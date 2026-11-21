import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasVoiceCommander } from './voice-commander.js';

test('WeatherRadarAtlasVoiceCommander - initializes in idle state with empty history', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(commander.getCommandHistory().length, 0);
  assert.ok(commander.getLastResponse().includes('Voice Commander standby'));
});

test('WeatherRadarAtlasVoiceCommander - starts and stops listening state accurately', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  assert.strictEqual(commander.startListening(), true);
  assert.strictEqual(commander.isListeningState(), true);
  assert.strictEqual(commander.stopListening(), false);
  assert.strictEqual(commander.isListeningState(), false);
});

test('WeatherRadarAtlasVoiceCommander - parses Doppler radar sweep grammar', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('sweep doppler radar');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'EXECUTE_DOPPLER_SWEEP');
  assert.ok(res.response.includes('Doppler radar sweep'));
});

test('WeatherRadarAtlasVoiceCommander - parses storm cell detection grammar with case insensitivity', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('SCAN STORM CELLS');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'SCAN_STORM_CELLS');
  assert.ok(res.response.includes('storm cells'));
});

test('WeatherRadarAtlasVoiceCommander - parses precipitation overlay toggle grammar', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('toggle precipitation overlay');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'TOGGLE_PRECIPITATION_OVERLAY');
  assert.ok(res.response.includes('precipitation overlay'));
});

test('WeatherRadarAtlasVoiceCommander - parses wind speed check grammar', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('check wind speed');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'CHECK_WIND_VELOCITY');
  assert.ok(res.response.includes('wind vector metrics'));
});

test('WeatherRadarAtlasVoiceCommander - parses zoom radar grammar', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('zoom in radar');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'ZOOM_IN_RADAR');
  assert.ok(res.response.includes('Magnifying radar sector'));
});

test('WeatherRadarAtlasVoiceCommander - parses severe weather alerts grammar', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('show severe weather alerts');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'SHOW_SEVERE_ALERTS');
  assert.ok(res.response.includes('severe weather bulletins'));
});

test('WeatherRadarAtlasVoiceCommander - handles unrecognized grammar with fallback message', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('make me a cup of coffee');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'UNRECOGNIZED_COMMAND');
  assert.ok(res.response.includes('not recognized'));
});

test('WeatherRadarAtlasVoiceCommander - handles empty or invalid transcripts safely', () => {
  const commander = new WeatherRadarAtlasVoiceCommander();
  const res = commander.parseVoiceGrammar('');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'UNKNOWN_GRAMMAR');
});

test('WeatherRadarAtlasVoiceCommander - tracks command history and supports clearing', () => {
  const commander = new WeatherRadarAtlasVoiceCommander({ maxHistory: 5 });
  commander.handleTranscript('sweep doppler radar');
  commander.handleTranscript('check wind speed');

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].action, 'CHECK_WIND_VELOCITY');
  assert.strictEqual(history[1].action, 'EXECUTE_DOPPLER_SWEEP');

  commander.clearHistory();
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('WeatherRadarAtlasVoiceCommander - synthesizes audio response and formats return string', () => {
  const mockSynth = {
    speaking: false,
    cancel() {},
    speak() {}
  };
  const commander = new WeatherRadarAtlasVoiceCommander({ synth: mockSynth });
  const out = commander.synthesizeResponse('Testing speech synthesis dispatcher.');
  assert.strictEqual(out, 'Testing speech synthesis dispatcher.');
  assert.strictEqual(commander.getLastResponse(), 'Testing speech synthesis dispatcher.');
});
