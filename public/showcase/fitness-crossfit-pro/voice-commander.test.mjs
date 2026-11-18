import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProVoiceCommander } from './voice-commander.js';

test('FitnessCrossfitProVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new FitnessCrossfitProVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('FitnessCrossfitProVoiceCommander - parses start workout grammar pattern correctly', () => {
  const commander = new FitnessCrossfitProVoiceCommander();
  const res1 = commander.parseVoiceGrammar('start wod');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'START_WORKOUT');

  const res2 = commander.parseVoiceGrammar('begin workout');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, 'START_WORKOUT');
});

test('FitnessCrossfitProVoiceCommander - parses rep logging grammar with parameter extraction', () => {
  const commander = new FitnessCrossfitProVoiceCommander();
  const res = commander.parseVoiceGrammar('log 20 reps');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'LOG_REPS');
});

test('FitnessCrossfitProVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new FitnessCrossfitProVoiceCommander();
  const res = commander.parseVoiceGrammar('what is the meaning of life');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
