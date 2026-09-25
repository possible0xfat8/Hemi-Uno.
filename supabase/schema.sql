-- ============================================================================
-- Hemi Uno - Complete Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- Enable pgcrypto / uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Canonical Web3 Wallet Player Profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,                                      -- e.g. 'wallet_0x1234...'
  address TEXT UNIQUE,                                      -- Lowercase Ethereum address e.g. '0x1234...'
  tag TEXT NOT NULL,                                        -- e.g. 'Chad#4829'
  name TEXT NOT NULL,                                       -- Player display name e.g. 'Chad' or '0x1234...5678'
  avatar TEXT NOT NULL DEFAULT '🦊',                        -- Emoji or URL avatar
  bio TEXT DEFAULT 'Hemi Testnet Card Champion',            -- Player bio (max 120 chars)
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'in_game', 'offline')),
  current_room_code TEXT DEFAULT NULL,                     -- Active room code if currently playing
  matches_played INTEGER NOT NULL DEFAULT 0,                -- Career matches played
  wins INTEGER NOT NULL DEFAULT 0,                          -- Career victories
  cards_played INTEGER NOT NULL DEFAULT 0,                  -- Total cards laid down
  total_winnings TEXT NOT NULL DEFAULT '0.000',             -- Total ETH won
  last_seen BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Index for instant wallet address lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_address_lower ON profiles (LOWER(address));
CREATE INDEX IF NOT EXISTS idx_profiles_tag_lower ON profiles (LOWER(tag));
CREATE INDEX IF NOT EXISTS idx_profiles_name_lower ON profiles (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard ON profiles (wins DESC, matches_played DESC);

-- ============================================================================
-- 2. FRIENDS TABLE (Mutual Friendship Relationships)
-- ============================================================================
CREATE TABLE IF NOT EXISTS friends (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends (user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends (friend_id);

-- ============================================================================
-- 3. FRIEND REQUESTS TABLE (Pending, Accepted, Declined)
-- ============================================================================
CREATE TABLE IF NOT EXISTS friend_requests (
  sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  PRIMARY KEY (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests (receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests (sender_id);

-- ============================================================================
-- 4. RECENT OPPONENTS TABLE (Social Discovery & Match Memory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recent_opponents (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  played_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  PRIMARY KEY (user_id, opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_opponents_user ON recent_opponents (user_id);
CREATE INDEX IF NOT EXISTS idx_recent_opponents_played ON recent_opponents (played_at DESC);

-- ============================================================================
-- 5. RECENT ROOMS TABLE (Active and Public Table Lobby Index)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recent_rooms (
  room_code TEXT PRIMARY KEY,
  host_name TEXT NOT NULL,
  host_avatar TEXT NOT NULL DEFAULT '🦊',
  buy_in TEXT NOT NULL DEFAULT '0.000',
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'game_over')),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_recent_rooms_created ON recent_rooms (created_at DESC);

-- ============================================================================
-- 6. MATCH HISTORY TABLE (Completed Game Logs & Escrow Payouts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  winner_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  player_ids TEXT[] NOT NULL DEFAULT '{}',
  pot_amount TEXT NOT NULL DEFAULT '0.000',
  cards_played JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_match_history_winner ON match_history (winner_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history (created_at DESC);

-- ============================================================================
-- 7. LEADERBOARD VIEW
-- ============================================================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  id,
  address,
  tag,
  name,
  avatar,
  bio,
  matches_played,
  wins,
  cards_played,
  total_winnings,
  last_seen
FROM profiles
ORDER BY wins DESC, matches_played DESC
LIMIT 50;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_opponents ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to profiles & leaderboard
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Allow public read access to recent rooms
DROP POLICY IF EXISTS "Recent rooms are viewable by everyone" ON recent_rooms;
CREATE POLICY "Recent rooms are viewable by everyone"
  ON recent_rooms FOR SELECT
  USING (true);

-- Allow public read access to match history
DROP POLICY IF EXISTS "Match history is viewable by everyone" ON match_history;
CREATE POLICY "Match history is viewable by everyone"
  ON match_history FOR SELECT
  USING (true);

-- Backend Service Role / API has full access to all operations
DROP POLICY IF EXISTS "Service role full access on profiles" ON profiles;
CREATE POLICY "Service role full access on profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on friends" ON friends;
CREATE POLICY "Service role full access on friends"
  ON friends FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on friend_requests" ON friend_requests;
CREATE POLICY "Service role full access on friend_requests"
  ON friend_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on recent_opponents" ON recent_opponents;
CREATE POLICY "Service role full access on recent_opponents"
  ON recent_opponents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on recent_rooms" ON recent_rooms;
CREATE POLICY "Service role full access on recent_rooms"
  ON recent_rooms FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on match_history" ON match_history;
CREATE POLICY "Service role full access on match_history"
  ON match_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
