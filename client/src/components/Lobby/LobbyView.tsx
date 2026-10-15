import { ArrowRight, ChevronRight, Coins, Crown, Edit2, Key, Play, Plus, Sparkles, Trophy, Users } from 'lucide-react';
import React, { useState } from 'react';
import { TableSummary, UserProfile } from '../../../../shared/types.js';
import { socketService } from '../../services/socket.js';
import { sound } from '../../services/sound.js';
import { ChipStack, formatChips } from '../Common/ChipStack.js';
import { FriendsRoomModal } from './FriendsRoomModal.js';

interface LobbyViewProps {
  tables: TableSummary[];
  user: UserProfile | null;
  onSelectTable: (tableId: string, buyIn: number) => void;
  onOpenProfile: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  tables,
  user,
  onSelectTable,
  onOpenProfile,
}) => {
  const [selectedTable, setSelectedTable] = useState<TableSummary | null>(null);
  const [buyInAmount, setBuyInAmount] = useState<number>(0);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);
  const [quickCode, setQuickCode] = useState<string>('');

  const openBuyInModal = (table: TableSummary) => {
    sound.playButtonClick();
    setSelectedTable(table);
    const userChips = user ? user.chips : 10000;
    const defaultBuy = Math.min(
      Math.max(table.stakes.minBuyIn, Math.floor((table.stakes.minBuyIn + table.stakes.maxBuyIn) / 2)),
      userChips
    );
    setBuyInAmount(Math.max(table.stakes.minBuyIn, defaultBuy));
  };

  const handleConfirmJoin = () => {
    if (!selectedTable) return;
    sound.playChipSound();
    onSelectTable(selectedTable.id, buyInAmount);
    setSelectedTable(null);
  };

  const handleQuickJoinCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCode.trim()) {
      sound.playChipSound();
      socketService.joinRoomByCode(quickCode.trim().toUpperCase());
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
      {/* Hero Banner with Play With Friends CTA */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 border border-amber-500/20 shadow-2xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-4 z-10 text-center md:text-left flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zynga Live Multiplayer Hold'em</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Step Up to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">High Stakes</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl">
            Real-time Texas Hold'em with instant bots, private rooms for friends, side-pot calculations, and authentic casino poker action.
          </p>

          {/* Action CTAs: Play with Friends & User Profile */}
          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={() => {
                sound.playButtonClick();
                setShowFriendsModal(true);
              }}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs md:text-sm px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95 transition"
            >
              <Users className="w-4 h-4 stroke-[3]" />
              <span>PLAY WITH FRIENDS (CODE)</span>
            </button>

            {user && (
              <button
                onClick={() => {
                  sound.playButtonClick();
                  onOpenProfile();
                }}
                className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-slate-200 transition"
              >
                <span>{user.name}</span>
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Join With Code Box */}
        <div className="w-full md:w-80 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl z-10 backdrop-blur-md space-y-3">
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-extrabold">
            <Key className="w-4 h-4 text-amber-400" />
            <span>HAVE A ROOM CODE?</span>
          </div>
          <form onSubmit={handleQuickJoinCode} className="space-y-2">
            <input
              type="text"
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              placeholder="ENTER 6-CHAR CODE"
              maxLength={10}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 px-3 py-2 rounded-xl text-center text-sm font-['JetBrains_Mono'] font-black tracking-widest text-amber-300 uppercase outline-none"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <span>Join Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Tables Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-wide">Live Tables</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {tables.length} tables active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tables.map((table) => {
            const isAffordable = user ? user.chips >= table.stakes.minBuyIn : true;

            return (
              <div
                key={table.id}
                className="group relative rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-amber-500/50 p-5 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-amber-500/10 flex flex-col justify-between"
              >
                {/* Stakes Tier Banner */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {table.stakes.name}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {table.playerCount}/{table.maxSeats}
                    </span>
                  </div>
                </div>

                {/* Table Title & Blinds */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-white group-hover:text-amber-300 transition-colors">
                      {table.name}
                    </h3>
                  </div>
                  {table.code && (
                    <div className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 inline-block font-['JetBrains_Mono']">
                      CODE: {table.code}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Blinds:</span>
                    <span className="font-extrabold text-amber-400">
                      ${formatChips(table.stakes.smallBlind)} / ${formatChips(table.stakes.bigBlind)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Buy-In:</span>
                    <span className="font-bold text-slate-200">
                      ${formatChips(table.stakes.minBuyIn)} - ${formatChips(table.stakes.maxBuyIn)}
                    </span>
                  </div>
                </div>

                {/* Join Table Button */}
                <button
                  onClick={() => openBuyInModal(table)}
                  disabled={!isAffordable}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                    isAffordable
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 active:scale-95'
                      : 'bg-slate-700/60 text-slate-400 cursor-not-allowed border border-slate-600/40'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isAffordable ? 'Take a Seat' : 'Needs More Chips'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Friends Room Modal */}
      {showFriendsModal && (
        <FriendsRoomModal
          onClose={() => setShowFriendsModal(false)}
          userChips={user ? user.chips : 10000}
        />
      )}

      {/* Buy-In Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-black text-white">{selectedTable.name}</h3>
                <p className="text-xs text-amber-400 font-bold">
                  Blinds: ${formatChips(selectedTable.stakes.smallBlind)} / ${formatChips(selectedTable.stakes.bigBlind)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Buy-in Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Choose Buy-In Amount:</span>
                <span className="text-xl font-black text-amber-300 font-['JetBrains_Mono']">
                  ${buyInAmount.toLocaleString()}
                </span>
              </div>

              <input
                type="range"
                min={selectedTable.stakes.minBuyIn}
                max={Math.min(selectedTable.stakes.maxBuyIn, user ? user.chips : selectedTable.stakes.maxBuyIn)}
                step={selectedTable.stakes.bigBlind}
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Min: ${formatChips(selectedTable.stakes.minBuyIn)}</span>
                <button
                  onClick={() =>
                    setBuyInAmount(
                      Math.min(selectedTable.stakes.maxBuyIn, user ? user.chips : selectedTable.stakes.maxBuyIn)
                    )
                  }
                  className="text-amber-400 hover:underline font-bold"
                >
                  Max Buy-In
                </button>
                <span>Max: ${formatChips(selectedTable.stakes.maxBuyIn)}</span>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedTable(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>Sit at Table</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
