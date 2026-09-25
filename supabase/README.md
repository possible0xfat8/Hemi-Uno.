# 🚀 Supabase Database Setup for Hemi Uno

This document guides you through setting up your PostgreSQL database on [Supabase](https://supabase.com) for **Hemi Uno**.

---

## ⚡ Quick Start (5 Steps)

### Step 1: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and click **Start your project** (or sign in).
2. Click **New project** and select your organization.
3. Fill in:
   - **Name**: `hemi-uno` (or your preferred name)
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select a region close to your target audience.
   - **Pricing Plan**: Free tier works great.
4. Click **Create new project** and wait 1-2 minutes for provisioning to finish.

---

### Step 2: Execute the SQL Schema
1. In your Supabase dashboard left sidebar, navigate to the **SQL Editor** (icon `>_`).
2. Click **New query** (or `+`).
3. Open the file [`supabase/schema.sql`](file:///c:/Users/possi/Documents/Hemi%20Uno/supabase/schema.sql) in this repository and copy the entire contents.
4. Paste the SQL into the Supabase SQL Editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. You should see a **"Success. No rows returned"** notification.

---

### Step 3: Copy Your Supabase API Keys
1. In the Supabase left sidebar, click the **Settings** gear icon at the bottom.
2. Under **Project Settings**, click **API**.
3. Locate the following values:
   - **Project URL**: e.g., `https://abcdefghijklmnopqrst.supabase.co`
   - **Project API keys**:
     - `anon` `public`: Public key for client operations.
     - `service_role` `secret`: Secret key that bypasses RLS policies for authoritative backend operations.

---

### Step 4: Add Keys to your `.env` file
1. In your local `Hemi Uno` project directory, create or edit your `.env` file (you can copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Paste your Supabase credentials into `.env`:
   ```env
   # Server Backend (Port & Environment)
   PORT=3000
   NODE_ENV=development

   # Supabase Database Connection
   SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh... (your service_role secret key)
   SUPABASE_ANON_KEY=eyJh... (your anon public key)

   # Optional Frontend Vite Keys (for client-side subscriptions)
   VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh... (your anon public key)
   ```

---

### Step 5: Start or Restart the Server
Run the local dev server:
```bash
npm run dev
```

You will see the following confirmation in your console:
```log
[Supabase] Remote Supabase connection configured: https://...
[Supabase] Fetching initial dataset from Supabase...
[Supabase] Successfully bootstrapped ... profiles and ... rooms from Supabase.
[Database] Loaded & canonicalized ... user profiles from persistent storage.
```

---

## 🗄️ Database Architecture & Tables

| Table | Description | Primary Key | Key Features |
|---|---|---|---|
| `profiles` | Canonical Web3 player profiles tied to wallet addresses | `id` (`wallet_0x...`) | Case-insensitive lower address index, career stats (matches, wins, cards, total winnings), real-time presence |
| `friends` | Mutual player friend relationships | `(user_id, friend_id)` | Foreign key cascading to `profiles(id)` |
| `friend_requests` | Social invites and friend requests | `(sender_id, receiver_id)` | Status: `pending`, `accepted`, `declined` |
| `recent_opponents` | Opponents faced in multiplayer matches | `(user_id, opponent_id)` | Timestamped match discovery list |
| `recent_rooms` | Active and public table lobby index | `room_code` | Host info, buy-in, room status |
| `match_history` | Historical logs of completed matches & payouts | `id` (UUID) | Winner ID, array of player IDs, total pot, cards played breakdown |

### Views
- **`leaderboard`**: Pre-sorted view ranking top 50 players by wins and career match activity.

### Security & Row Level Security (RLS)
- **Public Read Access**: Enabled for `profiles`, `recent_rooms`, and `match_history` so public spectators and leaderboards can be queried safely.
- **Service Role Access**: The backend node service uses `service_role` to securely update user statistics, record match history, and manage presence.

---

## 🛡️ Zero-Latency Architecture & Offline Resilience
Hemi Uno uses a **write-through caching** hybrid design:
- Active game loops and WebSocket ticks run at **0ms latency** directly from in-memory cache.
- Every state change asynchronously replicates to Supabase in the background.
- If Supabase keys are not provided or if the internet is disconnected, the server seamlessly falls back to `data/uno_db.json`. No crashes, no disruption to live gameplay.
