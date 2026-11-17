import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribeDNAtoRNA, translateRNA } from './script.js';

test('Transcribe DNA ATGTTT to RNA AUGUUU', () => {
  assert.equal(transcribeDNAtoRNA('ATGTTT'), 'AUGUUU');
});

test('Translate AUGUUUUAA to Met, Phe, STOP', () => {
  const res = translateRNA('AUGUUUUAA');
  assert.deepEqual(res, ['Met (Start)', 'Phe', 'STOP']);
});