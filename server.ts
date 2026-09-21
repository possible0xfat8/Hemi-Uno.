import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { RoomManager } from './server/roomManager.js';
import { serverDb } from './server/database.js';
import { CardColor } from './src/types.js';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  // JSON body parser for REST APIs
  app.use(express.json());

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

  // Global platform live statistics endpoint
  app.get('/api/stats', (req, res) => {
    const publicRooms = roomManager.getPublicRooms();
    const openTables = publicRooms.length;
    // Calculate players currently online from server database and active rooms
    const connectedSockets = io.engine.clientsCount || 1;
    const dbUsers = serverDb.getAllUsers();
    const activeInRooms = publicRooms.reduce((acc, r) => acc + r.playerCount, 0);
    const playersOnline = Math.max(activeInRooms + connectedSockets, 12);
    
    // Calculate total games played
    let gamesPlayed = 8421;
    for (const u of dbUsers) {
      if (u.stats?.matchesPlayed) {
        gamesPlayed += u.stats.matchesPlayed;
      }
    }

    res.json({
      openTables,
      playersOnline,
      gamesPlayed,
    });
  });

  // REST: User Profile endpoints
  app.get('/api/profile/by-address/:address', (req, res) => {
    const address = req.params.address;
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    const user = serverDb.getUserByAddress(address) || serverDb.linkOrGetUserByAddress(address);
    res.json(user);
  });

  app.get('/api/profile/:id', (req, res) => {
    const user = serverDb.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(user);
  });

  app.post('/api/profile', (req, res) => {
    const { id, accountId, name, avatar, bio, address } = req.body;
    const targetId = id || accountId;
    if (!targetId && !address) {
      return res.status(400).json({ error: 'User id or wallet address is required' });
    }
    const updated = serverDb.updateUserProfile(targetId || '', { name, avatar, bio, address });
    // Broadcast real-time update to all tabs/sockets associated with this user ID and wallet
    io.to(`user:${updated.id}`).emit('profile:updated', updated);
    if (updated.address) {
      io.to(`wallet:${updated.address.toLowerCase()}`).emit('profile:updated', updated);
    }
    res.json(updated);
  });

  // REST: Friends endpoints
  app.get('/api/friends/:id', (req, res) => {
    const friends = serverDb.getEnrichedFriends(req.params.id);
    const user = serverDb.getUser(req.params.id);
    res.json({
      friends,
      requestsReceived: user ? user.friendRequestsReceived.map(id => serverDb.getUser(id)).filter(Boolean) : [],
      requestsSent: user ? user.friendRequestsSent.map(id => serverDb.getUser(id)).filter(Boolean) : [],
    });
  });

  app.post('/api/friends/request', (req, res) => {
    const { userId, targetQuery } = req.body;
    if (!userId || !targetQuery) {
      return res.status(400).json({ error: 'userId and targetQuery required' });
    }
    const result = serverDb.sendFriendRequest(userId, targetQuery);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    if (result.friend) {
      io.to(`user:${result.friend.id}`).emit('friends:received_request', {
        from: serverDb.getUser(userId),
      });
    }
    res.json({ success: true, friend: result.friend });
  });

  app.post('/api/friends/accept', (req, res) => {
    const { userId, requesterId } = req.body;
    if (!userId || !requesterId) {
      return res.status(400).json({ error: 'userId and requesterId required' });
    }
    const result = serverDb.acceptFriendRequest(userId, requesterId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    io.to(`user:${requesterId}`).emit('friends:request_accepted', {
      by: serverDb.getUser(userId),
    });
    res.json({ success: true });
  });

  app.post('/api/friends/decline', (req, res) => {
    const { userId, requesterId } = req.body;
    const result = serverDb.declineFriendRequest(userId, requesterId);
    res.json(result);
  });

  app.post('/api/friends/remove', (req, res) => {
    const { userId, friendId } = req.body;
    const result = serverDb.removeFriend(userId, friendId);
    res.json(result);
  });

  app.get('/api/players/discover', (req, res) => {
    const userId = (req.query.userId as string) || '';
    const suggested = serverDb.getSuggestedPlayers(userId);
    res.json({ players: suggested });
  });

  app.get('/api/leaderboard', (req, res) => {
    const leaderboard = serverDb.getLeaderboard(15);
    res.json({ leaderboard });
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
      // Ensure user profile in database
      if (accountId) {
        serverDb.getOrCreateUser(accountId, { address });
        socket.join(`user:${accountId}`);
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

    // 0b. Quick Join (1-Click Instant Match finding or auto-creating)
    socket.on('room:quick_join', ({ accountId, playerName, avatar, address }, callback) => {
      const cleanAddress = address && typeof address === 'string' && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
      if (!cleanAddress) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Please connect your Web3 wallet to play Quick Match' });
        }
        return;
      }

      const dbUser = serverDb.getUserByAddress(cleanAddress) || serverDb.linkOrGetUserByAddress(cleanAddress, accountId, { name: playerName, avatar });
      const validAccountId = dbUser.id;
      const resolvedName = dbUser.name || playerName || 'Player';
      const resolvedAvatar = dbUser.avatar || avatar || '🦊';

      socket.join(`user:${validAccountId}`);
      socket.join(`wallet:${cleanAddress}`);

      const result = roomManager.quickJoin(validAccountId, socket.id, resolvedName, resolvedAvatar, cleanAddress);
      if (result.success && result.room) {
        socket.join(result.room.roomId);
        const resolvedId = result.playerId || validAccountId;
        const sanitized = result.room.getSanitizedStateForPlayer(resolvedId);
        socket.emit('game:state', sanitized);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: result.room.roomCode,
            roomId: result.room.roomId,
            accountId: resolvedId,
            isHost: result.isHost,
            gameState: sanitized,
          });
        }
        roomManager.broadcastRoomState(result.room);
      } else {
        if (typeof callback === 'function') {
          callback({ success: false, error: result.error || 'Could not find or create a match' });
        }
      }
    });

    // 0c. Profile Sync (keeps client and server profiles synchronized across tabs and wallet addresses)
    socket.on('profile:sync', (data: any, callback?: any) => {
      const targetId = data?.accountId || data?.id;
      const rawAddress = data?.address && typeof data.address === 'string' && data.address.trim().startsWith('0x')
        ? data.address.trim().toLowerCase()
        : undefined;

      let user: any = null;
      if (rawAddress) {
        socket.join(`wallet:${rawAddress}`);
        // If it's just a sync on startup/tab switch, get the authoritative record without overwriting name!
        if (data?.isExplicitUpdate && (data?.name || data?.avatar || data?.bio !== undefined)) {
          user = serverDb.updateUserProfile(targetId || `wallet_${rawAddress}`, {
            name: data?.name,
            avatar: data?.avatar,
            bio: data?.bio,
            address: rawAddress,
          });
        } else {
          user = serverDb.getUserByAddress(rawAddress) || serverDb.linkOrGetUserByAddress(rawAddress, targetId, {
            name: data?.name,
            avatar: data?.avatar,
            bio: data?.bio,
          });
        }
      } else if (targetId) {
        if (data?.isExplicitUpdate && (data?.name || data?.avatar || data?.bio !== undefined)) {
          user = serverDb.updateUserProfile(targetId, {
            name: data?.name,
            avatar: data?.avatar,
            bio: data?.bio,
          });
        } else {
          user = serverDb.getOrCreateUser(targetId, {
            name: data?.name,
            avatar: data?.avatar,
            bio: data?.bio,
          });
        }
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'No identifier provided' });
        return;
      }

      if (user) {
        socket.join(`user:${user.id}`);
        if (user.address) {
          socket.join(`wallet:${user.address.toLowerCase()}`);
        }

        if (data?.isExplicitUpdate) {
          // Broadcast to other tabs/sockets connected to this user/wallet
          socket.to(`user:${user.id}`).emit('profile:updated', user);
          if (user.address) {
            socket.to(`wallet:${user.address.toLowerCase()}`).emit('profile:updated', user);
          }
        }

        // Send authoritative profile back to the requesting socket
        socket.emit('profile:synced', user);
        if (typeof callback === 'function') {
          callback({ success: true, profile: user });
        }
      }
    });

    // 0d. Live Friends Query & Management via Socket
    socket.on('friends:list', ({ accountId }, callback) => {
      if (!accountId) {
        if (typeof callback === 'function') callback({ friends: [] });
        return;
      }
      const friends = serverDb.getEnrichedFriends(accountId);
      const user = serverDb.getUser(accountId);
      if (typeof callback === 'function') {
        callback({
          friends,
          requestsReceived: user ? user.friendRequestsReceived.map(id => serverDb.getUser(id)).filter(Boolean) : [],
          requestsSent: user ? user.friendRequestsSent.map(id => serverDb.getUser(id)).filter(Boolean) : [],
        });
      }
    });

    socket.on('friends:send_invite', ({ accountId, friendId, roomCode }, callback) => {
      const sender = serverDb.getUser(accountId);
      if (sender && friendId && roomCode) {
        io.to(`user:${friendId}`).emit('invite:received', {
          senderId: sender.id,
          senderName: sender.name,
          senderAvatar: sender.avatar,
          roomCode,
          timestamp: Date.now(),
        });
      }
      if (typeof callback === 'function') callback({ success: true });
    });

    // 1. Create room
    socket.on('room:create', ({ accountId, playerName, avatar, buyIn, address }, callback) => {
      try {
        const cleanAddress = address && typeof address === 'string' && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
        if (!cleanAddress) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Please connect your Web3 wallet to create a table' });
          }
          return;
        }

        const dbUser = serverDb.getUserByAddress(cleanAddress) || serverDb.linkOrGetUserByAddress(cleanAddress, accountId, { name: playerName, avatar });
        const validAccountId = dbUser.id;
        const resolvedName = dbUser.name || playerName || 'Player 1';
        const resolvedAvatar = dbUser.avatar || avatar || '🦊';

        const room = roomManager.createRoom(validAccountId, socket.id, resolvedName, resolvedAvatar, buyIn, cleanAddress);
        socket.join(room.roomId);
        socket.join(`user:${validAccountId}`);
        socket.join(`wallet:${cleanAddress}`);

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
        const cleanAddress = address && typeof address === 'string' && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
        if (!cleanAddress) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Please connect your Web3 wallet to join a table' });
          }
          return;
        }

        const dbUser = serverDb.getUserByAddress(cleanAddress) || serverDb.linkOrGetUserByAddress(cleanAddress, accountId, { name: playerName, avatar });
        const validAccountId = dbUser.id;
        const resolvedName = dbUser.name || playerName || 'Player';
        const resolvedAvatar = dbUser.avatar || avatar || '🦁';

        const result = roomManager.joinRoom(roomCode, validAccountId, socket.id, resolvedName, resolvedAvatar, cleanAddress);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          const resolvedPlayerId = result.playerId || validAccountId;
          socket.join(`user:${resolvedPlayerId}`);
          socket.join(`wallet:${cleanAddress}`);

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

    // 4. Add bot to room (Open Tables only, Host only)
    socket.on('room:add_bot', (callback) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (!room || !player) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      if (room.isQuickMatch) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Quick Match is strictly for real players. Bots cannot be added.' });
        }
        return;
      }
      if (room.hostId !== player.id) {
        if (typeof callback === 'function') callback({ success: false, error: 'Only the host can add bots' });
        return;
      }
      const success = room.addBot();
      if (typeof callback === 'function') callback({ success });
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
          callback({ success: false, error: 'Requires 2 to 5 ready players to start' });
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

      // Disallow quitting while match is in progress
      if (room && room.status === 'playing') {
        const isSeated = room.players.some((p) => p.id === accountId);
        if (isSeated) {
          socket.emit('game:error', {
            message: 'You cannot quit while the game is in progress. Complete the match to exit.',
          });
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Cannot quit while game is in progress' });
          }
          return;
        }
      }

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
