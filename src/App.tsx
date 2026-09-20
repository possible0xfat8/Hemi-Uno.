import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Card, CardColor, FloatingEmote, ChatMessage, PublicRoomSummary } from './types';
import { soundEngine } from './utils/audio';
import { CardComponent } from './components/CardComponent';
import { OpponentSeat } from './components/OpponentSeat';
import { CenterTable } from './components/CenterTable';
import { LobbyView } from './components/LobbyView';
import { WildColorModal } from './components/WildColorModal';
import { ReactionWheel } from './components/ReactionWheel';
import { VictoryModal } from './components/VictoryModal';
import { RulesModal } from './components/RulesModal';
import { CardTransferAnimation } from './components/CardTransferAnimation';
import { ChatPanel } from './components/ChatPanel';
import { WalletConnectButton } from './components/WalletConnectButton';
import {
  WalletState,
  getInjectedProvider,
  switchOrAddHemiNetwork,
  fetchEthBalance,
  isHemiChain,
  HEMI_SEPOLIA_CONFIG,
} from './utils/wallet';
import {
  getOrCreateAccountProfile,
  saveAccountProfile,
  getActiveRoomCode,
  setActiveRoomCode,
  AccountProfile,
} from './utils/account';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  LogOut,
  Flame,
  Eye,
  MessageSquare,
  Users,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('reconnecting');
  const [account, setAccount] = useState<AccountProfile>(() => getOrCreateAccountProfile());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emotes, setEmotes] = useState<FloatingEmote[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  // Web3 Wallet state
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: null,
    isConnecting: false,
    error: null,
    walletName: null,
  });

  // Sync wallet address with persistent account profile
  useEffect(() => {
    if (wallet.address && wallet.address !== account.address) {
      const updated = saveAccountProfile({ address: wallet.address });
      setAccount(updated);
    }
  }, [wallet.address, account.address]);

  // Check initial connected wallet and listen to account/chain events
  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider || !provider.request) return;

    const checkExistingConnection = async () => {
      try {
        const accounts: string[] = await provider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
          const chainIdDec = parseInt(chainIdHex, 16);
          const balFormatted = await fetchEthBalance(provider, accounts[0]);

          setWallet({
            address: accounts[0],
            chainId: chainIdDec,
            balance: balFormatted,
            isConnecting: false,
            error: null,
            walletName: 'Web3 Wallet',
          });
        }
      } catch (err) {
        console.warn('Silent wallet check notice:', err);
      }
    };

    checkExistingConnection();

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setWallet((prev) => ({ ...prev, address: null, balance: null }));
      } else {
        const balFormatted = await fetchEthBalance(provider, accounts[0]);
        setWallet((prev) => ({ ...prev, address: accounts[0], balance: balFormatted }));
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      const chainIdDec = parseInt(chainIdHex, 16);
      setWallet((prev) => {
        if (prev.address) {
          fetchEthBalance(provider, prev.address).then((bal) => {
            setWallet((p) => ({ ...p, balance: bal }));
          });
        }
        return { ...prev, chainId: chainIdDec };
      });
    };

    if (provider.on) {
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (provider.removeListener) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleConnectWallet = async () => {
    const provider = getInjectedProvider();
    if (!provider || !provider.request) {
      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        error: 'No Web3 wallet extension found. Please install MetaMask, Rabby, or OKX.',
      }));
      return;
    }

    setWallet((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No account authorized');
      }

      // Check current chain ID
      const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
      let chainIdDec = parseInt(chainIdHex, 16);

      // If not on Hemi (Sepolia 743111 or Mainnet 43111), prompt to switch to Hemi Sepolia
      if (!isHemiChain(chainIdDec)) {
        try {
          await switchOrAddHemiNetwork(provider, HEMI_SEPOLIA_CONFIG);
          const updatedChainHex: string = await provider.request({ method: 'eth_chainId' });
          chainIdDec = parseInt(updatedChainHex, 16);
        } catch (switchErr) {
          console.warn('Network switch deferred by user:', switchErr);
        }
      }

      const balFormatted = await fetchEthBalance(provider, accounts[0]);

      setWallet({
        address: accounts[0],
        chainId: chainIdDec,
        balance: balFormatted,
        isConnecting: false,
        error: null,
        walletName: 'Web3 Wallet',
      });
      soundEngine.play('card_deal');
    } catch (err: any) {
      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Failed to connect wallet',
      }));
    }
  };

  const handleDisconnectWallet = () => {
    setWallet({
      address: null,
      chainId: null,
      balance: null,
      isConnecting: false,
      error: null,
      walletName: null,
    });
  };

  const handleSwitchNetwork = async () => {
    const provider = getInjectedProvider();
    if (provider) {
      const success = await switchOrAddHemiNetwork(provider, HEMI_SEPOLIA_CONFIG);
      if (success) {
        const chainIdHex = await provider.request({ method: 'eth_chainId' });
        const chainIdDec = parseInt(chainIdHex, 16);
        let bal: string | null = null;
        if (wallet.address) {
          bal = await fetchEthBalance(provider, wallet.address);
        }
        setWallet((prev) => ({
          ...prev,
          chainId: chainIdDec,
          balance: bal || prev.balance,
        }));
      }
    }
  };

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Sync ref for active game state to guard socket listeners
  const gameStateRef = useRef<GameState | null>(null);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Public live rooms for spectator browser
  const [liveRooms, setLiveRooms] = useState<PublicRoomSummary[]>([]);

  // Wild Card selection state
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);

  // Helper to fetch live rooms
  const refreshLiveRooms = (s?: Socket | null) => {
    const activeSocket = s || socket;
    if (activeSocket) {
      activeSocket.emit('rooms:get_public', (res: { rooms?: PublicRoomSummary[] }) => {
        if (res?.rooms) {
          setLiveRooms(res.rooms);
        }
      });
    }

    fetch('/api/live-rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data?.rooms) {
          setLiveRooms(data.rooms);
        }
      })
      .catch(() => {});
  };

  // Initialize Socket.IO connection with auto-reconnect and session resume
  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 20000,
    });

    s.on('connect', () => {
      setSocketConnected(true);
      setConnectionStatus('connected');

      // Attempt to resume session with persistent accountId & dual-key resolution
      const urlParams = new URLSearchParams(window.location.search);
      const urlCode = urlParams.get('room') || urlParams.get('join');
      const activeCode = getActiveRoomCode() || (urlCode ? urlCode.toUpperCase().trim() : null);

      s.emit(
        'session:resume',
        {
          accountId: account.id,
          roomCode: activeCode,
          address: wallet.address || account.address,
        },
        (res: any) => {
          if (res?.success && res?.gameState) {
            console.log('Session resumed successfully for room:', res.roomCode);
            setGameState(res.gameState);
            setActiveRoomCode(res.roomCode);
            // Synchronize browser URL query param
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.get('room') !== res.roomCode) {
              currentUrl.searchParams.set('room', res.roomCode);
              currentUrl.searchParams.delete('join');
              window.history.replaceState({}, '', currentUrl.toString());
            }
          } else if (res?.roomNotFound && activeCode) {
            // Room no longer active on server
            setActiveRoomCode(null);
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.has('room') || currentUrl.searchParams.has('join')) {
              currentUrl.searchParams.delete('room');
              currentUrl.searchParams.delete('join');
              window.history.replaceState({}, '', currentUrl.pathname);
            }
          }
        }
      );

      refreshLiveRooms(s);
    });

    s.on('disconnect', () => {
      setSocketConnected(false);
      setConnectionStatus('reconnecting');
    });

    s.on('connect_error', () => {
      setSocketConnected(false);
      setConnectionStatus('reconnecting');
    });

    s.on('game:state', (state: GameState) => {
      setGameState(state);
      if (state?.roomCode) {
        setActiveRoomCode(state.roomCode);
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('room') !== state.roomCode) {
          currentUrl.searchParams.set('room', state.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    });

    s.on('game:sound', ({ soundName }: { soundName: string }) => {
      soundEngine.play(soundName);
    });

    s.on('game:shake', () => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
    });

    s.on('game:emote', (emote: FloatingEmote) => {
      setEmotes((prev) => [...prev, emote]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== emote.id));
      }, 2400);
    });

    // Chat events - strictly scoped to active lobby room
    s.on('chat:message', (msg: ChatMessage) => {
      const currentRoom = gameStateRef.current;
      // If client is in a lobby, ignore messages destined for other lobbies
      if (currentRoom) {
        if (msg.roomId && currentRoom.roomId && msg.roomId !== currentRoom.roomId) {
          return;
        }
        if (msg.roomCode && currentRoom.roomCode && msg.roomCode !== currentRoom.roomCode) {
          return;
        }
      }

      setChatMessages((prev) => [...prev, msg]);
      soundEngine.play('card_draw');
      setIsChatOpen((open) => {
        if (!open) {
          setUnreadChatCount((prev) => prev + 1);
        }
        return open;
      });
    });

    // Public room updates broadcast from server
    s.on('rooms:public_list', (rooms: PublicRoomSummary[]) => {
      setLiveRooms(rooms);
    });

    setSocket(s);

    // Periodic poll for live rooms every 6 seconds when not in a game
    const interval = setInterval(() => {
      refreshLiveRooms(s);
    }, 6000);

    return () => {
      clearInterval(interval);
      s.disconnect();
    };
  }, [account.id]);

  // Fetch private chat history whenever entering a new room code
  useEffect(() => {
    if (!gameState?.roomCode || !socket) return;
    socket.emit('chat:history', (res: any) => {
      if (res?.success && Array.isArray(res.messages)) {
        setChatMessages(res.messages);
      }
    });
  }, [gameState?.roomCode, socket]);

  // Handle URL search params (e.g. ?join=ABCD)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join') || params.get('room');
    if (code && socket && !gameState) {
      socket.emit(
        'room:join',
        {
          roomCode: code.toUpperCase(),
          accountId: account.id,
          playerName: account.name,
          avatar: account.avatar,
          address: wallet.address || account.address,
        },
        (res: any) => {
          if (res?.success && res?.gameState) {
            setGameState(res.gameState);
            setActiveRoomCode(res.roomCode);
          }
        }
      );
    }
  }, [socket, gameState, account.id, account.name, account.avatar, wallet.address, account.address]);

  // When opening chat, reset unread counter
  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) {
        setUnreadChatCount(0);
      }
      return !prev;
    });
  };

  // Audio mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // Explicit resume session action from UI
  const handleResumeSession = (roomCode?: string | null) => {
    if (!socket) return;
    const targetCode = roomCode || getActiveRoomCode();
    socket.emit(
      'session:resume',
      {
        accountId: account.id,
        roomCode: targetCode,
        address: wallet.address || account.address,
      },
      (res: any) => {
        if (res?.success && res?.gameState) {
          setGameState(res.gameState);
          setActiveRoomCode(res.roomCode);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('room', res.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        } else {
          setActiveRoomCode(null);
          setErrorMessage('Room is no longer active on the server.');
        }
      }
    );
  };

  // Lobby actions
  const handleCreateRoom = (playerName: string, avatar: string, buyIn: string, address?: string) => {
    if (!socket) return;
    setErrorMessage(null);
    const playerAddress = address || wallet.address || account.address || undefined;
    socket.emit(
      'room:create',
      {
        accountId: account.id,
        playerName: playerName || account.name,
        avatar: avatar || account.avatar,
        buyIn,
        address: playerAddress,
      },
      (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create room');
        } else {
          setActiveRoomCode(res.roomCode);
          if (res.gameState) {
            setGameState(res.gameState);
          }
          setChatMessages([]);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('room', res.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    );
  };

  const handleJoinRoom = (roomCode: string, playerName: string, avatar: string, address?: string) => {
    if (!socket) return;
    setErrorMessage(null);
    const playerAddress = address || wallet.address || account.address || undefined;
    socket.emit(
      'room:join',
      {
        roomCode: roomCode.toUpperCase(),
        accountId: account.id,
        playerName: playerName || account.name,
        avatar: avatar || account.avatar,
        address: playerAddress,
      },
      (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to join room');
        } else {
          setActiveRoomCode(res.roomCode);
          if (res.gameState) {
            setGameState(res.gameState);
          }
          setChatMessages([]);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('room', res.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    );
  };

  const handleSpectateRoom = (roomCode: string, spectatorName: string, avatar: string) => {
    if (!socket) return;
    setErrorMessage(null);
    socket.emit(
      'room:spectate',
      {
        roomCode: roomCode.toUpperCase(),
        accountId: account.id,
        spectatorName: spectatorName || account.name,
        avatar: avatar || account.avatar,
      },
      (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to spectate room');
        } else {
          setActiveRoomCode(res.roomCode);
          setChatMessages([]);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('room', res.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    );
  };

  const handleToggleReady = () => {
    if (!socket) return;
    socket.emit('room:toggle_ready');
  };

  const handleAddBot = () => {
    if (!socket) return;
    socket.emit('room:add_bot');
  };

  const handleRemovePlayer = (playerId: string) => {
    if (!socket) return;
    socket.emit('room:remove_player', { playerId });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('game:start', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot start game');
      }
    });
  };

  // Game actions
  const handlePlayCard = (card: Card) => {
    if (!socket || !gameState) return;
    if (gameState.currentTurnPlayerId !== myPlayerId) return;

    if (card.color === 'wild') {
      // Prompt color picker
      setPendingWildCard(card);
    } else {
      socket.emit('game:play_card', { cardId: card.id }, (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid move');
          setTimeout(() => setErrorMessage(null), 3000);
        }
      });
    }
  };

  const handleConfirmWildColor = (chosenColor: CardColor) => {
    if (!socket || !pendingWildCard) return;
    socket.emit('game:play_card', { cardId: pendingWildCard.id, chosenColor }, (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid move');
        setTimeout(() => setErrorMessage(null), 3000);
      }
      setPendingWildCard(null);
    });
  };

  const handleDrawCard = () => {
    if (!socket) return;
    socket.emit('game:draw_card', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot draw card');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    });
  };

  const handlePassTurn = () => {
    if (!socket) return;
    socket.emit('game:pass_turn', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot pass turn');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    });
  };

  const handleCallLastCard = () => {
    if (!socket) return;
    socket.emit('game:call_last_card');
  };

  const handleSendEmote = (emoji: string, text?: string) => {
    if (!socket) return;
    socket.emit('game:send_emote', { emoji, text });
  };

  const handleSendChatMessage = (text: string) => {
    if (!socket) return;
    socket.emit('chat:send', { text }, (res: any) => {
      if (!res?.success) {
        setErrorMessage(res?.error || 'Failed to send message');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    });
  };

  const handleRematch = () => {
    if (!socket) return;
    socket.emit('game:rematch');
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('room:leave');
    }
    setActiveRoomCode(null);
    setGameState(null);
    setChatMessages([]);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('room');
    currentUrl.searchParams.delete('join');
    window.history.replaceState({}, '', currentUrl.pathname);
    refreshLiveRooms();
  };

  const myPlayerId = account.id;
  const isSpectator = !!gameState?.isSpectator;
  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId);
  const isMyTurn = gameState?.currentTurnPlayerId === myPlayerId;
  const isHost = gameState?.hostId === myPlayerId;
  const topCard = gameState?.topDiscardCard || null;

  // Compute opponents list
  // If spectator, everyone seated is viewed around the table
  const opponents = isSpectator
    ? (gameState?.players || [])
    : (gameState?.players.filter((p) => p.id !== myPlayerId) || []);

  // Check if each card in hand is playable
  const isCardPlayable = (c: Card) => {
    if (!isMyTurn || isSpectator) return false;
    // Defense stacking rule: If under attack (+2 or +4), player MUST defend with +2 or +4
    if (gameState?.pendingDrawCount && gameState.pendingDrawCount > 0) {
      return c.value === 'draw2' || c.value === 'wild_draw4';
    }
    if (c.color === 'wild') return true;
    if (c.color === gameState?.activeColor) return true;
    if (topCard && c.value === topCard.value) return true;
    return false;
  };

  return (
    <div
      id="game-root"
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden ${screenShake ? 'shake-effect' : ''}`}
    >
      {/* Top Spectator Banner if in spectator mode */}
      {isSpectator && gameState && (
        <div className="w-full bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 border-b border-purple-500/40 px-4 py-2 flex items-center justify-between text-xs text-purple-200 z-30 shadow-lg">
          <div className="flex items-center gap-2 font-black tracking-wide">
            <Eye className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-white">LIVE SPECTATOR MODE</span>
            <span className="hidden sm:inline-block text-purple-300/80 font-normal">
              • Watching Room <strong className="text-amber-400 font-mono">{gameState.roomCode}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-[10px]">
              {gameState.spectatorCount || 1} Watching
            </span>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
          >
            Leave Spectate
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-black text-slate-950 shadow-md shadow-amber-500/20 text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-tight">
                HEMI UNO ARCADE
              </span>
              <span className="hidden sm:inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                PHASE 1 ENGINE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {connectionStatus === 'connected'
                  ? 'Authoritative Node Connected'
                  : connectionStatus === 'reconnecting'
                  ? 'Reconnecting...'
                  : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Header Wallet Connect Widget */}
          <WalletConnectButton
            wallet={wallet}
            onConnect={handleConnectWallet}
            onDisconnect={handleDisconnectWallet}
            onSwitchNetwork={handleSwitchNetwork}
            compact={!!gameState && gameState.status !== 'lobby'}
          />

          {gameState && gameState.status !== 'lobby' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className="text-slate-500">ROOM:</span>
              <span className="text-amber-400 font-bold">{gameState.roomCode}</span>
              {isSpectator && (
                <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 text-[10px] font-bold">
                  SPECTATING
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Game Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {gameState && !isSpectator && (
            <button
              onClick={handleLeaveRoom}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 relative">
        {/* Error Toast notification */}
        {errorMessage && (
          <div className="fixed top-20 z-50 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-2xl animate-in slide-in-from-top-4 duration-150">
            {errorMessage}
          </div>
        )}

        {/* View: Lobby Screen */}
        {(!gameState || gameState.status === 'lobby') && (
          <LobbyView
            gameState={gameState}
            myPlayerId={myPlayerId}
            wallet={wallet}
            account={account}
            onUpdateProfile={(name, avatar) => {
              const updated = saveAccountProfile({ name, avatar });
              setAccount(updated);
            }}
            connectionStatus={connectionStatus}
            onConnectWallet={handleConnectWallet}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onSpectateRoom={handleSpectateRoom}
            onToggleReady={handleToggleReady}
            onAddBot={handleAddBot}
            onRemovePlayer={handleRemovePlayer}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            liveRooms={liveRooms}
            onRefreshLiveRooms={() => refreshLiveRooms()}
            error={errorMessage}
            activeRoomCode={getActiveRoomCode()}
            onResumeSession={handleResumeSession}
          />
        )}

        {/* View: Active Game Table */}
        {gameState && gameState.status !== 'lobby' && (
          <div className="w-full max-w-5xl flex-1 flex flex-col justify-between items-center py-2 sm:py-4">
            {/* Reconnecting banner if temporarily disconnected */}
            {connectionStatus === 'reconnecting' && (
              <div className="w-full max-w-md mx-auto mb-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 shadow-lg backdrop-blur-md animate-pulse z-30">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Re-syncing match state with server...</span>
              </div>
            )}
            {/* Opponents Area around table */}
            <div className="w-full flex items-center justify-around px-2 sm:px-6 pt-1 pb-4 flex-wrap gap-2">
              {opponents.map((opp) => (
                <OpponentSeat
                  key={opp.id}
                  player={opp}
                  isCurrentTurn={gameState.currentTurnPlayerId === opp.id}
                  turnTimeRemaining={gameState.turnTimeRemaining}
                  turnTimeTotal={gameState.turnTimeTotal}
                  emotes={emotes}
                />
              ))}
            </div>

            {/* Center Felt Table */}
            <CenterTable
              topDiscardCard={gameState.topDiscardCard}
              activeColor={gameState.activeColor}
              drawPileCount={gameState.drawPileCount}
              turnDirection={gameState.turnDirection}
              isMyTurn={isMyTurn}
              canDraw={!gameState.drawPendingForPlayer && !isSpectator}
              onDrawCard={handleDrawCard}
              bannerAlert={gameState.bannerAlert}
              lastActionMessage={gameState.lastActionMessage}
              escrowPot={gameState.escrowPot}
              pendingDrawCount={gameState.pendingDrawCount}
            />

            {/* If Spectator: Show Spectator Arena Bottom Bar */}
            {isSpectator ? (
              <div className="w-full max-w-2xl flex flex-col items-center gap-3 p-4 sm:p-5 rounded-3xl bg-slate-900/90 border-2 border-purple-500/30 backdrop-blur-md shadow-2xl mt-4 z-20 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Eye className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Spectator Grandstand</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                          {gameState.spectatorCount || 1} Watching
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Live match view • Cheering and reactions enabled
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ReactionWheel onSendEmote={handleSendEmote} />
                    <button
                      onClick={handleToggleChat}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Live Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Player's Turn Notification & Action Bar */
              <div className="w-full flex flex-col items-center mt-2 sm:mt-4 z-20">
                {/* Turn indicator ribbon */}
                <div className="mb-2 flex items-center gap-3">
                  {isMyTurn ? (
                    gameState.pendingDrawCount && gameState.pendingDrawCount > 0 ? (
                      <div className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-rose-600/50 animate-bounce flex items-center gap-2 border-2 border-white/60">
                        <Flame
                          className="w-4 h-4 fill-white animate-spin"
                          style={{ animationDuration: '3s' }}
                        />
                        <span>
                          UNDER ATTACK! PICK +{gameState.pendingDrawCount} OR DEFEND WITH +2/+4! (
                          {gameState.turnTimeRemaining}s)
                        </span>
                      </div>
                    ) : (
                      <div className="px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg shadow-amber-500/30 animate-pulse flex items-center gap-2">
                        <Flame className="w-4 h-4 fill-current" />
                        <span>YOUR TURN! ({gameState.turnTimeRemaining}s)</span>
                      </div>
                    )
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs">
                      Waiting for{' '}
                      {gameState.players.find((p) => p.id === gameState.currentTurnPlayerId)?.name ||
                        'opponent'}
                      ...
                    </div>
                  )}
                </div>

                {/* Player's Hand of Cards */}
                <div
                  id="player-hand-container"
                  className="relative w-full max-w-3xl flex justify-center items-end min-h-[140px] sm:min-h-[160px] px-4 pb-2"
                >
                  <div className="flex justify-center -space-x-8 sm:-space-x-10 hover:-space-x-4 transition-all duration-300">
                    {myPlayer?.hand?.map((card, idx) => {
                      const playable = isCardPlayable(card);
                      const total = myPlayer.hand?.length || 1;
                      const rot = (idx - (total - 1) / 2) * 3;

                      return (
                        <div
                          key={card.id}
                          className="transition-transform duration-200"
                          style={{
                            transformOrigin: 'bottom center',
                          }}
                        >
                          <CardComponent
                            card={card}
                            isPlayable={playable}
                            size="md"
                            rotation={rot}
                            onClick={() => handlePlayCard(card)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Quick Controls Bar */}
                <div className="w-full max-w-xl flex items-center justify-between gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md mt-2">
                  <div className="flex items-center gap-2">
                    {/* Reaction Emote Wheel */}
                    <ReactionWheel onSendEmote={handleSendEmote} />

                    {/* Last Card / UNO Callout */}
                    <button
                      onClick={handleCallLastCard}
                      className={`
                        px-3 py-1.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-md
                        ${myPlayer && myPlayer.cardCount <= 2
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-bounce shadow-rose-600/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}
                      `}
                      title="Call Last Card! / UNO!"
                    >
                      <span>🚨</span>
                      <span>LAST CARD!</span>
                    </button>
                  </div>

                  {/* Hand Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isMyTurn && gameState.drawPendingForPlayer && (
                      <button
                        onClick={handlePassTurn}
                        className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-400 font-black text-xs uppercase tracking-wider transition-colors animate-pulse"
                      >
                        Pass Turn
                      </button>
                    )}

                    {isMyTurn && !gameState.drawPendingForPlayer && (
                      <button
                        onClick={handleDrawCard}
                        className={`
                          px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md
                          ${gameState.pendingDrawCount && gameState.pendingDrawCount > 0
                            ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'}
                        `}
                      >
                        {gameState.pendingDrawCount && gameState.pendingDrawCount > 0
                          ? `Pick +${gameState.pendingDrawCount} Cards`
                          : 'Draw 1 Card'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Chat Drawer & Toggle */}
      {gameState && (
        <ChatPanel
          isOpen={isChatOpen}
          onToggle={handleToggleChat}
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          myPlayerId={myPlayerId}
          isSpectator={isSpectator}
          unreadCount={unreadChatCount}
          roomCode={gameState.roomCode}
          roomId={gameState.roomId}
        />
      )}

      {/* Real-time Staggered Card Draw Motion Animation */}
      <CardTransferAnimation socket={socket} myPlayerId={myPlayerId} />

      {/* Modals */}
      <WildColorModal
        isOpen={!!pendingWildCard}
        cardLabel={pendingWildCard?.label}
        onSelectColor={handleConfirmWildColor}
        onCancel={() => setPendingWildCard(null)}
      />

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {gameState && gameState.status === 'game_over' && (
        <VictoryModal
          gameState={gameState}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onRematch={handleRematch}
        />
      )}
    </div>
  );
}
