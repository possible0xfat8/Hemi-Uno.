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
  if (card.color === 'wild' || card.value === 'wild') {
    return '/assets/cards/wild.svg';
  }
  if (card.value === 'wild_draw4') {
    return '/assets/cards/wild_draw4.svg';
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
        ${isSelected ? '-translate-y-4 ring-4 ring-amber-300 scale-105 shadow-2xl' : ''}
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

      {/* Playable Aura Pulse */}
      {isPlayable && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-white/70 pointer-events-none animate-pulse" />
      )}

      {/* Acrylic Card Glaze Reflection */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/10 rounded-xl pointer-events-none" />
    </div>
  );
};

