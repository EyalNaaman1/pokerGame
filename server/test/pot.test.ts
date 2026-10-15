import assert from 'assert';
import { PlayerContribution, PotManager } from '../src/engine/PotManager.js';

export function testPotManager() {
  console.log('--- Testing Pot Manager & Side Pots ---');

  // Test 1: Simple 2-player equal pot
  const p1: PlayerContribution = {
    seatIndex: 0,
    playerId: 'p1',
    name: 'Alice',
    totalBet: 500,
    folded: false,
    isAllIn: false,
  };
  const p2: PlayerContribution = {
    seatIndex: 1,
    playerId: 'p2',
    name: 'Bob',
    totalBet: 500,
    folded: false,
    isAllIn: false,
  };

  const res1 = PotManager.calculatePots([p1, p2]);
  assert.strictEqual(res1.pots.length, 1);
  assert.strictEqual(res1.pots[0].amount, 1000);
  assert.deepStrictEqual(res1.pots[0].eligibleSeatIndices.sort(), [0, 1]);
  console.log('✓ Equal 2-player pot calculated');

  // Test 2: 3-way with All-ins (Short stack, mid stack, deep stack)
  // Alice has 100 (all-in)
  // Bob has 300 (all-in)
  // Charlie has 500
  // Pot structure should be:
  // Main Pot: 100*3 = 300 (Alice, Bob, Charlie)
  // Side Pot 1: 200*2 = 400 (Bob, Charlie)
  // Charlie gets 200 refunded!
  const cAlice: PlayerContribution = {
    seatIndex: 0,
    playerId: 'alice',
    name: 'Alice',
    totalBet: 100,
    folded: false,
    isAllIn: true,
  };
  const cBob: PlayerContribution = {
    seatIndex: 1,
    playerId: 'bob',
    name: 'Bob',
    totalBet: 300,
    folded: false,
    isAllIn: true,
  };
  const cCharlie: PlayerContribution = {
    seatIndex: 2,
    playerId: 'charlie',
    name: 'Charlie',
    totalBet: 500,
    folded: false,
    isAllIn: false,
  };

  const res2 = PotManager.calculatePots([cAlice, cBob, cCharlie]);
  assert.strictEqual(res2.refunds.get(2), 200, 'Charlie should get 200 excess refunded');
  assert.strictEqual(res2.pots.length, 2, 'Should create 2 pots (main + 1 side pot)');
  assert.strictEqual(res2.pots[0].amount, 300, 'Main pot should be 300');
  assert.deepStrictEqual(res2.pots[0].eligibleSeatIndices.sort(), [0, 1, 2]);
  assert.strictEqual(res2.pots[1].amount, 400, 'Side pot should be 400');
  assert.deepStrictEqual(res2.pots[1].eligibleSeatIndices.sort(), [1, 2]);
  console.log('✓ Multi-way all-in side pots and refund calculated accurately');

  // Test 3: Folded player contribution remains in pot but player is ineligible
  const fDan: PlayerContribution = {
    seatIndex: 3,
    playerId: 'dan',
    name: 'Dan',
    totalBet: 100,
    folded: true, // folded
    isAllIn: false,
  };
  const res3 = PotManager.calculatePots([
    { ...cAlice, totalBet: 100 },
    { ...cBob, totalBet: 100 },
    fDan,
  ]);
  assert.strictEqual(res3.pots[0].amount, 300, 'Pot should include folded player bet');
  assert(!res3.pots[0].eligibleSeatIndices.includes(3), 'Folded player must not be eligible');
  console.log('✓ Folded player money stays in pot, player marked ineligible');
}
