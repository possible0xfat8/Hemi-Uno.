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
}

const STORAGE_KEY_PROFILE = 'uno_arcade_profile_v2';
const STORAGE_KEY_ROOM = 'uno_arcade_active_room_v2';

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

export function getOrCreateAccountProfile(): AccountProfile {
  if (typeof window === 'undefined') {
    return {
      id: 'acc_server_placeholder',
      name: 'Player',
      avatar: '🦊',
      bio: 'Ready to play UNO!',
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string' && parsed.id.trim()) {
        return {
          id: parsed.id,
          name: parsed.name || 'ChadCard',
          avatar: parsed.avatar || '🦊',
          bio: parsed.bio || 'UNO enthusiast & strategist',
          address: parsed.address,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse account profile from localStorage:', err);
  }

  // Create fresh persistent account
  const newProfile: AccountProfile = {
    id: generateAccountId(),
    name: DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)],
    avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
    bio: 'UNO enthusiast & strategist',
  };

  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
  } catch (err) {
    console.warn('Failed to save fresh account profile:', err);
  }

  return newProfile;
}

export function saveAccountProfile(updates: Partial<AccountProfile>): AccountProfile {
  const current = getOrCreateAccountProfile();
  const merged: AccountProfile = {
    ...current,
    ...updates,
    id: current.id, // ID is immutable
  };

  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save account updates:', err);
  }

  return merged;
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
