import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridKeyboardShortcuts } from './keyboard-shortcuts.js';

describe('RenewableMicrogridKeyboardShortcuts', () => {
  it('initializes with default key bindings', () => {
    const kb = new RenewableMicrogridKeyboardShortcuts();
    assert.ok(kb.shortcuts.length >= 4);
  });

  it('filters shortcuts by search keyword', () => {
    const kb = new RenewableMicrogridKeyboardShortcuts();
    const matches = kb.filter('search');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].key, 'Ctrl+K');
  });

  it('allows registering custom shortcuts', () => {
    const kb = new RenewableMicrogridKeyboardShortcuts();
    kb.register('Ctrl+B', 'Build', 'Trigger build pipeline');
    assert.equal(kb.shortcuts.length, 5);
  });
});
