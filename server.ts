import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { RoomManager } from './server/roomManager.js';
import { CardColor } from './src/types.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const roomManager = new RoomManager(io);

  // Parse JSON payloads
  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      network: 'Hemi Sepolia Testnet (Chain ID 743111, Native Token ETH)',
    });
  });

  // Public live rooms endpoint for spectators
  app.get('/api/live-rooms', (req, res) => {
    res.json({
      rooms: roomManager.getPublicRooms(),
    });
  });

  // Socket.IO event handling
  io.on('connection', (socket) => {
    const leaveCurrentRoom = () => {
      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (currentRoom) {
        socket.leave(currentRoom.roomId);
        roomManager.handleLeaveRoom(socket.id);
      }
    };

    // 1. Create room
    socket.on('room:create', ({ playerName, avatar, buyIn, address }, callback) => {
      try {
        leaveCurrentRoom();
        const room = roomManager.createRoom(socket.id, playerName, avatar, buyIn, address);
        socket.join(room.roomId);
        if (typeof callback === 'function') {
          callback({ success: true, roomCode: room.roomCode, roomId: room.roomId });
        }
        roomManager.broadcastRoomState(room);
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // 2. Join room
    socket.on('room:join', ({ roomCode, playerName, avatar, address }, callback) => {
      try {
        leaveCurrentRoom();
        const result = roomManager.joinRoom(roomCode, socket.id, playerName, avatar, address);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (typeof callback === 'function') {
            callback({ success: true, roomCode: result.room.roomCode, roomId: result.room.roomId });
          }
          roomManager.broadcastRoomState(result.room);
        } else {
          if (typeof callback === 'function') {
            callback({ success: false, error: result.error });
          }
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // 2b. Spectate room
    socket.on('room:spectate', ({ roomCode, spectatorName, avatar }, callback) => {
      try {
        leaveCurrentRoom();
        const result = roomManager.joinAsSpectator(roomCode, socket.id, spectatorName, avatar);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (typeof callback === 'function') {
            callback({ success: true, roomCode: result.room.roomCode, roomId: result.room.roomId });
          }
        } else {
          if (typeof callback === 'function') {
            callback({ success: false, error: result.error });
          }
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // 2c. Get public live rooms
    socket.on('rooms:get_public', (callback) => {
      if (typeof callback === 'function') {
        callback({ rooms: roomManager.getPublicRooms() });
      }
    });

    // 3. Toggle ready state
    socket.on('room:toggle_ready', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (room) {
        room.toggleReady(socket.id);
      }
    });

    // 4. Add bot to room
    socket.on('room:add_bot', (callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (room) {
        const success = room.addBot();
        if (typeof callback === 'function') callback({ success });
      }
    });

    // 5. Remove player / bot
    socket.on('room:remove_player', ({ playerId }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (room && room.hostId === socket.id) {
        room.removePlayer(playerId);
      }
    });

    // 6. Start game (Host only)
    socket.on('game:start', (callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      if (room.hostId !== socket.id) {
        if (typeof callback === 'function') callback({ success: false, error: 'Only host can start game' });
        return;
      }
      if (!room.canStart()) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Requires 3 to 5 ready players to start' });
        }
        return;
      }
      const started = room.startGame();
      if (typeof callback === 'function') callback({ success: started });
    });

    // 7. Play card
    socket.on('game:play_card', ({ cardId, chosenColor }: { cardId: string; chosenColor?: CardColor }, callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      const res = room.playCard(socket.id, cardId, chosenColor);
      if (typeof callback === 'function') callback(res);
    });

    // 8. Draw card
    socket.on('game:draw_card', (callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      const res = room.drawCard(socket.id);
      if (typeof callback === 'function') callback(res);
    });

    // 9. Pass turn
    socket.on('game:pass_turn', (callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      const res = room.passTurn(socket.id);
      if (typeof callback === 'function') callback(res);
    });

    // 10. Call last card
    socket.on('game:call_last_card', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (room) {
        room.callLastCard(socket.id);
      }
    });

    // 11. Send emote
    socket.on('game:send_emote', ({ emoji, text }: { emoji: string; text?: string }) => {
      roomManager.sendEmote(socket.id, emoji, text);
    });

    // 11b. Send chat message
    socket.on('chat:send', ({ text }: { text: string }, callback) => {
      const result = roomManager.sendChatMessage(socket.id, text);
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // 11c. Get chat history
    socket.on('chat:history', (callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (typeof callback === 'function') {
        callback({ messages: room ? room.messages : [] });
      }
    });

    // 11d. Leave room (player or spectator)
    socket.on('room:leave', (callback) => {
      leaveCurrentRoom();
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    });

    // 12. Rematch
    socket.on('game:rematch', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (room && room.hostId === socket.id) {
        room.rematch();
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      roomManager.handleDisconnect(socket.id);
    });
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`UNO Arcade server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
