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
          <div className="absolute -inset-2 rounded-full border-2 border-amber-400 animate-ping opacity-35" />
        )}

        <div
          className={`
            relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl
            bg-slate-900 border-2 transition-all duration-300 shadow-xl
            ${isCurrentTurn ? 'border-amber-400 ring-4 ring-amber-400/30 scale-105 shadow-amber-500/30' : 'border-slate-700'}
            ${!player.isConnected ? 'opacity-50 grayscale' : ''}
          `}
        >
          {player.avatar}

          {/* Turn timer badge when it is their turn */}
          {isCurrentTurn && (
            <div className="absolute -bottom-2 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full shadow-md font-mono">
              {turnTimeRemaining}s
            </div>
          )}

          {/* Bot / Host Tag */}
          {player.isBot && (
            <div className="absolute -top-1 -right-1 bg-sky-600 text-white text-[9px] font-extrabold px-1 rounded-sm uppercase tracking-wider">
              BOT
            </div>
          )}
          {player.isHost && !player.isBot && (
            <div className="absolute -top-1 -left-1 bg-amber-600 text-white text-[9px] font-extrabold px-1 rounded-sm uppercase tracking-wider">
              HOST
            </div>
          )}
        </div>
      </div>

      {/* Player Name and Card Count Tag */}
      <div className="mt-1.5 flex flex-col items-center">
        <div className="px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
          <span className="text-xs font-bold text-slate-200 max-w-[90px] truncate">
            {player.name}
          </span>
          <span
            className={`
              text-[11px] font-black px-1.5 py-0.2 rounded-full font-mono
              ${player.cardCount <= 2 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-amber-400'}
            `}
          >
            {player.cardCount}
          </span>
        </div>

        {player.address && (
          <span className="text-[9px] font-mono text-slate-400 mt-0.5 max-w-[90px] truncate" title={player.address}>
            {player.address.substring(0, 6)}...{player.address.substring(player.address.length - 4)}
          </span>
        )}

        {player.cardCount === 1 && (
          <span className="text-[10px] font-black text-rose-400 tracking-wider animate-bounce mt-0.5">
            LAST CARD!
          </span>
        )}

        {!player.isConnected && (
          <span className="text-[10px] text-red-400 font-semibold mt-0.5">
            Disconnected...
          </span>
        )}
      </div>

      {/* Visual mini fanned cards behind/under opponent */}
      <div className="flex justify-center -space-x-4 mt-1">
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
