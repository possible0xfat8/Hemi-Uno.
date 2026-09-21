import React, { useState } from 'react';
import { Card as CardType, CardColor } from '../types';

interface CardProps {
  card?: CardType;
  isBack?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  rotation?: number;
}

const COLOR_GLOW: Record<CardColor, string> = {
  red: 'shadow-red-500/50 hover:shadow-red-500/70 ring-red-400',
  blue: 'shadow-blue-500/50 hover:shadow-blue-500/70 ring-blue-500',
  green: 'shadow-emerald-500/50 hover:shadow-emerald-500/70 ring-emerald-400',
  yellow: 'shadow-amber-400/50 hover:shadow-amber-400/70 ring-amber-300',
  wild: 'shadow-purple-500/60 hover:shadow-purple-500/80 ring-purple-300',
};

// Helper function to resolve the official SVG asset URL
export function getCardAssetSrc(card?: CardType, isBack?: boolean): string {
  if (isBack || !card) {
    return '/assets/cards/card_back.svg';
  }
  // MUST evaluate wild_draw4 BEFORE general wild color!
  if (card.value === 'wild_draw4') {
    return '/assets/cards/wild_draw4.svg';
  }
  if (card.color === 'wild' || card.value === 'wild') {
    return '/assets/cards/wild.svg';
  }
  return `/assets/cards/${card.color}_${card.value}.svg`;
}

