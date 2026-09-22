import React from 'react';
import { Card, CardColor, BannerAlert, EscrowPotInfo } from '../types';
import { CardComponent } from './CardComponent';
import { RotateCw, RotateCcw, AlertTriangle, Flame } from 'lucide-react';

interface CenterTableProps {
  topDiscardCard: Card | null;
  activeColor: CardColor | null;
  drawPileCount: number;
  turnDirection: 1 | -1;
  isMyTurn: boolean;
  canDraw: boolean;
  onDrawCard: () => void;
  bannerAlert: BannerAlert | null;
  lastActionMessage: string | null;
  escrowPot?: EscrowPotInfo;
  pendingDrawCount?: number;
}

const COLOR_GLOW: Record<CardColor, string> = {
  red: 'border-rose-500 shadow-rose-500/50 bg-rose-500/10 text-rose-400',
  blue: 'border-blue-500 shadow-blue-500/50 bg-blue-500/10 text-blue-400',
  green: 'border-emerald-500 shadow-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  yellow: 'border-amber-400 shadow-amber-400/50 bg-amber-400/10 text-amber-300',
  wild: 'border-purple-500 shadow-purple-500/50 bg-purple-500/10 text-purple-300',
};

export const CenterTable: React.FC<CenterTableProps> = ({
  topDiscardCard,
  activeColor,
  drawPileCount,
  turnDirection,
  isMyTurn,
  canDraw,
  onDrawCard,
  bannerAlert,
  lastActionMessage,
  escrowPot,
  pendingDrawCount = 0,
}) => {
  const activeColorStyle = activeColor ? COLOR_GLOW[activeColor] : 'border-slate-600 bg-slate-800 text-slate-300';

  // If top discard card is a Wild or Wild Draw 4, transform it into activeColor so it visually transforms!
  const effectiveDiscardCard = (topDiscardCard && (topDiscardCard.value === 'wild' || topDiscardCard.value === 'wild_draw4') && activeColor)
    ? {
        ...topDiscardCard,
        color: activeColor,
        label: topDiscardCard.value === 'wild_draw4' ? `+4 ${activeColor.toUpperCase()}` : `${activeColor.toUpperCase()} WILD`,
      }
    : topDiscardCard;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[280px] xs:max-w-[320px] sm:max-w-md md:max-w-lg select-none px-0.5 sm:px-2 shrink-0">
      {/* Banner Alert Banner - anchored cleanly without overlapping player seats or cards */}
      {bannerAlert && (
        <div className="absolute -top-3.5 sm:-top-4 z-40 w-full flex justify-center pointer-events-none animate-in zoom-in-75 duration-200">
          <div className="px-2.5 sm:px-4 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 text-white font-black text-[9px] sm:text-xs tracking-wide uppercase shadow-xl border border-white/50 flex items-center gap-1.5 animate-pulse max-w-[95%] truncate">
            <span>⚡</span>
            <span className="truncate">{bannerAlert.text}</span>
            <span>⚡</span>
          </div>
        </div>
      )}

      {/* Table Felt Surface */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[2/1] rounded-2xl sm:rounded-[40px] bg-gradient-to-b from-[#0E1217] via-[#090B0E] to-[#0E1217] border-2 border-[#FF4600]/40 shadow-2xl shadow-black/80 flex items-center justify-around px-2 sm:px-8 overflow-hidden table-felt-hemi py-1.5 sm:py-2">
        {/* Subtle Felt Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FF4600_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Center Hemi Uno Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/hemi-uno-emblem.svg"
            alt="Hemi Emblem"
            className="w-20 h-20 sm:w-40 sm:h-40 opacity-[0.12] pointer-events-none select-none"
          />
        </div>

        {/* Turn Direction Ambient Ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className={`w-32 h-32 sm:w-56 sm:h-56 rounded-full border border-dashed border-[#FF4600] animate-spin ${turnDirection === 1 ? 'duration-[25000ms]' : 'duration-[25000ms] -scale-x-100'}`} />
        </div>

        {/* Left: Draw Pile */}
        <div id="draw-deck-pile" className="relative flex flex-col items-center z-10">
          <div className="relative cursor-pointer group" onClick={canDraw ? onDrawCard : undefined}>
            {/* Visual stacked card shadows */}
            <div className="absolute -top-1 -left-1 w-13 h-20 xs:w-16 xs:h-24 sm:w-22 sm:h-34 bg-[#090B0E] rounded-xl border border-slate-700 pointer-events-none" />
            <div className="absolute -top-0.5 -left-0.5 w-13 h-20 xs:w-16 xs:h-24 sm:w-22 sm:h-34 bg-[#0E1217] rounded-xl border border-slate-700 pointer-events-none" />

            <CardComponent
              isBack
              size="md"
              className={`
                w-13 h-20 xs:w-16 xs:h-24 sm:w-22 sm:h-34 transition-all duration-200
                ${canDraw && isMyTurn ? (pendingDrawCount > 0 ? 'ring-3 sm:ring-4 ring-rose-500 shadow-xl shadow-rose-500/60 -translate-y-1 sm:-translate-y-2' : 'ring-3 sm:ring-4 ring-[#FF4600] -translate-y-1 sm:-translate-y-2 shadow-lg shadow-[#FF4600]/40 group-hover:-translate-y-2.5') : 'opacity-90'}
              `}
            />

            {canDraw && isMyTurn && (
              <div
                className={`
                  absolute -bottom-2.5 sm:-bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-black rounded-full shadow-md animate-bounce
                  ${pendingDrawCount > 0 ? 'bg-gradient-to-r from-rose-600 to-[#FF4600] text-white border border-rose-300' : 'bg-[#FF4600] text-white shadow-lg shadow-[#FF4600]/50'}
                `}
              >
                {pendingDrawCount > 0 ? `+${pendingDrawCount} CARDS` : 'DRAW'}
              </div>
            )}
          </div>

          <div className="mt-0.5 sm:mt-2 text-[9px] sm:text-[11px] font-bold text-slate-400 font-mono flex items-center gap-1">
            <span>DECK:</span>
            <span className="text-[#FF4600] font-black">{drawPileCount}</span>
          </div>
        </div>

        {/* Center: Turn Direction & Active Color Pill */}
        <div className="flex flex-col items-center gap-1 sm:gap-2.5 z-10">
          {/* Active Defense Stack Callout if > 0 */}
          {pendingDrawCount > 0 && (
            <div className="px-1.5 py-0.2 sm:px-2.5 sm:py-1 rounded-full bg-rose-600/90 border border-rose-400 text-white font-black text-[8px] sm:text-[11px] flex items-center gap-1 shadow-lg shadow-rose-600/40 animate-pulse">
              <Flame className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300 fill-amber-300" />
              <span>STACK: +{pendingDrawCount}</span>
            </div>
          )}

          {/* Active Color Indicator */}
          <div
            className={`
              px-2 py-0.5 sm:px-4 sm:py-1.5 rounded-full border-2 shadow-lg backdrop-blur-md flex items-center gap-1 sm:gap-2
              transition-all duration-300 font-black text-[10px] sm:text-sm tracking-wide
              ${activeColorStyle}
            `}
          >
            <span className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-current animate-ping" />
            <span>{activeColor ? activeColor.toUpperCase() : 'WILD'}</span>
          </div>

          {/* Turn Direction Badge */}
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-[#090B0E]/90 border border-slate-800 text-[8px] sm:text-xs text-slate-300 font-mono">
            {turnDirection === 1 ? (
              <>
                <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FF4600] animate-spin" style={{ animationDuration: '4s' }} />
                <span>CW</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>REV</span>
              </>
            )}
          </div>

          {/* Escrow Pot Info */}
          {escrowPot && (
            <div className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-lg bg-[#FF4600]/15 border border-[#FF4600]/40 text-[8px] sm:text-[10px] font-bold text-[#FF4600] font-mono">
              POT: {escrowPot.amount} {escrowPot.currency}
            </div>
          )}
        </div>

        {/* Right: Discard Pile (Top Card) */}
        <div id="center-discard-pile" className="relative flex flex-col items-center z-10">
          {effectiveDiscardCard ? (
            <div className="relative">
              <CardComponent
                card={effectiveDiscardCard}
                size="md"
                rotation={-3}
                className="w-13 h-20 xs:w-16 xs:h-24 sm:w-22 sm:h-34 transition-transform duration-300 hover:rotate-0"
              />
            </div>
          ) : (
            <div className="w-13 h-20 xs:w-16 xs:h-24 sm:w-22 sm:h-34 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
              DISCARD
            </div>
          )}

          <div className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider">DISCARD</span>
            {effectiveDiscardCard && (
              <span className={`text-[10px] sm:text-xs font-black tracking-wide max-w-[85px] sm:max-w-none truncate text-center ${
                effectiveDiscardCard.value === 'wild_draw4' ? 'text-[#FF4600]' :
                effectiveDiscardCard.value === 'draw2' ? 'text-amber-400' : 'text-slate-200'
              }`}>
                {effectiveDiscardCard.value === 'wild_draw4' ? `+4 ${effectiveDiscardCard.color.toUpperCase()}` :
                 effectiveDiscardCard.value === 'draw2' ? `+2 ${effectiveDiscardCard.color.toUpperCase()}` :
                 effectiveDiscardCard.value === 'skip' ? `SKIP` :
                 effectiveDiscardCard.value === 'reverse' ? `REV` :
                 effectiveDiscardCard.value === 'wild' ? `${effectiveDiscardCard.color.toUpperCase()} WILD` :
                 `${effectiveDiscardCard.color.toUpperCase()} ${effectiveDiscardCard.value}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action ticker bar */}
      {lastActionMessage && (
        <div className="mt-1.5 sm:mt-2 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-xs text-slate-300 font-medium text-center shadow-md max-w-sm sm:max-w-md truncate">
          {lastActionMessage}
        </div>
      )}
    </div>
  );
};
