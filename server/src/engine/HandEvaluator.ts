import { Card, HandEvaluation, HandRank, Rank } from '../../../shared/types.js';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  'T': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

const VALUE_NAMES: Record<number, string> = {
  2: 'Twos',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
};

const SINGULAR_NAMES: Record<number, string> = {
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
};

export class HandEvaluator {
  public static getRankValue(rank: Rank): number {
    return RANK_VALUES[rank];
  }

  /**
   * Evaluates best 5-card hand from 5, 6, or 7 cards
   */
  public static evaluate(cards: Card[]): HandEvaluation {
    if (cards.length < 5) {
      throw new Error('At least 5 cards required for hand evaluation');
    }

    const combinations = this.get5CardCombinations(cards);
    let bestEvaluation: HandEvaluation | null = null;

    for (const combo of combinations) {
      const evalResult = this.evaluate5CardHand(combo);
      if (!bestEvaluation || evalResult.score > bestEvaluation.score) {
        bestEvaluation = evalResult;
      }
    }

    return bestEvaluation!;
  }

  private static get5CardCombinations(cards: Card[]): Card[][] {
    const results: Card[][] = [];

    function combine(start: number, chosen: Card[]) {
      if (chosen.length === 5) {
        results.push([...chosen]);
        return;
      }
      for (let i = start; i < cards.length; i++) {
        chosen.push(cards[i]);
        combine(i + 1, chosen);
        chosen.pop();
      }
    }

    combine(0, []);
    return results;
  }

  private static evaluate5CardHand(cards: Card[]): HandEvaluation {
    const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    const values = sorted.map((c) => RANK_VALUES[c.rank]);
    const isFlush = cards.every((c) => c.suit === cards[0].suit);

    // Check straight
    let isStraight = false;
    let straightHigh = 0;

    if (
      values[0] - values[1] === 1 &&
      values[1] - values[2] === 1 &&
      values[2] - values[3] === 1 &&
      values[3] - values[4] === 1
    ) {
      isStraight = true;
      straightHigh = values[0];
    } else if (
      values[0] === 14 &&
      values[1] === 5 &&
      values[2] === 4 &&
      values[3] === 3 &&
      values[4] === 2
    ) {
      // Ace-low straight (Wheel): 5, 4, 3, 2, A
      isStraight = true;
      straightHigh = 5;
    }

    // Rank counts
    const counts = new Map<number, number>();
    for (const val of values) {
      counts.set(val, (counts.get(val) || 0) + 1);
    }

    const groups: { val: number; count: number }[] = [];
    counts.forEach((count, val) => groups.push({ val, count }));
    // Sort by count descending, then by val descending
    groups.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.val - a.val;
    });

    const BASE = 100_000_000;

    // 1. Royal Flush & Straight Flush
    if (isFlush && isStraight) {
      if (straightHigh === 14) {
        return {
          rank: HandRank.ROYAL_FLUSH,
          rankName: 'Royal Flush',
          score: HandRank.ROYAL_FLUSH * BASE + straightHigh,
          cards: sorted,
        };
      }
      return {
        rank: HandRank.STRAIGHT_FLUSH,
        rankName: `Straight Flush, ${SINGULAR_NAMES[straightHigh]} High`,
        score: HandRank.STRAIGHT_FLUSH * BASE + straightHigh,
        cards: sorted,
      };
    }

    // 2. Four of a Kind
    if (groups[0].count === 4) {
      const quadVal = groups[0].val;
      const kicker = groups[1].val;
      const score = HandRank.FOUR_OF_A_KIND * BASE + quadVal * 100 + kicker;
      return {
        rank: HandRank.FOUR_OF_A_KIND,
        rankName: `Four of a Kind, ${VALUE_NAMES[quadVal]}`,
        score,
        cards: sorted,
      };
    }

    // 3. Full House
    if (groups[0].count === 3 && groups[1].count === 2) {
      const tripVal = groups[0].val;
      const pairVal = groups[1].val;
      const score = HandRank.FULL_HOUSE * BASE + tripVal * 100 + pairVal;
      return {
        rank: HandRank.FULL_HOUSE,
        rankName: `Full House, ${VALUE_NAMES[tripVal]} full of ${VALUE_NAMES[pairVal]}`,
        score,
        cards: sorted,
      };
    }

    // 4. Flush
    if (isFlush) {
      const score =
        HandRank.FLUSH * BASE +
        values[0] * 160000 +
        values[1] * 8000 +
        values[2] * 400 +
        values[3] * 20 +
        values[4];
      return {
        rank: HandRank.FLUSH,
        rankName: `Flush, ${SINGULAR_NAMES[values[0]]} High`,
        score,
        cards: sorted,
      };
    }

    // 5. Straight
    if (isStraight) {
      const score = HandRank.STRAIGHT * BASE + straightHigh;
      return {
        rank: HandRank.STRAIGHT,
        rankName: `Straight, ${SINGULAR_NAMES[straightHigh]} High`,
        score,
        cards: sorted,
      };
    }

    // 6. Three of a Kind
    if (groups[0].count === 3) {
      const tripVal = groups[0].val;
      const k1 = groups[1].val;
      const k2 = groups[2].val;
      const score = HandRank.THREE_OF_A_KIND * BASE + tripVal * 1000 + k1 * 30 + k2;
      return {
        rank: HandRank.THREE_OF_A_KIND,
        rankName: `Three of a Kind, ${VALUE_NAMES[tripVal]}`,
        score,
        cards: sorted,
      };
    }

    // 7. Two Pair
    if (groups[0].count === 2 && groups[1].count === 2) {
      const highPair = Math.max(groups[0].val, groups[1].val);
      const lowPair = Math.min(groups[0].val, groups[1].val);
      const kicker = groups[2].val;
      const score = HandRank.TWO_PAIR * BASE + highPair * 1000 + lowPair * 30 + kicker;
      return {
        rank: HandRank.TWO_PAIR,
        rankName: `Two Pair, ${VALUE_NAMES[highPair]} and ${VALUE_NAMES[lowPair]}`,
        score,
        cards: sorted,
      };
    }

    // 8. One Pair
    if (groups[0].count === 2) {
      const pairVal = groups[0].val;
      const k1 = groups[1].val;
      const k2 = groups[2].val;
      const k3 = groups[3].val;
      const score = HandRank.ONE_PAIR * BASE + pairVal * 10000 + k1 * 400 + k2 * 20 + k3;
      return {
        rank: HandRank.ONE_PAIR,
        rankName: `One Pair of ${VALUE_NAMES[pairVal]}`,
        score,
        cards: sorted,
      };
    }

    // 9. High Card
    const score =
      HandRank.HIGH_CARD * BASE +
      values[0] * 160000 +
      values[1] * 8000 +
      values[2] * 400 +
      values[3] * 20 +
      values[4];
    return {
      rank: HandRank.HIGH_CARD,
      rankName: `High Card, ${SINGULAR_NAMES[values[0]]}`,
      score,
      cards: sorted,
    };
  }
}
