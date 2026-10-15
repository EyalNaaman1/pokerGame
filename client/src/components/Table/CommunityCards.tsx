import { Sparkles, Trophy } from 'lucide-react';
import React from 'react';
import { Card, WinnerInfo } from '../../../../shared/types.js';
import { CardView } from '../Common/CardView.js';
import { ChipStack, formatChips } from '../Common/ChipStack.js';

interface CommunityCardsProps {
  cards: Card[];
  pot: number;
  winners?: WinnerInfo[] | null;
  nextHandSeconds?: number;
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards,
  pot,
  winners,
  nextHandSeconds,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 z-10">
      {/* Table Pot Badge */}
      <div className="bg-slate-950/85 border border-amber-500/40 rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-2 backdrop-blur-md">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">POT:</span>
        <ChipStack amount={pot} size="md" />
      </div>

      {/* 5 Card Slots */}
      <div className="flex items-center gap-1.5 md:gap-2.5 p-2 rounded-2xl bg-black/30 border border-emerald-500/20 shadow-inner">
        {[0, 1, 2, 3, 4].map((index) => {
          const card = cards[index];

          if (card) {
            return (
              <div
                key={`card-${index}-${card.rank}-${card.suit}`}
                className="animate-in fade-in zoom-in-75 duration-300"
              >
                <CardView card={card} size="md" />
              </div>
            );
          }

          // Empty slot placeholder
          return (
            <div
              key={`empty-${index}`}
              className="w-14 h-20 rounded-md border-2 border-emerald-900/60 bg-emerald-950/30 flex items-center justify-center"
            >
              <div className="w-8 h-12 rounded border border-emerald-800/30 flex items-center justify-center">
                <span className="text-emerald-700/50 text-xs font-bold">♦</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner In-Game Banner */}
      {winners && winners.length > 0 && (
        <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center gap-1 bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/90 border-2 border-amber-400 px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(250,204,21,0.5)] backdrop-blur-md max-w-sm text-center">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-wider">
              {winners.map((w) => w.name).join(' & ')} Won ${formatChips(winners.reduce((s, w) => s + w.amount, 0))}!
            </span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
          </div>
          <span className="text-[11px] font-bold text-slate-200">
            {winners[0]?.handName || 'Winning Hand'}
          </span>
          {nextHandSeconds !== undefined && nextHandSeconds > 0 && (
            <span className="text-[10px] text-amber-400/80 font-semibold tracking-wide">
              Next hand in {nextHandSeconds}s...
            </span>
          )}
        </div>
      )}
    </div>
  );
};
