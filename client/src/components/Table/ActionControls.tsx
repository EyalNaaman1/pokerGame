import { ArrowUpRight, Check, Minus, Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PlayerActionType, PlayerSeat, TableState } from '../../../../shared/types.js';
import { sound } from '../../services/sound.js';
import { formatChips } from '../Common/ChipStack.js';

interface ActionControlsProps {
  tableState: TableState;
  localPlayer: PlayerSeat;
  onAction: (action: PlayerActionType, amount?: number) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  tableState,
  localPlayer,
  onAction,
}) => {
  const isMyTurn = tableState.currentTurnSeat === localPlayer.seatIndex;
  const callCost = tableState.currentBet - localPlayer.currentBet;
  const canCheck = callCost === 0;

  const minBet = Math.max(tableState.minRaise, tableState.currentBet + tableState.stakes.bigBlind);
  const maxBet = localPlayer.chips + localPlayer.currentBet;

  const [betAmount, setBetAmount] = useState<number>(minBet);

  // Keep bet within bounds when turn updates
  useEffect(() => {
    setBetAmount(Math.min(maxBet, Math.max(minBet, tableState.minRaise)));
  }, [tableState.currentBet, tableState.minRaise, localPlayer.chips]);

  if (!isMyTurn) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-6 py-3 flex items-center justify-between text-xs text-slate-400 font-medium shadow-2xl backdrop-blur-md">
        <span>Waiting for other players to act...</span>
        <span className="font-extrabold text-amber-400">
          Current Bet: ${formatChips(tableState.currentBet)}
        </span>
      </div>
    );
  }

  const handleFold = () => {
    sound.playFoldSound();
    onAction('FOLD');
  };

  const handleCheckOrCall = () => {
    if (canCheck) {
      sound.playCheckSound();
      onAction('CHECK');
    } else {
      sound.playChipSound();
      onAction('CALL');
    }
  };

  const handleBetOrRaise = () => {
    sound.playChipSound();
    if (betAmount >= maxBet) {
      onAction('ALL_IN');
    } else {
      onAction(tableState.currentBet === 0 ? 'BET' : 'RAISE', betAmount);
    }
  };

  // Quick preset calculations
  const potSize = tableState.pot;
  const setPreset = (preset: 'MIN' | 'HALF_POT' | 'POT' | 'ALL_IN') => {
    sound.playButtonClick();
    if (preset === 'MIN') {
      setBetAmount(Math.min(maxBet, minBet));
    } else if (preset === 'HALF_POT') {
      const halfPotTarget = tableState.currentBet + Math.floor(potSize * 0.5);
      setBetAmount(Math.min(maxBet, Math.max(minBet, halfPotTarget)));
    } else if (preset === 'POT') {
      const potTarget = tableState.currentBet + potSize;
      setBetAmount(Math.min(maxBet, Math.max(minBet, potTarget)));
    } else if (preset === 'ALL_IN') {
      setBetAmount(maxBet);
    }
  };

  const adjustBet = (delta: number) => {
    sound.playButtonClick();
    setBetAmount((prev) => Math.min(maxBet, Math.max(minBet, prev + delta)));
  };

  return (
    <div className="bg-slate-950/95 border-2 border-amber-500/50 rounded-3xl p-4 shadow-2xl backdrop-blur-xl space-y-3.5 max-w-2xl mx-auto">
      {/* Top Presets & Bet Slider */}
      {localPlayer.chips > callCost && (
        <div className="space-y-2">
          {/* Preset Buttons */}
          <div className="flex items-center justify-between gap-1.5">
            {(['MIN', 'HALF_POT', 'POT', 'ALL_IN'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setPreset(preset)}
                className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-[11px] font-black tracking-wider text-slate-300 border border-slate-700/80 transition"
              >
                {preset === 'HALF_POT' ? '1/2 POT' : preset === 'ALL_IN' ? 'ALL IN' : preset}
              </button>
            ))}
          </div>

          {/* Bet Slider & Amount Display */}
          <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
            <button
              onClick={() => adjustBet(-tableState.stakes.bigBlind)}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={minBet}
              max={maxBet}
              step={tableState.stakes.bigBlind}
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <button
              onClick={() => adjustBet(tableState.stakes.bigBlind)}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="w-24 text-right">
              <span className="font-['JetBrains_Mono'] font-extrabold text-sm text-amber-300">
                ${formatChips(betAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons (Fold / Check-Call / Bet-Raise) */}
      <div className="grid grid-cols-3 gap-3">
        {/* FOLD Button */}
        <button
          onClick={handleFold}
          className="py-3 px-2 rounded-2xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 active:scale-95 text-white font-black text-xs md:text-sm uppercase tracking-wider shadow-lg border border-rose-400/40 flex flex-col items-center justify-center gap-0.5 transition"
        >
          <div className="flex items-center gap-1">
            <X className="w-4 h-4" />
            <span>FOLD</span>
          </div>
          {canCheck && <span className="text-[10px] text-rose-200 lowercase">(check is free)</span>}
        </button>

        {/* CHECK / CALL Button */}
        <button
          onClick={handleCheckOrCall}
          className="py-3 px-2 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 active:scale-95 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider shadow-lg border border-amber-300/50 flex flex-col items-center justify-center gap-0.5 transition"
        >
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{canCheck ? 'CHECK' : `CALL $${formatChips(Math.min(callCost, localPlayer.chips))}`}</span>
          </div>
          {!canCheck && localPlayer.chips <= callCost && (
            <span className="text-[10px] text-slate-900 font-extrabold">(ALL IN)</span>
          )}
        </button>

        {/* BET / RAISE Button */}
        <button
          onClick={handleBetOrRaise}
          disabled={localPlayer.chips <= callCost}
          className={`py-3 px-2 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider shadow-lg border flex flex-col items-center justify-center gap-0.5 transition ${
            localPlayer.chips > callCost
              ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 active:scale-95 text-slate-950 border-emerald-300/50'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            <span>
              {tableState.currentBet === 0
                ? `BET $${formatChips(betAmount)}`
                : `RAISE $${formatChips(betAmount)}`}
            </span>
          </div>
          {betAmount >= maxBet && (
            <span className="text-[10px] text-slate-900 font-extrabold">(ALL IN)</span>
          )}
        </button>
      </div>
    </div>
  );
};
