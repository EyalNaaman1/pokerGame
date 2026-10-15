import { testHandEvaluator } from './evaluator.test.js';
import { testPotManager } from './pot.test.js';
import { testTableFSM } from './table.test.js';

console.log('========================================');
console.log('   RUNNING POKER ENGINE TEST SUITE');
console.log('========================================');

try {
  testHandEvaluator();
  testPotManager();
  testTableFSM();
  console.log('\n========================================');
  console.log('  🎉 ALL POKER ENGINE TESTS PASSED! 🎉');
  console.log('========================================');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
}
