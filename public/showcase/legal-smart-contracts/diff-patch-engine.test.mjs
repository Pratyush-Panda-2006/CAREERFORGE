import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsDiffPatchEngine } from './diff-patch-engine.js';

test('LegalSmartContractsDiffPatchEngine - computeDiff identical content produces all equal lines', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const text = 'stream: live\ncodec: aac\nbitrate: 320k';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every(item => item.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(diff), '');
});

test('LegalSmartContractsDiffPatchEngine - computeDiff detects additions and deletions', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const original = 'status: idle\nsample: 44.1khz';
  const modified = 'status: active\nsample: 48khz\nchannels: stereo';

  const diff = engine.computeDiff(original, modified);
  assert.ok(diff.some(d => d.type === 'delete' && d.text === 'status: idle'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'status: active'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'channels: stereo'));

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('-status: idle'));
  assert.ok(unified.includes('+status: active'));
});

test('LegalSmartContractsDiffPatchEngine - applyPatch reconstructs modified text from diff array', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const original = 'key: value1\nmode: test';
  const modified = 'key: value2\nmode: test';

  const diff = engine.computeDiff(original, modified);
  const reconstructed = engine.applyPatch(original, diff);
  assert.equal(reconstructed, modified);
});

test('LegalSmartContractsDiffPatchEngine - applyPatch reconstructs modified text from unified string', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const original = 'setting: low\npreset: studio';
  const modified = 'setting: high\npreset: studio';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff);
  const patched = engine.applyPatch(original, unified);
  assert.equal(patched, modified);
});
