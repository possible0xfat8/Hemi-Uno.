import React, { useState, useEffect } from 'react';
import { GameState, PublicRoomSummary } from '../types';
import { WalletState, formatAddress } from '../utils/wallet';
import { AccountProfile } from '../utils/account';
import { HemiUnoLogo } from './HemiUnoLogo';
import { HemiHeroCards } from './HemiHeroCards';
import {
  Users,
  Eye,
  Trophy,
  BookOpen,
  Home,
  Gamepad2,
  ChevronRight,
  Copy,
  Check,
  Lightbulb,
  Code2,
  Plus,
  Radio,
  RefreshCw,
  Crown,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Play,
  Share2,
  UserPlus,
  UserX,
  RotateCcw,
  Music,
  Volume2,
  VolumeX,
  LogOut,
} from 'lucide-react';

export interface LobbyViewProps {
  gameState: GameState | null;
  myPlayerId: string;
  wallet: WalletState;
  account: AccountProfile;
  onUpdateProfile?: (name: string, avatar: string) => void;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting' | 'offline';
  onConnectWallet: () => Promise<void>;
  onCreateRoom: (playerName: string, avatar: string, buyIn: string, address?: string) => void;
  onJoinRoom: (roomCode: string, playerName: string, avatar: string, address?: string) => void;
  onQuickJoin?: () => void;
  onOpenProfile: () => void;
  onOpenFriends: () => void;
  friendCount?: number;
  onlineFriendCount?: number;
  onSpectateRoom: (roomCode: string, spectatorName: string, avatar: string) => void;
  onToggleReady: () => void;
  onAddBot: () => void;
  onRemovePlayer: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  liveRooms?: PublicRoomSummary[];
  onRefreshLiveRooms?: () => void;
  error?: string | null;
  activeRoomCode?: string | null;
  onResumeSession?: (code: string) => void;
  onOpenLeaderboard?: () => void;
  onOpenRules?: () => void;
  onOpenCreateTable?: () => void;
  liveStats?: { openTables: number; playersOnline: number; gamesPlayed: number };
  isMusicOn?: boolean;
  onToggleMusic?: () => void;
}

const AVATARS = ['🦊', '🦁', '🐸', '🤖', '🐻', '💎', '🐉', '🐱'];

