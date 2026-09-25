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
 * Returns overall on-chain escrow protocol metrics
 */
export async function getEscrowInfo() {
  const address = getEscrowAddress();
  if (!address) return null;

  try {
    const contract = getEscrowReadOnly();
    if (!contract) return null;

    const [totalSettled, totalVol, totalFees] = await Promise.all([
      contract.totalGamesSettled(),
      contract.totalVolumeDistributed(),
      contract.totalFeesCollected(),
    ]);

    return {
      escrowAddress: address,
      tokenAddress: process.env.CRAZY8_TOKEN_ADDRESS || '0x19B111602A60442CCbe947a58a5fd7CB0195324E',
      totalGamesSettled: Number(totalSettled),
      totalVolumeDistributed: ethers.formatEther(totalVol),
      totalFeesCollected: ethers.formatEther(totalFees),
      network: 'Hemi Sepolia Testnet',
      chainId: 743111,
    };
  } catch (err) {
    console.error('[EscrowService] Error fetching escrow info:', err);
    return null;
  }
}

/**
 * Returns on-chain match game details
 */
export async function getGameEscrowDetails(roomCode: string) {
  const contract = getEscrowReadOnly();
  if (!contract) return null;

  try {
    const gameId = formatGameId(roomCode);
    const details = await contract.getGameDetails(gameId);
    return {
      gameId,
      roomCode: roomCode.trim().toUpperCase(),
      totalPot: ethers.formatEther(details[0]),
      buyInPerPlayer: ethers.formatEther(details[1]),
      playerCount: Number(details[2]),
      winner: details[3],
      isSettled: details[4],
      isCancelled: details[5],
      winnerPayout: ethers.formatEther(details[6]),
      feeAmount: ethers.formatEther(details[7]),
    };
  } catch (err) {
    console.warn(`[EscrowService] Error getting game details for ${roomCode}:`, err);
    return null;
  }
}

/**
 * Automates on-chain match settlement:
 * Pays 95% of pot to winner and 5% board fee to treasury.
 */
export async function settleMatchOnChain(
  roomCode: string,
  winnerAddress: string,
  potTokens: number | string = 0
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

    // Inspect on-chain pot status
    const gameDetails = await adminContract.getGameDetails(gameId).catch(() => null);

    if (gameDetails && gameDetails[0] > 0n && !gameDetails[4]) {
      // Pot is deposited in the Escrow contract -> call settleGame
      console.log(`[EscrowService] Settling on-chain escrow match ${roomCode} (${gameId}) for winner ${cleanWinner}...`);
      const tx = await adminContract.settleGame(gameId, cleanWinner);
      console.log(`[EscrowService] Escrow settle tx broadcasted: ${tx.hash}`);

      await tx.wait(1);
      console.log(`[EscrowService] Match ${roomCode} confirmed settled on Hemi Sepolia!`);

      const totalPotEth = parseFloat(ethers.formatEther(gameDetails[0]));
      const payout = (totalPotEth * 0.95).toFixed(2);
      const fee = (totalPotEth * 0.05).toFixed(2);

      return {
        success: true,
        txHash: tx.hash,
        gameId,
        winnerPayout: payout,
        boardFee: fee,
      };
    }

    // Fallback: If pot was not deposited on-chain beforehand (e.g. casual lobby or bot game)
    const potNum = typeof potTokens === 'string' ? parseFloat(potTokens) : potTokens;
    if (potNum > 0) {
      const payoutAmount = potNum * 0.95;
      const feeAmount = potNum * 0.05;

      // Transfer tokens from admin relayer to winner if admin has enough balance
      const tokenArtifactPath = path.resolve(process.cwd(), 'src', 'contracts', 'HemiCrazy8Token.json');
      if (fs.existsSync(tokenArtifactPath)) {
        const tokenArtifact = JSON.parse(fs.readFileSync(tokenArtifactPath, 'utf8'));
        const privateKey = process.env.admin_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
        if (privateKey) {
          const provider = getProvider();
          const wallet = new ethers.Wallet(privateKey, provider);
          const tokenContract = new ethers.Contract(tokenArtifact.address, tokenArtifact.abi, wallet);
          const adminBal = await tokenContract.balanceOf(wallet.address);
          const payoutWei = ethers.parseEther(payoutAmount.toString());

          if (adminBal >= payoutWei) {
            console.log(`[EscrowService] Rewarding winner ${cleanWinner} directly: ${payoutAmount} $CRAZY8...`);
            const transferTx = await tokenContract.transfer(cleanWinner, payoutWei);
            await transferTx.wait(1);
            console.log(`[EscrowService] Payout confirmed: ${transferTx.hash}`);

            return {
              success: true,
              txHash: transferTx.hash,
              gameId,
              winnerPayout: payoutAmount.toFixed(1),
              boardFee: feeAmount.toFixed(1),
            };
          }
        }
      }

      return {
        success: true,
        gameId,
        winnerPayout: payoutAmount.toFixed(1),
        boardFee: feeAmount.toFixed(1),
      };
    }

    return {
      success: true,
      gameId,
      winnerPayout: '0',
      boardFee: '0',
    };
  } catch (err: any) {
    console.error(`[EscrowService] Error settling match ${roomCode}:`, err);
    return {
      success: false,
      error: err.reason || err.shortMessage || err.message || 'Failed to settle game on-chain',
    };
  }
}

