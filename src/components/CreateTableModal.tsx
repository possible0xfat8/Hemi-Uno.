import React, { useState } from 'react';
import { X, Users, Sparkles, Coins, ArrowRight, Shield } from 'lucide-react';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (playerName: string, avatar: string, buyIn: string, address?: string) => void;
  playerName: string;
  avatar: string;
  walletAddress?: string;
}

const MODES = [
  { id: 'Classic', title: 'Classic', desc: 'The original official rules for 2-4 players.', icon: '🎴' },
  { id: 'Stacked Draw', title: 'Stacked Draw', desc: 'Defend and stack +2 and +4 cards to force rivals to draw!', icon: '⚡' },
  { id: 'Quick Match', title: 'Quick Match', desc: 'Short 15s turn timer with fast animations.', icon: '⏱️' },
];

const BUY_INS = ['Free', '0.001', '0.005', '0.01', '0.05'];

export const CreateTableModal: React.FC<CreateTableModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  playerName,
  avatar,
  walletAddress,
}) => {
  const [selectedMode, setSelectedMode] = useState('Classic');
  const [selectedBuyIn, setSelectedBuyIn] = useState('Free');

  if (!isOpen) return null;

  const handleCreate = () => {
    const buyInValue = selectedBuyIn === 'Free' ? '0.000' : selectedBuyIn;
    onCreateRoom(playerName, avatar, buyInValue, walletAddress);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0E1217] border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] text-white flex items-center justify-center shadow-lg shadow-[#FF4600]/25">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Create Table</h2>
              <p className="text-xs text-slate-400">Host your own game with custom rules and buy-in</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Game Mode Selector */}
        <div className="space-y-4 mb-6">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
            Select Game Mode
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {MODES.map((m) => {
              const active = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  type="button"
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3.5 ${
                    active
                      ? 'bg-[#FF4600]/15 border-[#FF4600] shadow-md shadow-[#FF4600]/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <span>{m.title}</span>
                      {active && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FF4600] text-white font-bold">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buy-In Selection */}
        <div className="mb-8">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2.5">
            Buy-in Pot (ETH)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {BUY_INS.map((amount) => {
              const active = selectedBuyIn === amount;
              return (
                <button
                  key={amount}
                  onClick={() => setSelectedBuyIn(amount)}
                  type="button"
                  className={`py-2.5 px-2 rounded-xl text-xs font-mono font-bold transition-all text-center border ${
                    active
                      ? 'bg-[#FF4600] text-white border-[#FF4600] shadow-lg shadow-[#FF4600]/25 scale-105'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {amount}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCreate}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5500] via-[#FF4600] to-[#E03A00] hover:from-[#FF6611] hover:to-[#FF4600] text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-[#FF4600]/30 active:scale-98 flex items-center justify-center gap-2"
        >
          <span>Create and Open Table</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
