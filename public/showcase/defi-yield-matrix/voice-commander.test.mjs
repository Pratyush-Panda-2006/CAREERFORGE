import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixVoiceCommander } from './voice-commander.js';

test('DefiYieldMatrixVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new DefiYieldMatrixVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('DefiYieldMatrixVoiceCommander - parses recognized command grammar pattern correctly', () => {
  const commander = new DefiYieldMatrixVoiceCommander();
  const res = commander.parseVoiceGrammar('stake liquidity');
  assert.strictEqual(res.matched, true);
});

test('DefiYieldMatrixVoiceCommander - registers custom runtime command correctly', () => {
  const commander = new DefiYieldMatrixVoiceCommander();
  commander.registerCommand('custom_ping', /ping/i, 'PONG', 'Pong acknowledgement.');
  const res = commander.parseVoiceGrammar('ping');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'PONG');
});

test('DefiYieldMatrixVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new DefiYieldMatrixVoiceCommander();
  const res = commander.parseVoiceGrammar('unrecognized unknown test phrase');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
