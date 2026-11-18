import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingVoiceCommander } from './voice-commander.js';

test('AgritechPrecisionFarmingVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new AgritechPrecisionFarmingVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('AgritechPrecisionFarmingVoiceCommander - parses irrigation grammar patterns correctly', () => {
  const commander = new AgritechPrecisionFarmingVoiceCommander();
  const res1 = commander.parseVoiceGrammar('activate irrigation');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'ACTIVATE_IRRIGATION');

  const res2 = commander.parseVoiceGrammar('turn on sprinklers');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, 'ACTIVATE_IRRIGATION');

  const res3 = commander.parseVoiceGrammar('stop irrigation');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.action, 'STOP_IRRIGATION');
});

test('AgritechPrecisionFarmingVoiceCommander - parses drone survey grammar correctly', () => {
  const commander = new AgritechPrecisionFarmingVoiceCommander();
  const res = commander.parseVoiceGrammar('deploy drone');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'DEPLOY_DRONE');
});

test('AgritechPrecisionFarmingVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new AgritechPrecisionFarmingVoiceCommander();
  const res = commander.parseVoiceGrammar('play heavy metal music');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
