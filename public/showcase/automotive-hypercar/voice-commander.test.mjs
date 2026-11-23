import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarVoiceCommander } from './voice-commander.js';

test('AutomotiveHypercarVoiceCommander - rejects empty or whitespace transcripts', () => {
  const commander = new AutomotiveHypercarVoiceCommander();

  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('AutomotiveHypercarVoiceCommander - parses start engine and launch control grammar patterns', () => {
  const commander = new AutomotiveHypercarVoiceCommander();

  const res1 = commander.parseVoiceGrammar('start engine');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'START_ENGINE');

  const res2 = commander.parseVoiceGrammar('ignite motor');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, 'START_ENGINE');

  const res3 = commander.parseVoiceGrammar('engage launch control');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.action, 'LAUNCH_CONTROL');

  const res4 = commander.parseVoiceGrammar('telemetry status');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.action, 'TELEMETRY_STATUS');

  const res5 = commander.parseVoiceGrammar('torque vectoring');
  assert.strictEqual(res5.matched, true);
  assert.strictEqual(res5.action, 'TORQUE_VECTORING');
});

test('AutomotiveHypercarVoiceCommander - parses active aero downforce grammar pattern', () => {
  const commander = new AutomotiveHypercarVoiceCommander();
  const res = commander.parseVoiceGrammar('increase downforce aero');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'ACTIVE_AERO');
});

test('AutomotiveHypercarVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new AutomotiveHypercarVoiceCommander();
  const res = commander.parseVoiceGrammar('buy cryptocurrency now');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});

test('AutomotiveHypercarVoiceCommander - synthesizeResponse handles unavailable synthesis gracefully', () => {
  const commander = new AutomotiveHypercarVoiceCommander({ speechSynth: null });
  const res = commander.synthesizeResponse('start engine');
  assert.strictEqual(res.spoken, false);
  assert.strictEqual(res.reason, 'SYNTH_UNAVAILABLE');
  assert.strictEqual(res.text, 'start engine');

  const emptyRes = commander.synthesizeResponse('');
  assert.strictEqual(emptyRes, null);
});
