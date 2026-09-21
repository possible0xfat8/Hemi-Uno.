import React from 'react';
import { CardColor } from '../types';
import { soundEngine } from '../utils/audio';

interface WildColorModalProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
  onCancel: () => void;
  cardLabel?: string;
}

export const WildColorModal: React.FC<WildColorModalProps> = ({
  isOpen,
  onSelectColor,
  onCancel,
  cardLabel = 'Wild Card',
}) => {
  if (!isOpen) return null;

  const colors: { name: CardColor; label: string; bg: string; hover: string }[] = [
    { name: 'red', label: 'RED', bg: 'bg-rose-600', hover: 'hover:bg-rose-500' },
    { name: 'blue', label: 'BLUE', bg: 'bg-blue-600', hover: 'hover:bg-blue-500' },
    { name: 'green', label: 'GREEN', bg: 'bg-emerald-600', hover: 'hover:bg-emerald-500' },
    { name: 'yellow', label: 'YELLOW', bg: 'bg-amber-500', hover: 'hover:bg-amber-400 text-slate-950' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-amber-500/20 text-center">
        <div
          className={`inline-block px-3 py-1 rounded-full font-mono text-xs font-black mb-2 border ${
            cardLabel.includes('+4')
              ? 'bg-gradient-to-r from-red-600 via-[#FF4600] to-amber-500 text-white border-white/60 shadow-lg shadow-[#FF4600]/30'
              : 'bg-[#FF4600]/20 text-[#FF4600] border-[#FF4600]/40'
          }`}
        >
          {cardLabel.includes('+4') ? '⚡ SPECIAL +4 WILD' : '★ WILD COLOR'}
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
          {cardLabel.includes('+4') ? 'Play +4 & Choose Color' : 'Choose Next Color'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mb-6">
          {cardLabel.includes('+4')
            ? 'Next opponent will be forced to draw +4 cards unless they defend with another +4! Choose the active color:'
            : 'All subsequent cards must match the chosen color until changed!'}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {colors.map((c) => (
            <button
              key={c.name}
              onClick={() => {
                soundEngine.play('wild');
                onSelectColor(c.name);
              }}
              className={`
                ${c.bg} ${c.hover}
                h-20 sm:h-24 rounded-2xl font-black text-base sm:text-lg tracking-wider
                shadow-lg transition-transform active:scale-95 hover:scale-105
                flex items-center justify-center border border-white/20
              `}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4"
        >
          Cancel and pick different card
        </button>
      </div>
    </div>
  );
};
