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
  return (
    <div
      id={`opponent-seat-${player.id}`}
      className={`relative flex flex-col items-center select-none ${positionStyle}`}
    >
      {/* Floating Emote on top */}
      <FloatingEmoteDisplay emotes={emotes} targetPlayerId={player.id} />

      {/* Turn Countdown Ring / Glow & Avatar */}
      <div className="relative">
        {isCurrentTurn && (
          <div className="absolute -inset-1 sm:-inset-1.5 rounded-full border-2 border-[#FF4600] animate-ping opacity-35" />
        )}

        <div
          className={`
            relative w-10 h-10 xs:w-11 xs:h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg xs:text-xl sm:text-2xl
            bg-[#090B0E] border-2 transition-all duration-300 shadow-xl
            ${isCurrentTurn ? 'border-[#FF4600] ring-3 ring-[#FF4600]/40 scale-105 shadow-[#FF4600]/40' : 'border-slate-800'}
            ${!player.isConnected ? 'opacity-50 grayscale' : ''}
          `}
        >
          {player.avatar}

          {/* Turn timer badge when it is their turn */}
          {isCurrentTurn && (
            <div className="absolute -bottom-1 -right-1 bg-[#FF4600] text-white font-black text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full shadow-md font-mono">
              {turnTimeRemaining}s
            </div>
          )}

          {/* Bot / Host Tag */}
          {player.isBot && (
            <div className="absolute -top-1 -right-1 bg-sky-600 text-white text-[7px] sm:text-[8px] font-extrabold px-1 rounded-sm uppercase tracking-wider">
              BOT
            </div>
          )}
          {player.isHost && !player.isBot && (
            <div className="absolute -top-1 -left-1 bg-[#FF4600] text-white text-[7px] sm:text-[8px] font-extrabold px-1 rounded-sm uppercase tracking-wider">
              HOST
            </div>
          )}
        </div>
      </div>

      {/* Player Name and Card Count Tag */}
      <div className="mt-1 flex flex-col items-center max-w-[85px] sm:max-w-[110px]">
        <div className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#0E1217]/95 border border-slate-700/80 backdrop-blur-md flex items-center gap-1 shadow-sm max-w-full">
          <span className="text-[10px] sm:text-xs font-bold text-slate-200 truncate max-w-[45px] sm:max-w-[65px]">
            {player.name}
          </span>
          <span
            className={`
              text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono shrink-0 flex items-center gap-0.5
              ${player.cardCount <= 2 ? 'bg-rose-600 text-white animate-pulse' : 'bg-[#090B0E] text-[#FF4600] border border-[#FF4600]/30'}
            `}
            title={`${player.cardCount} cards remaining`}
          >
            <span className="text-[8px] opacity-70">🂠</span>
            <span>{player.cardCount}</span>
          </span>
        </div>

        {/* Score display during match */}
        {(player.score !== undefined && player.score > 0) && (
          <span className="text-[8px] sm:text-[9px] text-amber-400 font-mono font-bold mt-0.5 flex items-center gap-0.5">
            🏆 {player.score} pts
          </span>
        )}

        {player.cardCount === 1 && (
          <span className="text-[8px] sm:text-[9px] font-black text-rose-400 tracking-wider animate-bounce mt-0.5">
            LAST CARD!
          </span>
        )}

        {!player.isConnected && (
          <span className="text-[8px] text-red-400 font-semibold mt-0.5">
            Offline
          </span>
        )}
      </div>
    </div>
  );
};
