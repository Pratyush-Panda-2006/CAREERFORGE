import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridVoiceCommander } from './voice-commander.js';

test('RenewableMicrogridVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new RenewableMicrogridVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('RenewableMicrogridVoiceCommander - parses grammar pattern for solar_output correctly', () => {
  const commander = new RenewableMicrogridVoiceCommander();
  const res = commander.parseVoiceGrammar('check solar output');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'CHECK_SOLAR');
});

test('RenewableMicrogridVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new RenewableMicrogridVoiceCommander();
  const res = commander.parseVoiceGrammar('completely unrecognized extraterrestrial noise');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