export const LobbyView: React.FC<LobbyViewProps> = ({
  gameState,
  myPlayerId,
  wallet,
  account,
  onUpdateProfile,
  connectionStatus = 'connected',
  onConnectWallet,
  onCreateRoom,
  onJoinRoom,
  onQuickJoin,
  onOpenProfile,
  onOpenFriends,
  friendCount = 0,
  onlineFriendCount = 0,
  onSpectateRoom,
  onToggleReady,
  onAddBot,
  onRemovePlayer,
  onStartGame,
  onLeaveRoom,
  liveRooms = [],
  onRefreshLiveRooms,
  error,
  activeRoomCode,
  onResumeSession,
  onOpenLeaderboard,
  onOpenRules,
  onOpenCreateTable,
  liveStats = { openTables: 12, playersOnline: 342, gamesPlayed: 8421 },
  isMusicOn = true,
  onToggleMusic,
}) => {
  const [playerName, setPlayerName] = useState(account?.name || '0xFat8');
  const [selectedAvatar, setSelectedAvatar] = useState(account?.avatar || '🦊');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [sortOption, setSortOption] = useState<'popular' | 'players' | 'fastest'>('popular');

  useEffect(() => {
    if (account?.name) setPlayerName(account.name);
    if (account?.avatar) setSelectedAvatar(account.avatar);
  }, [account?.name, account?.avatar]);

  const handleAvatarSelect = (newAvatar: string) => {
    setSelectedAvatar(newAvatar);
    if (onUpdateProfile) {
      onUpdateProfile(playerName, newAvatar);
    }
  };

  const handleCopyWalletAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (cleanCode.length >= 4) {
      onJoinRoom(cleanCode, playerName, selectedAvatar, wallet.address || undefined);
    }
  };

  // Compute player level & XP from career stats
  const matchesCount = account?.stats?.matchesPlayed || 0;
  const winsCount = account?.stats?.wins || 0;
  const playerLevel = Math.floor(matchesCount / 3) + 1;
  const playerXP = winsCount * 10 + matchesCount * 2;

  // Real or default online friends display
  const defaultOnlineFriends = [
    { name: 'Press.g', avatar: '🦁' },
    { name: 'Matt.g', avatar: '🤖' },
    { name: 'Axuer', avatar: '🐻' },
    { name: 'Zyro', avatar: '🐱' },
    { name: 'Tobz', avatar: '🦊' },
  ];

  // Default tables if live rooms are empty
  const defaultTables = [
    {
      code: 'CLSC',
      mode: 'Classic',
      desc: 'The original. 2-4 players.',
      players: '3/4',
      buyIn: 'Free',
      hostName: 'LumiBear',
      hostAvatar: '🐻',
    },
    {
      code: 'STCK',
      mode: 'Stacked Draw',
      desc: 'Stack it. Survive it.',
      players: '2/4',
      buyIn: 'Free',
      hostName: 'NeoDash',
      hostAvatar: '🤖',
    },
    {
      code: 'TEAM',
      mode: '2v2 Team',
      desc: 'Team up. Take over.',
      players: '3/4',
      buyIn: 'Free',
      hostName: 'Zyro',
      hostAvatar: '🦊',
    },
    {
      code: 'FAST',
      mode: 'Speed Uno',
      desc: 'Fast rounds, less waiting.',
      players: '2/4',
      buyIn: 'Free',
      hostName: 'Tobz',
      hostAvatar: '🐱',
    },
  ];

  const displayTables = liveRooms.length > 0
    ? liveRooms.map(r => ({
        code: r.roomCode,
        mode: r.mode || 'Classic',
        desc: r.description || 'The original. 2-4 players.',
        players: `${r.playerCount}/${r.maxPlayers || 4}`,
        buyIn: r.escrowPot?.buyInAmount && parseFloat(r.escrowPot.buyInAmount) > 0 ? `${r.escrowPot.buyInAmount} ETH` : 'Free',
        hostName: r.hostName || r.players[0]?.name || 'Host',
        hostAvatar: r.hostAvatar || r.players[0]?.avatar || '🦊',
      }))
    : defaultTables;

  // ==========================================
  // VIEW: WAITING ROOM LOBBY (when in a game)
  // ==========================================
  if (gameState && gameState.status === 'lobby') {
    const isHost = gameState.hostId === myPlayerId;
    const isSpectator = !gameState.players.some((p) => p.id === myPlayerId);
    const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
    const playerCount = gameState.players.length;
    const isQuickMatch = !!gameState.isQuickMatch;
    const canStart =
      playerCount >= 2 &&
      playerCount <= 5 &&
      gameState.players.every((p) => p.isHost || p.isReady || p.isBot);

    const handleCopyCode = () => {
      navigator.clipboard.writeText(gameState.roomCode);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    };

    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-[#0E1217]/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
        {/* Spectator Notice */}
        {isSpectator && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FF4600]/10 border border-[#FF4600]/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF4600]/20 flex items-center justify-center text-[#FF4600] shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Spectating Room</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#FF4600]/30 text-orange-200 text-[10px] font-bold">
                    Watcher
                  </span>
                </div>
                <div className="text-[11px] text-orange-200/80">
                  You are watching this lobby in real time. The match will start once the host initiates it.
                </div>
              </div>
            </div>
            <button
              onClick={onLeaveRoom}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              Exit
            </button>
          </div>
        )}

        {/* Quick Match Real Players Notice */}
        {isQuickMatch && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-emerald-200">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-white text-xs sm:text-sm flex items-center gap-2">
                  <span>Quick Match — Real Players Only</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    No Bots
                  </span>
                </div>
                <div className="text-emerald-200/80 text-[11px]">
                  {playerCount < 2
                    ? 'Waiting for other players to join Quick Match or share your code!'
                    : `${playerCount} real players ready. Host can launch match at any time!`}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Share Room Code"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </button>
          </div>
        )}

        {/* Open Tables Host Banner */}
        {!isQuickMatch && isHost && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FF4600]/10 border border-[#FF4600]/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-orange-200">
              <div className="w-8 h-8 rounded-xl bg-[#FF4600]/20 flex items-center justify-center text-lg shrink-0">
                👑
              </div>
              <div>
                <div className="font-black text-white text-xs sm:text-sm flex items-center gap-2">
                  <span>You are Table Host!</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FF4600]/20 text-orange-300 font-mono text-[10px] font-bold">
                    Open Table
                  </span>
                </div>
                <div className="text-orange-200/80 text-[11px]">
                  You have full table control. Add bots or wait for real players to join, then click Start Game.
                </div>
              </div>
            </div>
            {playerCount < 5 && (
              <button
                onClick={onAddBot}
                className="px-3 py-1.5 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-[#FF4600]/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bot</span>
              </button>
            )}
          </div>
        )}

        {/* Lobby Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <HemiUnoLogo size="sm" variant="clean" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {isQuickMatch ? 'Quick Match Lobby' : `${gameState.customMode || 'Open'} Table`}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF4600]/20 text-[#FF4600] font-mono text-xs font-bold border border-[#FF4600]/30">
                  {playerCount}/5 Players
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isHost
                  ? isQuickMatch
                    ? 'Match begins once 2 or more real players are seated.'
                    : 'Invite players or add bots, then click Start Game.'
                  : 'Waiting for host to begin match...'}
              </p>
            </div>
          </div>

          {/* Room Code & Audio Mood Control */}
          <div className="flex items-center gap-2">
            {onToggleMusic && (
              <button
                type="button"
                onClick={onToggleMusic}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                  isMusicOn
                    ? 'bg-[#FF4600]/15 border-[#FF4600]/40 text-orange-300 hover:bg-[#FF4600]/25 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
                title={isMusicOn ? 'Mute Background Groove' : 'Play Cool Cyber Uno Song'}
              >
                <Music className={`w-3.5 h-3.5 ${isMusicOn ? 'text-[#FF4600] animate-bounce' : 'text-slate-500'}`} />
                <span className="hidden sm:inline text-[11px]">
                  {isMusicOn ? 'Groove ON' : 'Groove OFF'}
                </span>
                {isMusicOn && (
                  <span className="flex gap-0.5 items-end h-3 ml-0.5">
                    <span className="w-0.5 h-1.5 bg-[#FF4600] animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#FF4600] animate-pulse delay-75" />
                    <span className="w-0.5 h-2 bg-[#FF4600] animate-pulse delay-150" />
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">CODE:</span>
              <span className="font-mono text-lg font-black text-[#FF4600] tracking-wider">
                {gameState.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copiedRoomCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Quit Lobby"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Quit Lobby</span>
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="py-6 space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Seat Roster ({playerCount}/5)</span>
            <span className="text-emerald-400 lowercase font-mono font-normal">
              {gameState.players.filter(p => p.isReady || p.isHost || p.isBot).length} ready
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {gameState.players.map((p) => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isMe
                      ? 'bg-[#FF4600]/10 border-[#FF4600]/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                      {p.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.isHost && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                            HOST
                          </span>
                        )}
                        {p.isBot && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                            BOT
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FF4600] text-white font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {p.isBot ? 'Automated Player' : p.isHost ? 'Room Organizer' : 'Challenger'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.isHost ? (
                      <span className="text-xs font-mono text-amber-400 font-bold px-2 py-1 bg-amber-500/10 rounded-lg">
                        Host
                      </span>
                    ) : p.isReady || p.isBot ? (
                      <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-1 bg-emerald-500/10 rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Ready
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-500 px-2 py-1 bg-slate-800 rounded-lg">
                        Waiting
                      </span>
                    )}

                    {isHost && !p.isHost && (
                      <button
                        onClick={() => onRemovePlayer(p.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                        title={p.isBot ? "Remove bot" : "Kick player"}
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Seat placeholders */}
            {Array.from({ length: Math.max(0, 5 - playerCount) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="p-3.5 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/20 flex items-center justify-between text-slate-600 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-700">
                    +
                  </div>
                  <span>Open Seat {playerCount + idx + 1}</span>
                </div>
                {isQuickMatch ? (
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Searching for player...</span>
                  </div>
                ) : isHost ? (
                  <button
                    onClick={onAddBot}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Bot</span>
                  </button>
                ) : (
                  <span className="text-slate-600 text-xs">Waiting for player</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Host and Player Controls */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onLeaveRoom}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Quit Lobby</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isHost && !isQuickMatch && playerCount < 5 && (
              <button
                onClick={onAddBot}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bot</span>
              </button>
            )}

            {!isHost && !isSpectator && (
              <button
                onClick={onToggleReady}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  myPlayer?.isReady
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {myPlayer?.isReady ? 'Cancel Ready' : 'I am Ready!'}
              </button>
            )}

            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  canStart
                    ? 'bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 text-white shadow-xl shadow-[#FF4600]/30 cursor-pointer active:scale-98'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Game</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN HOMEPAGE DASHBOARD (Exact Match to screenshot "new game ui.png")
  // =========================================================================
  return (
    <div className="w-full max-w-7xl mx-auto py-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Navigation Sidebar & Brand Atmosphere        */}
        {/* ========================================================= */}
        <div className="lg:col-span-2 hidden lg:flex flex-col gap-3">
          {/* Main Nav Items */}
          <div className="space-y-1.5">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] text-white font-black text-sm shadow-lg shadow-[#FF4600]/25 transition-all text-left"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={onQuickJoin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900/60 font-bold text-sm transition-all text-left cursor-pointer"
            >
              <Gamepad2 className="w-5 h-5" />
              <span>Play</span>
            </button>

            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900/60 font-bold text-sm transition-all text-left cursor-pointer"
            >
              <Trophy className="w-5 h-5" />
              <span>Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={onOpenRules}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900/60 font-bold text-sm transition-all text-left cursor-pointer"
            >
              <BookOpen className="w-5 h-5" />
              <span>How to Play</span>
            </button>
          </div>

          {/* Background Music Groove Card in Left Sidebar */}
          {onToggleMusic && (
            <div
              onClick={onToggleMusic}
              className={`mt-2 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                isMusicOn
                  ? 'bg-gradient-to-br from-[#FF4600]/15 via-slate-900 to-[#111620] border-[#FF4600]/40 shadow-lg shadow-[#FF4600]/10'
                  : 'bg-[#111620] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-orange-400">
                  <Music className={`w-3.5 h-3.5 ${isMusicOn ? 'text-[#FF4600] animate-bounce' : 'text-slate-500'}`} />
                  BGM GROOVE
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                    isMusicOn
                      ? 'bg-[#FF4600] text-white shadow-sm shadow-[#FF4600]/40'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isMusicOn ? 'LIVE' : 'MUTED'}
                </span>
              </div>
              <div className="text-xs font-black text-white group-hover:text-[#FF4600] transition-colors flex items-center justify-between">
                <span>Cyber Synth Uno Track</span>
                {isMusicOn && (
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-0.5 h-2 bg-[#FF4600] animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-[#FF4600] animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-[#FF4600] animate-pulse delay-150" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isMusicOn ? 'Playing energetic arcade funk beat' : 'Click to turn background song on'}
              </div>
            </div>
          )}

          {/* LIVE Spectate Games card in Left Sidebar */}
          <div
            onClick={() => {
              if (displayTables.length > 0) {
                onSpectateRoom(displayTables[0].code, playerName, selectedAvatar);
              }
            }}
            className="mt-2 p-3.5 rounded-2xl bg-[#111620] border border-slate-800 hover:border-[#FF4600]/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
              <Eye className="w-4 h-4 text-slate-400 group-hover:text-[#FF4600] transition-colors" />
            </div>
            <div className="text-xs font-black text-white group-hover:text-[#FF4600] transition-colors">
              Spectate Games
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Watch real-time matches
            </div>
          </div>

          {/* Bottom Watermark */}
          <div className="mt-8 pt-6 border-t border-slate-800/40 flex flex-col gap-2">
            <div className="flex items-center gap-2 opacity-30">
              <div className="w-6 h-6 rounded-full border border-[#FF4600] flex items-center justify-center text-[#FF4600] font-black text-xs">
                h
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
                Hemi Uno
              </span>
            </div>
            <div className="text-xs font-mono text-slate-500 leading-tight">
              Same rules.<br />
              <span className="text-slate-400 font-bold">New vibes.</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: Hero Banner, Stats, and Open Tables       */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-5">
          {/* Hero Banner with Hemi Hero Cards illustration */}
          <div className="rounded-3xl bg-gradient-to-br from-[#121622] via-[#0F131C] to-[#0A0D14] border border-slate-800/90 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            {/* Ambient orange glow in the background */}
            <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#FF4600]/15 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              {/* Left text and action */}
              <div className="flex-1 min-w-0 text-left">
                <span className="inline-block text-[11px] font-black font-mono tracking-widest text-[#FF4600] uppercase mb-2">
                  HEMI UNO
                </span>

                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2">
                  Ready to <span className="text-[#FF4600]">play?</span>
                </h1>

                <p className="text-sm text-slate-300 mb-6 max-w-sm">
                  Jump into the next open table — no room code needed.
                </p>

                <div className="mb-6">
                  <button
                    onClick={onQuickJoin}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5500] via-[#FF4600] to-[#E03A00] hover:from-[#FF6611] hover:to-[#FF4600] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-[#FF4600]/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <span>&lt; QUICK PLAY &gt;</span>
                  </button>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-400">🎯</span> Find a game
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-amber-400">⚡</span> Join instantly
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-blue-400">🏆</span> Play with others
                  </span>
                </div>
              </div>

              {/* Right: The 3 Glowing Hemi Network Cards */}
              <div className="shrink-0">
                <HemiHeroCards />
              </div>
            </div>
          </div>

          {/* 3 Metrics Counter Row */}
          <div className="grid grid-cols-3 gap-3.5">
            {/* Open Tables */}
            <div className="p-4 rounded-2xl bg-[#0E1218] border border-slate-800/90 flex items-center justify-between group hover:border-slate-700 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#FF4600]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    OPEN TABLES
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {liveStats.openTables || displayTables.length}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>

            {/* Players Online */}
            <div className="p-4 rounded-2xl bg-[#0E1218] border border-slate-800/90 flex items-center justify-between group hover:border-slate-700 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    PLAYERS ONLINE
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {liveStats.playersOnline}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>

            {/* Games Played */}
            <div className="p-4 rounded-2xl bg-[#0E1218] border border-slate-800/90 flex items-center justify-between group hover:border-slate-700 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    GAMES PLAYED
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {liveStats.gamesPlayed.toLocaleString()}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </div>

          {/* Open Tables Section */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0E1218] border border-slate-800/90 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF4600]/15 flex items-center justify-center text-[#FF4600]">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Open Tables</h2>
                  <p className="text-xs text-slate-400">Join a public game and start playing now.</p>
                </div>
              </div>

              {/* Sort by dropdown */}
              <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span>Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer"
                >
                  <option value="popular" className="bg-slate-900 text-white">Popular</option>
                  <option value="players" className="bg-slate-900 text-white">Players</option>
                  <option value="fastest" className="bg-slate-900 text-white">Fastest</option>
                </select>
              </div>
            </div>

            {/* List of Open Tables */}
            <div className="space-y-2.5">
              {displayTables.map((table) => (
                <div
                  key={table.code}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Mode, description, host */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                      {table.mode === 'Stacked Draw' ? '⚡' : table.mode === '2v2 Team' ? '👥' : table.mode === 'Quick Match' ? '⏱️' : '🎴'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{table.mode}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          • Public
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{table.desc}</div>
                    </div>
                  </div>

                  {/* Badges: Players, Buy-in, Host */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{table.players}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="text-slate-500">💼</span>
                      <span>{table.buyIn}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-base">{table.hostAvatar}</span>
                      <span className="truncate max-w-[80px]">{table.hostName}</span>
                    </div>

                    {/* Join Button */}
                    <button
                      onClick={() => onJoinRoom(table.code, playerName, selectedAvatar, wallet.address || undefined)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#FF4600]/20 active:scale-95 flex items-center gap-1 ml-auto sm:ml-2 cursor-pointer"
                    >
                      <span>Join</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Profile Card, Create, Join Code, Social     */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-4">
          {/* User Profile Card */}
          <div className="p-5 rounded-3xl bg-[#0E1218] border border-slate-800/90 shadow-xl relative overflow-hidden">
            <div className="flex flex-col items-center text-center">
              {/* Big Avatar with orange halo */}
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-[#FF4600] flex items-center justify-center text-4xl shadow-xl shadow-[#FF4600]/20">
                  {selectedAvatar}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-md">
                  👑
                </div>
              </div>

              {/* Username + Crown */}
              <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                <span>{playerName}</span>
              </h3>

              {/* Level & XP */}
              <div className="text-xs font-mono text-slate-400 mt-0.5 mb-2">
                Level {playerLevel} • {playerXP} XP
              </div>

              {/* Connection Status Indicator */}
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Wallet Connected</span>
              </div>

              {/* Truncated Address pill with copy */}
              {wallet.address && (
                <button
                  onClick={handleCopyWalletAddress}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono transition-all mb-4"
                  title="Copy address"
                >
                  <span>{formatAddress(wallet.address)}</span>
                  {copiedAddress ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              )}

              {/* Avatar Selector Row */}
              <div className="w-full pt-3 border-t border-slate-800/80">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 text-left">
                  Choose Avatar
                </div>
                <div className="flex items-center justify-between gap-1">
                  {AVATARS.slice(0, 5).map((emoji) => {
                    const active = selectedAvatar === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAvatarSelect(emoji)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                          active
                            ? 'bg-[#FF4600]/20 border-2 border-[#FF4600] scale-105'
                            : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    title="More Avatars & Profile Settings"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Create Table Card (Vibrant Orange Card) */}
          <div
            onClick={onOpenCreateTable}
            className="p-5 rounded-3xl bg-gradient-to-r from-[#FF5500] via-[#FF4600] to-[#E03A00] text-white shadow-xl shadow-[#FF4600]/25 transition-all hover:brightness-105 active:scale-98 cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-black/20 flex items-center justify-center text-white shrink-0 mt-0.5">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Create Table</h3>
                <p className="text-xs text-white/80 leading-snug">
                  Set your own rules, invite friends, or play for a custom buy-in.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80 shrink-0 ml-2" />
          </div>

          {/* Join by Code Card */}
          <div className="p-5 rounded-3xl bg-[#0E1218] border border-slate-800/90 shadow-xl">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Join by Code</h3>
                <p className="text-[11px] text-slate-400">Have a room code? Enter it here.</p>
              </div>
            </div>

            <form onSubmit={handleJoinByCodeSubmit} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter room code..."
                maxLength={6}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white placeholder-slate-600 uppercase focus:border-[#FF4600] outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={joinCodeInput.trim().length < 4}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-white font-black text-xs uppercase tracking-wider transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Join</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* LIVE Spectate Games Card */}
          <div
            onClick={() => {
              if (displayTables.length > 0) {
                onSpectateRoom(displayTables[0].code, playerName, selectedAvatar);
              }
            }}
            className="p-4 rounded-3xl bg-[#0E1218] border border-slate-800/90 shadow-xl hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
              <button className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-[#FF4600]/40 text-xs font-bold text-slate-300 group-hover:text-white flex items-center gap-1 transition-all">
                <Eye className="w-3 h-3 text-[#FF4600]" />
                <span>Spectate</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="text-sm font-black text-white group-hover:text-[#FF4600] transition-colors">
              Spectate Games
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Watch ongoing matches in real time.
            </p>
          </div>

          {/* Friends Online Card */}
          <div className="p-5 rounded-3xl bg-[#0E1218] border border-slate-800/90 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="text-xs font-black text-white">Friends Online</div>
              <button
                onClick={onOpenFriends}
                className="text-[11px] text-[#FF4600] hover:underline font-bold"
              >
                View All →
              </button>
            </div>

            <div className="flex items-center justify-between gap-1">
              {defaultOnlineFriends.map((f, idx) => (
                <div
                  key={idx}
                  onClick={onOpenFriends}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 group-hover:border-[#FF4600] flex items-center justify-center text-lg transition-colors">
                      {f.avatar}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0E1218]" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[48px]">
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* New here? Tips Card */}
          <div
            onClick={onOpenRules}
            className="p-4 rounded-3xl bg-[#0E1218] border border-slate-800/90 shadow-xl hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">New here?</h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Click Quick Play to join a public game instantly. No code, no setup — just play!
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
