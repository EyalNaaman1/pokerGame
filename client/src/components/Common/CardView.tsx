import React from 'react';
import { Card, Suit } from '../../../../shared/types.js';

interface CardViewProps {
  card?: Card | null;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  s: 'text-slate-900',
  c: 'text-slate-900',
  h: 'text-rose-600',
  d: 'text-rose-600',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  hidden = false,
  size = 'md',
  highlight = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded',
    md: 'w-14 h-20 text-sm rounded-md',
    lg: 'w-18 h-26 text-base rounded-lg',
  }[size];

  // Hidden card / Card back
  if (hidden || !card) {
    return (
      <div
        className={`${sizeClasses} bg-gradient-to-br from-red-700 via-red-800 to-red-950 border-2 border-red-500/80 shadow-md flex items-center justify-center relative overflow-hidden select-none ${className}`}
      >
        <div className="absolute inset-1 border border-red-400/30 rounded flex items-center justify-center bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:6px_6px]">
          <span className="text-red-300 font-black text-sm drop-shadow">♠</span>
        </div>
      </div>
    );
  }

  // Display '10' instead of 'T' so players are never confused
  const displayRank = card.rank === 'T' ? '10' : card.rank;
  const symbol = SUIT_SYMBOLS[card.suit];
  const colorClass = SUIT_COLORS[card.suit];

  return (
    <div
      className={`${sizeClasses} bg-white border border-slate-300 shadow-lg flex flex-col justify-between p-1 relative font-bold select-none transition-all duration-200 ${
        highlight
          ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] -translate-y-1 scale-105'
          : 'hover:-translate-y-0.5'
      } ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`leading-none flex flex-col items-center self-start ${colorClass}`}>
        <span className="font-black text-[13px] md:text-sm tracking-tight">{displayRank}</span>
        <span className="text-[10px] md:text-xs -mt-0.5">{symbol}</span>
      </div>

      {/* Center Suit Symbol */}
      <div className={`text-xl md:text-2xl self-center font-black ${colorClass} opacity-85 select-none`}>
        {symbol}
      </div>

      {/* Bottom Right Rank & Suit (Inverted) */}
      <div className={`leading-none flex flex-col items-center self-end rotate-180 ${colorClass}`}>
        <span className="font-black text-[13px] md:text-sm tracking-tight">{displayRank}</span>
        <span className="text-[10px] md:text-xs -mt-0.5">{symbol}</span>
      </div>
    </div>
  );
};
