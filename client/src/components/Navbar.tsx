import { Coins, Home, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../../shared/types.js';
import { socketService } from '../services/socket.js';
import { sound } from '../services/sound.js';
import { ChipStack } from './Common/ChipStack.js';

interface NavbarProps {
  user: UserProfile | null;
  currentTableTitle?: string;
  onBackToLobby?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentTableTitle,
  onBackToLobby,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    return localStorage.getItem('poker_sound_enabled') !== 'false';
  });
  const [refillCooldown, setRefillCooldown] = useState<boolean>(false);

  useEffect(() => {
    sound.enabled = soundOn;
  }, [soundOn]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sound.enabled = next;
    localStorage.setItem('poker_sound_enabled', String(next));
    if (next) sound.playButtonClick();
  };

  const handleRefill = () => {
    if (refillCooldown) return;
    sound.playChipSound();
    socketService.refillChips();
    setRefillCooldown(true);
    setTimeout(() => setRefillCooldown(false), 3000);
  };

  return (
    <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 md:px-5 flex items-center justify-between sticky top-0 z-40 shadow-xl shrink-0">
      {/* Brand & Table Status */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBackToLobby}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-red-600 to-rose-700 p-0.5 shadow-md flex items-center justify-center">
            <span className="text-xl drop-shadow">♠️</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-base tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400">
                ZYNGA
              </span>
              <span className="font-extrabold text-base text-white">POKER</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/30">
                LIVE
              </span>
            </div>
            {currentTableTitle ? (
              <p className="text-[11px] text-amber-300/80 font-semibold truncate max-w-[180px]">
                {currentTableTitle}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 font-medium">Texas Hold'em</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls: Wallet & Actions */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Chips Balance */}
        {user && (
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-amber-500/30 rounded-full px-2.5 py-1 shadow-inner">
            <ChipStack amount={user.chips} size="sm" />
            <button
              onClick={handleRefill}
              disabled={refillCooldown}
              title="Get 5,000 Free Chips!"
              className="ml-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Coins className="w-3 h-3" />
              <span>+5K FREE</span>
            </button>
          </div>
        )}

        {/* Lobby Button */}
        {currentTableTitle && onBackToLobby && (
          <button
            onClick={() => {
              sound.playButtonClick();
              onBackToLobby();
            }}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lobby</span>
          </button>
        )}

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition"
          title={soundOn ? 'Mute Audio' : 'Unmute Audio'}
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Player Profile Avatar */}
        {user && (
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xs border border-indigo-400/50 shadow">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <span className="text-xs font-bold text-slate-200 block truncate max-w-[80px]">
                {user.name}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
