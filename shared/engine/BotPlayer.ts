import { Card, HandRank, PlayerActionType } from '../types.js';
import { HandEvaluator } from './HandEvaluator.js';

export interface BotDecisionContext {
  holeCards: Card[];
  communityCards: Card[];
  currentBet: number;
  playerCurrentBet: number;
  playerChips: number;
  pot: number;
  bigBlind: number;
  minRaise: number;
  stage: string;
}

export class BotPlayer {
  public static decideAction(ctx: BotDecisionContext): { action: PlayerActionType; amount?: number } {
    const callCost = ctx.currentBet - ctx.playerCurrentBet;
    const canCheckAction = callCost === 0;

    if (!ctx.holeCards || ctx.holeCards.length < 2) {
      return { action: canCheckAction ? 'CHECK' : 'FOLD' };
    }

    if (ctx.communityCards.length === 0) {
      return this.decidePreflop(ctx, callCost, canCheckAction);
    }

    return this.decidePostflop(ctx, callCost, canCheckAction);
  }

  private static decidePreflop(
    ctx: BotDecisionContext,
    callCost: number,
    canCheck: boolean
  ): { action: PlayerActionType; amount?: number } {
    const [c1, c2] = ctx.holeCards;
    const v1 = HandEvaluator.getRankValue(c1.rank);
    const v2 = HandEvaluator.getRankValue(c2.rank);
    const isPair = v1 === v2;
    const isSuited = c1.suit === c2.suit;
    const highVal = Math.max(v1, v2);
    const lowVal = Math.min(v1, v2);

    if ((isPair && highVal >= 11) || (highVal === 14 && lowVal >= 13)) {
      if (ctx.playerChips > ctx.minRaise && Math.random() < 0.7) {
        const raiseAmount = Math.min(ctx.playerChips, Math.max(ctx.minRaise, ctx.currentBet + ctx.bigBlind * 2));
        return { action: 'RAISE', amount: raiseAmount };
      }
      return callCost <= ctx.playerChips ? { action: 'CALL' } : { action: 'ALL_IN' };
    }

    const isGood =
      (isPair && highVal >= 7) ||
      (highVal >= 12 && lowVal >= 10) ||
      (isSuited && highVal >= 10) ||
      (isSuited && highVal - lowVal === 1 && highVal >= 8);

    if (isGood) {
      if (canCheck) {
        if (Math.random() < 0.4 && ctx.playerChips >= ctx.minRaise) {
          return { action: 'RAISE', amount: ctx.minRaise };
        }
        return { action: 'CHECK' };
      }
      if (callCost <= ctx.bigBlind * 4 && callCost <= ctx.playerChips) {
        return { action: 'CALL' };
      }
      return { action: 'FOLD' };
    }

    const isPlayable = isPair || isSuited || highVal === 14;
    if (isPlayable) {
      if (canCheck) return { action: 'CHECK' };
      if (callCost <= ctx.bigBlind * 2 && callCost <= ctx.playerChips) {
        return { action: 'CALL' };
      }
      return { action: 'FOLD' };
    }

    if (canCheck) return { action: 'CHECK' };
    if (Math.random() < 0.05 && callCost <= ctx.bigBlind * 2 && callCost <= ctx.playerChips) {
      return { action: 'CALL' };
    }
    return { action: 'FOLD' };
  }

  private static decidePostflop(
    ctx: BotDecisionContext,
    callCost: number,
    canCheck: boolean
  ): { action: PlayerActionType; amount?: number } {
    const allCards = [...ctx.holeCards, ...ctx.communityCards];
    const evaluation = HandEvaluator.evaluate(allCards);

    if (evaluation.rank >= HandRank.STRAIGHT) {
      if (ctx.playerChips > ctx.minRaise && Math.random() < 0.6) {
        const targetBet = Math.min(
          ctx.playerChips,
          Math.max(ctx.minRaise, ctx.currentBet + Math.floor(ctx.pot * 0.6))
        );
        return { action: ctx.currentBet === 0 ? 'BET' : 'RAISE', amount: targetBet };
      }
      if (canCheck) return { action: 'CHECK' };
      return callCost <= ctx.playerChips ? { action: 'CALL' } : { action: 'ALL_IN' };
    }

    if (evaluation.rank === HandRank.THREE_OF_A_KIND || evaluation.rank === HandRank.TWO_PAIR) {
      if (canCheck) {
        if (Math.random() < 0.5 && ctx.playerChips >= ctx.minRaise) {
          const betAmount = Math.min(ctx.playerChips, Math.max(ctx.minRaise, Math.floor(ctx.pot * 0.5)));
          return { action: 'BET', amount: betAmount };
        }
        return { action: 'CHECK' };
      }
      if (callCost <= ctx.pot * 0.75 && callCost <= ctx.playerChips) {
        return { action: 'CALL' };
      }
      if (canCheck) return { action: 'CHECK' };
      return { action: 'FOLD' };
    }

    if (evaluation.rank === HandRank.ONE_PAIR) {
      if (canCheck) {
        if (Math.random() < 0.25 && ctx.playerChips >= ctx.minRaise) {
          const betAmount = Math.min(ctx.playerChips, Math.max(ctx.minRaise, ctx.bigBlind * 2));
          return { action: 'BET', amount: betAmount };
        }
        return { action: 'CHECK' };
      }
      if (callCost <= Math.max(ctx.bigBlind * 3, ctx.pot * 0.35) && callCost <= ctx.playerChips) {
        return { action: 'CALL' };
      }
      return { action: 'FOLD' };
    }

    if (canCheck) {
      if (Math.random() < 0.1 && ctx.playerChips >= ctx.minRaise) {
        return { action: 'BET', amount: ctx.minRaise };
      }
      return { action: 'CHECK' };
    }

    return { action: 'FOLD' };
  }
}
