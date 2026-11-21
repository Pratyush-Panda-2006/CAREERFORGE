import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceVoiceCommander } from './voice-commander.js';

test('VoiceCommander Grammar - recognizes dashboard navigation commands', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const res1 = commander.parseVoiceGrammar('go to dashboard');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.commandId, 'go_to_dashboard');
  assert.strictEqual(res1.category, 'navigation');

  const res2 = commander.parseVoiceGrammar('open dashboard');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.commandId, 'go_to_dashboard');
});

test('VoiceCommander Grammar - recognizes help commands', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const res1 = commander.parseVoiceGrammar('show help');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.commandId, 'show_help');
  assert.strictEqual(res1.category, 'help');

  const res2 = commander.parseVoiceGrammar('what can i say');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.commandId, 'show_help');
});

test('VoiceCommander Grammar - recognizes start and stop listening commands', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const startRes = commander.parseVoiceGrammar('start listening');
  assert.strictEqual(startRes.matched, true);
  assert.strictEqual(startRes.commandId, 'start_listening');
  assert.strictEqual(startRes.category, 'control');

  const stopRes = commander.parseVoiceGrammar('stop listening');
  assert.strictEqual(stopRes.matched, true);
  assert.strictEqual(stopRes.commandId, 'stop_listening');
  assert.strictEqual(stopRes.category, 'control');
});

test('VoiceCommander Grammar - recognizes read page and clear history commands', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const readRes = commander.parseVoiceGrammar('read page');
  assert.strictEqual(readRes.matched, true);
  assert.strictEqual(readRes.commandId, 'read_page');
  assert.strictEqual(readRes.category, 'accessibility');

  const clearRes = commander.parseVoiceGrammar('clear history');
  assert.strictEqual(clearRes.matched, true);
  assert.strictEqual(clearRes.commandId, 'clear_history');
  assert.strictEqual(clearRes.category, 'utility');
});

test('VoiceCommander Grammar - performs case-insensitive matching and whitespace normalization', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const mixedCaseRes = commander.parseVoiceGrammar('   GO   TO   DASHBOARD   ');
  assert.strictEqual(mixedCaseRes.matched, true);
  assert.strictEqual(mixedCaseRes.commandId, 'go_to_dashboard');
  assert.strictEqual(mixedCaseRes.transcript, 'go to dashboard');
});

test('VoiceCommander Grammar - handles empty, null, and unknown phrases gracefully', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const emptyRes = commander.parseVoiceGrammar('');
  assert.strictEqual(emptyRes.matched, false);
  assert.strictEqual(emptyRes.commandId, null);
  assert.strictEqual(emptyRes.confidence, 0);

  const nullRes = commander.parseVoiceGrammar(null);
  assert.strictEqual(nullRes.matched, false);
  assert.strictEqual(nullRes.commandId, null);

  const unknownRes = commander.parseVoiceGrammar('order groceries online');
  assert.strictEqual(unknownRes.matched, false);
  assert.strictEqual(unknownRes.commandId, null);
  assert.strictEqual(unknownRes.category, 'unknown');
  assert.ok(unknownRes.response.includes('not recognized'));
});

test('VoiceCommander Grammar - unrelated speech does not trigger partial accidental matches', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const partialRes = commander.parseVoiceGrammar('i want to go to dashboard later tonight');
  assert.strictEqual(partialRes.matched, false);
  assert.strictEqual(partialRes.commandId, null);
});

test('VoiceCommander Command Routing - executes corresponding handler and maps actions', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const res = commander.parseVoiceGrammar('go to dashboard');
  assert.strictEqual(typeof res.handler, 'function');
  const actionResult = res.handler();
  assert.deepStrictEqual(actionResult, { action: 'navigate', target: 'dashboard' });
});

test('VoiceCommander Command Routing - unknown commands have null handlers and stable IDs', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  const res = commander.parseVoiceGrammar('random noise phrase');
  assert.strictEqual(res.handler, null);
  assert.strictEqual(res.commandId, null);
});

test('VoiceCommander Fallbacks - gracefully handles missing browser Speech APIs in Node.js', () => {
  const commander = new NeurotechInterfaceVoiceCommander();

  assert.strictEqual(commander.recognition, null);
  assert.strictEqual(commander.synthesis, null);

  const started = commander.startListening();
  assert.strictEqual(started, false);

  const synthDispatched = commander.synthesizeResponse('Test spoken message');
  assert.strictEqual(synthDispatched, false);
});

test('VoiceCommander Execution - handleTranscript updates history and dispatches callbacks', () => {
  let matchedEvent = null;
  const commander = new NeurotechInterfaceVoiceCommander({
    onCommandMatch: (entry) => {
      matchedEvent = entry;
    }
  });

  const entry = commander.handleTranscript('show help');
  assert.strictEqual(entry.commandId, 'show_help');
  assert.strictEqual(commander.history.length, 1);
  assert.strictEqual(matchedEvent?.commandId, 'show_help');

  commander.clearHistory();
  assert.strictEqual(commander.history.length, 0);
});

test('VoiceCommander Immutability - multiple grammar parsing calls do not mutate activeGrammars', () => {
  const commander = new NeurotechInterfaceVoiceCommander();
  const initialLength = commander.activeGrammars.length;

  commander.parseVoiceGrammar('show help');
  commander.parseVoiceGrammar('emergency stop');
  commander.parseVoiceGrammar('unknown phrase');

  assert.strictEqual(commander.activeGrammars.length, initialLength);
});
