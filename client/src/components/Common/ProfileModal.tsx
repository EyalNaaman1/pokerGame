import { Check, Sparkles, User } from 'lucide-react';
import React, { useState } from 'react';
import { socketService } from '../../services/socket.js';
import { sound } from '../../services/sound.js';

interface ProfileModalProps {
  initialName?: string;
  initialAvatar?: string;
  onClose: (name: string, avatar: string) => void;
  isFirstTime?: boolean;
}

const AVATARS = [
  { id: 'avatar1', label: 'Ace', emoji: '♠️', bg: 'from-amber-500 to-yellow-600' },
  { id: 'avatar2', label: 'Shark', emoji: '🦈', bg: 'from-cyan-500 to-blue-600' },
  { id: 'avatar3', label: 'King', emoji: '👑', bg: 'from-purple-500 to-indigo-600' },
  { id: 'avatar4', label: 'Lucky', emoji: '🍀', bg: 'from-emerald-500 to-green-600' },
  { id: 'avatar5', label: 'Fire', emoji: '🔥', bg: 'from-rose-500 to-red-600' },
  { id: 'avatar6', label: 'Diamond', emoji: '💎', bg: 'from-pink-500 to-fuchsia-600' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  initialName = '',
  initialAvatar = 'avatar1',
  onClose,
  isFirstTime = false,
}) => {
  const [name, setName] = useState<string>(initialName);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(initialAvatar);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = name.trim() || `Player_${Math.floor(Math.random() * 9000 + 1000)}`;
    sound.playChipSound();
    socketService.updateProfile(finalName, selectedAvatar);
    onClose(finalName, selectedAvatar);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFirstTime ? 'Welcome to Zynga Poker' : 'Edit Profile'}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            {isFirstTime ? 'Choose Your Poker Identity' : 'Customize Profile'}
          </h2>
          <p className="text-xs text-slate-300">
            {isFirstTime
              ? 'Enter your player name and pick an avatar to start with 10,000 free chips!'
              : 'Update your display name and table avatar.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Your Nickname</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maverick, TexasKid, LuckyQueen"
                maxLength={14}
                required
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none shadow-inner"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Choose Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => {
                    sound.playButtonClick();
                    setSelectedAvatar(av.id);
                  }}
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${av.bg} flex items-center justify-center text-xl shadow-md transition-all relative ${
                    selectedAvatar === av.id
                      ? 'ring-4 ring-amber-400 scale-110 shadow-amber-400/50'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <span>{av.emoji}</span>
                  {selectedAvatar === av.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[10px] text-slate-950 font-black">
                      <Check className="w-2.5 h-2.5 stroke-[4]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Starter Chips Banner */}
          {isFirstTime && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Starter Bonus:</span>
              <span className="text-sm font-extrabold text-amber-400 font-['JetBrains_Mono']">
                +10,000 FREE CHIPS 🪙
              </span>
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition"
          >
            {isFirstTime ? 'Enter Casino & Play Now' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
