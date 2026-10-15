export type Suit = 's' | 'h' | 'd' | 'c'; // spades, hearts, diamonds, clubs
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export enum HandRank {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export interface HandEvaluation {
  rank: HandRank;
  rankName: string;
  score: number; // For tie-breaking
  cards: Card[]; // Best 5 cards
}

export type PlayerActionType = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN';

export type TableStage =
  | 'WAITING'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'HAND_ENDED';

export interface PlayerSeat {
  seatIndex: number;
  id: string;
  name: string;
  avatar: string;
  chips: number;
  currentBet: number;
  totalHandBet: number;
  folded: boolean;
  isAllIn: boolean;
  isBot: boolean;
  cards: Card[] | null; // Masked (null or empty) unless local player or showdown
  lastAction: string | null;
  sittingOut: boolean;
}

export interface SidePot {
  amount: number;
  eligibleSeatIndices: number[];
}

export interface WinnerInfo {
  seatIndex: number;
  playerId: string;
  name: string;
  amount: number;
  handName: string;
  cards: Card[];
}

export interface TableStakes {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
}

export interface TableState {
  id: string;
  name: string;
  code?: string;
  isPrivate?: boolean;
  stakes: TableStakes;
  stage: TableStage;
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentTurnSeat: number | null;
  turnTimeLeft: number;
  turnDuration: number;
  seats: (PlayerSeat | null)[];
  winners: WinnerInfo[] | null;
  handNumber: number;
  nextHandSeconds?: number;
}

export interface TableSummary {
  id: string;
  name: string;
  code?: string;
  isPrivate?: boolean;
  stakes: TableStakes;
  playerCount: number;
  maxSeats: number;
  stage: TableStage;
}

export interface UserProfile {
  id: string;
  name: string;
  chips: number;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  time: string;
  isSystem?: boolean;
}
