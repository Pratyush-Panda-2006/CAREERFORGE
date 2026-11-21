import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadStateDebugger } from './state-debugger.js';

describe('SaasLaunchpadStateDebugger (Issue #1036)', () => {
  it('initializes with genesis snapshot and deep clones state', () => {
    const initialState = { count: 1, nested: { prop: 'initial' } };
    const debuggerEngine = new SaasLaunchpadStateDebugger(initialState);

    assert.equal(debuggerEngine.history.length, 1);
    assert.equal(debuggerEngine.currentIndex, 0);
    assert.equal(debuggerEngine.history[0].action, '@@INIT_STATE');

    // Mutate source to verify deep cloning
    initialState.nested.prop = 'mutated';
    assert.equal(debuggerEngine.getCurrentState().nested.prop, 'initial');
  });

  it('records sequential snapshots and updates pointer correctly', () => {
    const debuggerEngine = new SaasLaunchpadStateDebugger({ counter: 0 });

    debuggerEngine.recordSnapshot('INCREMENT', { counter: 1 });
    debuggerEngine.recordSnapshot('INCREMENT', { counter: 2 });

    assert.equal(debuggerEngine.history.length, 3);
    assert.equal(debuggerEngine.currentIndex, 2);
    assert.equal(debuggerEngine.getCurrentState().counter, 2);
  });

  it('jumps to historical steps and clamps out-of-bounds indices', () => {
    const debuggerEngine = new SaasLaunchpadStateDebugger({ step: 0 });
    debuggerEngine.recordSnapshot('STEP_1', { step: 1 });
    debuggerEngine.recordSnapshot('STEP_2', { step: 2 });

    // Jump back to step 0
    const state0 = debuggerEngine.jumpToStep(0);
    assert.equal(state0.step, 0);
    assert.equal(debuggerEngine.currentIndex, 0);

    // Clamp high
    const stateHigh = debuggerEngine.jumpToStep(999);
    assert.equal(stateHigh.step, 2);
    assert.equal(debuggerEngine.currentIndex, 2);

    // Clamp low
    const stateLow = debuggerEngine.jumpToStep(-5);
    assert.equal(stateLow.step, 0);
    assert.equal(debuggerEngine.currentIndex, 0);
  });

  it('truncates future history when recording a new action from a past index', () => {
    const debuggerEngine = new SaasLaunchpadStateDebugger({ version: '1.0' });
    debuggerEngine.recordSnapshot('UPDATE_A', { version: '2.0' });
    debuggerEngine.recordSnapshot('UPDATE_B', { version: '3.0' });

    // Rewind to step 1 (UPDATE_A)
    debuggerEngine.jumpToStep(1);
    assert.equal(debuggerEngine.currentIndex, 1);

    // Branch from step 1
    debuggerEngine.recordSnapshot('FORKED_ACTION', { version: '2.1-fork' });
    assert.equal(debuggerEngine.history.length, 3);
    assert.equal(debuggerEngine.history[2].action, 'FORKED_ACTION');
    assert.equal(debuggerEngine.getCurrentState().version, '2.1-fork');
  });

  it('computes structured key-level diffs accurately', () => {
    const debuggerEngine = new SaasLaunchpadStateDebugger();

    const s1 = { title: 'Old', removed: 10, shared: true };
    const s2 = { title: 'New', added: 'extra', shared: true };

    const diffs = debuggerEngine.computeDiff(s1, s2);

    const titleDiff = diffs.find(d => d.key === 'title');
    assert.equal(titleDiff.type, 'modified');
    assert.equal(titleDiff.oldVal, 'Old');
    assert.equal(titleDiff.newVal, 'New');

    const addedDiff = diffs.find(d => d.key === 'added');
    assert.equal(addedDiff.type, 'added');
    assert.equal(addedDiff.newVal, 'extra');

    const removedDiff = diffs.find(d => d.key === 'removed');
    assert.equal(removedDiff.type, 'deleted');
    assert.equal(removedDiff.oldVal, 10);

    const sharedDiff = diffs.find(d => d.key === 'shared');
    assert.equal(sharedDiff.type, 'unchanged');
  });

  it('exports valid JSON replay and imports successfully', () => {
    const debuggerEngine = new SaasLaunchpadStateDebugger({ app: 'init' });
    debuggerEngine.recordSnapshot('EVENT_X', { app: 'running', status: 200 });

    const exportStr = debuggerEngine.exportReplay();
    assert.ok(typeof exportStr === 'string');

    // Create fresh instance and import replay
    const freshDebugger = new SaasLaunchpadStateDebugger();
    const importRes = freshDebugger.importReplay(exportStr);
    assert.equal(importRes.success, true);
    assert.equal(freshDebugger.history.length, 2);
    assert.equal(freshDebugger.getCurrentState().status, 200);

    // Corrupted import check
    const badImport = freshDebugger.importReplay('invalid json');
    assert.equal(badImport.success, false);
  });
});
