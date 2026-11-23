import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactKeyboardShortcuts } from './keyboard-shortcuts.js';

describe('NonprofitImpactKeyboardShortcuts', () => {
  it('initializes with default key bindings', () => {
    const kb = new NonprofitImpactKeyboardShortcuts();
    assert.ok(kb.shortcuts.length >= 4);
  });

  it('filters shortcuts by search keyword', () => {
    const kb = new NonprofitImpactKeyboardShortcuts();
    const matches = kb.filter('search');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].key, 'Ctrl+K');
  });

  it('allows registering custom shortcuts', () => {
    const kb = new NonprofitImpactKeyboardShortcuts();
    kb.register('Ctrl+B', 'Build', 'Trigger build pipeline');
    assert.equal(kb.shortcuts.length, 5);
  });
});
