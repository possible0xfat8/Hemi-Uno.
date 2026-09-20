import React from 'react';
import { GameInviteEvent } from '../types';
import { Play, X, Sparkles } from 'lucide-react';

interface GameInviteToastProps {
  invite: GameInviteEvent | null;
  onAccept: (roomCode: string) => void;
  onDismiss: () => void;
}

export const GameInviteToast: React.FC<GameInviteToastProps> = ({
  invite,
  onAccept,
  onDismiss,
}) => {
  if (!invite) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full animate-slide-in shadow-2xl">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-2 border-purple-500/60 shadow-purple-500/20 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-2xl flex items-center justify-center shrink-0">
            {invite.senderAvatar}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Game Invitation</span>
            </div>
            <div className="text-xs font-bold text-white truncate">
              {invite.senderName} invited you!
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Room: <span className="text-amber-400 font-bold">{invite.roomCode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onAccept(invite.roomCode)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Join</span>
          </button>
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
