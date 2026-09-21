import React, { useState, useEffect } from 'react';
import { AccountProfile, DEFAULT_AVATARS } from '../utils/account';
import { UserProfileRecord } from '../types';
import { WalletState, formatAddress } from '../utils/wallet';
import {
  User,
  X,
  Trophy,
  Flame,
  Zap,
  Coins,
  Copy,
  Check,
  Sparkles,
  Shield,
  Layers,
  Save,
  Wallet,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountProfile;
  onSaveProfile: (updates: Partial<AccountProfile>) => void;
  wallet: WalletState;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  account,
  onSaveProfile,
  wallet,
}) => {
  const [name, setName] = useState(account.name);
  const [avatar, setAvatar] = useState(account.avatar);
  const [bio, setBio] = useState(account.bio || 'UNO enthusiast & strategist');
  const [copiedId, setCopiedId] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileRecord | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(account.name);
      setAvatar(account.avatar);
      setBio(account.bio || 'UNO enthusiast & strategist');
      setSavedSuccess(false);

      // Fetch user profile from database by connected wallet address or account id
      setLoadingStats(true);
      const targetUrl = wallet.address
        ? `/api/profile/by-address/${encodeURIComponent(wallet.address)}`
        : `/api/profile/${account.id}`;

      fetch(targetUrl)
        .then((res) => {
          if (res.ok) return res.json();
          if (wallet.address) {
            return fetch(`/api/profile/${account.id}`).then((r) => (r.ok ? r.json() : null));
          }
          return null;
        })
        .then((data) => {
          if (data) {
            setProfileData(data);
            if (data.name) setName(data.name);
            if (data.avatar) setAvatar(data.avatar);
            if (data.bio) setBio(data.bio);
          }
        })
        .catch((err) => console.warn('Could not fetch server profile:', err))
        .finally(() => setLoadingStats(false));
    }
  }, [isOpen, account.id, account.name, account.avatar, account.bio, wallet.address]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(account.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Player';
    const cleanBio = bio.trim();

    onSaveProfile({
      name: cleanName,
      avatar,
      bio: cleanBio,
    });

    // Save to server database
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: account.id,
        name: cleanName,
        avatar,
        bio: cleanBio,
        address: wallet.address || account.address,
      }),
    })
      .then((res) => res.json())
      .then((updated) => {
        if (updated) setProfileData(updated);
      })
      .catch((err) => console.warn('Failed to save profile to database:', err));

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const rawStats = (profileData?.stats as any) || {};
  const stats = {
    gamesPlayed: rawStats.matchesPlayed ?? rawStats.gamesPlayed ?? 0,
    gamesWon: rawStats.wins ?? rawStats.gamesWon ?? 0,
    cardsPlayed: rawStats.cardsPlayed ?? 0,
    winStreak: rawStats.winStreak ?? 0,
    bestWinStreak: rawStats.bestWinStreak ?? 0,
    totalEarningsEth: rawStats.totalWinnings ?? rawStats.totalEarningsEth ?? '0.000',
  };

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-lg">
              {avatar}
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Player Profile & Stats</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                  Database Synced
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Persistent across refreshes, devices, and rooms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Handle & Avatar */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Lobby Display Handle
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={18}
                  placeholder="Your player handle"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400 text-sm font-bold transition-colors"
                  required
                />
              </div>
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Select Your Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {DEFAULT_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                      avatar === av
                        ? 'bg-amber-500/20 border-2 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio / Tagline */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Player Status / Bio
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={60}
                placeholder="e.g. Always holding a Wild +4 card"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400 text-xs transition-colors"
              />
            </div>

            {/* Player ID & Friend Code */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Your Friend Code / Player ID
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 truncate max-w-[260px]">
                  {account.id}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Wallet Integration Status */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Hemi Sepolia Settlement Wallet
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {wallet.address ? formatAddress(wallet.address) : 'No Web3 wallet linked'}
                  </div>
                </div>
              </div>
              {wallet.address && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  Connected
                </span>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={savedSuccess}
              className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                savedSuccess
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20 active:scale-98'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Profile Saved to Database!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </form>

          {/* Database Career Stats */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Career Database Stats</span>
              {loadingStats && (
                <span className="text-[10px] text-slate-500 font-normal">Loading...</span>
              )}
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Wins */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-lg font-black text-amber-400 font-mono">
                  {stats.gamesWon}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Victories
                </div>
              </div>

              {/* Matches */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-lg font-black text-white font-mono">
                  {stats.gamesPlayed}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Matches
                </div>
              </div>

              {/* Win Rate */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {winRate}%
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Win Rate
                </div>
              </div>

              {/* Current Streak */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-lg font-black text-rose-400 font-mono flex items-center justify-center gap-1">
                  <span>{stats.winStreak}</span>
                  {stats.winStreak > 1 && <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Win Streak
                </div>
              </div>

              {/* Best Streak */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-lg font-black text-purple-400 font-mono">
                  {stats.bestWinStreak}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Best Streak
                </div>
              </div>

              {/* Cards Played */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-lg font-black text-blue-400 font-mono">
                  {stats.cardsPlayed}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cards Played
                </div>
              </div>
            </div>

            {/* Total Pot Earnings */}
            <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">
                  Total Career Pot Won
                </span>
              </div>
              <div className="text-sm font-black text-amber-400 font-mono">
                {stats.totalEarningsEth} ETH
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
