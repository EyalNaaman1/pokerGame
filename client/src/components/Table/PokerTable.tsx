import { ArrowLeft, Bot, Check, Copy, Share2, Volume2 } from 'lucide-react';
import React, { useState } from 'react';
import { PlayerActionType, TableState, UserProfile } from '../../../../shared/types.js';
import { socketService } from '../../services/socket.js';
import { sound } from '../../services/sound.js';
import { formatChips } from '../Common/ChipStack.js';
import { ActionControls } from './ActionControls.js';
import { ChatBox } from './ChatBox.js';
import { CommunityCards } from './CommunityCards.js';
import { PlayerSeat } from './PlayerSeat.js';
import { ShowdownOverlay } from './ShowdownOverlay.js';

interface PokerTableProps {
  tableState: TableState;
  user: UserProfile | null;
  onLeaveTable: () => void;
  chatMessages: any[];
}

export const PokerTable: React.FC<PokerTableProps> = ({
  tableState,
  user,
  onLeaveTable,
  chatMessages,
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const maxSeats = tableState.stakes.maxSeats;
  const localPlayerSeat = tableState.seats.find((s) => s && user && s.id === user.id) || null;
  const localSeatIndex = localPlayerSeat ? localPlayerSeat.seatIndex : -1;

  const handleAction = (action: PlayerActionType, amount?: number) => {
    socketService.sendAction(tableState.id, action, amount);
  };

  const handleSitDown = (seatIndex: number) => {
    sound.playButtonClick();
    const defaultBuyIn = Math.min(
      Math.max(tableState.stakes.minBuyIn, Math.floor((tableState.stakes.minBuyIn + tableState.stakes.maxBuyIn) / 2)),
      user ? user.chips : tableState.stakes.minBuyIn
    );
    socketService.joinTable(tableState.id, defaultBuyIn, seatIndex);
  };

  const handleAddBot = () => {
    sound.playButtonClick();
    socketService.addBot(tableState.id);
  };

  const handleCopyInvite = () => {
    sound.playButtonClick();
    const code = tableState.code || tableState.id;
    const url = `${window.location.origin}/?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Helper to compute elliptical seat position relative to table
  const getSeatPosition = (seatIndex: number) => {
    // Offset so local player is always at the bottom center
    const offset = localSeatIndex !== -1 ? localSeatIndex : 0;
    const visualIndex = (seatIndex - offset + maxSeats) % maxSeats;

    // Angle theta: start at bottom (Math.PI / 2) and go clockwise
    const theta = (visualIndex / maxSeats) * 2 * Math.PI + Math.PI / 2;
    // Ellipse radius percentages
    const rx = 42; // horizontal radius %
    const ry = 38; // vertical radius %

    const left = 50 + rx * Math.cos(theta);
    const top = 50 + ry * Math.sin(theta);

    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col justify-between p-2 md:p-6 select-none overflow-hidden">
      {/* Table Header Utility Bar */}
      <div className="flex items-center justify-between z-30 mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playButtonClick();
              onLeaveTable();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 transition active:scale-95 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Table</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="font-extrabold text-amber-400">{tableState.name}</span>
            <span className="text-slate-500">|</span>
            <span>
              Blinds: ${formatChips(tableState.stakes.smallBlind)}/${formatChips(tableState.stakes.bigBlind)}
            </span>
          </div>

          {/* Room Code Badge with Copy button */}
          {tableState.code && (
            <button
              onClick={handleCopyInvite}
              title="Click to copy invite link for friends"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold transition active:scale-95 shadow-md"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Code: <span className="font-['JetBrains_Mono'] tracking-wider text-white">{tableState.code}</span></span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add Bot Button */}
          <button
            onClick={handleAddBot}
            title="Add a bot player to an empty seat"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition active:scale-95 shadow-md"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Bot</span>
          </button>

          {/* Chat Toggle */}
          <ChatBox tableId={tableState.id} messages={chatMessages} />
        </div>
      </div>

      {/* Poker Table Area */}
      <div className="flex-1 flex items-center justify-center relative my-2">
        {/* The Oval Felt Table */}
        <div className="relative w-full max-w-5xl h-[520px] md:h-[580px] rounded-[180px] md:rounded-[220px] bg-gradient-to-b from-emerald-800 via-emerald-900 to-[#072d1a] border-[14px] md:border-[18px] border-[#361a0c] shadow-table flex items-center justify-center overflow-visible">
          {/* Inner Table Leather Padded Rail & Gold Ring */}
          <div className="absolute inset-1 rounded-[165px] md:rounded-[205px] border-2 border-amber-500/30 shadow-felt pointer-events-none" />

          {/* Felt Watermark Pattern */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <span className="text-[280px] font-black text-white">♠</span>
          </div>

          {/* Center Community Cards & Pot with Winner Banner */}
          <CommunityCards
            cards={tableState.communityCards}
            pot={tableState.pot}
            winners={tableState.winners}
            nextHandSeconds={tableState.nextHandSeconds}
          />

          {/* Player Seats around the Ellipse */}
          {tableState.seats.map((seat, seatIdx) => {
            const pos = getSeatPosition(seatIdx);
            const isLocal = localSeatIndex === seatIdx;
            const isTurn = tableState.currentTurnSeat === seatIdx;
            const isDealer = tableState.dealerSeat === seatIdx;
            const isWinner = tableState.winners?.some((w) => w.seatIndex === seatIdx) ?? false;

            return (
              <div
                key={`seat-${seatIdx}`}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-20"
              >
                <PlayerSeat
                  seatIndex={seatIdx}
                  seat={seat}
                  isCurrentTurn={isTurn}
                  isDealer={isDealer}
                  isWinner={isWinner}
                  turnTimeLeft={tableState.turnTimeLeft}
                  turnDuration={tableState.turnDuration}
                  isLocalPlayer={isLocal}
                  onSitDown={handleSitDown}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="z-30 w-full mt-2">
        {localPlayerSeat && !localPlayerSeat.folded && tableState.stage !== 'WAITING' && tableState.stage !== 'SHOWDOWN' && tableState.stage !== 'HAND_ENDED' ? (
          <ActionControls
            tableState={tableState}
            localPlayer={localPlayerSeat}
            onAction={handleAction}
          />
        ) : localPlayerSeat ? (
          <div className="text-center py-2 text-xs font-semibold text-slate-400">
            {localPlayerSeat.folded
              ? 'You have folded. Waiting for the next hand to begin...'
              : 'Waiting for next hand...'}
          </div>
        ) : (
          <div className="text-center py-2 text-xs font-semibold text-slate-400">
            Click on any empty seat above to join the game!
          </div>
        )}
      </div>

      {/* Showdown Winner Celebration */}
      {(tableState.stage === 'SHOWDOWN' || tableState.stage === 'HAND_ENDED') && tableState.winners && tableState.winners.length > 0 && (
        <ShowdownOverlay winners={tableState.winners} />
      )}
    </div>
  );
};
