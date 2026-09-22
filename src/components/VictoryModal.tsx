import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { GameState } from '../types';
import { Trophy, CheckCircle2, Copy, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';

interface VictoryModalProps {
  gameState: GameState;
  myPlayerId: string;
  isHost: boolean;
  onRematch: () => void;
  onLeaveRoom?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  gameState,
  myPlayerId,
  isHost,
  onRematch,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const winner = gameState.winner;
  const isMe = winner?.id === myPlayerId;
  const signature = gameState.settlementSignature;

  useEffect(() => {
    // Launch celebratory confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  const handleCopySignature = () => {
    if (signature) {
      navigator.clipboard.writeText(JSON.stringify(signature, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaim = () => {
    setClaimed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#0E1217] border-2 border-[#FF4600]/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-lg w-full shadow-2xl shadow-[#FF4600]/20 text-center relative overflow-y-auto max-h-[92vh] sm:max-h-[90vh] custom-scrollbar">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FF4600]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-tr from-[#FF4600] to-orange-400 flex items-center justify-center text-2xl sm:text-4xl shadow-xl shadow-[#FF4600]/40 mb-2.5 sm:mb-3 animate-bounce">
            🏆
          </div>

          <div className="inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#FF4600]/20 border border-[#FF4600]/40 text-[#FF4600] font-mono text-[10px] sm:text-xs font-bold mb-1.5 sm:mb-2">
            HEMI CRAZY 8 • VICTORY!
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            {isMe ? 'YOU WON THE MATCH!' : `${winner?.name || 'Player'} Won!`}
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 mb-3 sm:mb-4">
            {isMe
              ? 'Congratulations! You shed all your cards first.'
              : `${winner?.name} has emptied their hand first.`}
          </p>

          {/* Pot settlement badge */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#090B0E] border border-slate-800 mb-3 sm:mb-4">
            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">
              Escrow Pot Award
            </div>
            <div className="text-xl sm:text-3xl font-black text-[#FF4600] font-mono flex items-center justify-center gap-1.5 sm:gap-2">
              <span>{gameState.escrowPot.amount}</span>
              <span className="text-sm sm:text-base text-orange-300 font-bold">{gameState.escrowPot.currency}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">95% Winner Payout ({(parseFloat(gameState.escrowPot.amount) * 0.95).toFixed(3)} {gameState.escrowPot.currency})</span>
            </div>
          </div>

          {/* Lobby Scoreboard & Standings */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#090B0E] border border-slate-800 mb-3 sm:mb-4 text-left">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                Lobby Standings & Scores
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                Round {gameState.players[0]?.roundsPlayed || 1}
              </span>
            </div>
            <div className="space-y-1 sm:space-y-1.5 max-h-32 sm:max-h-36 overflow-y-auto no-scrollbar">
              {[...gameState.players]
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs ${
                      p.id === winner?.id
                        ? 'bg-[#FF4600]/15 border-[#FF4600]/40 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="font-mono text-slate-400 font-bold w-4 text-[10px] sm:text-xs">#{idx + 1}</span>
                      <span className="text-sm sm:text-base shrink-0">{p.avatar}</span>
                      <span className="font-bold truncate max-w-[85px] sm:max-w-[120px]">{p.name}</span>
                      {p.id === myPlayerId && (
                        <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-[#FF4600] text-white font-bold shrink-0">YOU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 font-mono shrink-0">
                      {p.lastRoundScore !== undefined && p.lastRoundScore > 0 && (
                        <span className="text-emerald-400 text-[10px] sm:text-[11px] font-bold">+{p.lastRoundScore}</span>
                      )}
                      <span className="text-white font-black text-xs sm:text-sm">
                        {p.score || 0} <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">pts</span>
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Hemi Sepolia EIP-712 Signature Box */}
          {signature && (
            <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-[#090B0E]/90 border border-[#FF4600]/30 text-left text-[10px] sm:text-xs mb-3 sm:mb-4 font-mono">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="font-bold text-[#FF4600] flex items-center gap-1">
                  <span>⚡</span> Hemi Settlement Proof
                </span>
                <button
                  onClick={handleCopySignature}
                  className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-300 hover:text-white bg-slate-800 px-1.5 sm:px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-[11px] text-slate-300">
                <div className="truncate"><span className="text-slate-500">Contract:</span> {signature.contractAddress}</div>
                <div className="truncate"><span className="text-slate-500">Winner:</span> {signature.winnerAddress}</div>
                <div className="truncate"><span className="text-slate-500">Sig:</span> {signature.signature.substring(0, 24)}...</div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 justify-center">
            {isMe && (
              <button
                onClick={handleClaim}
                disabled={claimed}
                className={`
                  w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg cursor-pointer
                  ${claimed
                    ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300 cursor-default'
                    : 'bg-gradient-to-r from-[#FF4600] to-[#FF6200] hover:from-[#ff5500] hover:to-[#ff731a] text-white hover:brightness-110 active:scale-95 shadow-[#FF4600]/30'}
                `}
              >
                {claimed ? '✓ Claimed (Hemi Sepolia)' : '⚡ Claim Pot on Hemi'}
              </button>
            )}

            <button
              onClick={onRematch}
              className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 text-white font-black text-xs sm:text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-[#FF4600]/25 cursor-pointer"
            >
              <span>Next Round / Rematch</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span>Quit to Lobby</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
