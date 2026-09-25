import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

let escrowContractReadOnly: ethers.Contract | null = null;
let escrowContractAdmin: ethers.Contract | null = null;
let providerInstance: ethers.JsonRpcProvider | null = null;

const HEMI_SEPOLIA_RPC = 'https://testnet.rpc.hemi.network/rpc';

function getArtifact() {
  const artifactPath = path.resolve(process.cwd(), 'src', 'contracts', 'HemiCrazy8Escrow.json');
  if (fs.existsSync(artifactPath)) {
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  }
  return null;
}

export function getEscrowAddress(): string | null {
  const artifact = getArtifact();
  return process.env.CRAZY8_ESCROW_ADDRESS?.trim() || artifact?.address || null;
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

export function getEscrowReadOnly(): ethers.Contract | null {
  const address = getEscrowAddress();
  if (!address) return null;

  if (!escrowContractReadOnly) {
    const artifact = getArtifact();
    const abi = artifact?.abi || [
      'function getGameDetails(bytes32) view returns (uint256,uint256,uint256,address,bool,bool,uint256,uint256)',
      'function totalGamesSettled() view returns (uint256)',
      'function totalVolumeDistributed() view returns (uint256)',
      'function totalFeesCollected() view returns (uint256)',
    ];
    escrowContractReadOnly = new ethers.Contract(address, abi, getProvider());
  }
  return escrowContractReadOnly;
}

export function getEscrowAdmin(): ethers.Contract | null {
  const address = getEscrowAddress();
  const privateKey = process.env.admin_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
  if (!address || !privateKey) return null;

  if (!escrowContractAdmin) {
    const artifact = getArtifact();
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const abi = artifact?.abi || [
      'function settleGame(bytes32,address) returns (bool)',
      'function cancelGameAndRefund(bytes32) returns (bool)',
      'function getGameDetails(bytes32) view returns (uint256,uint256,uint256,address,bool,bool,uint256,uint256)',
    ];
    escrowContractAdmin = new ethers.Contract(address, abi, wallet);
  }
  return escrowContractAdmin;
}

/**
 * Converts a room code into a deterministic bytes32 gameId
 */
export function formatGameId(roomCode: string): string {
  const cleanCode = (roomCode || 'GAME').trim().toUpperCase();
  return ethers.keccak256(ethers.toUtf8Bytes(`HEMI_CRAZY_8_${cleanCode}`));
}

/**
 * Automates on-chain match settlement:
 * Pays 95% of pot to winner and 5% board fee to treasury.
 */
export async function settleMatchOnChain(
  roomCode: string,
  winnerAddress: string
): Promise<{
  success: boolean;
  txHash?: string;
  gameId?: string;
  winnerPayout?: string;
  boardFee?: string;
  error?: string;
}> {
  try {
    const cleanWinner = ethers.getAddress(winnerAddress.trim());
    const gameId = formatGameId(roomCode);
    const adminContract = getEscrowAdmin();

    if (!adminContract) {
      console.warn('[EscrowService] Escrow contract not deployed or admin key missing.');
      return { success: false, error: 'Escrow contract not yet configured on server' };
    }

    console.log(`[EscrowService] Settling match ${roomCode} (${gameId}) for winner ${cleanWinner}...`);
    const tx = await adminContract.settleGame(gameId, cleanWinner);
    console.log(`[EscrowService] Settle transaction broadcasted: ${tx.hash}`);

    await tx.wait(1);
    console.log(`[EscrowService] Match ${roomCode} confirmed settled on Hemi Sepolia!`);

    return {
      success: true,
      txHash: tx.hash,
      gameId,
    };
  } catch (err: any) {
    console.error(`[EscrowService] Error settling match ${roomCode}:`, err);
    return {
      success: false,
      error: err.reason || err.shortMessage || err.message || 'Failed to settle game on-chain',
    };
  }
}
