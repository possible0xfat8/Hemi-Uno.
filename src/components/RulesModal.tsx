import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-slate-200 relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-amber-400">
          <BookOpen className="w-5 h-5" />
          <h3 className="text-xl font-black tracking-tight">Game Rules & Mechanics</h3>
        </div>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="font-bold text-amber-300 block mb-1">🎯 Objective</span>
            Be the first player to shed all cards from your hand to win the match and claim the escrow pot!
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="font-bold text-sky-300 block mb-1">🃏 Valid Plays</span>
            Play a card that matches the <span className="text-white font-bold">active color</span> OR the <span className="text-white font-bold">active number/rank</span> of the top discard card.
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-bold text-rose-300 block mb-1">⚡ Action Cards</span>
            <div>• <strong className="text-white">Wild Card (Multicolor Oval):</strong> Can be played on any turn. Choose the new active color.</div>
            <div>• <strong className="text-white">+4 Wild Draw 4:</strong> Next player draws 4 cards and loses their turn. You choose the active color.</div>
            <div>• <strong className="text-white">+2 Draw 2:</strong> Next player draws 2 cards and loses their turn.</div>
            <div>• <strong className="text-white">⊘ Skip:</strong> Next player is skipped.</div>
            <div>• <strong className="text-white">⇄ Reverse:</strong> Flips turn direction (Clockwise ⇄ Counter-clockwise).</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="font-bold text-emerald-300 block mb-1">⏱️ Turn Timer & Draw Deck</span>
            Each turn has a strict 20-second authoritative server timer. If you cannot play, draw 1 card. If the drawn card is playable, play it or pass. If time expires, a card is drawn and turn passes.
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="font-bold text-purple-300 block mb-1">⛓️ Hemi Testnet Escrow (Phase 2)</span>
            Pot is escrowed in smart contracts. The authoritative server signs an EIP-712 settlement voucher for the winner to claim 95% of the pot on-chain.
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};
