import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { RoomManager } from './server/roomManager.js';
import { CardColor } from './src/types.js';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  // Socket.IO server with enhanced timeout resilience and connection recovery
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 25000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  const roomManager = new RoomManager(io);

  // Health check endpoint
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
    const getPlayerInCurrentRoom = () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return { room: null, player: null };
      const player = room.getPlayerBySocket(socket.id);
      return { room, player };
    };

    // 0. Session Resume handshake on connect / reconnect
    socket.on('session:resume', ({ accountId, roomCode, address }, callback) => {
      if (!accountId && !address) {
        if (typeof callback === 'function') callback({ success: false });
        return;
      }
      const result = roomManager.resumeSession(accountId, socket.id, roomCode, address);
      if (result.success && result.room) {
        socket.join(result.room.roomId);
        const resolvedId = result.playerId || accountId;
        const sanitized = result.room.getSanitizedStateForPlayer(resolvedId);
        // Explicitly send state directly to this freshly connected socket
        socket.emit('game:state', sanitized);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: result.room.roomCode,
            roomId: result.room.roomId,
            isSpectator: result.isSpectator,
            playerId: resolvedId,
            gameState: sanitized,
          });
        }
      } else {
        if (typeof callback === 'function') {
          callback({ success: false, roomNotFound: true });
        }
      }
    });

    // 1. Create room
    socket.on('room:create', ({ accountId, playerName, avatar, buyIn, address }, callback) => {
      try {
        const validAccountId = accountId || roomManager.getAccountIdBySocket(socket.id) || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const room = roomManager.createRoom(validAccountId, socket.id, playerName, avatar, buyIn, address);
        socket.join(room.roomId);
        const sanitized = room.getSanitizedStateForPlayer(validAccountId);
        socket.emit('game:state', sanitized);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: room.roomCode,
            roomId: room.roomId,
            accountId: validAccountId,
            gameState: sanitized,
          });
        }
        roomManager.broadcastRoomState(room);
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // 2. Join room
    socket.on('room:join', ({ roomCode, accountId, playerName, avatar, address }, callback) => {
      try {
        const validAccountId = accountId || roomManager.getAccountIdBySocket(socket.id) || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const result = roomManager.joinRoom(roomCode, validAccountId, socket.id, playerName, avatar, address);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          const resolvedPlayerId = result.playerId || validAccountId;
          const sanitized = result.room.getSanitizedStateForPlayer(resolvedPlayerId);
          socket.emit('game:state', sanitized);

          if (typeof callback === 'function') {
            callback({
              success: true,
              roomCode: result.room.roomCode,
              roomId: result.room.roomId,
              accountId: resolvedPlayerId,
              reconnected: result.reconnected,
              gameState: sanitized,
            });
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

    // 2b. Spectate room
    socket.on('room:spectate', ({ roomCode, accountId, spectatorName, avatar }, callback) => {
      try {
        const validAccountId = accountId || roomManager.getAccountIdBySocket(socket.id) || `acc_spec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const result = roomManager.joinAsSpectator(roomCode, validAccountId, socket.id, spectatorName, avatar);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          if (typeof callback === 'function') {
            callback({
              success: true,
              roomCode: result.room.roomCode,
              roomId: result.room.roomId,
              accountId: validAccountId,
            });
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
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player) {
        room.toggleReady(player.id);
      }
    });

    // 4. Add bot to room
    socket.on('room:add_bot', (callback) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player && room.hostId === player.id) {
        const success = room.addBot();
        if (typeof callback === 'function') callback({ success });
      } else if (room) {
        const success = room.addBot();
        if (typeof callback === 'function') callback({ success });
      }
    });

    // 5. Remove player / bot
    socket.on('room:remove_player', ({ playerId }) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player && room.hostId === player.id) {
        room.removePlayer(playerId);
      }
    });

    // 6. Start game (Host only)
    socket.on('game:start', (callback) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (!room || !player) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room or player not found' });
        return;
      }
      if (room.hostId !== player.id) {
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
      const { room, player } = getPlayerInCurrentRoom();
      if (!room || !player) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      const res = room.playCard(player.id, cardId, chosenColor);
      if (typeof callback === 'function') callback(res);
    });

    // 8. Draw card
    socket.on('game:draw_card', (callback) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (!room || !player) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      const res = room.drawCard(player.id);
      if (typeof callback === 'function') callback(res);
    });

    // 9. Pass turn
    socket.on('game:pass_turn', (callback) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (!room || !player) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      const res = room.passTurn(player.id);
      if (typeof callback === 'function') callback(res);
    });

    // 10. Call last card
    socket.on('game:call_last_card', () => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player) {
        room.callLastCard(player.id);
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
      const accountId = roomManager.getAccountIdBySocket(socket.id);
      const room = roomManager.getRoomBySocket(socket.id);
      if (room) {
        socket.leave(room.roomId);
      }
      if (accountId) {
        roomManager.handleLeaveRoom(accountId, socket.id);
      }
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    });

    // 12. Rematch
    socket.on('game:rematch', () => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player && room.hostId === player.id) {
        room.rematch();
      }
    });

    // Disconnect (initiates grace period without destroying active game)
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
