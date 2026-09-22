import React from 'react';
import { X } from 'lucide-react';
import { CardComponent } from './CardComponent';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#18181b] border border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-lg w-full shadow-2xl text-slate-100 relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Top Header matching iMessage screenshot */}
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/10 mb-3 sm:mb-4 sticky top-0 bg-[#18181b]/95 backdrop-blur-sm z-20">
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <h3 className="font-['Montserrat','Arial_Black',sans-serif] font-bold text-sm sm:text-lg text-white/90 tracking-wide text-center flex-1 pr-7 sm:pr-8">
            How to play CRAZY 8
          </h3>
        </div>

        {/* Special cards section */}
        <div className="space-y-6 text-sm">
          <div>
            <h4 className="font-['Montserrat','Arial_Black',sans-serif] font-black text-lg sm:text-xl text-white tracking-tight mb-4">
              Special cards:
            </h4>
          </div>

          {/* 1. Crazy 8 */}
          <div className="space-y-2.5 pb-4 border-b border-white/10">
            <h5 className="font-['Montserrat','Arial_Black',sans-serif] font-black text-base text-white">
              Crazy 8
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-[#5c1313] border border-white/15 shadow-inner">
                <CardComponent
                  card={{ id: 'preview-8', color: 'wild', value: '8', label: 'Crazy 8' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Can be played on any card on the discard pile, and allows you to change its color.
              </p>
            </div>
          </div>

          {/* 2. Skip */}
          <div className="space-y-2.5 pb-4 border-b border-white/10">
            <h5 className="font-['Montserrat','Arial_Black',sans-serif] font-black text-base text-white">
              Skip
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-[#5c1313] border border-white/15 shadow-inner">
                <CardComponent
                  card={{ id: 'preview-skip', color: 'red', value: 'skip', label: 'Skip' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Next player loses their turn.
              </p>
            </div>
          </div>

          {/* 3. Reverse */}
          <div className="space-y-2.5 pb-4 border-b border-white/10">
            <h5 className="font-['Montserrat','Arial_Black',sans-serif] font-black text-base text-white">
              Reverse
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-[#5c1313] border border-white/15 shadow-inner">
                <CardComponent
                  card={{ id: 'preview-reverse', color: 'green', value: 'reverse', label: 'Reverse' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Changes the direction of play.
              </p>
            </div>
          </div>

          {/* 4. Draw 2 */}
          <div className="space-y-2.5 pb-4 border-b border-white/10">
            <h5 className="font-['Montserrat','Arial_Black',sans-serif] font-black text-base text-white">
              Draw 2
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-[#5c1313] border border-white/15 shadow-inner">
                <CardComponent
                  card={{ id: 'preview-draw2', color: 'blue', value: 'draw2', label: 'Draw 2' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Next player draws 2 cards and skips their turn. If the next player has a Draw 2 card of his own, then he can defend himself and stack his Draw 2 card on top and transfer the result over to the next player.
              </p>
            </div>
          </div>

          {/* 5. Crazy Draw 4 */}
          <div className="space-y-2.5 pb-4 border-b border-white/10">
            <h5 className="font-['Montserrat','Arial_Black',sans-serif] font-black text-base text-white">
              Crazy Draw 4
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-[#5c1313] border border-white/15 shadow-inner">
                <CardComponent
                  card={{ id: 'preview-draw4', color: 'wild', value: 'wild_draw4', label: 'Crazy Draw 4' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Can be played on any card on the discard pile, and allows you to change its color. Next player draws 4 cards and skips their turn. If the next player has a Draw 4 card of his own, then he can defend himself and stack his Draw 4 card on top and transfer the result over to the next player.
              </p>
            </div>
          </div>

          {/* Objective & Turn Rules */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs text-slate-300">
            <div className="font-bold text-amber-400 text-sm">🎯 Goal & Turn Flow</div>
            <p>• Shed all your cards first to win the match and claim the Hemi crypto pot!</p>
            <p>• Play a card matching either the active suit/color or the number of the top card.</p>
            <p>• Crazy 8 and Crazy Draw 4 have temporary rainbow colors in your hand and allow you to change the active suit to any color when played!</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 hover:opacity-90 text-white font-['Montserrat','Arial_Black',sans-serif] font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};
