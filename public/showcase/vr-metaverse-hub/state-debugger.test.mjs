import test from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubStateDebugger } from './state-debugger.js';

test('VrMetaverseHubStateDebugger - initializes and records snapshots deeply', () => {
  const initial = { room: 'Lobby', userCount: 5, tags: ['vr', 'metaverse'] };
  const dbg = new VrMetaverseHubStateDebugger(initial);

  assert.strictEqual(dbg.snapshots.length, 1);
  assert.strictEqual(dbg.currentIndex, 0);

  const current = dbg.getCurrentSnapshot();
  assert.strictEqual(current.action, '@@INIT');
  assert.deepStrictEqual(current.state, initial);

  // Verify deep clone prevents mutation leaks
  initial.tags.push('mutated');
  assert.strictEqual(current.state.tags.length, 2);
});

test('VrMetaverseHubStateDebugger - steps forward and backward with bounds clamping', () => {
  const dbg = new VrMetaverseHubStateDebugger({ count: 0 });
  dbg.recordSnapshot('INCREMENT', { count: 1 });
  dbg.recordSnapshot('INCREMENT', { count: 2 });
  dbg.recordSnapshot('INCREMENT', { count: 3 });

  assert.strictEqual(dbg.snapshots.length, 4);
  assert.strictEqual(dbg.currentIndex, 3);

  dbg.stepBack();
  assert.strictEqual(dbg.currentIndex, 2);
  assert.strictEqual(dbg.getCurrentSnapshot().state.count, 2);

  dbg.jumpToStep(0);
  assert.strictEqual(dbg.currentIndex, 0);
  assert.strictEqual(dbg.getCurrentSnapshot().state.count, 0);

  // Test lower boundary clamp
  dbg.stepBack();
  assert.strictEqual(dbg.currentIndex, 0);

  // Test upper boundary clamp
  dbg.jumpToStep(999);
  assert.strictEqual(dbg.currentIndex, 3);
});

test('VrMetaverseHubStateDebugger - computes delta diff between states accurately', () => {
  const dbg = new VrMetaverseHubStateDebugger();
  const s1 = { user: 'Alice', score: 100, status: 'online' };
  const s2 = { user: 'Alice', score: 150, location: 'Plaza' };

  const diff = dbg.computeDiff(s1, s2);

  assert.deepStrictEqual(diff.added, { location: 'Plaza' });
  assert.deepStrictEqual(diff.deleted, { status: 'online' });
  assert.deepStrictEqual(diff.modified, { score: { from: 100, to: 150 } });
});

test('VrMetaverseHubStateDebugger - exports and imports replay JSON correctly', () => {
  const dbg = new VrMetaverseHubStateDebugger({ avatar: 'NexusPilot' });
  dbg.recordSnapshot('TELEPORT', { avatar: 'NexusPilot', coords: [10, 20] });

  const exportedJson = dbg.exportReplay();
  assert.ok(typeof exportedJson === 'string');

  const newDbg = new VrMetaverseHubStateDebugger();
  const success = newDbg.importReplay(exportedJson);

  assert.strictEqual(success, true);
  assert.strictEqual(newDbg.snapshots.length, 2);
  assert.strictEqual(newDbg.currentIndex, 1);
  assert.strictEqual(newDbg.getCurrentSnapshot().action, 'TELEPORT');
});
