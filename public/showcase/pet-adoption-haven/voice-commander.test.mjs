import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenVoiceCommander } from './voice-commander.js';

test('PetAdoptionHavenVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new PetAdoptionHavenVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('PetAdoptionHavenVoiceCommander - parses find pets and adopt grammar patterns correctly', () => {
  const commander = new PetAdoptionHavenVoiceCommander();
  const res1 = commander.parseVoiceGrammar('find pets');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'SEARCH_PETS');

  const res2 = commander.parseVoiceGrammar('show dogs');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, 'SEARCH_PETS');

  const res3 = commander.parseVoiceGrammar('adopt dog');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.action, 'START_ADOPTION');
});

test('PetAdoptionHavenVoiceCommander - parses breed filtering grammar correctly', () => {
  const commander = new PetAdoptionHavenVoiceCommander();
  const res = commander.parseVoiceGrammar('filter golden retriever');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'FILTER_BREED');
});

test('PetAdoptionHavenVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new PetAdoptionHavenVoiceCommander();
  const res = commander.parseVoiceGrammar('buy cryptocurrency now');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
