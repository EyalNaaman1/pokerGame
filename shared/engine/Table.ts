import {
  Card,
  HandEvaluation,
  PlayerActionType,
  PlayerSeat,
  TableStage,
  TableStakes,
  TableState,
  WinnerInfo,
} from '../types.js';
import { BotPlayer } from './BotPlayer.js';
import { Deck } from './Deck.js';
import { HandEvaluator } from './HandEvaluator.js';
import { PlayerContribution, PotManager } from './PotManager.js';

export interface InternalPlayerSeat extends PlayerSeat {
  holeCards: Card[];
  hasActedThisRound: boolean;
  totalHandBet: number;
}

export type TableEventCallback = (event: string, payload: any) => void;

export class Table {
  public readonly id: string;
  public readonly name: string;
  public readonly code?: string;
  public readonly isPrivate: boolean;
  public readonly stakes: TableStakes;
  public stage: TableStage = 'WAITING';

  public communityCards: Card[] = [];
  public pot: number = 0;
  public currentBet: number = 0;
  public minRaise: number = 0;
  public lastRaiseAmount: number = 0;

  public dealerSeat: number = -1;
  public smallBlindSeat: number = -1;
  public bigBlindSeat: number = -1;
  public currentTurnSeat: number | null = null;
  public turnTimeLeft: number = 0;
  public readonly turnDuration: number = 15;
  public nextHandSeconds: number = 0;

  public seats: (InternalPlayerSeat | null)[];
  public winners: WinnerInfo[] | null = null;
  public handNumber: number = 0;

  private deck: Deck = new Deck();
  private turnTimer: any = null;
  private botTimeout: any = null;
  private nextHandTimeout: any = null;
  private nextHandInterval: any = null;

  public onBroadcast: TableEventCallback | null = null;

  constructor(id: string, name: string, stakes: TableStakes, code?: string, isPrivate: boolean = false) {
    this.id = id;
    this.name = name;
    this.stakes = stakes;
    this.code = code;
    this.isPrivate = isPrivate;
    this.seats = Array(stakes.maxSeats).fill(null);
  }

  // --- Seating & Players ---

  public sitPlayer(
    seatIndex: number,
    id: string,
    name: string,
    avatar: string,
    chips: number,
    isBot: boolean = false
  ): { success: boolean; error?: string } {
    if (seatIndex < 0 || seatIndex >= this.stakes.maxSeats) {
      return { success: false, error: 'Invalid seat index' };
    }
    if (this.seats[seatIndex] !== null) {
      return { success: false, error: 'Seat is already occupied' };
    }
    const existingIndex = this.seats.findIndex((s) => s && s.id === id);
    if (existingIndex !== -1) {
      return { success: false, error: 'Already seated at this table' };
    }
    if (chips < this.stakes.minBuyIn) {
      return { success: false, error: `Minimum buy-in is ${this.stakes.minBuyIn}` };
    }

    const isHandInProgress = this.stage !== 'WAITING' && this.stage !== 'HAND_ENDED';

    const player: InternalPlayerSeat = {
      seatIndex,
      id,
      name,
      avatar,
      chips,
      currentBet: 0,
      totalHandBet: 0,
      folded: isHandInProgress,
      isAllIn: false,
      isBot,
      cards: null,
      holeCards: [],
      lastAction: isHandInProgress ? 'WAITING FOR HAND' : null,
      sittingOut: false,
      hasActedThisRound: isHandInProgress,
    };

    this.seats[seatIndex] = player;
    this.broadcastState();

    if (this.stage === 'WAITING' && this.getActivePlayersWithChips().length >= 2) {
      this.startNextHand();
    }

    return { success: true };
  }

