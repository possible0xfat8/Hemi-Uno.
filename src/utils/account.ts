/**
 * Persistent Account & Player Profile Management for UNO Arcade
 * Ensures player identity, custom name, avatar, and active room survive:
 * - Network drops and reconnects
 * - Tab refreshes
 * - Browser sleep / wake
 */

export interface AccountProfile {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  address?: string;
  stats?: {
    matchesPlayed: number;
    wins: number;
    cardsPlayed: number;
    hemiWon?: string;
    rankTitle?: string;
    winStreak?: number;
  };
}

const STORAGE_KEY_PROFILE = 'uno_arcade_profile_v2';
const STORAGE_KEY_ROOM = 'uno_arcade_active_room_v2';
const STORAGE_KEY_WALLET_PREFIX = 'uno_arcade_wallet_profile_';

export const DEFAULT_AVATARS = ['🦊', '🦁', '🐸', '🤖', '⚡', '💎', '🐉', '🐱', '🐼', '🦄', '🐯', '🦅'];
export const DEFAULT_NAMES = [
  'ChadCard',
  'HemiHustler',
  'BlockBuster',
  'SepoliaShark',
  'TurboPlayer',
  'NeonKnight',
  'CosmicDraw',
  'WildJoker',
];

function generateAccountId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36);
  return `acc_${time}_${rand}`;
}

export function getAccountProfileForWallet(address?: string | null): AccountProfile | null {
  if (typeof window === 'undefined' || !address) return null;
  try {
    const clean = address.trim().toLowerCase();
    const raw = localStorage.getItem(`${STORAGE_KEY_WALLET_PREFIX}${clean}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) {
        return {
          id: parsed.id || `wallet_${clean}`,
          name: parsed.name,
          avatar: parsed.avatar || '🦊',
          bio: parsed.bio || 'Hemi Testnet Card Champion',
          address: clean,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading wallet profile from storage:', err);
  }
  return null;
}

export function getOrCreateAccountProfile(preferredAddress?: string | null): AccountProfile {
  if (typeof window === 'undefined') {
    return {
      id: 'acc_server_placeholder',
      name: 'Player',
      avatar: '🦊',
      bio: 'Ready to play UNO on Hemi!',
    };
  }

  // 1. If preferredAddress is given, try wallet cache first
  if (preferredAddress) {
    const fromWallet = getAccountProfileForWallet(preferredAddress);
    if (fromWallet) return fromWallet;
  }

  // 2. Check if last connected wallet exists in storage
  const lastWallet = getLastConnectedWallet();
  if (lastWallet) {
    const fromLast = getAccountProfileForWallet(lastWallet);
    if (fromLast) return fromLast;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string' && parsed.id.trim()) {
        return {
          id: parsed.id,
          name: parsed.name || 'Player',
          avatar: parsed.avatar || '🦊',
          bio: parsed.bio || 'UNO enthusiast & strategist',
          address: parsed.address,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse account profile from localStorage:', err);
  }

  // Fallback initial account
  const newProfile: AccountProfile = {
    id: generateAccountId(),
    name: 'Player',
    avatar: DEFAULT_AVATARS[0],
    bio: 'Ready to play UNO on Hemi!',
  };

  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
  } catch (err) {
    console.warn('Failed to save fresh account profile:', err);
  }

  return newProfile;
}

export function saveAccountProfile(updates: Partial<AccountProfile>): AccountProfile {
  const current = getOrCreateAccountProfile(updates.address);
  const merged: AccountProfile = {
    ...current,
    ...updates,
    id: updates.id || current.id,
  };

  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(merged));
    const targetAddr = merged.address || updates.address;
    if (targetAddr) {
      const cleanAddr = targetAddr.trim().toLowerCase();
      localStorage.setItem('uno_arcade_last_wallet_addr', cleanAddr);
      localStorage.setItem(`${STORAGE_KEY_WALLET_PREFIX}${cleanAddr}`, JSON.stringify(merged));
    }
  } catch (err) {
    console.warn('Failed to save account updates:', err);
  }

  return merged;
}

export function syncAccountWithServerProfile(serverUser: {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  address?: string;
}): AccountProfile {
  const profile: AccountProfile = {
    id: serverUser.id,
    name: serverUser.name || 'Player',
    avatar: serverUser.avatar || '🦊',
    bio: serverUser.bio || 'Hemi Testnet Card Champion',
    address: serverUser.address ? serverUser.address.trim().toLowerCase() : undefined,
  };

  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    if (profile.address) {
      const cleanAddr = profile.address;
      localStorage.setItem('uno_arcade_last_wallet_addr', cleanAddr);
      localStorage.setItem(`${STORAGE_KEY_WALLET_PREFIX}${cleanAddr}`, JSON.stringify(profile));
    }
  } catch (err) {
    console.warn('Failed to save synced account profile:', err);
  }

  return profile;
}

export function getLastConnectedWallet(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('uno_arcade_last_wallet_addr');
  } catch {
    return null;
  }
}

export function saveLastConnectedWallet(address: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (address) {
      localStorage.setItem('uno_arcade_last_wallet_addr', address);
    } else {
      localStorage.removeItem('uno_arcade_last_wallet_addr');
    }
  } catch {}
}

export function getActiveRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = localStorage.getItem(STORAGE_KEY_ROOM);
    return code && code.trim().length === 4 ? code.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function setActiveRoomCode(roomCode: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (roomCode) {
      localStorage.setItem(STORAGE_KEY_ROOM, roomCode.trim().toUpperCase());
    } else {
      localStorage.removeItem(STORAGE_KEY_ROOM);
    }
  } catch {}
}
