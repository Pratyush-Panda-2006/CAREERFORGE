import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataStateDebugger } from './state-debugger.js';

test('RoboticsAutomataStateDebugger - initializes and records snapshots deeply', () => {
  const initial = { botId: 'ROBO-1', joints: [10, 20, 30], flags: { active: true } };
  const dbg = new RoboticsAutomataStateDebugger(initial);

  assert.strictEqual(dbg.snapshots.length, 1);
  assert.strictEqual(dbg.currentIndex, 0);

  const current = dbg.getCurrentSnapshot();
  assert.strictEqual(current.action, '@@INIT');
  assert.deepStrictEqual(current.state, initial);

  // Deep clone prevents mutation
  initial.joints.push(99);
  assert.strictEqual(current.state.joints.length, 3);
});

test('RoboticsAutomataStateDebugger - steps forward and backward with bounds clamping', () => {
  const dbg = new RoboticsAutomataStateDebugger({ step: 0 });
  dbg.recordSnapshot('MOVE_X', { step: 1 });
  dbg.recordSnapshot('MOVE_Y', { step: 2 });
  dbg.recordSnapshot('MOVE_Z', { step: 3 });

  assert.strictEqual(dbg.snapshots.length, 4);
  assert.strictEqual(dbg.currentIndex, 3);

  dbg.stepBack();
  assert.strictEqual(dbg.currentIndex, 2);
  assert.strictEqual(dbg.getCurrentSnapshot().state.step, 2);

  dbg.jumpToStep(0);
  assert.strictEqual(dbg.currentIndex, 0);
  assert.strictEqual(dbg.getCurrentSnapshot().state.step, 0);

  // Clamping
  dbg.stepBack();
  assert.strictEqual(dbg.currentIndex, 0);
  dbg.jumpToStep(500);
  assert.strictEqual(dbg.currentIndex, 3);
});

test('RoboticsAutomataStateDebugger - computes delta diff between states accurately', () => {
  const dbg = new RoboticsAutomataStateDebugger();
  const s1 = { status: 'STANDBY', power: 50, sensor: 'IR' };
  const s2 = { status: 'ENGAGED', power: 75, target: 'B9' };

  const diff = dbg.computeDiff(s1, s2);

  assert.deepStrictEqual(diff.added, { target: 'B9' });
  assert.deepStrictEqual(diff.deleted, { sensor: 'IR' });
  assert.deepStrictEqual(diff.modified, {
    status: { from: 'STANDBY', to: 'ENGAGED' },
    power: { from: 50, to: 75 }
  });
});

test('RoboticsAutomataStateDebugger - exports and imports replay JSON correctly', () => {
  const dbg = new RoboticsAutomataStateDebugger({ bot: 'AUTO-7' });
  dbg.recordSnapshot('GRIPPER_CLOSE', { bot: 'AUTO-7', grip: 100 });

  const exportedJson = dbg.exportReplay();
  assert.ok(typeof exportedJson === 'string');

  const newDbg = new RoboticsAutomataStateDebugger();
  const success = newDbg.importReplay(exportedJson);

  assert.strictEqual(success, true);
  assert.strictEqual(newDbg.snapshots.length, 2);
  assert.strictEqual(newDbg.currentIndex, 1);
  assert.strictEqual(newDbg.getCurrentSnapshot().action, 'GRIPPER_CLOSE');
});
