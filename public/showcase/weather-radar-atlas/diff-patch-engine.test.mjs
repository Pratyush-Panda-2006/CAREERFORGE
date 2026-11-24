import test from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasDiffPatchEngine } from './diff-patch-engine.js';

test('WeatherRadarAtlasDiffPatchEngine - computeDiff identical content produces all equal lines', () => {
  const engine = new WeatherRadarAtlasDiffPatchEngine();
  const text = 'line 1\nline 2\nline 3';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every(item => item.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(diff), '');
});

test('WeatherRadarAtlasDiffPatchEngine - computeDiff detects additions and deletions', () => {
  const engine = new WeatherRadarAtlasDiffPatchEngine();
  const original = 'first line\nsecond line';
  const modified = 'first line\nupdated line\nthird line';

  const diff = engine.computeDiff(original, modified);
  assert.ok(diff.some(d => d.type === 'delete' && d.text === 'second line'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'updated line'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'third line'));

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('-second line'));
  assert.ok(unified.includes('+updated line'));
});

test('WeatherRadarAtlasDiffPatchEngine - applyPatch reconstructs modified text from diff array', () => {
  const engine = new WeatherRadarAtlasDiffPatchEngine();
  const original = 'alpha: 1\nbeta: 2';
  const modified = 'alpha: 1\nbeta: 3';

  const diff = engine.computeDiff(original, modified);
  const reconstructed = engine.applyPatch(original, diff);
  assert.equal(reconstructed, modified);
});

test('WeatherRadarAtlasDiffPatchEngine - applyPatch reconstructs modified text from unified string', () => {
  const engine = new WeatherRadarAtlasDiffPatchEngine();
  const original = 'param: A\nflag: false';
  const modified = 'param: A\nflag: true';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff);
  const patched = engine.applyPatch(original, unified);
  assert.equal(patched, modified);
});