  public leaveSeat(id: string): { chipsReturned: number } | null {
    const seatIndex = this.seats.findIndex((s) => s && s.id === id);
    if (seatIndex === -1) return null;

    const player = this.seats[seatIndex]!;
    const chips = player.chips;

    if (this.stage !== 'WAITING' && this.stage !== 'HAND_ENDED' && !player.folded) {
      this.handleAction(player.id, 'FOLD');
    }

    this.seats[seatIndex] = null;
    this.broadcastState();

    if (this.stage === 'WAITING' && this.getActivePlayersWithChips().length >= 2) {
      this.startNextHand();
    }

    return { chipsReturned: chips };
  }

  public addBot(): boolean {
    const emptySeats = this.seats
      .map((seat, idx) => (seat === null ? idx : -1))
      .filter((idx) => idx !== -1);
    if (emptySeats.length === 0) return false;

    const randomSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
    const botNames = ['BluffKing', 'AceChaser', 'TexasTornado', 'PokerFace', 'RiverShark', 'LuckyLady'];
    const chosenName = botNames[Math.floor(Math.random() * botNames.length)] + '_' + Math.floor(Math.random() * 90 + 10);
    const botAvatars = ['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6'];
    const chosenAvatar = botAvatars[Math.floor(Math.random() * botAvatars.length)];
    const buyIn = this.stakes.minBuyIn * 2;

    this.sitPlayer(randomSeat, `bot_${Date.now()}_${Math.random()}`, chosenName, chosenAvatar, buyIn, true);
    return true;
  }

  // --- Hand Lifecycle ---

  public startNextHand(): void {
    if (this.turnTimer) clearInterval(this.turnTimer);
    if (this.botTimeout) clearTimeout(this.botTimeout);
    if (this.nextHandTimeout) clearTimeout(this.nextHandTimeout);
    if (this.nextHandInterval) clearInterval(this.nextHandInterval);
    this.nextHandSeconds = 0;

    // Auto-rebuy busted bots so game action never stalls
    for (let i = 0; i < this.stakes.maxSeats; i++) {
      const p = this.seats[i];
      if (p && p.isBot && p.chips < this.stakes.bigBlind) {
        p.chips = this.stakes.minBuyIn * 2;
      }
    }

    const eligibleSeats = this.getActivePlayersWithChips();
    if (eligibleSeats.length < 2) {
      this.stage = 'WAITING';
      this.currentTurnSeat = null;
      this.broadcastState();
      return;
    }

    this.handNumber++;
    this.deck.reset();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.lastRaiseAmount = this.stakes.bigBlind;
    this.minRaise = this.stakes.bigBlind;
    this.winners = null;

    for (let i = 0; i < this.stakes.maxSeats; i++) {
      const p = this.seats[i];
      if (p) {
        p.currentBet = 0;
        p.totalHandBet = 0;
        p.folded = p.chips < this.stakes.bigBlind;
        p.isAllIn = false;
        p.cards = null;
        p.holeCards = [];
        p.lastAction = null;
        p.hasActedThisRound = false;
      }
    }

    this.advanceDealer();
    this.assignBlindsAndPost();

    for (let i = 0; i < this.stakes.maxSeats; i++) {
      const p = this.seats[i];
      if (p && !p.folded) {
        p.holeCards = this.deck.drawMultiple(2);
      }
    }

    this.stage = 'PREFLOP';

    const activeSeats = this.seats
      .map((p, idx) => (p && !p.folded && !p.isAllIn ? idx : -1))
      .filter((idx) => idx !== -1);

    if (activeSeats.length <= 1) {
      this.checkRoundCompletion();
    } else {
      let firstTurn = this.getNextActiveSeat(this.bigBlindSeat);
      this.setTurn(firstTurn);
    }

    this.broadcastState();
  }

  private advanceDealer(): void {
    const activeIndices = this.getActivePlayersWithChips().map((s) => s.seatIndex);
    if (this.dealerSeat === -1 || !activeIndices.includes(this.dealerSeat)) {
      this.dealerSeat = activeIndices[0];
    } else {
      const currentPos = activeIndices.indexOf(this.dealerSeat);
      const nextPos = (currentPos + 1) % activeIndices.length;
      this.dealerSeat = activeIndices[nextPos];
    }
  }

