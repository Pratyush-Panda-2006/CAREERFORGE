import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AerospaceOrbiterVoiceCommander,
  ORBITER_GRAMMAR_PATTERNS,
  ORBITER_RESPONSES,
  FALLBACK_PHRASES
} from './voice-commander.js';

test('AerospaceOrbiterVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new AerospaceOrbiterVoiceCommander();
  const emptyRes = commander.parseVoiceGrammar('');
  assert.strictEqual(emptyRes.matched, false);
  assert.strictEqual(emptyRes.action, 'UNKNOWN');
  assert.strictEqual(emptyRes.confidence, 0);

  const whitespaceRes = commander.parseVoiceGrammar('   \t\n ');
  assert.strictEqual(whitespaceRes.matched, false);
  assert.strictEqual(whitespaceRes.action, 'UNKNOWN');
});

test('AerospaceOrbiterVoiceCommander - parses orbit burn grammar and variations', () => {
  const commander = new AerospaceOrbiterVoiceCommander();
  const res1 = commander.parseVoiceGrammar('execute orbit burn');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.command, 'orbit_burn');
  assert.strictEqual(res1.action, 'ORBIT_BURN');

  const res2 = commander.parseVoiceGrammar('thruster vector prograde');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.command, 'orbit_burn');
});

test('AerospaceOrbiterVoiceCommander - parses core flight actions correctly', () => {
  const commander = new AerospaceOrbiterVoiceCommander();
  assert.strictEqual(commander.parseVoiceGrammar('telemetry check').command, 'telemetry_check');
  assert.strictEqual(commander.parseVoiceGrammar('docking alignment station').command, 'docking_alignment');
  assert.strictEqual(commander.parseVoiceGrammar('jettison stage separation').command, 'jettison_stage');
  assert.strictEqual(commander.parseVoiceGrammar('abort mission immediately').command, 'abort_mission');
  assert.strictEqual(commander.parseVoiceGrammar('system status').command, 'status');
  assert.strictEqual(commander.parseVoiceGrammar('help instructions').command, 'help');
  assert.strictEqual(commander.parseVoiceGrammar('reset navigation').command, 'reset');
});

test('AerospaceOrbiterVoiceCommander - routes recognized commands to corresponding responses', () => {
  const commander = new AerospaceOrbiterVoiceCommander();
  const burnRoute = commander.routeCommand({ command: 'orbit_burn', confidence: 1, matched: true });
  assert.strictEqual(burnRoute, ORBITER_RESPONSES.orbit_burn);

  const abortRoute = commander.routeCommand({ command: 'abort_mission', confidence: 1, matched: true });
  assert.strictEqual(abortRoute, ORBITER_RESPONSES.abort_mission);
});

test('AerospaceOrbiterVoiceCommander - handles fallback phrase routing for unrecognized speech', () => {
  const commander = new AerospaceOrbiterVoiceCommander();
  const unrecognized = commander.parseVoiceGrammar('unidentified flying anomaly query');
  assert.strictEqual(unrecognized.matched, false);
  assert.strictEqual(unrecognized.command, 'fallback');
  assert.strictEqual(unrecognized.action, 'FALLBACK');

  const routedFallback = commander.routeCommand(unrecognized);
  assert.strictEqual(typeof routedFallback, 'string');
  assert.strictEqual(routedFallback, FALLBACK_PHRASES[0]);

  // History should record the fallback
  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});

test('AerospaceOrbiterVoiceCommander - registers and matches custom runtime commands', () => {
  const commander = new AerospaceOrbiterVoiceCommander();
  commander.registerCommand(
    'solar_panel_deploy',
    /deploy\s*solar\s*panels?/i,
    'DEPLOY_SOLAR_PANELS',
    'Photovoltaic solar array deployed.'
  );

  const res = commander.parseVoiceGrammar('deploy solar panels');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.command, 'solar_panel_deploy');
  assert.strictEqual(res.action, 'DEPLOY_SOLAR_PANELS');
  assert.strictEqual(res.response, 'Photovoltaic solar array deployed.');
});

test('AerospaceOrbiterVoiceCommander - synthesizeResponse gracefully resolves false when no SpeechSynthesis', async () => {
  const commander = new AerospaceOrbiterVoiceCommander({ speechSynth: null });
  const result = await commander.synthesizeResponse('Test audio transmission');
  assert.strictEqual(result, false);
});
