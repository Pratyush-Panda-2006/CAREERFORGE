import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsStateDebugger } from './state-debugger.js';

test('SupplyChainLogisticsStateDebugger - initializes and records snapshots deeply', () => {
  const initial = { shipment: 'SC-100', cargo: ['electronics', 'medical'], status: 'PORT' };
  const dbg = new SupplyChainLogisticsStateDebugger(initial);

  assert.strictEqual(dbg.snapshots.length, 1);
  assert.strictEqual(dbg.currentIndex, 0);

  const current = dbg.getCurrentSnapshot();
  assert.strictEqual(current.action, '@@INIT');
  assert.deepStrictEqual(current.state, initial);

  // Deep clone prevents external mutations
  initial.cargo.push('mutated');
  assert.strictEqual(current.state.cargo.length, 2);
});

test('SupplyChainLogisticsStateDebugger - steps forward and backward with bounds clamping', () => {
  const dbg = new SupplyChainLogisticsStateDebugger({ checkpoint: 0 });
  dbg.recordSnapshot('WAYPOINT_1', { checkpoint: 1 });
  dbg.recordSnapshot('WAYPOINT_2', { checkpoint: 2 });
  dbg.recordSnapshot('WAYPOINT_3', { checkpoint: 3 });

  assert.strictEqual(dbg.snapshots.length, 4);
  assert.strictEqual(dbg.currentIndex, 3);

  dbg.stepBack();
  assert.strictEqual(dbg.currentIndex, 2);
  assert.strictEqual(dbg.getCurrentSnapshot().state.checkpoint, 2);

  dbg.jumpToStep(0);
  assert.strictEqual(dbg.currentIndex, 0);
  assert.strictEqual(dbg.getCurrentSnapshot().state.checkpoint, 0);

  // Clamping
  dbg.stepBack();
  assert.strictEqual(dbg.currentIndex, 0);
  dbg.jumpToStep(500);
  assert.strictEqual(dbg.currentIndex, 3);
});

test('SupplyChainLogisticsStateDebugger - computes delta diff between states accurately', () => {
  const dbg = new SupplyChainLogisticsStateDebugger();
  const s1 = { status: 'DEPARTED', temp: 5.0, driver: 'John' };
  const s2 = { status: 'ARRIVED', temp: 5.4, location: 'Dock-4' };

  const diff = dbg.computeDiff(s1, s2);

  assert.deepStrictEqual(diff.added, { location: 'Dock-4' });
  assert.deepStrictEqual(diff.deleted, { driver: 'John' });
  assert.deepStrictEqual(diff.modified, {
    status: { from: 'DEPARTED', to: 'ARRIVED' },
    temp: { from: 5.0, to: 5.4 }
  });
});

test('SupplyChainLogisticsStateDebugger - exports and imports replay JSON correctly', () => {
  const dbg = new SupplyChainLogisticsStateDebugger({ shipment: 'SC-EXPRESS' });
  dbg.recordSnapshot('CUSTOMS_CLEARANCE', { shipment: 'SC-EXPRESS', cleared: true });

  const exportedJson = dbg.exportReplay();
  assert.ok(typeof exportedJson === 'string');

  const newDbg = new SupplyChainLogisticsStateDebugger();
  const success = newDbg.importReplay(exportedJson);

  assert.strictEqual(success, true);
  assert.strictEqual(newDbg.snapshots.length, 2);
  assert.strictEqual(newDbg.currentIndex, 1);
  assert.strictEqual(newDbg.getCurrentSnapshot().action, 'CUSTOMS_CLEARANCE');
});
