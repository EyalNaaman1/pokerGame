import confetti from 'canvas-confetti';
import { Award, Sparkles } from 'lucide-react';
import React, { useEffect } from 'react';
import { WinnerInfo } from '../../../../shared/types.js';
import { sound } from '../../services/sound.js';
import { CardView } from '../Common/CardView.js';
import { ChipStack } from '../Common/ChipStack.js';

interface ShowdownOverlayProps {
  winners: WinnerInfo[];
  onDismiss?: () => void;
}

export const ShowdownOverlay: React.FC<ShowdownOverlayProps> = ({ winners }) => {
  useEffect(() => {
    sound.playWinSound();

    // Trigger confetti explosion
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#eab308', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
      <div className="pointer-events-auto max-w-md w-full bg-gradient-to-b from-slate-900/95 via-amber-950/80 to-slate-950/95 border-2 border-amber-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(234,179,8,0.5)] backdrop-blur-xl animate-in zoom-in-90 duration-300 space-y-4 text-center">
        {/* Celebration Header */}
        <div className="flex items-center justify-center gap-2 text-amber-300">
          <Sparkles className="w-6 h-6 animate-spin text-amber-400" />
          <span className="text-xs font-black uppercase tracking-widest">SHOWDOWN WINNER</span>
          <Sparkles className="w-6 h-6 animate-spin text-amber-400" />
        </div>

        {winners.map((winner, idx) => (
          <div key={`winner-${idx}`} className="space-y-3">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 p-1 shadow-2xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                  <Award className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-white mt-2 drop-shadow">
                {winner.name}
              </h2>
              <div className="mt-1">
                <ChipStack amount={winner.amount} size="lg" />
              </div>
            </div>

            <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-3">
              <span className="text-xs font-bold text-amber-300/90 block uppercase tracking-wide">
                {winner.handName}
              </span>

              {winner.cards && winner.cards.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {winner.cards.map((card, cIdx) => (
                    <CardView key={`wcard-${cIdx}`} card={card} size="sm" highlight />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
