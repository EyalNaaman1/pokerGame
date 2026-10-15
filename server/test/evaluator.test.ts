import assert from 'assert';
import { Card, HandRank } from '../../shared/types.js';
import { HandEvaluator } from '../src/engine/HandEvaluator.js';

export function testHandEvaluator() {
  console.log('--- Testing Hand Evaluator ---');

  // 1. Royal Flush
  const royalFlush: Card[] = [
    { rank: 'A', suit: 's' },
    { rank: 'K', suit: 's' },
    { rank: 'Q', suit: 's' },
    { rank: 'J', suit: 's' },
    { rank: 'T', suit: 's' },
    { rank: '2', suit: 'h' },
    { rank: '3', suit: 'd' },
  ];
  const rfEval = HandEvaluator.evaluate(royalFlush);
  assert.strictEqual(rfEval.rank, HandRank.ROYAL_FLUSH, 'Should be Royal Flush');
  console.log('✓ Royal Flush detected correctly');

  // 2. Straight Flush (King High)
  const straightFlush: Card[] = [
    { rank: '9', suit: 'h' },
    { rank: 'K', suit: 'h' },
    { rank: 'Q', suit: 'h' },
    { rank: 'J', suit: 'h' },
    { rank: 'T', suit: 'h' },
    { rank: '2', suit: 'c' },
    { rank: '4', suit: 's' },
  ];
  const sfEval = HandEvaluator.evaluate(straightFlush);
  assert.strictEqual(sfEval.rank, HandRank.STRAIGHT_FLUSH, 'Should be Straight Flush');
  console.log('✓ Straight Flush detected correctly');

  // 3. Four of a Kind vs Full House
  const quads: Card[] = [
    { rank: '8', suit: 's' },
    { rank: '8', suit: 'h' },
    { rank: '8', suit: 'd' },
    { rank: '8', suit: 'c' },
    { rank: 'A', suit: 's' },
    { rank: 'K', suit: 'd' },
    { rank: '2', suit: 'c' },
  ];
  const fullHouse: Card[] = [
    { rank: 'K', suit: 's' },
    { rank: 'K', suit: 'h' },
    { rank: 'K', suit: 'd' },
    { rank: 'Q', suit: 'c' },
    { rank: 'Q', suit: 's' },
    { rank: '4', suit: 'd' },
    { rank: '2', suit: 'c' },
  ];
  const quadsEval = HandEvaluator.evaluate(quads);
  const fhEval = HandEvaluator.evaluate(fullHouse);
  assert.strictEqual(quadsEval.rank, HandRank.FOUR_OF_A_KIND);
  assert.strictEqual(fhEval.rank, HandRank.FULL_HOUSE);
  assert(quadsEval.score > fhEval.score, 'Quads should beat Full House');
  console.log('✓ Four of a Kind beats Full House');

  // 4. Ace-low Wheel straight (A-2-3-4-5)
  const wheel: Card[] = [
    { rank: 'A', suit: 's' },
    { rank: '2', suit: 'h' },
    { rank: '3', suit: 'd' },
    { rank: '4', suit: 'c' },
    { rank: '5', suit: 's' },
    { rank: 'K', suit: 'd' },
    { rank: '9', suit: 'c' },
  ];
  const wheelEval = HandEvaluator.evaluate(wheel);
  assert.strictEqual(wheelEval.rank, HandRank.STRAIGHT, 'Wheel should be Straight');
  console.log('✓ Ace-low straight (Wheel) evaluated correctly');

  // 5. Two Pair with Kicker comparison
  const twoPairAceKicker: Card[] = [
    { rank: 'T', suit: 's' },
    { rank: 'T', suit: 'h' },
    { rank: '6', suit: 'd' },
    { rank: '6', suit: 'c' },
    { rank: 'A', suit: 's' },
    { rank: '3', suit: 'd' },
    { rank: '2', suit: 'c' },
  ];
  const twoPairKingKicker: Card[] = [
    { rank: 'T', suit: 'd' },
    { rank: 'T', suit: 'c' },
    { rank: '6', suit: 's' },
    { rank: '6', suit: 'h' },
    { rank: 'K', suit: 's' },
    { rank: '4', suit: 'd' },
    { rank: '2', suit: 'h' },
  ];
  const tp1 = HandEvaluator.evaluate(twoPairAceKicker);
  const tp2 = HandEvaluator.evaluate(twoPairKingKicker);
  assert.strictEqual(tp1.rank, HandRank.TWO_PAIR);
  assert.strictEqual(tp2.rank, HandRank.TWO_PAIR);
  assert(tp1.score > tp2.score, 'Ace kicker should beat King kicker in Two Pair');
  console.log('✓ Kicker tie-breaking works accurately');
}
