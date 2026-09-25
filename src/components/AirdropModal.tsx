import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Gift,
  CheckCircle2,
  ExternalLink,
  X,
  Loader2,
  Coins,
  ShieldCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { claimWelcomeAirdrop, CRAZY8_TOKEN_ADDRESS, CRAZY8_AIRDROP_AMOUNT } from '../utils/token';

interface AirdropModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  onClaimSuccess: (newBalance: string) => void;
}

export const AirdropModal: React.FC<AirdropModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  onClaimSuccess,
}) => {
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (!walletAddress) return;
    setClaiming(true);
    setError(null);

    const result = await claimWelcomeAirdrop(walletAddress);
    setClaiming(false);

    if (result.success && result.balance) {
      setTxHash(result.txHash || null);
      setClaimed(true);
      onClaimSuccess(result.balance);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF4600', '#FF8000', '#FFD700', '#10B981'],
      });
    } else {
      setError(result.error || 'Failed to claim airdrop. You may have already claimed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0E1217] border-2 border-[#FF4600]/50 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative text-center overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FF4600]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-end mb-1">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!claimed ? (
          <>
            {/* Header Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-[#FF4600]/30 to-[#FF8000]/10 border-2 border-[#FF4600]/40 flex items-center justify-center mx-auto mb-4 text-[#FF5500] shadow-xl shadow-[#FF4600]/20">
              <Gift className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-[#FF4600]/20 border border-[#FF4600]/40 text-[#FF4600] font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2">
              Hemi Sepolia Testnet Airdrop
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
              Claim 10,000 $CRAZY8
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Welcome to <strong>Hemi Crazy 8</strong>! Claim your free gasless testnet chips to join tables, bet on pots, and win real match rewards.
            </p>

            {/* Airdrop Specs Box */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-5 text-left space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Airdrop Amount:</span>
                <span className="font-bold text-amber-400">10,000 $CRAZY8</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Gas Fee:</span>
                <span className="font-bold text-emerald-400">0.00 ETH (Gasless - Admin Sponsored)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Claim Limit:</span>
                <span className="text-slate-300">1 Time per Wallet (On-Chain)</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 mb-4 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={claiming || !walletAddress}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5500] via-[#FF4600] to-[#E03A00] hover:from-[#FF6611] hover:to-[#FF4600] text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-[#FF4600]/30 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispensing on Hemi Sepolia...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Claim 10,000 Free Chips</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
              Airdrop Received!
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              10,000 $CRAZY8 tokens have landed in your wallet. You are ready to enter game tables, place bets, and compete for the 95% winner escrow pot!
            </p>

            {txHash && (
              <a
                href={`https://testnet.explorer.hemi.xyz/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-amber-400 hover:text-white transition-colors font-mono mb-6"
              >
                <span>View on Hemi Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/30 active:scale-98 cursor-pointer"
            >
              Let's Play Crazy 8!
            </button>
          </>
        )}
      </div>
    </div>
  );
};
