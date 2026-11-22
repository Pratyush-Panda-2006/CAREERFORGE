import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelVoiceCommander } from './voice-commander.js';

test('CybersecuritySentinelVoiceCommander - grammar regex matching recognizes known commands', () => {
  const commander = new CybersecuritySentinelVoiceCommander({
    grammars: [
      { pattern: '\\b(lock|secure|shield)\\b', command: 'lock_system', action: 'lock_system', confidence: 0.9 },
      { pattern: '\\b(scan|audit|inspect)\\b', command: 'run_scan', action: 'run_scan', confidence: 0.9 }
    ],
    commands: [
      { id: 'lock_system', response: 'System locked.' },
      { id: 'run_scan', response: 'Scanning...' }
    ]
  });

  const lock = commander.parseVoiceGrammar('please lock the system');
  assert.strictEqual(lock.command, 'lock_system');
  assert.strictEqual(lock.action, 'lock_system');
  assert.strictEqual(lock.confidence, 0.9);

  const scan = commander.parseVoiceGrammar('run a full audit now');
  assert.strictEqual(scan.command, 'run_scan');
  assert.strictEqual(scan.action, 'run_scan');
});

test('CybersecuritySentinelVoiceCommander - command routing lookup returns correct responses', () => {
  const commander = new CybersecuritySentinelVoiceCommander({
    grammars: [
      { pattern: '\\b(help|assist)\\b', command: 'help', action: 'help', confidence: 0.8 }
    ],
    commands: [
      { id: 'help', response: 'Available commands: lock, scan, alert, logout, help.' }
    ]
  });

  const parsed = commander.parseVoiceGrammar('i need help');
  const routed = commander.routeCommand(parsed);
  assert.strictEqual(routed.handled, true);
  assert.strictEqual(routed.message, 'Available commands: lock, scan, alert, logout, help.');
});

test('CybersecuritySentinelVoiceCommander - fallback phrase handling for unknown commands', () => {
  const commander = new CybersecuritySentinelVoiceCommander({
    grammars: [
      { pattern: '\\b(lock|secure)\\b', command: 'lock_system', action: 'lock_system', confidence: 0.9 }
    ],
    commands: [
      { id: 'lock_system', response: 'System locked.' }
    ]
  });

  const unknown = commander.parseVoiceGrammar('play some music');
  assert.strictEqual(unknown.command, 'unknown');
  assert.strictEqual(unknown.action, 'fallback');

  const routed = commander.routeCommand(unknown);
  assert.strictEqual(routed.handled, false);
  assert.ok(typeof routed.message === 'string' && routed.message.length > 0);
});

test('CybersecuritySentinelVoiceCommander - record and retrieve command history', () => {
  const commander = new CybersecuritySentinelVoiceCommander({ maxHistory: 5 });
  commander.recordCommand('lock system', 'System locked.', 'lock_system');
  commander.recordCommand('run scan', 'Scanning...', 'run_scan');

  const history = commander.getHistory();
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].transcript, 'run scan');
  assert.strictEqual(history[1].transcript, 'lock system');
  assert.ok(history[0].id.startsWith('vc_'));

  commander.clearHistory();
  assert.strictEqual(commander.getHistory().length, 0);
});
