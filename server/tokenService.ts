import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { serverDb } from './database.js';

let tokenContractReadOnly: ethers.Contract | null = null;
let tokenContractAdmin: ethers.Contract | null = null;
let providerInstance: ethers.JsonRpcProvider | null = null;

const HEMI_SEPOLIA_RPC = 'https://testnet.rpc.hemi.network/rpc';

function getArtifact() {
  const artifactPath = path.resolve(process.cwd(), 'src', 'contracts', 'HemiCrazy8Token.json');
  if (fs.existsSync(artifactPath)) {
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  }
  return null;
}

export function getTokenAddress(): string {
  const artifact = getArtifact();
  return (
    process.env.CRAZY8_TOKEN_ADDRESS?.trim() ||
    artifact?.address ||
    '0x19B111602A60442CCbe947a58a5fd7CB0195324E'
  );
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    const network = ethers.Network.from({
      chainId: 743111,
      name: 'hemi-sepolia',
    });
    providerInstance = new ethers.JsonRpcProvider(HEMI_SEPOLIA_RPC, network, {
      staticNetwork: network,
    });
  }
  return providerInstance;
}

export function getTokenReadOnly(): ethers.Contract {
  if (!tokenContractReadOnly) {
    const artifact = getArtifact();
    const address = getTokenAddress();
    const abi = artifact?.abi || [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function isEligibleForAirdrop(address) view returns (bool)',
      'function hasClaimedAirdrop(address) view returns (bool)',
      'function airdropTo(address) returns (bool)',
    ];
    tokenContractReadOnly = new ethers.Contract(address, abi, getProvider());
  }
  return tokenContractReadOnly;
}

export function getTokenAdmin(): ethers.Contract | null {
  const privateKey = process.env.admin_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    console.warn('[TokenService] admin_PRIVATE_KEY not set in environment.');
    return null;
  }

  if (!tokenContractAdmin) {
    const artifact = getArtifact();
    const address = getTokenAddress();
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const abi = artifact?.abi || [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function isEligibleForAirdrop(address) view returns (bool)',
      'function hasClaimedAirdrop(address) view returns (bool)',
      'function airdropTo(address) returns (bool)',
    ];
    tokenContractAdmin = new ethers.Contract(address, abi, wallet);
  }
  return tokenContractAdmin;
}

export async function getTokenInfo() {
  try {
    const contract = getTokenReadOnly();
    const address = getTokenAddress();
    const [name, symbol, decimals, totalSupply, poolBalance] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply(),
      contract.balanceOf(address),
    ]);

    return {
      address,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatEther(totalSupply),
      poolBalance: ethers.formatEther(poolBalance),
      network: 'Hemi Sepolia Testnet',
      chainId: 743111,
    };
  } catch (err) {
    console.error('[TokenService] Error fetching token info:', err);
    throw err;
  }
}

export async function getPlayerTokenStatus(rawAddress: string) {
  if (!rawAddress) return { balance: '0', eligible: false, hasClaimed: false, symbol: 'CRAZY8' };
  try {
    const cleanAddr = ethers.getAddress(rawAddress.trim());
    const contract = getTokenReadOnly();

    const [rawBal, isEligible, hasClaimed] = await Promise.all([
      contract.balanceOf(cleanAddr).catch(() => 0n),
      contract.isEligibleForAirdrop(cleanAddr).catch(() => true),
      contract.hasClaimedAirdrop(cleanAddr).catch(() => false),
    ]);

    const onChainBal = parseFloat(ethers.formatEther(rawBal)) || 0;
    const user = serverDb.getUserByAddress(cleanAddr);
    // On-chain balance is authoritative. Otherwise check user tokenBalance in database.
    const effectiveBal = onChainBal > 0 ? onChainBal : (typeof user?.tokenBalance === 'number' ? user.tokenBalance : 0);

    return {
      address: cleanAddr,
      balance: effectiveBal.toString(),
      eligible: isEligible && !hasClaimed,
      hasClaimed,
      symbol: 'CRAZY8',
    };
  } catch (err) {
    console.error(`[TokenService] Error checking status for ${rawAddress}:`, err);
    return { balance: '0', eligible: false, hasClaimed: false, symbol: 'CRAZY8' };
  }
}

/**
 * Executes gasless welcome airdrop of 10,000 $CRAZY8 to the recipient.
 * Enforces single claim per wallet on-chain and returns the transaction hash.
 */
export async function dispenseAirdrop(rawAddress: string): Promise<{
  success: boolean;
  txHash?: string;
  balance?: string;
  amount?: number;
  error?: string;
}> {
  try {
    const cleanAddr = ethers.getAddress(rawAddress.trim());
    const adminContract = getTokenAdmin();
    if (!adminContract) {
      return { success: false, error: 'Admin signer not configured on server' };
    }

    // Pre-check eligibility on-chain
    const isEligible = await adminContract.isEligibleForAirdrop(cleanAddr);
    if (!isEligible) {
      return {
        success: false,
        error: 'This wallet has already claimed the 10,000 $CRAZY8 welcome airdrop.',
      };
    }

    console.log(`[TokenService] Dispensing 10,000 $CRAZY8 to ${cleanAddr}...`);
    // Explicit gasPrice (0.1 Gwei) and gasLimit (120,000) ensure instant sequencer inclusion
    const tx = await adminContract.airdropTo(cleanAddr, {
      gasLimit: 120000,
      gasPrice: ethers.parseUnits('0.1', 'gwei'),
    });
    console.log(`[TokenService] Airdrop transaction broadcasted: ${tx.hash}`);

    // Update server DB immediately so player can use their chips without waiting for block confirmation
    const user = serverDb.getUserByAddress(cleanAddr);
    if (user) {
      user.tokenBalance = (user.tokenBalance || 0) + 10000;
      serverDb.save();
    }

    // Confirm in background without blocking the HTTP response
    tx.wait(1).then(async (receipt: any) => {
      console.log(`[TokenService] Airdrop confirmed in block ${receipt?.blockNumber} for ${cleanAddr}`);
      try {
        const bal = await adminContract.balanceOf(cleanAddr);
        console.log(`[TokenService] Confirmed on-chain balance for ${cleanAddr}: ${ethers.formatEther(bal)}`);
      } catch {}
    }).catch((err: any) => {
      console.warn(`[TokenService] Background confirmation warning for ${tx.hash}:`, err);
    });

    return {
      success: true,
      txHash: tx.hash,
      balance: '10000',
      amount: 10000,
    };
  } catch (err: any) {
    console.error('[TokenService] Airdrop execution error:', err);
    return {
      success: false,
      error: err.reason || err.shortMessage || err.message || 'Failed to execute airdrop',
    };
  }
}
