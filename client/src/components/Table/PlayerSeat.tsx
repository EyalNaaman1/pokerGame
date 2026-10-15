import { Bot, Crown, Sparkles, UserPlus } from 'lucide-react';
import React, { useEffect } from 'react';
import { PlayerSeat as PlayerSeatType } from '../../../../shared/types.js';
import { sound } from '../../services/sound.js';
import { CardView } from '../Common/CardView.js';
import { ChipStack } from '../Common/ChipStack.js';

interface PlayerSeatProps {
  seatIndex: number;
  seat: PlayerSeatType | null;
  isCurrentTurn: boolean;
  isDealer: boolean;
  isWinner?: boolean;
  turnTimeLeft: number;
  turnDuration: number;
  isLocalPlayer: boolean;
  onSitDown?: (seatIndex: number) => void;
  className?: string;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  seatIndex,
  seat,
  isCurrentTurn,
  isDealer,
  isWinner = false,
  turnTimeLeft,
  turnDuration,
  isLocalPlayer,
  onSitDown,
  className = '',
}) => {
  // Beep when 4 seconds or fewer remaining on local player turn
  useEffect(() => {
    if (isCurrentTurn && isLocalPlayer && turnTimeLeft <= 4 && turnTimeLeft > 0) {
      sound.playTimerAlert();
    }
  }, [isCurrentTurn, isLocalPlayer, turnTimeLeft]);

  // Empty Seat
  if (!seat) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <button
          onClick={() => onSitDown && onSitDown(seatIndex)}
          className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-500/40 hover:border-amber-400 bg-black/40 hover:bg-emerald-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-0.5 text-emerald-400/80 hover:text-amber-300 transition-all shadow-md group active:scale-95"
        >
          <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Sit</span>
        </button>
      </div>
    );
  }

  // Turn Timer percentage
  const timerPercent = isCurrentTurn && turnDuration > 0 ? (turnTimeLeft / turnDuration) * 100 : 0;
  const timerColor = timerPercent > 50 ? '#10b981' : timerPercent > 20 ? '#f59e0b' : '#ef4444';

  const isFolded = seat.folded;
  const isThinking = seat.lastAction === 'Thinking...';

  return (
    <div
      className={`relative flex flex-col items-center select-none transition-all duration-300 ${
        isFolded ? 'opacity-40 grayscale-[50%]' : ''
      } ${className}`}
    >
      {/* Winner Crown Banner */}
      {isWinner && (
        <div className="absolute -top-7 z-30 flex items-center gap-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black text-[10px] shadow-[0_0_20px_rgba(250,204,21,0.9)] animate-bounce border border-yellow-200">
          <Crown className="w-3.5 h-3.5 fill-current text-slate-950" />
          <span>WINNER</span>
        </div>
      )}

      {/* Dealer Button */}
      {isDealer && (
        <div className="absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full bg-amber-400 border border-white text-slate-950 font-black text-xs flex items-center justify-center shadow-lg">
          D
        </div>
      )}

      {/* Last Action Pill */}
      {seat.lastAction && !isWinner && (
        <div
          className={`absolute -top-5 z-20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-md tracking-wider flex items-center gap-1 ${
            isThinking
              ? 'bg-cyan-950/90 border border-cyan-400/80 text-cyan-300 animate-pulse'
              : 'bg-slate-900/95 border border-amber-500/50 text-amber-300'
          }`}
        >
          {isThinking && <Sparkles className="w-2.5 h-2.5 animate-spin" />}
          <span>{seat.lastAction}</span>
        </div>
      )}

      {/* Avatar Container with SVG Turn Timer Ring */}
      <div className="relative w-16 h-16 md:w-18 md:h-18 flex items-center justify-center">
        {/* Animated Countdown SVG */}
        {isCurrentTurn && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10">
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-slate-700/50 fill-transparent"
              strokeWidth="4"
            />
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="fill-transparent transition-all duration-300"
              stroke={timerColor}
              strokeWidth="4"
              strokeDasharray="260"
              strokeDashoffset={260 - (260 * timerPercent) / 100}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Circular Avatar */}
        <div
          className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border-2 ${
            isWinner
              ? 'border-yellow-300 ring-4 ring-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.9)] scale-110'
              : isCurrentTurn
              ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]'
              : isLocalPlayer
              ? 'border-sky-400'
              : 'border-slate-700'
          } flex items-center justify-center overflow-hidden shadow-xl relative z-0 transition-all duration-300`}
        >
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-900 via-purple-950 to-slate-900 font-black text-white text-base">
            {seat.name.charAt(0).toUpperCase()}
          </div>

          {/* Bot Indicator Badge */}
          {seat.isBot && (
            <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 text-[8px] font-black text-slate-300 flex items-center justify-center gap-0.5 py-0.5 border-t border-slate-700">
              <Bot className="w-2.5 h-2.5 text-cyan-400" />
              <span>BOT</span>
            </div>
          )}
        </div>
      </div>

      {/* Player Name & Chips Info Pill */}
      <div
        className={`mt-1 bg-slate-950/85 border px-2.5 py-1 rounded-xl shadow-lg flex flex-col items-center min-w-[75px] max-w-[110px] backdrop-blur-sm z-10 ${
          isWinner ? 'border-yellow-400 bg-yellow-950/40' : 'border-slate-800'
        }`}
      >
        <span
          className={`text-[11px] font-bold truncate max-w-full ${
            isWinner ? 'text-yellow-300' : isLocalPlayer ? 'text-amber-300' : 'text-slate-200'
          }`}
          title={seat.name}
        >
          {seat.name}
        </span>
        <ChipStack amount={seat.chips} size="sm" />
      </div>

      {/* Hole Cards */}
      <div className="flex items-center -space-x-4 mt-1.5 z-10">
        {seat.cards && seat.cards.length > 0 ? (
          <>
            <CardView
              card={seat.cards[0]}
              size="sm"
              highlight={isWinner}
              className="rotate-[-6deg]"
            />
            <CardView
              card={seat.cards[1]}
              size="sm"
              highlight={isWinner}
              className="rotate-[6deg]"
            />
          </>
        ) : !isFolded ? (
          <>
            <CardView hidden size="sm" className="rotate-[-6deg]" />
            <CardView hidden size="sm" className="rotate-[6deg]" />
          </>
        ) : null}
      </div>

      {/* Current Bet on Table Felt */}
      {seat.currentBet > 0 && (
        <div className="absolute -bottom-7 bg-amber-500/20 border border-amber-400/50 rounded-full px-2 py-0.5 shadow-md backdrop-blur-sm z-20 flex items-center gap-1">
          <ChipStack amount={seat.currentBet} size="sm" />
        </div>
      )}
    </div>
  );
};
