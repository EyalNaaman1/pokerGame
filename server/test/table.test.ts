import assert from 'assert';
import { Table } from '../../shared/engine/Table.js';

export function testTableFSM() {
  console.log('--- Testing Table FSM & Hand Flow ---');

  const table = new Table('test-table', 'Test Room', {
    id: 'test-stakes',
    name: 'Test',
    smallBlind: 10,
    bigBlind: 20,
    minBuyIn: 400,
    maxBuyIn: 2000,
    maxSeats: 6,
  });

  // Seat 2 players
  const s1 = table.sitPlayer(0, 'p1', 'Player 1', 'avatar1', 1000);
  assert(s1.success, 'Player 1 seated');
  const s2 = table.sitPlayer(1, 'p2', 'Player 2', 'avatar2', 1000);
  assert(s2.success, 'Player 2 seated');

  // When 2 players sit, hand automatically starts
  assert.strictEqual(table.stage, 'PREFLOP', 'Hand should start in PREFLOP stage');
  assert.strictEqual(table.pot, 0, 'Pot uncollected before street end');
  assert.strictEqual(table.currentBet, 20, 'Current bet should be big blind 20');

  // Verify blinds posted
  const p1Seat = table.seats[0]!;
  const p2Seat = table.seats[1]!;
  assert.strictEqual(p1Seat.chips + p2Seat.chips, 1970, '30 chips deducted for blinds');

  // Check state serialization (masks cards of opponent)
  const stateP1 = table.getStateForPlayer('p1');
  assert(stateP1.seats[0]?.cards !== null, 'Player 1 should see own cards');
  assert(stateP1.seats[1]?.cards === null, 'Player 1 should NOT see Player 2 cards');

  // Test player 1 call
  const activeTurn = table.currentTurnSeat!;
  const activePlayer = table.seats[activeTurn]!;
  const actionRes = table.handleAction(activePlayer.id, 'CALL');
  assert(actionRes.success, 'Call should succeed');
  console.log('✓ Blinds, hole cards, state masking, and action dispatch verified');
}
