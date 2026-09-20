import React, { useState } from 'react';
import { GameState, Player, PublicRoomSummary } from '../types';
import { WalletState, formatAddress } from '../utils/wallet';
import {
  Copy,
  Check,
  Play,
  Bot,
  Users,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Eye,
  Radio,
  RefreshCw,
  Coins,
  Tv,
  Wallet,
} from 'lucide-react';

interface LobbyViewProps {
  gameState: GameState | null;
  myPlayerId: string;
  wallet: WalletState;
  onConnectWallet: () => Promise<void>;
  onCreateRoom: (playerName: string, avatar: string, buyIn: string, address?: string) => void;
  onJoinRoom: (roomCode: string, playerName: string, avatar: string, address?: string) => void;
  onSpectateRoom: (roomCode: string, spectatorName: string, avatar: string) => void;
  onToggleReady: () => void;
  onAddBot: () => void;
  onRemovePlayer: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveRoom?: () => void;
  liveRooms?: PublicRoomSummary[];
  onRefreshLiveRooms?: () => void;
  error?: string | null;
}

const AVATARS = ['🦊', '🦁', '🐸', '🤖', '⚡', '💎', '🐉', '🐱'];
const BUY_IN_OPTIONS = ['0.001', '0.005', '0.01', '0.05'];

