import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataVoiceCommander } from './voice-commander.js';

test('RoboticsAutomataVoiceCommander - parses start automation grammar', () => {
  const commander = new RoboticsAutomataVoiceCommander();
  const parsed = commander.parseVoiceGrammar('start automation system');
  assert.strictEqual(parsed.command, 'start');
  assert.strictEqual(parsed.confidence, 1);
  assert.strictEqual(parsed.transcript, 'start automation system');
});

test('RoboticsAutomataVoiceCommander - parses stop, status, reset, and help grammars', () => {
  const commander = new RoboticsAutomataVoiceCommander();
  assert.strictEqual(commander.parseVoiceGrammar('stop robot').command, 'stop');
  assert.strictEqual(commander.parseVoiceGrammar('system status').command, 'status');
  assert.strictEqual(commander.parseVoiceGrammar('reset').command, 'reset');
  assert.strictEqual(commander.parseVoiceGrammar('help me').command, 'help');
});

test('RoboticsAutomataVoiceCommander - returns fallback for unrecognized transcript', () => {
  const commander = new RoboticsAutomataVoiceCommander();
  const parsed = commander.parseVoiceGrammar('open the pod bay doors');
  assert.strictEqual(parsed.command, 'fallback');
  assert.strictEqual(parsed.confidence, 0);
});

test('RoboticsAutomataVoiceCommander - returns fallback for empty transcript', () => {
  const commander = new RoboticsAutomataVoiceCommander();
  const parsed = commander.parseVoiceGrammar('');
  assert.strictEqual(parsed.command, 'fallback');
  assert.strictEqual(parsed.confidence, 0);
});

test('RoboticsAutomataVoiceCommander - routes commands to correct responses', () => {
  const commander = new RoboticsAutomataVoiceCommander();
  assert.strictEqual(commander.routeCommand({ command: 'start', confidence: 1 }), 'Starting robotics automation system.');
  assert.strictEqual(commander.routeCommand({ command: 'stop', confidence: 1 }), 'Stopping robotics automation system.');
  assert.strictEqual(commander.routeCommand({ command: 'status', confidence: 1 }), 'Robotics automation system is operational and nominal.');
  assert.strictEqual(commander.routeCommand({ command: 'help', confidence: 1 }), 'Available commands: start automation, stop, status, reset, and help.');
});

test('RoboticsAutomataVoiceCommander - routes fallback to a fallback phrase string', () => {
  const commander = new RoboticsAutomataVoiceCommander();
  const fallbackRes = commander.routeCommand({ command: 'fallback', confidence: 0 });
  assert.strictEqual(typeof fallbackRes, 'string');
  assert.notStrictEqual(fallbackRes, '');
});

test('RoboticsAutomataVoiceCommander - synthesizeResponse resolves without speech synthesis', () => {
  const commander = new RoboticsAutomataVoiceCommander();
  commander.synth = null;
  return commander.synthesizeResponse('test message').then((result) => {
    assert.strictEqual(result, false);
  });
});