  private assignBlindsAndPost(): void {
    const activeIndices = this.getActivePlayersWithChips().map((s) => s.seatIndex);

    if (activeIndices.length === 2) {
      this.smallBlindSeat = this.dealerSeat;
      this.bigBlindSeat = activeIndices.find((idx) => idx !== this.dealerSeat)!;
    } else {
      const dealerPos = activeIndices.indexOf(this.dealerSeat);
      this.smallBlindSeat = activeIndices[(dealerPos + 1) % activeIndices.length];
      this.bigBlindSeat = activeIndices[(dealerPos + 2) % activeIndices.length];
    }

    this.postBet(this.smallBlindSeat, this.stakes.smallBlind, 'POST SB');
    this.postBet(this.bigBlindSeat, this.stakes.bigBlind, 'POST BB');

    this.currentBet = this.stakes.bigBlind;
    this.minRaise = this.stakes.bigBlind * 2;
    this.lastRaiseAmount = this.stakes.bigBlind;
  }

  private postBet(seatIndex: number, amount: number, label: string): void {
    const p = this.seats[seatIndex];
    if (!p) return;

    const actualBet = Math.min(p.chips, amount);
    p.chips -= actualBet;
    p.currentBet += actualBet;
    p.totalHandBet += actualBet;
    p.lastAction = `${label} ${actualBet}`;

    if (p.chips === 0) {
      p.isAllIn = true;
    }
  }

  private setTurn(seatIndex: number | null): void {
    if (this.turnTimer) clearInterval(this.turnTimer);
    if (this.botTimeout) clearTimeout(this.botTimeout);

    this.currentTurnSeat = seatIndex;

    if (seatIndex === null) {
      this.turnTimeLeft = 0;
      return;
    }

    this.turnTimeLeft = this.turnDuration;

    this.turnTimer = setInterval(() => {
      this.turnTimeLeft--;
      this.broadcastState();
      if (this.turnTimeLeft <= 0) {
        if (this.turnTimer) clearInterval(this.turnTimer);
        this.handleTimeout(seatIndex);
      }
    }, 1000);

    const player = this.seats[seatIndex];
    if (player && player.isBot) {
      player.lastAction = 'Thinking...';
      this.broadcastState();

      const thinkTime = Math.floor(Math.random() * 1700 + 2500);
      this.botTimeout = setTimeout(() => {
        this.executeBotTurn(seatIndex);
      }, thinkTime);
    }
  }

  private executeBotTurn(seatIndex: number): void {
    const p = this.seats[seatIndex];
    if (!p || this.currentTurnSeat !== seatIndex) return;

    const decision = BotPlayer.decideAction({
      holeCards: p.holeCards,
      communityCards: this.communityCards,
      currentBet: this.currentBet,
      playerCurrentBet: p.currentBet,
      playerChips: p.chips,
      pot: this.pot + this.getTotalCurrentBets(),
      bigBlind: this.stakes.bigBlind,
      minRaise: this.minRaise,
      stage: this.stage,
    });

    this.handleAction(p.id, decision.action, decision.amount);
  }

  private handleTimeout(seatIndex: number): void {
    const p = this.seats[seatIndex];
    if (!p || this.currentTurnSeat !== seatIndex) return;

    const callCost = this.currentBet - p.currentBet;
    if (callCost === 0) {
      this.handleAction(p.id, 'CHECK');
    } else {
      this.handleAction(p.id, 'FOLD');
    }
  }

  // --- Action Processing ---

