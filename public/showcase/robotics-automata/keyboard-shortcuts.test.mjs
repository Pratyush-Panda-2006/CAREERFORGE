import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataKeyboardShortcuts } from './keyboard-shortcuts.js';

describe('RoboticsAutomataKeyboardShortcuts', () => {
  it('initializes with default key bindings', () => {
    const kb = new RoboticsAutomataKeyboardShortcuts();
    assert.ok(kb.shortcuts.length >= 4);
  });

  it('filters shortcuts by search keyword', () => {
    const kb = new RoboticsAutomataKeyboardShortcuts();
    const matches = kb.filter('search');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].key, 'Ctrl+K');
  });

  it('allows registering custom shortcuts', () => {
    const kb = new RoboticsAutomataKeyboardShortcuts();
    kb.register('Ctrl+B', 'Build', 'Trigger build pipeline');
    assert.equal(kb.shortcuts.length, 5);
  });
});
