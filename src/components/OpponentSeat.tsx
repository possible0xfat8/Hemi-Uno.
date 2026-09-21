import React from 'react';
import { Player, FloatingEmote } from '../types';
import { CardComponent } from './CardComponent';
import { FloatingEmoteDisplay } from './ReactionWheel';

interface OpponentSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  turnTimeRemaining: number;
  turnTimeTotal: number;
  emotes: FloatingEmote[];
  positionStyle?: string;
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isCurrentTurn,
  turnTimeRemaining,
  turnTimeTotal,
  emotes,
  positionStyle = '',
}) => {
  // Show max 6 visual cards in fan to avoid clutter, with total count badge
  const displayCardCount = Math.min(6, player.cardCount);
  const percentRemaining = (turnTimeRemaining / turnTimeTotal) * 100;

  return (
    <div
      id={`opponent-seat-${player.id}`}
      className={`relative flex flex-col items-center select-none ${positionStyle}`}
    >
      {/* Floating Emote on top */}
      <FloatingEmoteDisplay emotes={emotes} targetPlayerId={player.id} />

      {/* Turn Countdown Ring / Glow */}
      <div className="relative">
        {isCurrentTurn && (
          <div className="absolute -inset-1.5 sm:-inset-2 rounded-full border-2 border-[#FF4600] animate-ping opacity-35" />
        )}

        <div
          className={`
            relative w-11 h-11 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-3xl
            bg-[#090B0E] border-2 transition-all duration-300 shadow-xl
            ${isCurrentTurn ? 'border-[#FF4600] ring-3 sm:ring-4 ring-[#FF4600]/30 scale-105 shadow-[#FF4600]/40' : 'border-slate-800'}
            ${!player.isConnected ? 'opacity-50 grayscale' : ''}
          `}
        >
          {player.avatar}

          {/* Turn timer badge when it is their turn */}
          {isCurrentTurn && (
            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-1 bg-[#FF4600] text-white font-black text-[9px] sm:text-xs px-1.5 py-0.2 sm:py-0.5 rounded-full shadow-md font-mono">
              {turnTimeRemaining}s
            </div>
          )}

          {/* Bot / Host Tag */}
          {player.isBot && (
            <div className="absolute -top-1 -right-1 bg-sky-600 text-white text-[8px] sm:text-[9px] font-extrabold px-1 rounded-sm uppercase tracking-wider">
              BOT
            </div>
          )}
          {player.isHost && !player.isBot && (
            <div className="absolute -top-1 -left-1 bg-[#FF4600] text-white text-[8px] sm:text-[9px] font-extrabold px-1 rounded-sm uppercase tracking-wider">
              HOST
            </div>
          )}
        </div>
      </div>

      {/* Player Name and Card Count Tag */}
      <div className="mt-1 flex flex-col items-center">
        <div className="px-2 py-0.5 rounded-full bg-[#0E1217]/95 border border-slate-700/80 backdrop-blur-md flex items-center gap-1 sm:gap-1.5 shadow-sm">
          <span className="text-[11px] sm:text-xs font-bold text-slate-200 max-w-[70px] sm:max-w-[100px] truncate">
            {player.name}
          </span>
          <span
            className={`
              text-[10px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full font-mono
              ${player.cardCount <= 2 ? 'bg-rose-600 text-white animate-pulse' : 'bg-[#090B0E] text-[#FF4600] border border-[#FF4600]/30'}
            `}
          >
            {player.cardCount}
          </span>
        </div>

        {player.cardCount === 1 && (
          <span className="text-[9px] sm:text-[10px] font-black text-rose-400 tracking-wider animate-bounce mt-0.5">
            LAST CARD!
          </span>
        )}

        {!player.isConnected && (
          <span className="text-[9px] text-red-400 font-semibold mt-0.5">
            Offline
          </span>
        )}
      </div>

      {/* Visual mini fanned cards - visible on larger screens, hidden on small mobile to save space */}
      <div className="hidden sm:flex justify-center -space-x-4 mt-1">
        {Array.from({ length: displayCardCount }).map((_, idx) => {
          const rot = (idx - (displayCardCount - 1) / 2) * 8;
          return (
            <CardComponent
              key={idx}
              isBack
              size="sm"
              rotation={rot}
              className="w-7 h-10 shadow-sm border-slate-700 pointer-events-none"
            />
          );
        })}
      </div>
    </div>
  );
};