export const LobbyView: React.FC<LobbyViewProps> = ({
  gameState,
  myPlayerId,
  wallet,
  onConnectWallet,
  onCreateRoom,
  onJoinRoom,
  onSpectateRoom,
  onToggleReady,
  onAddBot,
  onRemovePlayer,
  onStartGame,
  onLeaveRoom,
  liveRooms = [],
  onRefreshLiveRooms,
  error,
}) => {
  const [playerName, setPlayerName] = useState('ChadCard');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const [buyIn, setBuyIn] = useState('0.005');
  const [joinCode, setJoinCode] = useState('');
  const [spectateCode, setSpectateCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'spectate'>('play');

  // If in room lobby
  if (gameState && gameState.status === 'lobby') {
    const isHost = gameState.hostId === myPlayerId;
    const isSpectator = !!gameState.isSpectator;
    const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
    const playerCount = gameState.players.length;
    const canStart =
      playerCount >= 3 &&
      playerCount <= 5 &&
      gameState.players.every((p) => p.isHost || p.isReady || p.isBot);

    const handleCopyCode = () => {
      navigator.clipboard.writeText(gameState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenSecondWindow = () => {
      const url = `${window.location.origin}?join=${gameState.roomCode}`;
      window.open(url, '_blank');
    };

    return (
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-slate-900/90 border-2 border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md">
        {/* Spectator Notice Banner if spectating lobby */}
        {isSpectator && (
          <div className="mb-5 p-3.5 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Spectating Lobby</span>
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 text-[10px] font-bold">
                    Watcher
                  </span>
                </div>
                <div className="text-[11px] text-purple-300/80">
                  You will watch the live match with real-time card plays and chat as soon as the host starts!
                </div>
              </div>
            </div>
            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        )}

        {/* Lobby Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🃏</span>
              <h2 className="text-xl sm:text-2xl font-black text-white">Room Lobby</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                {playerCount}/5 Players
              </span>
              {gameState.spectatorCount ? (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{gameState.spectatorCount}</span>
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Crazy 8s / UNO arcade shedding engine. 3 to 5 players required.
            </p>
          </div>

          {/* Room Code Pill */}
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">ROOM CODE</span>
              <span className="text-xl font-black text-amber-400 tracking-widest font-mono">
                {gameState.roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Seated Players ({playerCount}/5)</span>
            </h3>
            {playerCount < 3 && (
              <span className="text-xs text-amber-400/90 font-medium">
                Need {3 - playerCount} more player{3 - playerCount > 1 ? 's' : ''} to start
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gameState.players.map((p, idx) => (
              <div
                key={p.id}
                className={`
                  p-3.5 rounded-2xl border flex items-center justify-between transition-all
                  ${p.id === myPlayerId ? 'bg-slate-800/80 border-amber-500/50 shadow-md shadow-amber-500/10' : 'bg-slate-950/60 border-slate-800'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                    {p.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white max-w-[120px] truncate">
                        {p.name}
                      </span>
                      {p.isHost && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          HOST
                        </span>
                      )}
                      {p.isBot && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          BOT
                        </span>
                      )}
                      {p.id === myPlayerId && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Seat #{idx + 1} • {p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Not Ready'}
                    </div>
                    {p.address && (
                      <div className="text-[10px] text-amber-400/90 font-mono truncate max-w-[130px]" title={p.address}>
                        {formatAddress(p.address)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.isReady || p.isHost ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-500 text-xs font-medium">
                      Waiting...
                    </span>
                  )}

                  {isHost && p.id !== myPlayerId && (
                    <button
                      onClick={() => onRemovePlayer(p.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors text-xs"
                      title="Kick Player / Bot"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pot & Buy-in Information */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
              💰
            </div>
            <div>
              <div className="text-xs font-bold text-white">Escrow Smart Pot</div>
              <div className="text-[11px] text-slate-400">
                Buy-in: {gameState.escrowPot.buyInAmount} {gameState.escrowPot.currency} / player
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Estimated Pot</div>
            <div className="text-lg font-black text-amber-400 font-mono">
              {gameState.escrowPot.amount} {gameState.escrowPot.currency}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isSpectator && playerCount < 5 && (
              <button
                onClick={onAddBot}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Bot className="w-4 h-4 text-blue-400" />
                <span>Add AI Bot</span>
              </button>
            )}

            <button
              onClick={handleOpenSecondWindow}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              title="Open a new tab to test real multiplayer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Open 2nd Player Tab</span>
            </button>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            {!isSpectator && !isHost && (
              <button
                onClick={onToggleReady}
                className={`
                  w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all
                  ${myPlayer?.isReady
                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'}
                `}
              >
                {myPlayer?.isReady ? 'Cancel Ready' : 'I Am Ready!'}
              </button>
            )}

            {!isSpectator && isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`
                  w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl
                  ${canStart
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:scale-105 active:scale-95 shadow-amber-500/40 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}
                `}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START GAME</span>
              </button>
            )}
          </div>
        </div>

        {isHost && !canStart && (
          <p className="text-[11px] text-amber-400/80 text-center sm:text-right mt-2 font-medium">
            {playerCount < 3 ? 'Minimum 3 players needed (Click "Add AI Bot" to quick-fill!)' : 'Waiting for all players to be Ready'}
          </p>
        )}
      </div>
    );
  }

  // Outside room: Main Page with Play vs Spectate tabs
  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-8 bg-slate-900/90 border-2 border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold mb-3">
          <span>⚡</span>
          <span>HEMI TESTNET ARCADE</span>
          <span>⚡</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          CRAZY EIGHTS / UNO
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          High-energy real-time multiplayer card battles with live spectator arena.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile & Wallet Linking Setup */}
      <div className="space-y-4 mb-6">
        {/* Wallet Link Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${wallet.address ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Hemi Web3 Wallet</span>
                {wallet.address && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Connected
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {wallet.address ? (
                  <span>{formatAddress(wallet.address)} • {wallet.balance ? `${wallet.balance} ETH` : 'Hemi Sepolia'}</span>
                ) : (
                  <span>Connect wallet to tie your address to your lobby pot settlement</span>
                )}
              </div>
            </div>
          </div>

          {!wallet.address ? (
            <button
              onClick={() => onConnectWallet()}
              disabled={wallet.isConnecting}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              {wallet.isConnecting ? 'Linking...' : 'Connect'}
            </button>
          ) : (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" />
              <span>Tied to Lobby</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Your Player / Spectator Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={16}
            placeholder="Enter your handle"
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400 text-sm font-bold transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Choose Avatar
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => setSelectedAvatar(av)}
                className={`
                  h-12 rounded-xl flex items-center justify-center text-2xl transition-all
                  ${selectedAvatar === av
                    ? 'bg-amber-500/20 border-2 border-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950 border border-slate-800 hover:border-slate-700'}
                `}
              >
                {av}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Mode Switcher: Play vs Spectate */}
      <div className="flex p-1.5 rounded-2xl bg-slate-950 border border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('play')}
          className={`
            flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all
            ${activeTab === 'play'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'}
          `}
        >
          <Sparkles className="w-4 h-4" />
          <span>Play Match</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('spectate');
            onRefreshLiveRooms?.();
          }}
          className={`
            flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all
            ${activeTab === 'spectate'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white'}
          `}
        >
          <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Live Spectator Arena</span>
          {liveRooms.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-amber-400 text-[10px] font-bold border border-amber-500/30">
              {liveRooms.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: PLAY (Create Room / Join Room) */}
      {activeTab === 'play' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Create Room Box */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Create Room
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Host a 3 to 5 player game and invite friends or AI bots.
              </p>

              <div className="mb-4">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Buy-In Pot (ETH)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {BUY_IN_OPTIONS.map((val) => (
                    <button
                      key={val}
                      onClick={() => setBuyIn(val)}
                      className={`
                        py-1 rounded-lg text-xs font-mono font-bold transition-colors
                        ${buyIn === val ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                      `}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => onCreateRoom(playerName, selectedAvatar, buyIn, wallet.address || undefined)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs tracking-wider uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Create New Room
            </button>
          </div>

          {/* Join Room Box */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Join Room
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Enter a 4-letter room code from your game host.
              </p>

              <div className="mb-4">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="e.g. 4F9B"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center font-mono font-black text-lg tracking-widest text-amber-400 focus:outline-hidden focus:border-amber-400 uppercase placeholder:text-slate-700"
                />
              </div>
            </div>

            <button
              onClick={() => onJoinRoom(joinCode, playerName, selectedAvatar, wallet.address || undefined)}
              disabled={joinCode.trim().length < 4}
              className={`
                w-full py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-lg
                ${joinCode.trim().length >= 4
                  ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-blue-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
              `}
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE GAMES & SPECTATE */}
      {activeTab === 'spectate' && (
        <div className="space-y-4">
          {/* Direct Code Spectate Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-purple-400" />
                <span>Spectate By Code</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Know a room code? Jump directly into the live audience.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={spectateCode}
                onChange={(e) => setSpectateCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ROOM"
                className="w-24 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono font-black text-sm text-amber-400 uppercase placeholder:text-slate-700 focus:outline-hidden focus:border-purple-400"
              />
              <button
                onClick={() => onSpectateRoom(spectateCode, playerName, selectedAvatar)}
                disabled={spectateCode.trim().length < 4}
                className={`
                  px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5
                  ${spectateCode.trim().length >= 4
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
                `}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Watch</span>
              </button>
            </div>
          </div>

          {/* Live Games List Header */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Live Active Matches ({liveRooms.length})
              </h3>
            </div>
            <button
              onClick={onRefreshLiveRooms}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
              title="Refresh live rooms list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Refresh</span>
            </button>
          </div>

          {/* Live Rooms List Feed */}
          {liveRooms.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
              <Eye className="w-8 h-8 text-purple-400/40 mx-auto mb-2 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-300">No Live Matches Right Now</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                No active games are currently being played. Create a room to start the action, and others will see you here!
              </p>
              <button
                onClick={() => setActiveTab('play')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all"
              >
                Create Room Now
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {liveRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-black text-sm tracking-wider">
                        {room.roomCode}
                      </span>

                      {room.status === 'playing' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>LIVE MATCH</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>LOBBY</span>
                        </span>
                      )}

                      <span className="text-[11px] text-purple-300 font-mono flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        <span>{room.spectatorCount || 0} watching</span>
                      </span>
                    </div>

                    {/* Players seated */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex -space-x-2">
                        {room.players.map((p, idx) => (
                          <div
                            key={idx}
                            className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-sm shadow-sm"
                            title={p.name}
                          >
                            {p.avatar}
                          </div>
                        ))}
                      </div>
                      <span className="text-slate-400 text-[11px] font-medium">
                        {room.playerCount}/5 Players ({room.players.map((p) => p.name).join(', ')})
                      </span>
                    </div>

                    {/* Pot Info */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                        <Coins className="w-3 h-3 text-amber-400" />
                        <span>{room.escrowPot.amount} {room.escrowPot.currency}</span>
                      </span>
                      {room.activeColor && (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold">
                          <span>Color:</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              room.activeColor === 'red'
                                ? 'bg-rose-500'
                                : room.activeColor === 'blue'
                                ? 'bg-blue-500'
                                : room.activeColor === 'green'
                                ? 'bg-emerald-500'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span className="text-white">{room.activeColor}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Spectate Button */}
                  <button
                    onClick={() => onSpectateRoom(room.roomCode, playerName, selectedAvatar)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs tracking-wider uppercase transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 shrink-0 group-hover:scale-105"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Watch Live</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
