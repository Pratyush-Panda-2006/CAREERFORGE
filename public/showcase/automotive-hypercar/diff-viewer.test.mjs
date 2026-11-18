import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarDiffInspector } from './diff-viewer.js';

test('AutomotiveHypercarDiffInspector - computes diff on identical text', () => {
  const inspector = new AutomotiveHypercarDiffInspector();
  const text = 'rpm: 18000\ntorque: 1200\nspeed: 380';
  const result = inspector.computeDiff(text, text);

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.unchanged, 3);
  assert.equal(result.metrics.changePercentage, 0);
  assert.equal(result.lines.length, 3);
});

test('AutomotiveHypercarDiffInspector - computes additions and deletions accurately', () => {
  const inspector = new AutomotiveHypercarDiffInspector();
  const oldText = 'downforce: 800\ndrag: 300';
  const newText = 'downforce: 1100\ndrag: 340\ndrs: active';

  const result = inspector.computeDiff(oldText, newText);

  assert.ok(result.metrics.additions >= 1);
  assert.ok(result.metrics.deletions >= 1);
  assert.ok(result.metrics.changePercentage > 0);
});

test('AutomotiveHypercarDiffInspector - handles empty strings gracefully', () => {
  const inspector = new AutomotiveHypercarDiffInspector();
  const result = inspector.computeDiff('', '');

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.changePercentage, 0);
});

test('AutomotiveHypercarDiffInspector - loads built-in telemetry presets', () => {
  const inspector = new AutomotiveHypercarDiffInspector();
  const keys = inspector.getPresetKeys();

  assert.ok(keys.includes('aeroBalance'));
  assert.ok(keys.includes('torqueVectoring'));
  assert.ok(keys.includes('damperKinematics'));

  const aero = inspector.getPreset('aeroBalance');
  assert.ok(aero.left.includes('Monza'));
  assert.ok(aero.right.includes('Spa'));
});
