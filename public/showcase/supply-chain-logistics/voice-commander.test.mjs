import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsVoiceCommander } from './voice-commander.js';

test('SupplyChainLogisticsVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new SupplyChainLogisticsVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('SupplyChainLogisticsVoiceCommander - parses grammar pattern for track_shipment correctly', () => {
  const commander = new SupplyChainLogisticsVoiceCommander();
  const res = commander.parseVoiceGrammar('track shipment');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'TRACK_SHIPMENT');
});

test('SupplyChainLogisticsVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new SupplyChainLogisticsVoiceCommander();
  const res = commander.parseVoiceGrammar('completely unrecognized extraterrestrial noise');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
