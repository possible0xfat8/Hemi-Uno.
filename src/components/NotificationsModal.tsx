import React, { useState } from 'react';
import { UserNotification } from '../types';
import {
  Bell,
  X,
  Trophy,
  Gift,
  ExternalLink,
  Copy,
  CheckCircle2,
  Trash2,
  Check,
  ShieldCheck,
  Sparkles,
  Inbox,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: UserNotification[];
  onMarkRead: (notificationId?: string) => void;
  onClearAll: () => void;
  onOpenAirdrop?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onClearAll,
  onOpenAirdrop,
}) => {
  const [filter, setFilter] = useState<'all' | 'winnings' | 'airdrops'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'winnings') return n.type === 'match_won';
    if (filter === 'airdrops') return n.type === 'airdrop_claimed';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleCopyTx = (id: string, txHash: string) => {
    navigator.clipboard.writeText(txHash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0E1218] border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-[#FF4600]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF4600]/15 border border-[#FF4600]/30 flex items-center justify-center text-[#FF4600]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Notifications & Payouts
                </h2>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#FF4600] text-white text-[10px] font-black">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                On-chain pot winnings, airdrops, and match records on Hemi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-800/60 relative z-10 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#FF4600] text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('winnings')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'winnings'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Trophy className="w-3 h-3 text-amber-400" />
              Winnings
            </button>
            <button
              onClick={() => setFilter('airdrops')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'airdrops'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Gift className="w-3 h-3 text-emerald-400" />
              Airdrops
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={() => onMarkRead()}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                title="Mark all as read"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-2.5 space-y-2.5 custom-scrollbar relative z-10">
          {filtered.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2.5">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No notifications here</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-3">
                Play match tables or claim your welcome airdrop to earn $CRAZY8 tokens!
              </p>
              {onOpenAirdrop && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAirdrop();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF4600] to-orange-500 text-white font-bold text-xs shadow-md shadow-[#FF4600]/20 hover:brightness-110 cursor-pointer"
                >
                  🎁 Claim 10,000 $CRAZY8 Airdrop
                </button>
              )}
            </div>
          ) : (
            filtered.map((item) => {
              const isWin = item.type === 'match_won';
              const isAirdrop = item.type === 'airdrop_claimed';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) onMarkRead(item.id);
                  }}
                  className={`p-3 rounded-xl border transition-all text-left relative ${
                    item.read
                      ? 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                      : 'bg-slate-900/90 border-[#FF4600]/40 text-white shadow-md shadow-[#FF4600]/5'
                  }`}
                >
                  {!item.read && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FF4600]" />
                  )}

                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-base ${
                        isWin
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                          : isAirdrop
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                      }`}
                    >
                      {isWin ? '🏆' : isAirdrop ? '🎁' : '⚡'}
                    </div>

                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-black text-xs text-white truncate">
                          {item.title}
                        </span>
                        {item.roomCode && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                            {item.roomCode}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug mb-1.5">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                        <span>{formatDate(item.createdAt)}</span>

                        {item.txHash && (
                          <>
                            <span>•</span>
                            <a
                              href={`https://testnet.explorer.hemi.xyz/tx/${item.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 flex items-center gap-0.5 font-mono underline"
                            >
                              <span>Hemi Explorer</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyTx(item.id, item.txHash!);
                              }}
                              className="text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                              title="Copy transaction hash"
                            >
                              {copiedId === item.id ? (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                              <span>{copiedId === item.id ? 'Copied' : 'Tx'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info banner */}
        <div className="pt-3 border-t border-slate-800/80 shrink-0 text-center relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
            <span>Smart Contract Escrow on Hemi Sepolia (Chain ID 743111)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
