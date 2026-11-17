import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenDiffInspector } from './diff-viewer.js';

test('PetAdoptionHavenDiffInspector - detects record line insertions accurately', () => {
  const inspector = new PetAdoptionHavenDiffInspector();
  const orig = 'name: Milo\nspecies: Feline\nstatus: In Shelter';
  const mod = 'name: Milo\nspecies: Feline\nmicrochip: 98102003\nstatus: In Shelter';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'microchip: 98102003'));
});

test('PetAdoptionHavenDiffInspector - detects record line deletions accurately', () => {
  const inspector = new PetAdoptionHavenDiffInspector();
  const orig = 'quarantine: active\nparvo_test: pending\nisolation_ward: B3\nfoster: none';
  const mod = 'quarantine: active\nisolation_ward: B3\nfoster: none';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'parvo_test: pending'));
});

test('PetAdoptionHavenDiffInspector - zero-change idempotency', () => {
  const inspector = new PetAdoptionHavenDiffInspector();
  const text = 'animal_id: DOG-101\nbreed: Labrador\nage_years: 3';

  inspector.computeDiff(text, text);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('PetAdoptionHavenDiffInspector - generates unified view format', () => {
  const inspector = new PetAdoptionHavenDiffInspector();
  const orig = 'lineA\nlineB';
  const mod = 'lineA\nlineB_edited';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  lineA'));
  assert.ok(unified.includes('- lineB'));
  assert.ok(unified.includes('+ lineB_edited'));
});