export const CardComponent: React.FC<CardProps> = ({
  card,
  isBack = false,
  isPlayable = false,
  isSelected = false,
  onClick,
  className = '',
  size = 'md',
  rotation = 0,
}) => {
  const [imgError, setImgError] = useState(false);

  // Aspect ratio of UNO card is 2:3 (e.g. 240x360)
  const sizeClasses = {
    sm: 'w-11 h-[68px] sm:w-13 sm:h-[80px]',
    md: 'w-20 h-[120px] sm:w-24 sm:h-[144px]',
    lg: 'w-28 h-[168px] sm:w-32 sm:h-[192px]',
  }[size];

  const imgSrc = getCardAssetSrc(card, isBack);
  const glowStyle = card ? COLOR_GLOW[card.color] : 'shadow-amber-500/30 ring-amber-400';

  if (isBack || !card) {
    return (
      <div
        id={card ? `card-back-${card.id}` : 'card-back'}
        style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
        className={`
          ${sizeClasses}
          relative rounded-xl overflow-hidden shadow-lg shadow-black/70 select-none
          transition-transform duration-200 cursor-default shrink-0
          border border-slate-900/40 bg-black
          ${className}
        `}
      >
        <img
          src="/assets/cards/card_back.svg"
          alt="Card Back"
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
          loading="eager"
          draggable={false}
        />
        {/* Subtle physical card glare effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
      </div>
    );
  }

  // Determine special card badges and identifiers
  const isDraw4 = card.value === 'wild_draw4';
  const isDraw2 = card.value === 'draw2';
  const isWildRegular = card.value === 'wild';
  const isSkip = card.value === 'skip';
  const isReverse = card.value === 'reverse';

  // Badge styles based on card type
  const draw2Bg = {
    red: 'bg-red-600 border-red-400/80 text-white shadow-red-500/60',
    blue: 'bg-blue-600 border-blue-400/80 text-white shadow-blue-500/60',
    green: 'bg-emerald-600 border-emerald-400/80 text-white shadow-emerald-500/60',
    yellow: 'bg-amber-400 border-amber-300 text-slate-950 shadow-amber-500/60 font-black',
    wild: 'bg-purple-600 border-purple-400 text-white shadow-purple-500/60',
  }[card.color] || 'bg-slate-800 text-white border-white/50';

  return (
    <div
      id={`card-${card.id}`}
      onClick={isPlayable ? onClick : undefined}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
      className={`
        ${sizeClasses}
        relative rounded-xl overflow-hidden select-none shrink-0
        transition-all duration-200 cursor-pointer
        shadow-md
        ${isPlayable ? `ring-2 ring-white/90 shadow-xl hover:-translate-y-3.5 hover:scale-105 active:scale-95 ${glowStyle}` : 'opacity-85 hover:opacity-95'}
        ${isSelected ? '-translate-y-4 ring-4 ring-[#FF4600] scale-105 shadow-2xl shadow-[#FF4600]/50' : ''}
        ${isDraw4 ? 'ring-1 ring-[#FF4600]/60' : ''}
        ${className}
      `}
    >
      {!imgError ? (
        <img
          src={imgSrc}
          alt={`${card.color} ${card.label}`}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm transition-transform duration-150"
          loading="eager"
          draggable={false}
        />
      ) : (
        /* Graceful fallback if an image asset is not loaded */
        <div className="w-full h-full flex flex-col items-center justify-between p-2 bg-slate-900 border-2 border-white/20 rounded-xl text-white font-black text-center">
          <span className="text-xs">{card.label}</span>
          <span className="text-xl font-mono">{card.value}</span>
          <span className="text-xs rotate-180">{card.label}</span>
        </div>
      )}

      {/* SPECIAL CARD: Prominent Corner & Center Badges */}
      {/* 1. WILD DRAW 4 SPECIAL CARD */}
      {isDraw4 && (
        <>
          {/* Top-Left Corner Badge */}
          <div className="absolute top-1 left-1 z-20 pointer-events-none">
            <span
              className={`
                inline-flex items-center justify-center font-black rounded-md tracking-tighter shadow-md border
                bg-gradient-to-br from-black via-[#090B0E] to-[#FF4600] text-white border-[#FF4600]
                ${size === 'sm' ? 'text-[9px] px-1 py-0.2' : size === 'md' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'}
              `}
            >
              +4
            </span>
          </div>

          {/* Bottom-Right Corner Badge (Inverted) */}
          <div className="absolute bottom-1 right-1 z-20 pointer-events-none rotate-180">
            <span
              className={`
                inline-flex items-center justify-center font-black rounded-md tracking-tighter shadow-md border
                bg-gradient-to-br from-black via-[#090B0E] to-[#FF4600] text-white border-[#FF4600]
                ${size === 'sm' ? 'text-[9px] px-1 py-0.2' : size === 'md' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'}
              `}
            >
              +4
            </span>
          </div>

          {/* Center Explicit Pill Identifier */}
          <div className="absolute inset-x-1 bottom-3 sm:bottom-4 z-20 flex justify-center pointer-events-none">
            <div className="px-1.5 py-0.5 rounded-full bg-black/90 border border-[#FF4600] text-[#FF4600] font-black tracking-wider text-[9px] sm:text-[10px] shadow-lg shadow-black/80 flex items-center gap-0.5 backdrop-blur-sm">
              <span className="bg-[#FF4600] text-white px-1 py-0.2 rounded-full font-mono text-[8px] sm:text-[9px]">
                +4
              </span>
              <span>WILD</span>
            </div>
          </div>
        </>
      )}

      {/* 2. DRAW 2 SPECIAL CARD (+2) */}
      {isDraw2 && (
        <>
          {/* Top-Left Corner Badge */}
          <div className="absolute top-1 left-1 z-20 pointer-events-none">
            <span
              className={`
                inline-flex items-center justify-center font-black rounded-md tracking-tighter shadow-md border
                ${draw2Bg}
                ${size === 'sm' ? 'text-[9px] px-1 py-0.2' : size === 'md' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'}
              `}
            >
              +2
            </span>
          </div>

          {/* Bottom-Right Corner Badge (Inverted) */}
          <div className="absolute bottom-1 right-1 z-20 pointer-events-none rotate-180">
            <span
              className={`
                inline-flex items-center justify-center font-black rounded-md tracking-tighter shadow-md border
                ${draw2Bg}
                ${size === 'sm' ? 'text-[9px] px-1 py-0.2' : size === 'md' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'}
              `}
            >
              +2
            </span>
          </div>

          {/* Center Explicit Pill Identifier */}
          <div className="absolute inset-x-1 bottom-3 sm:bottom-4 z-20 flex justify-center pointer-events-none">
            <div className="px-1.5 py-0.5 rounded-full bg-black/90 border border-white/40 text-white font-black tracking-wider text-[9px] sm:text-[10px] shadow-lg shadow-black/80 flex items-center gap-0.5 backdrop-blur-sm">
              <span className={`px-1 py-0.2 rounded-full font-mono text-[8px] sm:text-[9px] ${draw2Bg}`}>
                +2
              </span>
              <span>DRAW</span>
            </div>
          </div>
        </>
      )}

      {/* 3. REGULAR WILD COLOR PICKER CARD */}
      {isWildRegular && (
        <>
          {/* Top-Left Corner Badge */}
          <div className="absolute top-1 left-1 z-20 pointer-events-none">
            <span
              className={`
                inline-flex items-center justify-center font-black rounded-md tracking-tighter shadow-md border
                bg-gradient-to-br from-purple-700 via-pink-600 to-amber-500 text-white border-white/60
                ${size === 'sm' ? 'text-[8px] px-1 py-0.2' : size === 'md' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}
              `}
            >
              W
            </span>
          </div>

          {/* Center Explicit Pill Identifier */}
          <div className="absolute inset-x-1 bottom-3 sm:bottom-4 z-20 flex justify-center pointer-events-none">
            <div className="px-2 py-0.5 rounded-full bg-black/90 border border-purple-400 text-purple-200 font-black tracking-wider text-[9px] sm:text-[10px] shadow-lg shadow-black/80 flex items-center gap-1 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500" />
              <span>WILD</span>
            </div>
          </div>
        </>
      )}

      {/* 4. SKIP CARD */}
      {isSkip && (
        <div className="absolute top-1 left-1 z-20 pointer-events-none">
          <span
            className={`
              inline-flex items-center justify-center font-black rounded-md tracking-tighter shadow-md border
              bg-black/80 text-white border-white/40
              ${size === 'sm' ? 'text-[8px] px-1 py-0.2' : size === 'md' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}
            `}
          >
            ⊘
          </span>
        </div>
      )}

      {/* 5. REVERSE CARD */}
      {isReverse && (
        <div className="absolute top-1 left-1 z-20 pointer-events-none">
          <span
            className={`
              inline-flex items-center justify-center font-black rounded-md tracking-tighter shadow-md border
              bg-black/80 text-white border-white/40
              ${size === 'sm' ? 'text-[8px] px-1 py-0.2' : size === 'md' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}
            `}
          >
            ⇄
          </span>
        </div>
      )}

      {/* Playable Aura Pulse */}
      {isPlayable && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-white/70 pointer-events-none animate-pulse" />
      )}

      {/* Acrylic Card Glaze Reflection */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/10 rounded-xl pointer-events-none" />
    </div>
  );
};

