import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubVoiceCommander } from './voice-commander.js';

test('StreamingCinemaHubVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new StreamingCinemaHubVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('StreamingCinemaHubVoiceCommander - parses play and pause movie commands correctly', () => {
  const commander = new StreamingCinemaHubVoiceCommander();
  const playRes = commander.parseVoiceGrammar('play movie');
  assert.strictEqual(playRes.matched, true);
  assert.strictEqual(playRes.action, 'PLAY_MEDIA');

  const pauseRes = commander.parseVoiceGrammar('pause video');
  assert.strictEqual(pauseRes.matched, true);
  assert.strictEqual(pauseRes.action, 'PAUSE_MEDIA');
});

test('StreamingCinemaHubVoiceCommander - parses subtitles and volume adjustments', () => {
  const commander = new StreamingCinemaHubVoiceCommander();
  const subRes = commander.parseVoiceGrammar('subtitles on');
  assert.strictEqual(subRes.matched, true);
  assert.strictEqual(subRes.action, 'TOGGLE_SUBTITLES');

  const volRes = commander.parseVoiceGrammar('volume up');
  assert.strictEqual(volRes.matched, true);
  assert.strictEqual(volRes.action, 'ADJUST_VOLUME');
});

test('StreamingCinemaHubVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new StreamingCinemaHubVoiceCommander();
  const res = commander.parseVoiceGrammar('order some popcorn and nachos');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
