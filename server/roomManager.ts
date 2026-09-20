import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './gameEngine.js';
import { CardColor, CardsDrawnEvent, CardPlayedEvent, ChatMessage, PublicRoomSummary } from '../src/types.js';

export class RoomManager {
  private io: SocketIOServer;
  private rooms: Map<string, GameRoom> = new Map(); // roomId -> GameRoom
  private codeToRoomId: Map<string, string> = new Map(); // code -> roomId
  private socketToRoomId: Map<string, string> = new Map(); // socketId -> roomId
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

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

  public createRoom(
    hostSocketId: string,
    playerName: string,
    avatar: string,
    buyIn: string = '0.01',
    address?: string
  ): GameRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roomCode = this.generateRoomCode();

    const room = new GameRoom(roomId, roomCode, hostSocketId);
    room.buyInAmount = buyIn || '0.01';

    room.setCallbacks(
      () => this.broadcastRoomState(room),
      (sound: string) => this.io.to(room.roomId).emit('game:sound', { soundName: sound }),
      (intensity: number) => this.io.to(room.roomId).emit('game:shake', { intensity }),
      (data: CardsDrawnEvent) => this.io.to(room.roomId).emit('game:cards_drawn', data),
      (data: CardPlayedEvent) => this.io.to(room.roomId).emit('game:card_played', data),
      (msg: ChatMessage) => this.io.to(room.roomId).emit('chat:message', msg)
    );

    room.addPlayer({
      id: hostSocketId,
      name: playerName || 'Player 1',
      avatar: avatar || '🦊',
      isHost: true,
      isConnected: true,
      address: address || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    });

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);
    this.socketToRoomId.set(hostSocketId, roomId);

    this.io.emit('rooms:public_list', this.getPublicRooms());
    return room;
  }

  public getRoomByCode(code: string): GameRoom | null {
    const roomId = this.codeToRoomId.get(code.toUpperCase().trim());
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public getRoomBySocket(socketId: string): GameRoom | null {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public joinRoom(
    roomCode: string,
    socketId: string,
    playerName: string,
    avatar: string,
    address?: string
  ): { success: boolean; room?: GameRoom; error?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      return { success: false, error: `Room "${roomCode.toUpperCase()}" not found` };
    }

    if (room.status !== 'lobby') {
      return { success: false, error: 'Game is already in progress in this room' };
    }

    if (room.players.length >= 5) {
      return { success: false, error: 'Room is full (max 5 players)' };
    }

    const added = room.addPlayer({
      id: socketId,
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
    this.io.emit('rooms:public_list', this.getPublicRooms());
    return { success: true, room };
  }

  public joinAsSpectator(
    roomCode: string,
    socketId: string,
    spectatorName: string,
    avatar: string
  ): { success: boolean; room?: GameRoom; error?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      return { success: false, error: `Room "${roomCode.toUpperCase()}" not found` };
    }

    room.addSpectator(socketId, spectatorName || 'Spectator', avatar || '👁️');
    this.socketToRoomId.set(socketId, room.roomId);
    this.broadcastRoomState(room);
    return { success: true, room };
  }

  public handleLeaveRoom(socketId: string): void {
    const timer = this.disconnectTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(socketId);
    }

    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketToRoomId.delete(socketId);
      return;
    }

    this.socketToRoomId.delete(socketId);

    if (room.spectators.has(socketId)) {
      room.removeSpectator(socketId);
      this.broadcastRoomState(room);
      return;
    }

    const player = room.players.find(p => p.id === socketId);
    if (player) {
      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '🚪',
        text: `${player.name} left the lobby.`,
        isSystem: true,
      });
      room.removePlayer(socketId);
      if (room.players.filter(pl => !pl.isBot).length === 0) {
        this.destroyRoom(room.roomId);
      } else {
        this.broadcastRoomState(room);
      }
    }
  }

  public handleDisconnect(socketId: string): void {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Check if spectator
    if (room.spectators.has(socketId)) {
      room.removeSpectator(socketId);
      this.socketToRoomId.delete(socketId);
      this.broadcastRoomState(room);
      return;
    }

    const player = room.players.find(p => p.id === socketId);
    if (!player) return;

    player.isConnected = false;
    room.emitUpdate();

    // Start 30-second grace timer to cleanup if not reconnected
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(socketId);
      this.socketToRoomId.delete(socketId);

      // Check if still disconnected
      const p = room.players.find(pl => pl.id === socketId);
      if (p && !p.isConnected) {
        room.removePlayer(socketId);
        if (room.players.filter(pl => !pl.isBot).length === 0) {
          // No human players left in room, destroy room
          this.destroyRoom(room.roomId);
        }
      }
    }, 30000);

    this.disconnectTimers.set(socketId, timer);
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
      if (!player.isBot && player.isConnected) {
        const sanitized = room.getSanitizedStateForPlayer(player.id);
        this.io.to(player.id).emit('game:state', sanitized);
      }
    }
    for (const [spectatorId] of room.spectators) {
      const sanitized = room.getSanitizedStateForPlayer(spectatorId);
      this.io.to(spectatorId).emit('game:state', sanitized);
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

    const player = room.players.find(p => p.id === socketId);
    const spectator = room.spectators.get(socketId);

    if (!player && !spectator) {
      return { success: false, error: 'Sender not part of this room' };
    }

    const isSpectator = !player && !!spectator;
    const senderName = player ? player.name : (spectator?.name || 'Spectator');
    const senderAvatar = player ? player.avatar : (spectator?.avatar || '👁️');

    const chatMsg = room.addChatMessage({
      senderId: socketId,
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

    const player = room.players.find(p => p.id === socketId);
    const spectator = room.spectators.get(socketId);
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
