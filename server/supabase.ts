import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfileRecord, DatabaseSchema } from './database.js';

export interface SupabaseProfileRow {
  id: string;
  address: string | null;
  tag: string;
  name: string;
  avatar: string;
  bio: string | null;
  status: 'online' | 'in_game' | 'offline';
  current_room_code: string | null;
  matches_played: number;
  wins: number;
  cards_played: number;
  total_winnings: string;
  last_seen: number;
  created_at: number;
  updated_at: number;
}

export interface SupabaseFriendRow {
  user_id: string;
  friend_id: string;
  created_at: number;
}

export interface SupabaseFriendRequestRow {
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
}

export interface SupabaseRecentOpponentRow {
  user_id: string;
  opponent_id: string;
  played_at: number;
}

export interface SupabaseRecentRoomRow {
  room_code: string;
  host_name: string;
  host_avatar: string;
  buy_in: string;
  status: 'lobby' | 'playing' | 'game_over';
  created_at: number;
}

export interface SupabaseMatchHistoryRow {
  id?: string;
  room_code: string;
  winner_id: string | null;
  player_ids: string[];
  pot_amount: string;
  cards_played: Record<string, number>;
  created_at: number;
}

let supabaseInstance: SupabaseClient | null = null;
let hasLoggedConfigState = false;

/**
 * Returns true if valid Supabase URL and credentials are provided in process.env
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  const isValid = Boolean(url && key && url.startsWith('http') && !url.includes('your-project-id'));
  
  if (!hasLoggedConfigState) {
    hasLoggedConfigState = true;
    if (isValid) {
      console.log(`[Supabase] Remote Supabase connection configured: ${url}`);
    } else {
      console.log('[Supabase] Supabase credentials not configured or using placeholders. Falling back to local persistent storage (data/uno_db.json).');
    }
  }
  return isValid;
}

/**
 * Get or initialize the Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL!.trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)!.trim();
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Convert local UserProfileRecord to Supabase profile row
 */
export function toSupabaseProfile(user: UserProfileRecord): SupabaseProfileRow {
  return {
    id: user.id,
    address: user.address ? user.address.toLowerCase() : null,
    tag: user.tag,
    name: user.name,
    avatar: user.avatar || '🦊',
    bio: user.bio || 'Hemi Testnet Card Champion',
    status: user.status || 'offline',
    current_room_code: user.currentRoomCode || null,
    matches_played: user.stats?.matchesPlayed || 0,
    wins: user.stats?.wins || 0,
    cards_played: user.stats?.cardsPlayed || 0,
    total_winnings: user.stats?.totalWinnings || '0.000',
    last_seen: user.lastSeen || Date.now(),
    created_at: user.createdAt || Date.now(),
    updated_at: user.updatedAt || Date.now(),
  };
}

/**
 * Asynchronously upsert a profile in Supabase
 */
