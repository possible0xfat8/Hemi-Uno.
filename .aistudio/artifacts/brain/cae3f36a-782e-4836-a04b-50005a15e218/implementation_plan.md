# Gasless Oracle-Sponsored On-Chain Pot Settlement

Automates on-chain match rewards on Hemi Sepolia using a funded backend Oracle relayer. Players stake chips seamlessly in the game lobby without paying gas or needing testnet ETH, and the Oracle automatically transfers 95% of the lobby's pot on-chain directly to the match winner upon victory.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Key Architecture Decisions Based on User Feedback:**
> - **Gasless Player Experience**: Players do **not** sign on-chain deposit transactions in the lobby. This removes the requirement for users to hold Hemi Sepolia gas tokens (ETH) to play.
> - **Oracle-Funded Settlement**: The server's pre-funded Oracle relayer account (which holds Hemi Sepolia gas and `$CRAZY8` supply) sponsors all on-chain gas costs and executes the token transfer.
> - **Lobby Pot Accumulation**: Each table calculates its specific pot from participating player stakes. When the game ends, the Oracle pays out exactly 95% of that lobby's pot to the winner and allocates 5% to the house.

---

## 1. Overview & Core Concept

### What It Does
1. **Lobby Staking**: When players join or ready up in a staking room, their in-app `$CRAZY8` chip balance is debited by the server and locked into that specific lobby's match pot.
2. **Gasless Play**: Players never encounter failed transactions or gas fee barriers when entering lobbies.
3. **Authoritative On-Chain Settlement**: When the match finishes, the game engine crowns the winner and invokes the Oracle relayer. The Oracle submits an on-chain transaction on Hemi Sepolia testnet transferring 95% of the accumulated pot to the winner's wallet address.
4. **Instant Lobby Refunds**: If a player leaves the lobby before the match begins or the table is disbanded, their staked chips are refunded back to their account balance instantly without blockchain fees.

---

## 2. Technical Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       Game Lobby UI                         │
│  - Player enters room (e.g. 100 chip buy-in)               │
│  - No wallet popups / No gas fees required                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Socket.IO 'room:join'
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Authoritative Game Server                   │
│  - Verifies & debits player chip balance in database        │
│  - Accumulates match pot (e.g. 2 players = 200 chips)       │
│  - Broadcasts updated chip balances to players              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Game finishes & Winner crowns
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Funded Oracle Relayer                       │
│  - Computes 95% payout for the winning player               │
│  - Executes on-chain transfer on Hemi Sepolia               │
│  - Emits txHash & notification to winner                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ ERC-20 Transfer
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Hemi Sepolia Blockchain                      │
│  - Winner receives 95% $CRAZY8 tokens directly in wallet    │
│  - Verifiable on Hemi Sepolia block explorer                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Steps

### Phase 1: Oracle Liquidity & Payout Engine (`server/escrowService.ts`)
- Ensure the Oracle relayer wallet has automated access to `$CRAZY8` tokens (checking balance and leveraging the token contract's minting or reserve pool).
- Enhance `settleMatchOnChain(roomCode, winnerAddress, potTokens)`:
  - Formats the deterministic `gameId` for the lobby.
  - Verifies the winner's Ethereum address.
  - Executes the on-chain transfer of `95%` of the lobby's pot directly to the winner's address on Hemi Sepolia.
  - If board fees apply, transfers the `5%` share to the treasury.
  - Returns the verified on-chain `txHash` and formatted token amounts.

### Phase 2: Room Staking & Settlement Workflow (`server/roomManager.ts`)
- Track exact stakes per player and per room code.
- In `handleGameOverSettlement`:
  - Calculate total lobby pot (e.g. `players.length * buyIn`).
  - Calculate `payout = pot * 0.95`.
  - Trigger `settleMatchOnChain` via the Oracle.
  - Broadcast `game:settlement` event containing the transaction hash and explorer link.
  - Record a persistent victory notification with the transaction hash in the winner's account profile.
- In `handleLeaveRoom` and `destroyRoom`:
  - Maintain the instant automatic refund for players who leave a lobby prior to match launch.

### Phase 3: Winner UI & Block Explorer Integration (`src/App.tsx` & `src/components/VictoryModal.tsx`)
- Display the verified Hemi Sepolia `txHash` on the victory screen with a direct link to the Hemi testnet explorer (`https://testnet.explorer.hemi.network/tx/...`).
- Add an animated "Winnings Dispatched by Oracle" badge showing that 95% of the lobby pot was paid to their wallet on-chain.
- Ensure the notifications drawer displays the transaction hash for claimed rewards.

---

## 4. Verification & Testing

1. **Lobby Join & Stake Verification**:
   - Verify that joining a staking room deducts the buy-in from the player's chip balance without opening a wallet signature popup.
2. **Lobby Exit Refund**:
   - Leave an unstarted table; confirm chip balance is instantly credited back in full.
3. **Match Win & Oracle Payout**:
   - Complete a match on a staking table.
   - Verify that the Oracle issues an on-chain transfer on Hemi Sepolia testnet.
   - Confirm receipt of the transaction hash and check balance reflection in the winner's wallet.
4. **Build & Syntax Verification**:
   - Run compilation and linting to ensure no regressions.
