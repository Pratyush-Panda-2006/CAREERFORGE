import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusVoiceCommander } from './voice-commander.js';

test('SmartIotNexusVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new SmartIotNexusVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('SmartIotNexusVoiceCommander - parses recognized command grammar pattern correctly', () => {
  const commander = new SmartIotNexusVoiceCommander();
  const res = commander.parseVoiceGrammar('reboot gateway');
  assert.strictEqual(res.matched, true);
});

test('SmartIotNexusVoiceCommander - registers custom runtime command correctly', () => {
  const commander = new SmartIotNexusVoiceCommander();
  commander.registerCommand('custom_ping', /ping/i, 'PONG', 'Pong acknowledgement.');
  const res = commander.parseVoiceGrammar('ping');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'PONG');
});

test('SmartIotNexusVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new SmartIotNexusVoiceCommander();
  const res = commander.parseVoiceGrammar('unrecognized unknown test phrase');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