  public handleAction(
    playerId: string,
    action: PlayerActionType,
    amount?: number
  ): { success: boolean; error?: string } {
    if (this.stage === 'WAITING' || this.stage === 'SHOWDOWN' || this.stage === 'HAND_ENDED') {
      return { success: false, error: 'No active hand in progress' };
    }

    if (this.currentTurnSeat === null) {
      return { success: false, error: 'Not waiting for any action' };
    }

    const player = this.seats[this.currentTurnSeat];
    if (!player || player.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const callCost = this.currentBet - player.currentBet;

    switch (action) {
      case 'FOLD': {
        player.folded = true;
        player.lastAction = 'FOLD';
        player.hasActedThisRound = true;
        break;
      }

      case 'CHECK': {
        if (callCost > 0) {
          return { success: false, error: `Cannot check; must call ${callCost}` };
        }
        player.lastAction = 'CHECK';
        player.hasActedThisRound = true;
        break;
      }

      case 'CALL': {
        if (callCost <= 0) {
          player.lastAction = 'CHECK';
          player.hasActedThisRound = true;
          break;
        }
        const payAmount = Math.min(player.chips, callCost);
        player.chips -= payAmount;
        player.currentBet += payAmount;
        player.totalHandBet += payAmount;
        player.lastAction = `CALL ${payAmount}`;
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        player.hasActedThisRound = true;
        break;
      }

      case 'BET':
      case 'RAISE': {
        let targetTotal = amount ?? this.minRaise;
        if (targetTotal < this.minRaise && targetTotal < player.chips + player.currentBet) {
          targetTotal = this.minRaise;
        }

        const additional = targetTotal - player.currentBet;
        if (additional <= 0) {
          return { success: false, error: 'Raise amount must be greater than current bet' };
        }

        const payAmount = Math.min(player.chips, additional);
        player.chips -= payAmount;
        player.currentBet += payAmount;
        player.totalHandBet += payAmount;

        const raiseDelta = player.currentBet - this.currentBet;
        if (raiseDelta > 0) {
          this.lastRaiseAmount = Math.max(raiseDelta, this.stakes.bigBlind);
          this.minRaise = player.currentBet + this.lastRaiseAmount;
          this.currentBet = player.currentBet;

          for (let i = 0; i < this.stakes.maxSeats; i++) {
            const other = this.seats[i];
            if (other && !other.folded && !other.isAllIn && i !== this.currentTurnSeat) {
              other.hasActedThisRound = false;
            }
          }
        }

        player.lastAction = `${action} ${player.currentBet}`;
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        player.hasActedThisRound = true;
        break;
      }

      case 'ALL_IN': {
        const allInAmount = player.chips;
        player.chips = 0;
        player.currentBet += allInAmount;
        player.totalHandBet += allInAmount;
        player.isAllIn = true;
        player.lastAction = `ALL IN ${player.currentBet}`;

        if (player.currentBet > this.currentBet) {
          const raiseDelta = player.currentBet - this.currentBet;
          if (raiseDelta >= this.lastRaiseAmount) {
            this.lastRaiseAmount = raiseDelta;
            this.minRaise = player.currentBet + this.lastRaiseAmount;
          } else {
            this.minRaise = player.currentBet + this.stakes.bigBlind;
          }
          this.currentBet = player.currentBet;

          for (let i = 0; i < this.stakes.maxSeats; i++) {
            const other = this.seats[i];
            if (other && !other.folded && !other.isAllIn && i !== this.currentTurnSeat) {
              other.hasActedThisRound = false;
            }
          }
        }
        player.hasActedThisRound = true;
        break;
      }
    }

    const remainingInHand = this.seats.filter((s) => s && !s.folded);
    if (remainingInHand.length === 1) {
      this.collectBetsIntoPot();
      this.endHandSingleWinner(remainingInHand[0]!);
      return { success: true };
    }

    this.checkRoundCompletion();
    return { success: true };
  }

  private checkRoundCompletion(): void {
    const activeUnfolded = this.seats.filter((s) => s && !s.folded);
    const playersAbleToAct = activeUnfolded.filter((s) => !s!.isAllIn);

    const roundComplete =
      playersAbleToAct.length === 0 ||
      playersAbleToAct.every((p) => p!.hasActedThisRound && p!.currentBet === this.currentBet);

    if (roundComplete) {
      this.collectBetsIntoPot();

      if (playersAbleToAct.length <= 1) {
        this.runRemainingStreetsAndShowdown();
        return;
      }

      this.advanceStreet();
    } else {
      const nextSeat = this.getNextActiveSeat(this.currentTurnSeat!);
      this.setTurn(nextSeat);
      this.broadcastState();
    }
  }

  private advanceStreet(): void {
    switch (this.stage) {
      case 'PREFLOP':
        this.stage = 'FLOP';
        this.communityCards.push(...this.deck.drawMultiple(3));
        break;
      case 'FLOP':
        this.stage = 'TURN';
        this.communityCards.push(this.deck.draw());
        break;
      case 'TURN':
        this.stage = 'RIVER';
        this.communityCards.push(this.deck.draw());
        break;
      case 'RIVER':
        this.resolveShowdown();
        return;
    }

    this.resetStreetBets();
    const firstTurn = this.getNextActiveSeat(this.dealerSeat);
    this.setTurn(firstTurn);
    this.broadcastState();
  }

  private runRemainingStreetsAndShowdown(): void {
    this.setTurn(null);

    const dealNextStreet = () => {
      if (this.communityCards.length < 3) {
        this.communityCards.push(...this.deck.drawMultiple(3));
        this.stage = 'FLOP';
        this.broadcastState();
        setTimeout(dealNextStreet, 1000);
      } else if (this.communityCards.length === 3) {
        this.communityCards.push(this.deck.draw());
        this.stage = 'TURN';
        this.broadcastState();
        setTimeout(dealNextStreet, 1000);
      } else if (this.communityCards.length === 4) {
        this.communityCards.push(this.deck.draw());
        this.stage = 'RIVER';
        this.broadcastState();
        setTimeout(dealNextStreet, 1000);
      } else {
        this.resolveShowdown();
      }
    };

    dealNextStreet();
  }

  private resetStreetBets(): void {
    this.currentBet = 0;
    this.minRaise = this.stakes.bigBlind;
    this.lastRaiseAmount = this.stakes.bigBlind;
    for (let i = 0; i < this.stakes.maxSeats; i++) {
      const p = this.seats[i];
      if (p) {
        p.currentBet = 0;
        p.hasActedThisRound = false;
      }
    }
  }

  private collectBetsIntoPot(): void {
    for (let i = 0; i < this.stakes.maxSeats; i++) {
      const p = this.seats[i];
      if (p && p.currentBet > 0) {
        this.pot += p.currentBet;
        p.currentBet = 0;
      }
    }
  }

  private getTotalCurrentBets(): number {
    return this.seats.reduce((sum, s) => sum + (s ? s.currentBet : 0), 0);
  }

  // --- Showdown & Payout ---

  private resolveShowdown(): void {
    this.stage = 'SHOWDOWN';
    this.setTurn(null);

    for (let i = 0; i < this.stakes.maxSeats; i++) {
      const p = this.seats[i];
      if (p && !p.folded) {
        p.cards = [...p.holeCards];
      }
    }

    const contributions: PlayerContribution[] = this.seats
      .map((s, idx) => {
        if (!s) return null;
        return {
          seatIndex: idx,
          playerId: s.id,
          name: s.name,
          totalBet: s.totalHandBet,
          folded: s.folded,
          isAllIn: s.isAllIn,
        };
      })
      .filter((s): s is PlayerContribution => s !== null);

    const { pots, refunds } = PotManager.calculatePots(contributions);

    refunds.forEach((refundAmount, seatIndex) => {
      const p = this.seats[seatIndex];
      if (p) {
        p.chips += refundAmount;
        this.pot = Math.max(0, this.pot - refundAmount);
      }
    });

    const evaluations = new Map<number, HandEvaluation>();
    const playersMap = new Map<number, { playerId: string; name: string }>();

    for (let i = 0; i < this.stakes.maxSeats; i++) {
      const p = this.seats[i];
      if (p && !p.folded) {
        const full7Cards = [...p.holeCards, ...this.communityCards];
        const evaluation = HandEvaluator.evaluate(full7Cards);
        evaluations.set(i, evaluation);
        playersMap.set(i, { playerId: p.id, name: p.name });
      }
    }

    const winners = PotManager.distributePots(pots, evaluations, playersMap);
    this.winners = winners;

    for (const win of winners) {
      const p = this.seats[win.seatIndex];
      if (p) {
        p.chips += win.amount;
        p.lastAction = `WINNER 🏆 (+${win.amount})`;
      }
    }

    this.nextHandSeconds = 6;
    this.broadcastState();

    if (this.nextHandInterval) clearInterval(this.nextHandInterval);
    this.nextHandInterval = setInterval(() => {
      this.nextHandSeconds--;
      this.broadcastState();
      if (this.nextHandSeconds <= 0) {
        if (this.nextHandInterval) clearInterval(this.nextHandInterval);
        this.startNextHand();
      }
    }, 1000);
  }

  private endHandSingleWinner(winner: InternalPlayerSeat): void {
    this.stage = 'HAND_ENDED';
    this.setTurn(null);

    const winAmount = this.pot;
    winner.chips += winAmount;
    winner.lastAction = `WINNER 🏆 (+${winAmount})`;

    this.winners = [
      {
        seatIndex: winner.seatIndex,
        playerId: winner.id,
        name: winner.name,
        amount: winAmount,
        handName: 'Won pot (all others folded)',
        cards: winner.holeCards,
      },
    ];

    this.nextHandSeconds = 5;
    this.broadcastState();

    if (this.nextHandInterval) clearInterval(this.nextHandInterval);
    this.nextHandInterval = setInterval(() => {
      this.nextHandSeconds--;
      this.broadcastState();
      if (this.nextHandSeconds <= 0) {
        if (this.nextHandInterval) clearInterval(this.nextHandInterval);
        this.startNextHand();
      }
    }, 1000);
  }

  // --- Helpers ---

  private getActivePlayersWithChips(): InternalPlayerSeat[] {
    return this.seats.filter((s): s is InternalPlayerSeat => s !== null && s.chips > 0 && !s.sittingOut);
  }

  private getNextActiveSeat(fromSeat: number): number {
    for (let step = 1; step <= this.stakes.maxSeats; step++) {
      const nextIdx = (fromSeat + step) % this.stakes.maxSeats;
      const p = this.seats[nextIdx];
      if (p && !p.folded && !p.isAllIn) {
        return nextIdx;
      }
    }
    return fromSeat;
  }

  public getStateForPlayer(playerId?: string): TableState {
    const sanitizedSeats: (PlayerSeat | null)[] = this.seats.map((s) => {
      if (!s) return null;
      const isOwner = playerId && s.id === playerId;
      const isShowdown = (this.stage === 'SHOWDOWN' || this.stage === 'HAND_ENDED') && !s.folded;

      return {
        seatIndex: s.seatIndex,
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        chips: s.chips,
        currentBet: s.currentBet,
        totalHandBet: s.totalHandBet,
        folded: s.folded,
        isAllIn: s.isAllIn,
        isBot: s.isBot,
        cards: isOwner || isShowdown ? s.holeCards : null,
        lastAction: s.lastAction,
        sittingOut: s.sittingOut,
      };
    });

    return {
      id: this.id,
      name: this.name,
      code: this.code,
      isPrivate: this.isPrivate,
      stakes: this.stakes,
      stage: this.stage,
      communityCards: this.communityCards,
      pot: this.pot + this.getTotalCurrentBets(),
      sidePots: [],
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealerSeat: this.dealerSeat,
      smallBlindSeat: this.smallBlindSeat,
      bigBlindSeat: this.bigBlindSeat,
      currentTurnSeat: this.currentTurnSeat,
      turnTimeLeft: this.turnTimeLeft,
      turnDuration: this.turnDuration,
      seats: sanitizedSeats,
      winners: this.winners,
      handNumber: this.handNumber,
      nextHandSeconds: this.nextHandSeconds,
    };
  }

  private broadcastState(): void {
    if (this.onBroadcast) {
      this.onBroadcast('TABLE_UPDATED', this.id);
    }
  }
}
