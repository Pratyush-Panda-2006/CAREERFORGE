import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsVoiceCommander } from './voice-commander.js';

test('LegalSmartContractsVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new LegalSmartContractsVoiceCommander();
  const empty = commander.parseVoiceGrammar('');
  assert.strictEqual(empty.matched, false);
  assert.strictEqual(empty.action, 'UNKNOWN');

  const spaces = commander.parseVoiceGrammar('   ');
  assert.strictEqual(spaces.matched, false);
  assert.strictEqual(spaces.action, 'UNKNOWN');
});

test('LegalSmartContractsVoiceCommander - parses sign contract grammar pattern correctly', () => {
  const commander = new LegalSmartContractsVoiceCommander();
  const res1 = commander.parseVoiceGrammar('sign contract');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'SIGN_CONTRACT');

  const res2 = commander.parseVoiceGrammar('execute agreement');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, 'SIGN_CONTRACT');
});

test('LegalSmartContractsVoiceCommander - parses audit clauses and escrow grammar correctly', () => {
  const commander = new LegalSmartContractsVoiceCommander();
  const res1 = commander.parseVoiceGrammar('audit clauses');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'AUDIT_CLAUSES');

  const res2 = commander.parseVoiceGrammar('check escrow');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, 'CHECK_ESCROW');
});

test('LegalSmartContractsVoiceCommander - produces fallback action and records history for unrecognized phrases', () => {
  const commander = new LegalSmartContractsVoiceCommander();
  const res = commander.parseVoiceGrammar('open the pod bay doors');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.action, 'FALLBACK');
  assert.ok(res.response.includes('not recognized'));

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});
