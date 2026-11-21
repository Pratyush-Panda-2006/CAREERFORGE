import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioStateDebugger } from './state-debugger.js';

describe('DeveloperPortfolioStateDebugger (Issue #1040)', () => {
  it('initializes with genesis snapshot and deep clones state', () => {
    const initialState = { repoCount: 42, developer: { handle: '@coder' } };
    const debuggerEngine = new DeveloperPortfolioStateDebugger(initialState);

    assert.equal(debuggerEngine.history.length, 1);
    assert.equal(debuggerEngine.currentIndex, 0);
    assert.equal(debuggerEngine.history[0].action, '@@INIT_PORTFOLIO_STATE');

    // Mutate source to test deep clone independence
    initialState.developer.handle = '@hacked';
    assert.equal(debuggerEngine.getCurrentState().developer.handle, '@coder');
  });

  it('records sequential snapshots and updates pointer correctly', () => {
    const debuggerEngine = new DeveloperPortfolioStateDebugger({ stars: 100 });

    debuggerEngine.recordSnapshot('STAR_REPO', { stars: 101 });
    debuggerEngine.recordSnapshot('STAR_REPO', { stars: 102 });

    assert.equal(debuggerEngine.history.length, 3);
    assert.equal(debuggerEngine.currentIndex, 2);
    assert.equal(debuggerEngine.getCurrentState().stars, 102);
  });

  it('jumps to historical steps and clamps out-of-bounds indices', () => {
    const debuggerEngine = new DeveloperPortfolioStateDebugger({ commit: 'c0' });
    debuggerEngine.recordSnapshot('COMMIT_1', { commit: 'c1' });
    debuggerEngine.recordSnapshot('COMMIT_2', { commit: 'c2' });

    // Jump back to genesis
    const state0 = debuggerEngine.jumpToStep(0);
    assert.equal(state0.commit, 'c0');
    assert.equal(debuggerEngine.currentIndex, 0);

    // Clamp high
    const stateHigh = debuggerEngine.jumpToStep(999);
    assert.equal(stateHigh.commit, 'c2');
    assert.equal(debuggerEngine.currentIndex, 2);

    // Clamp low
    const stateLow = debuggerEngine.jumpToStep(-10);
    assert.equal(stateLow.commit, 'c0');
    assert.equal(debuggerEngine.currentIndex, 0);
  });

  it('truncates future history when recording a new action from a past index', () => {
    const debuggerEngine = new DeveloperPortfolioStateDebugger({ branch: 'main' });
    debuggerEngine.recordSnapshot('FEATURE_A', { branch: 'feat/a' });
    debuggerEngine.recordSnapshot('FEATURE_B', { branch: 'feat/b' });

    // Rewind to step 1
    debuggerEngine.jumpToStep(1);
    assert.equal(debuggerEngine.currentIndex, 1);

    // Branch to new action
    debuggerEngine.recordSnapshot('HOTFIX_C', { branch: 'hotfix/c' });
    assert.equal(debuggerEngine.history.length, 3);
    assert.equal(debuggerEngine.history[2].action, 'HOTFIX_C');
    assert.equal(debuggerEngine.getCurrentState().branch, 'hotfix/c');
  });

  it('computes structured key-level diffs accurately', () => {
    const debuggerEngine = new DeveloperPortfolioStateDebugger();

    const s1 = { theme: 'dark', deprecated: 'old-plugin', unchanged: 100 };
    const s2 = { theme: 'light', addedFeature: true, unchanged: 100 };

    const diffs = debuggerEngine.computeDiff(s1, s2);

    const themeDiff = diffs.find(d => d.key === 'theme');
    assert.equal(themeDiff.type, 'modified');
    assert.equal(themeDiff.oldVal, 'dark');
    assert.equal(themeDiff.newVal, 'light');

    const addedDiff = diffs.find(d => d.key === 'addedFeature');
    assert.equal(addedDiff.type, 'added');
    assert.equal(addedDiff.newVal, true);

    const deprecatedDiff = diffs.find(d => d.key === 'deprecated');
    assert.equal(deprecatedDiff.type, 'deleted');
    assert.equal(deprecatedDiff.oldVal, 'old-plugin');

    const unchangedDiff = diffs.find(d => d.key === 'unchanged');
    assert.equal(unchangedDiff.type, 'unchanged');
  });

  it('exports valid JSON replay and imports successfully', () => {
    const debuggerEngine = new DeveloperPortfolioStateDebugger({ init: true });
    debuggerEngine.recordSnapshot('ADD_SKILL', { init: true, skills: ['Rust'] });

    const exportStr = debuggerEngine.exportReplay();
    assert.ok(typeof exportStr === 'string');

    // Fresh instance import
    const freshDebugger = new DeveloperPortfolioStateDebugger();
    const importRes = freshDebugger.importReplay(exportStr);
    assert.equal(importRes.success, true);
    assert.equal(freshDebugger.history.length, 2);
    assert.deepEqual(freshDebugger.getCurrentState().skills, ['Rust']);

    // Invalid JSON import test
    const badImport = freshDebugger.importReplay('{invalid json');
    assert.equal(badImport.success, false);
  });
});
