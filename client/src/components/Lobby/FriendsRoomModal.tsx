import { ArrowRight, Bot, Key, Plus, Sparkles, Users } from 'lucide-react';
import React, { useState } from 'react';
import { socketService } from '../../services/socket.js';
import { sound } from '../../services/sound.js';
import { formatChips } from '../Common/ChipStack.js';

interface FriendsRoomModalProps {
  onClose: () => void;
  userChips: number;
}

const STAKE_PRESETS = [
  { label: 'Micro (10/20)', sb: 10, bb: 20, minBuy: 400 },
  { label: 'Low (50/100)', sb: 50, bb: 100, minBuy: 2000 },
  { label: 'Mid (100/200)', sb: 100, bb: 200, minBuy: 4000 },
  { label: 'VIP (500/1000)', sb: 500, bb: 1000, minBuy: 20000 },
];

export const FriendsRoomModal: React.FC<FriendsRoomModalProps> = ({ onClose, userChips }) => {
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');

  // Create state
  const [roomName, setRoomName] = useState<string>('Poker Night with Friends');
  const [selectedStake, setSelectedStake] = useState<number>(0); // index in STAKE_PRESETS
  const [maxSeats, setMaxSeats] = useState<number>(6);
  const [enableBots, setEnableBots] = useState<boolean>(true);

  // Join state
  const [joinCode, setJoinCode] = useState<string>('');

  const currentPreset = STAKE_PRESETS[selectedStake];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playChipSound();

    const buyIn = Math.min(currentPreset.minBuy * 2, userChips);
    socketService.createPrivateRoom({
      name: roomName.trim() || 'Private Poker Room',
      smallBlind: currentPreset.sb,
      bigBlind: currentPreset.bb,
      maxSeats,
      buyIn,
      enableBots,
    });
    onClose();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      sound.playChipSound();
      socketService.joinRoomByCode(joinCode.trim().toUpperCase());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white">Play with Friends</h2>
          </div>
          <button
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('CREATE');
            }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'CREATE'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Private Room
          </button>
          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('JOIN');
            }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'JOIN'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Tab 1: Create Private Room */}
        {activeTab === 'CREATE' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Room Name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={24}
                required
                className="w-full bg-slate-800 text-white font-bold text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-amber-400"
              />
            </div>

            {/* Stakes Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Select Stakes</label>
              <div className="grid grid-cols-2 gap-2">
                {STAKE_PRESETS.map((p, idx) => (
                  <button
                    type="button"
                    key={`stake-${idx}`}
                    onClick={() => {
                      sound.playButtonClick();
                      setSelectedStake(idx);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold text-left transition ${
                      selectedStake === idx
                        ? 'border-amber-400 bg-amber-500/10 text-amber-300 ring-2 ring-amber-400/30'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div>{p.label}</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Min Buy: ${formatChips(p.minBuy)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Size (6-max or 9-max) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Table Seats</label>
              <div className="flex gap-3">
                {[6, 9].map((seats) => (
                  <button
                    type="button"
                    key={`seats-${seats}`}
                    onClick={() => {
                      sound.playButtonClick();
                      setMaxSeats(seats);
                    }}
                    className={`flex-1 py-2 rounded-xl border text-xs font-black transition ${
                      maxSeats === seats
                        ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    {seats}-Player Table
                  </button>
                ))}
              </div>
            </div>

            {/* Enable Bots Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={enableBots}
                onChange={(e) => setEnableBots(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-300">
                Auto-fill empty seats with bots so you can play immediately
              </span>
            </label>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Room & Generate Code</span>
            </button>
          </form>
        ) : (
          /* Tab 2: Join with Code */
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Enter Friend's Room Code</label>
              <div className="relative">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A8X9K2"
                  maxLength={12}
                  required
                  className="w-full bg-slate-800 text-amber-300 font-['JetBrains_Mono'] font-black text-lg px-4 py-3 rounded-xl border-2 border-slate-700 focus:border-amber-400 outline-none uppercase tracking-widest text-center shadow-inner"
                />
                <Key className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-400">
                Ask your friend for their 6-character room code or click the invite link they shared with you!
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <span>Join Table</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
