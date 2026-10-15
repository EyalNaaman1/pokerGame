import { HandEvaluation, SidePot, WinnerInfo } from '../../../shared/types.js';

export interface PlayerContribution {
  seatIndex: number;
  playerId: string;
  name: string;
  totalBet: number;
  folded: boolean;
  isAllIn: boolean;
}

export class PotManager {
  /**
   * Calculates the pots (main pot + side pots) and any uncalled refund.
   * Based on total contributions of all players in the hand.
   */
  public static calculatePots(players: PlayerContribution[]): {
    pots: SidePot[];
    refunds: Map<number, number>; // seatIndex -> refund amount
  } {
    const refunds = new Map<number, number>();
    const contributions = players.filter((p) => p.totalBet > 0);

    if (contributions.length === 0) {
      return { pots: [], refunds };
    }

    // Check if only one player contributed (or if someone bet more than everyone else and nobody called)
    const sortedByBet = [...contributions].sort((a, b) => b.totalBet - a.totalBet);
    if (sortedByBet.length > 1 && sortedByBet[0].totalBet > sortedByBet[1].totalBet) {
      const excess = sortedByBet[0].totalBet - sortedByBet[1].totalBet;
      refunds.set(sortedByBet[0].seatIndex, excess);
      sortedByBet[0].totalBet -= excess;
    }

    // Collect all unique non-zero bet levels where an ALL-IN occurred, plus the max bet
    // For non-all-in players, they all match the highest level, or folded at some level
    const betLevels = Array.from(
      new Set(
        contributions
          .filter((p) => p.isAllIn && !p.folded)
          .map((p) => p.totalBet)
      )
    ).sort((a, b) => a - b);

    const maxBet = Math.max(...contributions.map((p) => p.totalBet));
    if (!betLevels.includes(maxBet)) {
      betLevels.push(maxBet);
    }

    const pots: SidePot[] = [];
    let previousLevel = 0;

    for (const level of betLevels) {
      const tierCost = level - previousLevel;
      if (tierCost <= 0) continue;

      let potAmount = 0;
      const eligibleSeats: number[] = [];

      for (const p of contributions) {
        if (p.totalBet > previousLevel) {
          const contributedToTier = Math.min(p.totalBet - previousLevel, tierCost);
          potAmount += contributedToTier;

          // Eligible only if not folded and contributed up to this level
          if (!p.folded && p.totalBet >= level) {
            eligibleSeats.push(p.seatIndex);
          }
        }
      }

      if (potAmount > 0) {
        // If no one is eligible (rare edge case where all at this tier folded),
        // give to remaining non-folded players
        let finalEligible = eligibleSeats;
        if (finalEligible.length === 0) {
          finalEligible = contributions.filter((p) => !p.folded).map((p) => p.seatIndex);
        }

        pots.push({
          amount: potAmount,
          eligibleSeatIndices: finalEligible,
        });
      }

      previousLevel = level;
    }

    // Merge consecutive pots if they have the exact same eligible players
    const mergedPots: SidePot[] = [];
    for (const pot of pots) {
      if (
        mergedPots.length > 0 &&
        this.arraysEqual(mergedPots[mergedPots.length - 1].eligibleSeatIndices, pot.eligibleSeatIndices)
      ) {
        mergedPots[mergedPots.length - 1].amount += pot.amount;
      } else {
        mergedPots.push({ ...pot, eligibleSeatIndices: [...pot.eligibleSeatIndices] });
      }
    }

    return { pots: mergedPots, refunds };
  }

  /**
   * Distributes all pots among winners according to hand evaluations
   */
  public static distributePots(
    pots: SidePot[],
    evaluations: Map<number, HandEvaluation>, // seatIndex -> evaluation
    playersMap: Map<number, { playerId: string; name: string }>
  ): WinnerInfo[] {
    const winningsBySeat = new Map<number, { amount: number; handName: string; cards: any[] }>();

    for (const pot of pots) {
      if (pot.amount <= 0 || pot.eligibleSeatIndices.length === 0) continue;

      // Find highest score among eligible players
      let bestScore = -1;
      let winningSeats: number[] = [];

      for (const seat of pot.eligibleSeatIndices) {
        const ev = evaluations.get(seat);
        if (!ev) continue;

        if (ev.score > bestScore) {
          bestScore = ev.score;
          winningSeats = [seat];
        } else if (ev.score === bestScore) {
          winningSeats.push(seat);
        }
      }

      if (winningSeats.length === 0) {
        // Fallback: split among eligible
        winningSeats = pot.eligibleSeatIndices;
      }

      const splitAmount = Math.floor(pot.amount / winningSeats.length);
      let remainder = pot.amount % winningSeats.length;

      for (const seat of winningSeats) {
        const ev = evaluations.get(seat);
        const winShare = splitAmount + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        const current = winningsBySeat.get(seat) || {
          amount: 0,
          handName: ev ? ev.rankName : 'Winning Hand',
          cards: ev ? ev.cards : [],
        };
        current.amount += winShare;
        if (ev) {
          current.handName = ev.rankName;
          current.cards = ev.cards;
        }
        winningsBySeat.set(seat, current);
      }
    }

    const winners: WinnerInfo[] = [];
    winningsBySeat.forEach((win, seatIndex) => {
      const p = playersMap.get(seatIndex);
      if (p) {
        winners.push({
          seatIndex,
          playerId: p.playerId,
          name: p.name,
          amount: win.amount,
          handName: win.handName,
          cards: win.cards,
        });
      }
    });

    return winners;
  }

  private static arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    const sA = [...a].sort();
    const sB = [...b].sort();
    return sA.every((val, index) => val === sB[index]);
  }
}
