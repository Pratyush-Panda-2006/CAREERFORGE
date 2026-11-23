import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { GamingEsportsHubVoiceCommander } from './voice-commander.js';

const source = readFileSync(new URL('bracket.js', import.meta.url), 'utf8');
const bracket = runInNewContext(`${source}\nBracketLogic;`);

function setup(browser = {}) {
  const states = [];
  const results = [];
  const commander = new GamingEsportsHubVoiceCommander(bracket, browser, {
    onState: (message, active) => states.push([message ?? states.at(-1)?.[0], active]),
    onResult: (...args) => results.push(args),
  });
  return { commander, states, results };
}

test('grammar maps precise normalized commands and rejects unintended phrases', () => {
  const { commander } = setup();
  assert.equal(commander.parseVoiceGrammar('  GRAND  FINAL SCORE! '), 'gf');
  assert.equal(commander.parseVoiceGrammar('Semi-final ONE score'), 'sf1');
  assert.equal(commander.parseVoiceGrammar('semifinal 2'), 'sf2');
  assert.equal(commander.parseVoiceGrammar('Who won the tournament?'), 'champion');
  assert.equal(commander.parseVoiceGrammar('show commands'), 'help');
  assert.equal(commander.parseVoiceGrammar('do not read the final score'), null);
});

test('champion and match scores use the actual bracket model', () => {
  const { commander, results } = setup();
  assert.equal(commander.runCommand('champion'), 'Team Cyber won the tournament.');
  assert.equal(commander.runCommand('final score'), 'Grand Final: Team Cyber 3, Apex Titans 2. Team Cyber won.');
  assert.equal(commander.runCommand('semifinal one'), 'Semifinal 1: Team Cyber 3, Phantom Squad 1. Team Cyber won.');
  assert.equal(commander.runCommand('semifinal two'), 'Semifinal 2: Storm Reapers 1, Apex Titans 3. Apex Titans won.');
  assert.equal(results.length, 4);
});

test('unknown commands offer alternatives and preserve the input for history', () => {
  const { commander, results } = setup();
  const reply = commander.runCommand('launch match');
  assert.match(reply, /^Command not recognized\. Try champion/);
  assert.deepEqual(results, [['launch match', reply]]);
});

test('unsupported and synchronously failing recognition keep typed commands available', () => {
  const unsupported = setup();
  unsupported.commander.startListening();
  assert.match(unsupported.states[0][0], /unavailable/);
  const failed = setup({ SpeechRecognition: class { start() { throw new Error('failed'); } } });
  failed.commander.startListening();
  assert.equal(failed.commander.active, false);
  assert.match(failed.states.at(-1)[0], /Could not start/);
  assert.match(failed.commander.runCommand('champion'), /Team Cyber/);
});

test('recognition routes only final results and keeps denial visible after end', () => {
  const { commander, states, results } = setup({ webkitSpeechRecognition: class { start() {} stop() {} } });
  commander.startListening();
  const mic = commander.recognition;
  mic.onstart();
  mic.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'champion' } }] });
  assert.equal(results.length, 0);
  mic.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'champion' } }] });
  assert.match(results[0][1], /Team Cyber/);
  commander.stopListening();
  mic.onerror({ error: 'not-allowed' });
  mic.onend();
  assert.deepEqual(states.at(-1), ['Microphone access is unavailable. Type a command below.', false]);
});

test('spoken replies replace queued speech and have a language set', () => {
  const events = [];
  const { commander } = setup({
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: {
      cancel() { events.push('canceled'); },
      speak(message) { events.push([message.text, message.lang]); },
    },
  });
  commander.synthesizeResponse('Team Cyber won.');
  assert.deepEqual(events, ['canceled', ['Team Cyber won.', 'en-US']]);
});
