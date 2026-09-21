import fs from 'fs';
import path from 'path';

export interface UserStats {
  matchesPlayed: number;
  wins: number;
  cardsPlayed: number;
  totalWinnings: string;
}

export interface UserProfileRecord {
  id: string; // e.g. "acc_..."
  tag: string; // e.g. "Chad#4829"
  name: string;
  avatar: string;
  bio: string;
  address?: string;
  status: 'online' | 'in_game' | 'offline';
  currentRoomCode?: string | null;
  lastSeen: number;
  createdAt: number;
  updatedAt: number;
  stats: UserStats;
  friends: string[]; // User IDs
  friendRequestsSent: string[]; // User IDs
  friendRequestsReceived: string[]; // User IDs
  recentOpponents: { id: string; name: string; avatar: string; playedAt: number }[];
}

export interface EnrichedFriend {
  id: string;
  tag: string;
  name: string;
  avatar: string;
  bio: string;
  status: 'online' | 'in_game' | 'offline';
  currentRoomCode?: string | null;
  address?: string;
  stats: UserStats;
  lastSeen: number;
}

export interface DatabaseSchema {
  users: Record<string, UserProfileRecord>;
  recentRooms: Record<string, {
    roomCode: string;
    hostName: string;
    hostAvatar: string;
    buyIn: string;
    createdAt: number;
    status: 'lobby' | 'playing' | 'game_over';
  }>;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'uno_db.json');

export class ServerDatabase {
  private data: DatabaseSchema = {
    users: {},
    recentRooms: {},
  };
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          const rawUsers: Record<string, UserProfileRecord> = parsed.users || {};
          const canonicalUsers: Record<string, UserProfileRecord> = {};

          // Deduplicate and canonicalize all users keyed by wallet address
          for (const [id, user] of Object.entries(rawUsers)) {
            if (user.address && user.address.trim()) {
              const cleanAddr = user.address.trim().toLowerCase();
              const canonicalId = `wallet_${cleanAddr}`;
              if (!canonicalUsers[canonicalId]) {
                canonicalUsers[canonicalId] = {
                  ...user,
                  id: canonicalId,
                  address: cleanAddr,
                };
              } else {
                // Merge duplicate records for the same wallet address
                const existing = canonicalUsers[canonicalId];
                // Keep the latest customized name
                if (user.updatedAt > existing.updatedAt || (!existing.name.startsWith('HemiPlayer_') && user.name)) {
                  existing.name = user.name || existing.name;
                  existing.avatar = user.avatar || existing.avatar;
                  existing.bio = user.bio || existing.bio;
                  existing.tag = user.tag || existing.tag;
                }
                existing.stats.matchesPlayed = Math.max(existing.stats.matchesPlayed || 0, user.stats?.matchesPlayed || 0);
                existing.stats.wins = Math.max(existing.stats.wins || 0, user.stats?.wins || 0);
                existing.stats.cardsPlayed = Math.max(existing.stats.cardsPlayed || 0, user.stats?.cardsPlayed || 0);
                existing.lastSeen = Math.max(existing.lastSeen || 0, user.lastSeen || 0);
                existing.updatedAt = Math.max(existing.updatedAt || 0, user.updatedAt || 0);
              }
            } else {
              canonicalUsers[id] = user;
            }
          }

