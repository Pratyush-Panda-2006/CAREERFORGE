import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioDiffInspector } from './diff-viewer.js';

test('MusicDawStudioDiffInspector - detects parameter line insertions accurately', () => {
  const inspector = new MusicDawStudioDiffInspector();
  const orig = 'bpm: 120\nmaster_gain_db: 0.0\nlimiter_enabled: true';
  const mod = 'bpm: 120\nmaster_gain_db: 0.0\nsidechain_threshold_db: -14.0\nlimiter_enabled: true';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'sidechain_threshold_db: -14.0'));
});

test('MusicDawStudioDiffInspector - detects parameter line deletions accurately', () => {
  const inspector = new MusicDawStudioDiffInspector();
  const orig = 'synth_wave: saw\nchorus_depth: 0.5\nflanger_rate: 1.2\nreverb_size: 45%';
  const mod = 'synth_wave: saw\nchorus_depth: 0.5\nreverb_size: 45%';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'flanger_rate: 1.2'));
});

test('MusicDawStudioDiffInspector - zero-change idempotency', () => {
  const inspector = new MusicDawStudioDiffInspector();
  const text = 'vst_preset: retro_lead_01\npolyphony: 8\nvelocity_sensitivity: 100';

  inspector.computeDiff(text, text);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('MusicDawStudioDiffInspector - generates unified view format', () => {
  const inspector = new MusicDawStudioDiffInspector();
  const orig = 'trackA\ntrackB';
  const mod = 'trackA\ntrackB_boosted';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  trackA'));
  assert.ok(unified.includes('- trackB'));
  assert.ok(unified.includes('+ trackB_boosted'));
});
