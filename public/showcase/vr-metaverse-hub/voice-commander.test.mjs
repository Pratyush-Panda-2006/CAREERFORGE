import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubVoiceCommander } from './voice-commander.js';

test('VrMetaverseHubVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new VrMetaverseHubVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('VrMetaverseHubVoiceCommander - parses grammar pattern for teleport_hub correctly', () => {
  const commander = new VrMetaverseHubVoiceCommander();
  const res = commander.parseVoiceGrammar('teleport to hub');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'TELEPORT_HUB');
});

test('VrMetaverseHubVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new VrMetaverseHubVoiceCommander();
  const res = commander.parseVoiceGrammar('completely unrecognized extraterrestrial noise');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
