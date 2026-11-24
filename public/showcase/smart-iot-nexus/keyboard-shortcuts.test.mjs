import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusKeyboardShortcuts } from './keyboard-shortcuts.js';

describe('SmartIotNexusKeyboardShortcuts', () => {
  it('initializes with default key bindings', () => {
    const kb = new SmartIotNexusKeyboardShortcuts();
    assert.ok(kb.shortcuts.length >= 4);
  });

  it('filters shortcuts by search keyword', () => {
    const kb = new SmartIotNexusKeyboardShortcuts();
    const matches = kb.filter('search');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].key, 'Ctrl+K');
  });

  it('allows registering custom shortcuts', () => {
    const kb = new SmartIotNexusKeyboardShortcuts();
    kb.register('Ctrl+B', 'Build', 'Trigger build pipeline');
    assert.equal(kb.shortcuts.length, 5);
  });
});
