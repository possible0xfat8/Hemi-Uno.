import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './gameEngine.js';
import { CardColor, CardsDrawnEvent, CardPlayedEvent, ChatMessage, PublicRoomSummary, Player } from '../src/types.js';
import { serverDb } from './database.js';

export class RoomManager {
  private io: SocketIOServer;
  private rooms: Map<string, GameRoom> = new Map(); // roomId -> GameRoom
  private codeToRoomId: Map<string, string> = new Map(); // code -> roomId
  private socketToRoomId: Map<string, string> = new Map(); // socketId -> roomId
  private socketToAccountId: Map<string, string> = new Map(); // socketId -> accountId
  private accountToRoomId: Map<string, string> = new Map(); // accountId -> roomId
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map(); // accountId -> Timeout

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.codeToRoomId.has(code) ? this.generateRoomCode() : code;
  }

  private clearDisconnectTimer(accountId: string): void {
    const timer = this.disconnectTimers.get(accountId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(accountId);
    }
  }

  public createRoom(
    accountId: string,
    hostSocketId: string,
    playerName: string,
    avatar: string,
    buyIn: string = '0.005',
    address?: string
  ): GameRoom {
    this.clearDisconnectTimer(accountId);

    // If account was in another room, leave it
    const existingRoomId = this.accountToRoomId.get(accountId);
    if (existingRoomId) {
      this.handleLeaveRoom(accountId, hostSocketId);
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roomCode = this.generateRoomCode();

    const room = new GameRoom(roomId, roomCode, accountId);
    room.buyInAmount = buyIn || '0.005';

    room.setCallbacks(
      () => this.broadcastRoomState(room),
      (sound: string) => this.io.to(room.roomId).emit('game:sound', { soundName: sound }),
      (intensity: number) => this.io.to(room.roomId).emit('game:shake', { intensity }),
      (data: CardsDrawnEvent) => this.io.to(room.roomId).emit('game:cards_drawn', data),
      (data: CardPlayedEvent) => this.io.to(room.roomId).emit('game:card_played', data),
      (msg: ChatMessage) => this.io.to(room.roomId).emit('chat:message', msg),
      (winner: Player, players: Player[], pot: string, cardsPlayedMap: Record<string, number>) => {
        serverDb.recordGameFinished(
          winner.id,
          players.filter(p => !p.isBot).map(p => p.id),
          pot,
          cardsPlayedMap
        );
      }
    );

    room.addPlayer({
      id: accountId,
      socketId: hostSocketId,
      name: playerName || 'Player 1',
      avatar: avatar || '🦊',
      isHost: true,
      isConnected: true,
      address: address || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    });

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);
    this.socketToRoomId.set(hostSocketId, roomId);
    this.socketToAccountId.set(hostSocketId, accountId);
    this.accountToRoomId.set(accountId, roomId);

    // Persist user and room state
    serverDb.getOrCreateUser(accountId, { name: playerName, avatar, address });
    serverDb.setUserPresence(accountId, 'in_game', roomCode);
    serverDb.saveRecentRoom(roomCode, {
      hostName: playerName || 'Player 1',
      hostAvatar: avatar || '🦊',
      buyIn: room.buyInAmount,
      status: 'lobby',
    });

    this.io.emit('rooms:public_list', this.getPublicRooms());
    return room;
  }

  public getRoomByCode(code: string): GameRoom | null {
    if (!code) return null;
    const roomId = this.codeToRoomId.get(code.toUpperCase().trim());
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public getRoomBySocket(socketId: string): GameRoom | null {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public getRoomByAccountId(accountId: string): GameRoom | null {
    const roomId = this.accountToRoomId.get(accountId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public getAccountIdBySocket(socketId: string): string | null {
    return this.socketToAccountId.get(socketId) || null;
  }

  public joinRoom(
    roomCode: string,
    accountId: string,
    socketId: string,
    playerName: string,
    avatar: string,
    address?: string
  ): { success: boolean; room?: GameRoom; error?: string; reconnected?: boolean; playerId?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      return { success: false, error: `Room "${roomCode.toUpperCase()}" not found` };
    }

    this.clearDisconnectTimer(accountId);

    // Check if player is already seated in this room (by accountId or wallet address)
    let existingPlayer = room.players.find(p => p.id === accountId);
    if (!existingPlayer && address) {
      existingPlayer = room.players.find(p => p.address && p.address.toLowerCase() === address.toLowerCase());
    }

    if (existingPlayer) {
      this.clearDisconnectTimer(existingPlayer.id);
      existingPlayer.isConnected = true;
      existingPlayer.socketId = socketId;
      if (playerName) existingPlayer.name = playerName;
      if (avatar) existingPlayer.avatar = avatar;
      if (address) existingPlayer.address = address;

      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, existingPlayer.id);
      this.accountToRoomId.set(existingPlayer.id, room.roomId);
      if (accountId !== existingPlayer.id) {
        this.accountToRoomId.set(accountId, room.roomId);
      }

      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '⚡',
        text: `${existingPlayer.name} reconnected.`,
        isSystem: true,
      });

      this.broadcastRoomState(room);
      return { success: true, room, reconnected: true, playerId: existingPlayer.id };
    }

    // Check if returning spectator
    const existingSpectator = room.spectators.get(accountId);
    if (existingSpectator) {
      existingSpectator.socketId = socketId;
      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, accountId);
      this.accountToRoomId.set(accountId, room.roomId);
      this.broadcastRoomState(room);
      return { success: true, room, reconnected: true, playerId: accountId };
    }

    // New player joining
    if (room.status !== 'lobby') {
      return { success: false, error: 'Game is already in progress in this room' };
    }

    if (room.players.length >= 5) {
      return { success: false, error: 'Room is full (max 5 players)' };
    }

    const added = room.addPlayer({
      id: accountId,
      socketId,
      name: playerName || `Player ${room.players.length + 1}`,
      avatar: avatar || '🦁',
      isHost: false,
      isConnected: true,
      address: address || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    });

    if (!added) {
      return { success: false, error: 'Could not join room' };
    }

    this.socketToRoomId.set(socketId, room.roomId);
    this.socketToAccountId.set(socketId, accountId);
    this.accountToRoomId.set(accountId, room.roomId);

    room.addChatMessage({
      senderId: 'system',
      senderName: 'SYSTEM',
      senderAvatar: '👋',
      text: `${added.name} joined the room.`,
      isSystem: true,
    });

    serverDb.getOrCreateUser(accountId, { name: playerName, avatar, address });
    serverDb.setUserPresence(accountId, 'in_game', room.roomCode);

    this.io.emit('rooms:public_list', this.getPublicRooms());
    this.broadcastRoomState(room);
    return { success: true, room, playerId: accountId };
  }

  public quickJoin(
    accountId: string,
    socketId: string,
    playerName: string,
    avatar: string,
    address?: string
  ): { success: boolean; room: GameRoom; isHost: boolean; playerId: string } {
    this.clearDisconnectTimer(accountId);

    // If already in a room, resume or return it
    const existingRoomId = this.accountToRoomId.get(accountId);
    if (existingRoomId) {
      const existing = this.rooms.get(existingRoomId);
      if (existing) {
        const resumeRes = this.resumeSession(accountId, socketId, existing.roomCode, address);
        if (resumeRes.success && resumeRes.room) {
          return {
            success: true,
            room: resumeRes.room,
            isHost: resumeRes.room.hostId === accountId,
            playerId: resumeRes.playerId || accountId,
          };
        }
      }
    }

    // Find first open public table waiting for players in lobby
    let openRoom: GameRoom | null = null;
    for (const r of this.rooms.values()) {
      if (r.status === 'lobby' && r.players.length < 4) {
        openRoom = r;
        break;
      }
    }

    if (openRoom) {
      const joinRes = this.joinRoom(openRoom.roomCode, accountId, socketId, playerName, avatar, address);
      if (joinRes.success && joinRes.room) {
        return {
          success: true,
          room: joinRes.room,
          isHost: joinRes.room.hostId === accountId,
          playerId: joinRes.playerId || accountId,
        };
      }
    }

    // Otherwise create a fresh table instantly
    const newRoom = this.createRoom(accountId, socketId, playerName, avatar, '0.000', address);
    return { success: true, room: newRoom, isHost: true, playerId: accountId };
  }

  public resumeSession(
    accountId: string,
    socketId: string,
    roomCode?: string,
    address?: string
  ): { success: boolean; room?: GameRoom; isSpectator?: boolean; playerId?: string; roomCode?: string } {
    this.clearDisconnectTimer(accountId);

    let room: GameRoom | null = null;

    if (roomCode) {
      room = this.getRoomByCode(roomCode);
    }

    if (!room) {
      const roomId = this.accountToRoomId.get(accountId);
      if (roomId) {
        room = this.rooms.get(roomId) || null;
      }
    }

    // If still not found, search through all active rooms for player by accountId or wallet address
    if (!room) {
      for (const r of this.rooms.values()) {
        const foundPlayer = r.players.find(
          p => p.id === accountId || (address && p.address && p.address.toLowerCase() === address.toLowerCase())
        );
        if (foundPlayer) {
          room = r;
          break;
        }
        if (r.spectators.has(accountId)) {
          room = r;
          break;
        }
      }
    }

    if (!room) {
      this.accountToRoomId.delete(accountId);
      return { success: false };
    }

    // Check if player in this room
    let player = room.players.find(p => p.id === accountId);
    if (!player && address) {
      player = room.players.find(p => p.address && p.address.toLowerCase() === address.toLowerCase());
    }

    if (player) {
      this.clearDisconnectTimer(player.id);
      player.isConnected = true;
      player.socketId = socketId;

      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, player.id);
      this.accountToRoomId.set(player.id, room.roomId);
      if (accountId !== player.id) {
        this.accountToRoomId.set(accountId, room.roomId);
      }

      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '⚡',
        text: `${player.name} reconnected.`,
        isSystem: true,
      });

      this.broadcastRoomState(room);
      return { success: true, room, isSpectator: false, playerId: player.id, roomCode: room.roomCode };
    }

    // Check if spectator
    const spectator = room.spectators.get(accountId);
    if (spectator) {
      this.clearDisconnectTimer(accountId);
      spectator.socketId = socketId;
      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, accountId);
      this.accountToRoomId.set(accountId, room.roomId);

      this.broadcastRoomState(room);
      return { success: true, room, isSpectator: true, playerId: accountId, roomCode: room.roomCode };
    }

    this.accountToRoomId.delete(accountId);
    return { success: false };
  }

  public joinAsSpectator(
    roomCode: string,
    accountId: string,
    socketId: string,
    spectatorName: string,
    avatar: string
  ): { success: boolean; room?: GameRoom; error?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      return { success: false, error: `Room "${roomCode.toUpperCase()}" not found` };
    }

    this.clearDisconnectTimer(accountId);

    room.addSpectator(accountId, socketId, spectatorName || 'Spectator', avatar || '👁️');
    this.socketToRoomId.set(socketId, room.roomId);
    this.socketToAccountId.set(socketId, accountId);
    this.accountToRoomId.set(accountId, room.roomId);

    this.broadcastRoomState(room);
    return { success: true, room };
  }

  public handleLeaveRoom(accountId: string, socketId?: string): void {
    this.clearDisconnectTimer(accountId);

    const roomId = this.accountToRoomId.get(accountId);
    this.accountToRoomId.delete(accountId);
    serverDb.setUserPresence(accountId, 'online', null);

    if (socketId) {
      this.socketToRoomId.delete(socketId);
      this.socketToAccountId.delete(socketId);
    }

    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.spectators.has(accountId)) {
      room.removeSpectator(accountId);
      this.broadcastRoomState(room);
      return;
    }

    const player = room.players.find(p => p.id === accountId);
    if (player) {
      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '🚪',
        text: `${player.name} left the room.`,
        isSystem: true,
      });
      room.removePlayer(accountId);

      const humanCount = room.players.filter(pl => !pl.isBot).length;
      if (humanCount === 0) {
        this.destroyRoom(room.roomId);
      } else {
        this.broadcastRoomState(room);
      }
    }
  }

  public handleDisconnect(socketId: string): void {
    const accountId = this.socketToAccountId.get(socketId);
    const roomId = this.socketToRoomId.get(socketId);

    // Clean up socket lookups
    this.socketToAccountId.delete(socketId);
    this.socketToRoomId.delete(socketId);

    if (!accountId || !roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Check if spectator
    if (room.spectators.has(accountId)) {
      this.clearDisconnectTimer(accountId);
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(accountId);
        if (room.spectators.has(accountId)) {
          room.removeSpectator(accountId);
          this.accountToRoomId.delete(accountId);
          this.broadcastRoomState(room);
        }
      }, 120000);
      this.disconnectTimers.set(accountId, timer);
      return;
    }

    const player = room.players.find(p => p.id === accountId);
    if (!player) return;

    // Mark player temporarily disconnected
    player.isConnected = false;
    this.broadcastRoomState(room);

    // Generous grace period (120 seconds) for network reconnects, sleep, tab switch
    this.clearDisconnectTimer(accountId);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(accountId);

      // Verify if still disconnected
      const p = room.players.find(pl => pl.id === accountId);
      if (p && !p.isConnected) {
        this.accountToRoomId.delete(accountId);
        serverDb.setUserPresence(accountId, 'offline', null);
        room.removePlayer(accountId);

        const humanCount = room.players.filter(pl => !pl.isBot).length;
        if (humanCount === 0) {
          this.destroyRoom(room.roomId);
        } else {
          this.broadcastRoomState(room);
        }
      }
    }, 120000);

    this.disconnectTimers.set(accountId, timer);
  }

  public destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.codeToRoomId.delete(room.roomCode);
    this.rooms.delete(roomId);
    this.io.emit('rooms:public_list', this.getPublicRooms());
  }

  public broadcastRoomState(room: GameRoom): void {
    for (const player of room.players) {
      if (!player.isBot && player.isConnected && player.socketId) {
        const sanitized = room.getSanitizedStateForPlayer(player.id);
        this.io.to(player.socketId).emit('game:state', sanitized);
      }
    }
    for (const [spectatorId, spec] of room.spectators) {
      if (spec.socketId) {
        const sanitized = room.getSanitizedStateForPlayer(spectatorId);
        this.io.to(spec.socketId).emit('game:state', sanitized);
      }
    }
    this.io.emit('rooms:public_list', this.getPublicRooms());
  }

  public sendChatMessage(
    socketId: string,
    text: string
  ): { success: boolean; message?: ChatMessage; error?: string } {
    const room = this.getRoomBySocket(socketId);
    if (!room) return { success: false, error: 'Room not found' };

    const cleanText = (text || '').trim();
    if (!cleanText) return { success: false, error: 'Message cannot be empty' };
    if (cleanText.length > 140) return { success: false, error: 'Message too long (max 140 chars)' };

    const player = room.players.find(p => p.socketId === socketId);
    const spectator = Array.from(room.spectators.values()).find(s => s.socketId === socketId);

    if (!player && !spectator) {
      return { success: false, error: 'Sender not part of this room' };
    }

    const isSpectator = !player && !!spectator;
    const senderId = player ? player.id : (spectator?.id || 'spectator');
    const senderName = player ? player.name : (spectator?.name || 'Spectator');
    const senderAvatar = player ? player.avatar : (spectator?.avatar || '👁️');

    const chatMsg = room.addChatMessage({
      senderId,
      senderName,
      senderAvatar,
      text: cleanText,
      isSpectator,
    });

    return { success: true, message: chatMsg };
  }

  public sendEmote(socketId: string, emoji: string, text?: string): void {
    const room = this.getRoomBySocket(socketId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socketId);
    const spectator = Array.from(room.spectators.values()).find(s => s.socketId === socketId);
    if (!player && !spectator) return;

    const senderId = player ? player.id : spectator!.id;

    const emotePayload = {
      id: `em_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: senderId,
      emoji,
      text,
      timestamp: Date.now(),
    };

    this.io.to(room.roomId).emit('game:emote', emotePayload);
    this.io.to(room.roomId).emit('game:sound', { soundName: 'emote' });
  }

  public getPublicRooms(): PublicRoomSummary[] {
    return Array.from(this.rooms.values()).map(room => ({
      roomId: room.roomId,
      roomCode: room.roomCode,
      status: room.status,
      playerCount: room.players.length,
      maxPlayers: 5,
      spectatorCount: room.spectators.size,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
      })),
      activeColor: room.activeColor,
      topDiscardCard: room.getTopDiscard(),
      escrowPot: {
        amount: (room.players.length * parseFloat(room.buyInAmount)).toFixed(3),
        currency: room.currency,
        buyInAmount: room.buyInAmount,
      },
    }));
  }
}
