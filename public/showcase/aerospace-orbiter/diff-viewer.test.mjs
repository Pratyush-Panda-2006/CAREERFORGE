import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterDiffInspector } from './diff-viewer.js';

test('AerospaceOrbiterDiffInspector verifies identical trajectories produce zero changes', () => {
  const trajectory = 'apogee = 400;\nperigee = 390;\ninclination = 51.6;';
  const inspector = new AerospaceOrbiterDiffInspector(trajectory, trajectory);

  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 3);
  assert.equal(metrics.changePercentage, 0);
});

test('AerospaceOrbiterDiffInspector identifies insertions and deletions', () => {
  const orig = 'burn_1();\ncoast();\nburn_2();';
  const mod = 'burn_1();\nattitude_correction();\ncoast();\nburn_2();\nstage_sep();';

  const inspector = new AerospaceOrbiterDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.additions, 2);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 3);

  const unified = inspector.generateUnifiedView();
  const additions = unified.filter(l => l.type === 'added');
  assert.equal(additions.length, 2);
  assert.equal(additions[0].content, 'attitude_correction();');
  assert.equal(additions[1].content, 'stage_sep();');
});

test('AerospaceOrbiterDiffInspector handles complete parameter replacement', () => {
  const orig = 'orbit: LEO';
  const mod = 'orbit: GEO';

  const inspector = new AerospaceOrbiterDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 1);
  assert.equal(metrics.additions, 1);
  assert.equal(metrics.changePercentage, 100);
});

test('AerospaceOrbiterDiffInspector handles empty inputs robustly', () => {
  const inspector = new AerospaceOrbiterDiffInspector('', '');
  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.changePercentage, 0);
});