export async function syncProfileToSupabase(user: UserProfileRecord): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const row = toSupabaseProfile(user);
    const { error } = await client.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase] Error upserting profile ${user.id}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Exception syncing profile ${user.id}:`, err);
  }
}

/**
 * Update user status and presence in Supabase
 */
export async function syncPresenceToSupabase(
  id: string,
  status: 'online' | 'in_game' | 'offline',
  currentRoomCode: string | null = null
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('profiles')
      .update({
        status,
        current_room_code: currentRoomCode,
        last_seen: Date.now(),
      })
      .eq('id', id);

    if (error) {
      console.warn(`[Supabase] Error updating presence for ${id}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Exception updating presence for ${id}:`, err);
  }
}

/**
 * Record a mutual friendship in Supabase
 */
export async function syncFriendRelationshipToSupabase(userId: string, friendId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const now = Date.now();
    await client.from('friends').upsert([
      { user_id: userId, friend_id: friendId, created_at: now },
      { user_id: friendId, friend_id: userId, created_at: now },
    ], { onConflict: 'user_id,friend_id' });
  } catch (err) {
    console.warn(`[Supabase] Error syncing friends (${userId} <-> ${friendId}):`, err);
  }
}

/**
 * Remove a mutual friendship in Supabase
 */
export async function removeFriendRelationshipFromSupabase(userId: string, friendId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('friends').delete().or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
  } catch (err) {
    console.warn(`[Supabase] Error removing friends (${userId} <-> ${friendId}):`, err);
  }
}

/**
 * Upsert a friend request in Supabase
 */
export async function syncFriendRequestToSupabase(
  senderId: string,
  receiverId: string,
  status: 'pending' | 'accepted' | 'declined'
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('friend_requests').upsert({
      sender_id: senderId,
      receiver_id: receiverId,
      status,
      created_at: Date.now(),
    }, { onConflict: 'sender_id,receiver_id' });
  } catch (err) {
    console.warn(`[Supabase] Error syncing friend request:`, err);
  }
}

/**
 * Delete a friend request from Supabase
 */
export async function removeFriendRequestFromSupabase(senderId: string, receiverId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);
  } catch (err) {
    console.warn(`[Supabase] Error deleting friend request:`, err);
  }
}

/**
 * Record recent opponents for social discovery
 */
export async function syncRecentOpponentsToSupabase(userId: string, opponentIds: string[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || opponentIds.length === 0) return;

  try {
    const now = Date.now();
    const rows = opponentIds.map(oppId => ({
      user_id: userId,
      opponent_id: oppId,
      played_at: now,
    }));
    await client.from('recent_opponents').upsert(rows, { onConflict: 'user_id,opponent_id' });
  } catch (err) {
    console.warn(`[Supabase] Error syncing recent opponents for ${userId}:`, err);
  }
}

/**
 * Sync active or recent room lobby to Supabase
 */
export async function syncRecentRoomToSupabase(roomCode: string, info: {
  hostName: string;
  hostAvatar: string;
  buyIn: string;
  status: 'lobby' | 'playing' | 'game_over';
  createdAt?: number;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('recent_rooms').upsert({
      room_code: roomCode,
      host_name: info.hostName,
      host_avatar: info.hostAvatar,
      buy_in: info.buyIn,
      status: info.status,
      created_at: info.createdAt || Date.now(),
    }, { onConflict: 'room_code' });
  } catch (err) {
    console.warn(`[Supabase] Error syncing room ${roomCode}:`, err);
  }
}

/**
 * Record a completed match in Supabase match_history table
 */
export async function syncMatchHistoryToSupabase(
  roomCode: string,
  winnerId: string,
  playerIds: string[],
  potAmount: string,
  cardsPlayedMap: Record<string, number>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('match_history').insert({
      room_code: roomCode,
      winner_id: winnerId,
      player_ids: playerIds,
      pot_amount: potAmount,
      cards_played: cardsPlayedMap,
      created_at: Date.now(),
    });
  } catch (err) {
    console.warn(`[Supabase] Error recording match history for room ${roomCode}:`, err);
  }
}

/**
 * Pull all data from Supabase to bootstrap or hydrate local in-memory state
 */
export async function loadInitialDataFromSupabase(): Promise<{
  users: Record<string, UserProfileRecord>;
  recentRooms: DatabaseSchema['recentRooms'];
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    console.log('[Supabase] Fetching initial dataset from Supabase...');
    const [profilesRes, friendsRes, requestsRes, opponentsRes, roomsRes] = await Promise.all([
      client.from('profiles').select('*'),
      client.from('friends').select('*'),
      client.from('friend_requests').select('*'),
      client.from('recent_opponents').select('*'),
      client.from('recent_rooms').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    if (profilesRes.error) {
      console.warn('[Supabase] Failed to fetch profiles:', profilesRes.error.message);
      return null;
    }

    const users: Record<string, UserProfileRecord> = {};

    for (const p of (profilesRes.data as SupabaseProfileRow[])) {
      users[p.id] = {
        id: p.id,
        address: p.address || undefined,
        tag: p.tag,
        name: p.name,
        avatar: p.avatar,
        bio: p.bio || 'Hemi Testnet Card Champion',
        status: p.status,
        currentRoomCode: p.current_room_code,
        matchesPlayed: p.matches_played, // backwards compatibility if read directly
        lastSeen: Number(p.last_seen),
        createdAt: Number(p.created_at),
        updatedAt: Number(p.updated_at),
        stats: {
          matchesPlayed: p.matches_played,
          wins: p.wins,
          cardsPlayed: p.cards_played,
          totalWinnings: p.total_winnings,
        },
        friends: [],
        friendRequestsSent: [],
        friendRequestsReceived: [],
        recentOpponents: [],
      } as UserProfileRecord;
    }

    // Populate friends
    if (friendsRes.data) {
      for (const f of (friendsRes.data as SupabaseFriendRow[])) {
        if (users[f.user_id] && !users[f.user_id].friends.includes(f.friend_id)) {
          users[f.user_id].friends.push(f.friend_id);
        }
      }
    }

    // Populate friend requests
    if (requestsRes.data) {
      for (const r of (requestsRes.data as SupabaseFriendRequestRow[])) {
        if (r.status === 'pending') {
          if (users[r.sender_id] && !users[r.sender_id].friendRequestsSent.includes(r.receiver_id)) {
            users[r.sender_id].friendRequestsSent.push(r.receiver_id);
          }
          if (users[r.receiver_id] && !users[r.receiver_id].friendRequestsReceived.includes(r.sender_id)) {
            users[r.receiver_id].friendRequestsReceived.push(r.sender_id);
          }
        }
      }
    }

    // Populate recent opponents
    if (opponentsRes.data) {
      for (const opp of (opponentsRes.data as SupabaseRecentOpponentRow[])) {
        if (users[opp.user_id]) {
          const oppUser = users[opp.opponent_id];
          users[opp.user_id].recentOpponents.push({
            id: opp.opponent_id,
            name: oppUser?.name || 'Player',
            avatar: oppUser?.avatar || '🦊',
            playedAt: Number(opp.played_at),
          });
        }
      }
    }

    const recentRooms: DatabaseSchema['recentRooms'] = {};
    if (roomsRes.data) {
      for (const rm of (roomsRes.data as SupabaseRecentRoomRow[])) {
        recentRooms[rm.room_code] = {
          roomCode: rm.room_code,
          hostName: rm.host_name,
          hostAvatar: rm.host_avatar,
          buyIn: rm.buy_in,
          status: rm.status,
          createdAt: Number(rm.created_at),
        };
      }
    }

    console.log(`[Supabase] Successfully bootstrapped ${Object.keys(users).length} profiles and ${Object.keys(recentRooms).length} rooms from Supabase.`);
    return { users, recentRooms };
  } catch (err) {
    console.warn('[Supabase] Could not fetch remote dataset:', err);
    return null;
  }
}

/**
 * Query real leaderboard directly from Supabase
 */
export async function fetchLeaderboardFromSupabase(limit = 15): Promise<UserProfileRecord[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('wins', { ascending: false })
      .order('matches_played', { ascending: false })
      .limit(limit);

    if (error || !data) return null;

    return data.map((p: SupabaseProfileRow) => ({
      id: p.id,
      address: p.address || undefined,
      tag: p.tag,
      name: p.name,
      avatar: p.avatar,
      bio: p.bio || 'Hemi Testnet Card Champion',
      status: p.status,
      currentRoomCode: p.current_room_code,
      lastSeen: Number(p.last_seen),
      createdAt: Number(p.created_at),
      updatedAt: Number(p.updated_at),
      stats: {
        matchesPlayed: p.matches_played,
        wins: p.wins,
        cardsPlayed: p.cards_played,
        totalWinnings: p.total_winnings,
      },
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      recentOpponents: [],
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch leaderboard:', err);
    return null;
  }
}

