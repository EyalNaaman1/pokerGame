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
  const [preAction, setPreAction] = useState<'CHECK_FOLD' | 'AUTO_CHECK' | 'CALL_ANY' | null>(null);

  useEffect(() => {
    setBetAmount(Math.min(maxBet, Math.max(minBet, tableState.minRaise)));
  }, [tableState.currentBet, tableState.minRaise, localPlayer.chips]);

  // Handle pre-action when turn arrives
  useEffect(() => {
    if (isMyTurn && preAction) {
      if (preAction === 'CHECK_FOLD') {
        if (canCheck) {
          sound.playCheckSound();
          onAction('CHECK');
        } else {
          sound.playFoldSound();
          onAction('FOLD');
        }
      } else if (preAction === 'AUTO_CHECK') {
        if (canCheck) {
          sound.playCheckSound();
          onAction('CHECK');
        }
      } else if (preAction === 'CALL_ANY') {
        if (canCheck) {
          sound.playCheckSound();
          onAction('CHECK');
        } else {
          sound.playChipSound();
          onAction('CALL');
        }
      }
      setPreAction(null);
    }
  }, [isMyTurn, preAction, canCheck, onAction]);

  // When not player's turn, show Zynga pre-action checkboxes
  if (!isMyTurn) {
    return (
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-2 flex items-center justify-between gap-2 shadow-xl backdrop-blur-md max-w-xl mx-auto">
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Pre-Actions:
        </span>

        <div className="flex items-center gap-2 flex-1 justify-center sm:justify-end">
          <button
            onClick={() => {
              sound.playButtonClick();
              setPreAction(preAction === 'CHECK_FOLD' ? null : 'CHECK_FOLD');
            }}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 ${
              preAction === 'CHECK_FOLD'
                ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${preAction === 'CHECK_FOLD' ? 'bg-rose-500 border-rose-400' : 'border-slate-600'}`}>
              {preAction === 'CHECK_FOLD' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
            </div>
            <span>Check / Fold</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setPreAction(preAction === 'AUTO_CHECK' ? null : 'AUTO_CHECK');
            }}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 ${
              preAction === 'AUTO_CHECK'
                ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${preAction === 'AUTO_CHECK' ? 'bg-amber-500 border-amber-400' : 'border-slate-600'}`}>
              {preAction === 'AUTO_CHECK' && <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
            </div>
            <span>Auto Check</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setPreAction(preAction === 'CALL_ANY' ? null : 'CALL_ANY');
            }}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 ${
              preAction === 'CALL_ANY'
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${preAction === 'CALL_ANY' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`}>
              {preAction === 'CALL_ANY' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
            </div>
            <span>Call Any</span>
          </button>
        </div>
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
    <div className="bg-slate-950/95 border-2 border-amber-500/50 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl space-y-2 max-w-xl mx-auto">
      {/* Top Presets & Bet Slider */}
      {localPlayer.chips > callCost && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            {(['MIN', 'HALF_POT', 'POT', 'ALL_IN'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setPreset(preset)}
                className="flex-1 py-0.5 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-black tracking-wider text-slate-300 border border-slate-700/80 transition"
              >
                {preset === 'HALF_POT' ? '1/2 POT' : preset === 'ALL_IN' ? 'ALL IN' : preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
            <button
              onClick={() => adjustBet(-tableState.stakes.bigBlind)}
              className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min={minBet}
              max={maxBet}
              step={tableState.stakes.bigBlind}
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <button
              onClick={() => adjustBet(tableState.stakes.bigBlind)}
              className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <div className="w-20 text-right">
              <span className="font-['JetBrains_Mono'] font-extrabold text-xs text-amber-300">
                ${formatChips(betAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleFold}
          className="py-2 px-2 rounded-xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow border border-rose-400/40 flex items-center justify-center gap-1 transition"
        >
          <X className="w-3.5 h-3.5" />
          <span>FOLD</span>
          {canCheck && <span className="text-[9px] text-rose-200 lowercase hidden sm:inline">(free)</span>}
        </button>

        <button
          onClick={handleCheckOrCall}
          className="py-2 px-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow border border-amber-300/50 flex items-center justify-center gap-1 transition"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>{canCheck ? 'CHECK' : `CALL $${formatChips(Math.min(callCost, localPlayer.chips))}`}</span>
        </button>

        <button
          onClick={handleBetOrRaise}
          disabled={localPlayer.chips <= callCost}
          className={`py-2 px-2 rounded-xl font-black text-xs uppercase tracking-wider shadow border flex items-center justify-center gap-1 transition ${
            localPlayer.chips > callCost
              ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 active:scale-95 text-slate-950 border-emerald-300/50'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
          <span>
            {tableState.currentBet === 0
              ? `BET $${formatChips(betAmount)}`
              : `RAISE $${formatChips(betAmount)}`}
          </span>
        </button>
      </div>
    </div>
  );
};