          this.data = {
            users: canonicalUsers,
            recentRooms: parsed.recentRooms || {},
          };
          this.saveSync();
          console.log(`[Database] Loaded & canonicalized ${Object.keys(this.data.users).length} user profiles from persistent storage.`);
        }
      } else {
        this.saveSync();
      }
    } catch (err) {
      console.error('[Database] Failed to initialize persistent database:', err);
    }
  }

  private saveSync(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database] Error saving database synchronously:', err);
    }
  }

  public save(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveSync();
    }, 500);
  }

  public generateFriendTag(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').trim() || 'Player';
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${cleanName}#${num}`;
  }

  public getUserByAddress(address: string): UserProfileRecord | null {
    if (!address) return null;
    const target = address.trim().toLowerCase();
    const canonicalId = `wallet_${target}`;
    if (this.data.users[canonicalId]) {
      return this.data.users[canonicalId];
    }
    for (const user of Object.values(this.data.users)) {
      if (user.address && user.address.trim().toLowerCase() === target) {
        return user;
      }
    }
    return null;
  }

  public linkOrGetUserByAddress(
    address: string,
    fallbackId?: string,
    fallbackData?: { name?: string; avatar?: string; bio?: string }
  ): UserProfileRecord {
    if (!address) {
      const id = fallbackId || `acc_${Date.now()}`;
      return this.getOrCreateUser(id, fallbackData || {});
    }

    const cleanAddress = address.trim().toLowerCase();
    const canonicalId = `wallet_${cleanAddress}`;

    // Look up existing authoritative profile by address
    const existing = this.getUserByAddress(cleanAddress);
    if (existing) {
      existing.lastSeen = Date.now();
      // Ensure user is keyed canonically
      if (existing.id !== canonicalId) {
        delete this.data.users[existing.id];
        existing.id = canonicalId;
        existing.address = cleanAddress;
        this.data.users[canonicalId] = existing;
        this.save();
      }
      return existing;
    }

    // No profile exists yet for this wallet address - create canonical profile
    const fallbackUser = fallbackId ? this.data.users[fallbackId] : null;
    const defaultName = fallbackUser?.name || fallbackData?.name || `Player_${cleanAddress.slice(2, 6)}`;
    const tag = fallbackUser?.tag || this.generateFriendTag(defaultName);

    const newUser: UserProfileRecord = {
      id: canonicalId,
      tag,
      name: defaultName,
      avatar: fallbackUser?.avatar || fallbackData?.avatar || '🦊',
      bio: fallbackUser?.bio || fallbackData?.bio || 'Hemi Testnet Card Champion',
      address: cleanAddress,
      status: 'online',
      currentRoomCode: null,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: fallbackUser?.stats || {
        matchesPlayed: 0,
        wins: 0,
        cardsPlayed: 0,
        totalWinnings: '0.000',
      },
      friends: fallbackUser?.friends || [],
      friendRequestsSent: fallbackUser?.friendRequestsSent || [],
      friendRequestsReceived: fallbackUser?.friendRequestsReceived || [],
      recentOpponents: fallbackUser?.recentOpponents || [],
    };

    if (fallbackId && fallbackId !== canonicalId && this.data.users[fallbackId]) {
      delete this.data.users[fallbackId];
    }

    this.data.users[canonicalId] = newUser;
    this.save();
    return newUser;
  }

  public getOrCreateUser(
    id: string,
    initial: { name?: string; avatar?: string; address?: string; bio?: string }
  ): UserProfileRecord {
    // If address is provided, always prioritize canonical wallet lookup
    if (initial.address) {
      return this.linkOrGetUserByAddress(initial.address, id, initial);
    }

    if (this.data.users[id]) {
      const user = this.data.users[id];
      if (initial.name && !user.name) user.name = initial.name;
      if (initial.avatar && !user.avatar) user.avatar = initial.avatar;
      if (initial.bio && !user.bio) user.bio = initial.bio;
      user.lastSeen = Date.now();
      return user;
    }

    const name = initial.name || 'Player';
    const tag = this.generateFriendTag(name);

    const newUser: UserProfileRecord = {
      id,
      tag,
      name,
      avatar: initial.avatar || '🦊',
      bio: initial.bio || 'Ready to play Crazy Eights on Hemi!',
      address: undefined,
      status: 'online',
      currentRoomCode: null,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: {
        matchesPlayed: 0,
        wins: 0,
        cardsPlayed: 0,
        totalWinnings: '0.000',
      },
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      recentOpponents: [],
    };

    this.data.users[id] = newUser;
    this.save();
    return newUser;
  }

  public getUser(id: string): UserProfileRecord | null {
    if (!id) return null;
    if (this.data.users[id]) return this.data.users[id];
    if (id.startsWith('0x')) {
      return this.getUserByAddress(id);
    }
    const walletKey = `wallet_${id.toLowerCase()}`;
    if (this.data.users[walletKey]) return this.data.users[walletKey];
    return null;
  }

  public getUserByTagOrName(query: string): UserProfileRecord | null {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;

    // Exact tag match (e.g. "chad#4829")
    for (const user of Object.values(this.data.users)) {
      if (user.tag.toLowerCase() === trimmed) {
        return user;
      }
    }

    // Exact id match
    if (this.data.users[query.trim()]) {
      return this.data.users[query.trim()];
    }

    // Exact name match
    for (const user of Object.values(this.data.users)) {
      if (user.name.toLowerCase() === trimmed) {
        return user;
      }
    }

    // Partial name match
    for (const user of Object.values(this.data.users)) {
      if (user.name.toLowerCase().includes(trimmed) || user.tag.toLowerCase().includes(trimmed)) {
        return user;
      }
    }

    return null;
  }

  public updateUserProfile(
    id: string,
    updates: { name?: string; avatar?: string; bio?: string; address?: string }
  ): UserProfileRecord {
    let user: UserProfileRecord | null = null;
    if (updates.address) {
      user = this.linkOrGetUserByAddress(updates.address, id, updates);
    } else if (id) {
      user = this.getUser(id);
    }

    if (!user) {
      user = this.getOrCreateUser(id || `acc_${Date.now()}`, updates);
    }

    if (updates.name && updates.name.trim() && updates.name.trim() !== user.name) {
      user.name = updates.name.trim();
      const parts = user.tag.split('#');
      const disc = parts[1] || Math.floor(1000 + Math.random() * 9000).toString();
      const cleanName = user.name.replace(/[^a-zA-Z0-9]/g, '').trim() || 'Player';
      user.tag = `${cleanName}#${disc}`;
    }

    if (updates.avatar) user.avatar = updates.avatar;
    if (updates.bio !== undefined) user.bio = updates.bio.trim().substring(0, 120);

    if (updates.address) {
      const cleanAddr = updates.address.trim().toLowerCase();
      user.address = cleanAddr;
      const canonicalId = `wallet_${cleanAddr}`;
      if (user.id !== canonicalId) {
        delete this.data.users[user.id];
        user.id = canonicalId;
        this.data.users[canonicalId] = user;
      }
    }

    user.updatedAt = Date.now();
    user.lastSeen = Date.now();
    this.save();
    return user;
  }

  public setUserPresence(id: string, status: 'online' | 'in_game' | 'offline', roomCode?: string | null): void {
    const user = this.data.users[id];
    if (!user) return;
    user.status = status;
    user.currentRoomCode = roomCode !== undefined ? roomCode : user.currentRoomCode;
    user.lastSeen = Date.now();
    this.save();
  }

  public getEnrichedFriends(userId: string): EnrichedFriend[] {
    const user = this.data.users[userId];
    if (!user) return [];

    const enriched: EnrichedFriend[] = [];
    for (const fId of user.friends) {
      const f = this.data.users[fId];
      if (f) {
        // Compute active status based on lastSeen (within 3 minutes = online/in_game)
        const isRecentlyActive = Date.now() - f.lastSeen < 3 * 60 * 1000;
        const currentStatus = isRecentlyActive ? f.status : 'offline';

        enriched.push({
          id: f.id,
          tag: f.tag,
          name: f.name,
          avatar: f.avatar,
          bio: f.bio,
          status: currentStatus,
          currentRoomCode: isRecentlyActive ? f.currentRoomCode : null,
          address: f.address,
          stats: f.stats,
          lastSeen: f.lastSeen,
        });
      }
    }

    // Sort: in_game first, then online, then offline
    return enriched.sort((a, b) => {
      const order = { in_game: 0, online: 1, offline: 2 };
      return order[a.status] - order[b.status];
    });
  }

  public sendFriendRequest(fromUserId: string, targetQuery: string): { success: boolean; error?: string; friend?: UserProfileRecord } {
    const fromUser = this.data.users[fromUserId];
    if (!fromUser) return { success: false, error: 'Sender profile not found' };

    const targetUser = this.getUserByTagOrName(targetQuery);
    if (!targetUser) return { success: false, error: `Could not find player with tag or name "${targetQuery}"` };

    if (targetUser.id === fromUserId) {
      return { success: false, error: 'You cannot add yourself as a friend' };
    }

    if (fromUser.friends.includes(targetUser.id)) {
      return { success: false, error: `${targetUser.name} is already your friend` };
    }

    if (fromUser.friendRequestsSent.includes(targetUser.id)) {
      return { success: false, error: 'Friend request already sent' };
    }

    // If target has already sent us a request, automatically accept it!
    if (fromUser.friendRequestsReceived.includes(targetUser.id)) {
      return this.acceptFriendRequest(fromUserId, targetUser.id);
    }

    fromUser.friendRequestsSent.push(targetUser.id);
    if (!targetUser.friendRequestsReceived.includes(fromUserId)) {
      targetUser.friendRequestsReceived.push(fromUserId);
    }

    this.save();
    return { success: true, friend: targetUser };
  }

  public acceptFriendRequest(userId: string, requesterId: string): { success: boolean; error?: string; friend?: UserProfileRecord } {
    const user = this.data.users[userId];
    const requester = this.data.users[requesterId];

    if (!user || !requester) {
      return { success: false, error: 'User record not found' };
    }

    // Remove from pending lists
    user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== requesterId);
    requester.friendRequestsSent = requester.friendRequestsSent.filter(id => id !== userId);

    // Add to mutual friends lists if not present
    if (!user.friends.includes(requesterId)) {
      user.friends.push(requesterId);
    }
    if (!requester.friends.includes(userId)) {
      requester.friends.push(userId);
    }

    this.save();
    return { success: true, friend: requester };
  }

  public declineFriendRequest(userId: string, requesterId: string): { success: boolean } {
    const user = this.data.users[userId];
    const requester = this.data.users[requesterId];

    if (user) {
      user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== requesterId);
    }
    if (requester) {
      requester.friendRequestsSent = requester.friendRequestsSent.filter(id => id !== userId);
    }

    this.save();
    return { success: true };
  }

  public removeFriend(userId: string, friendId: string): { success: boolean } {
    const user = this.data.users[userId];
    const friend = this.data.users[friendId];

    if (user) {
      user.friends = user.friends.filter(id => id !== friendId);
    }
    if (friend) {
      friend.friends = friend.friends.filter(id => id !== userId);
    }

    this.save();
    return { success: true };
  }

  public recordGameFinished(
    winnerId: string,
    playerIds: string[],
    potAmount: string,
    cardsPlayedMap: Record<string, number>
  ): void {
    const potNum = parseFloat(potAmount) || 0;

    for (const pid of playerIds) {
      const user = this.data.users[pid];
      if (!user) continue;

      user.stats.matchesPlayed += 1;
      user.stats.cardsPlayed += (cardsPlayedMap[pid] || 0);

      if (pid === winnerId) {
        user.stats.wins += 1;
        const currentWon = parseFloat(user.stats.totalWinnings) || 0;
        user.stats.totalWinnings = (currentWon + potNum).toFixed(3);
      }

      // Record recent opponents
      const otherPlayers = playerIds
        .filter(id => id !== pid)
        .map(id => this.data.users[id])
        .filter(Boolean) as UserProfileRecord[];

      for (const opp of otherPlayers) {
        if (!user.recentOpponents.some(r => r.id === opp.id)) {
          user.recentOpponents.unshift({
            id: opp.id,
            name: opp.name,
            avatar: opp.avatar,
            playedAt: Date.now(),
          });
        }
      }
      user.recentOpponents = user.recentOpponents.slice(0, 10);
    }

    this.save();
  }

  public getSuggestedPlayers(excludeUserId: string): UserProfileRecord[] {
    const all = Object.values(this.data.users);
    const excludeUser = this.data.users[excludeUserId];
    const friendsSet = new Set(excludeUser ? excludeUser.friends : []);
    friendsSet.add(excludeUserId);

    return all
      .filter(u => !friendsSet.has(u.id))
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 6);
  }

  public saveRecentRoom(roomCode: string, info: { hostName: string; hostAvatar: string; buyIn: string; status: 'lobby' | 'playing' | 'game_over' }): void {
    this.data.recentRooms[roomCode] = {
      roomCode,
      hostName: info.hostName,
      hostAvatar: info.hostAvatar,
      buyIn: info.buyIn,
      createdAt: Date.now(),
      status: info.status,
    };
    this.save();
  }
}

export const serverDb = new ServerDatabase();
