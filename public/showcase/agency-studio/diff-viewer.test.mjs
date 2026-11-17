import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioDiffInspector } from './diff-viewer.js';

test('AgencyStudioDiffInspector - detects brief line insertions accurately', () => {
  const inspector = new AgencyStudioDiffInspector();
  const orig = 'project: Agency Rebrand\nclient: Acme Corp\nscope: Web Design';
  const mod = 'project: Agency Rebrand\nclient: Acme Corp\nsub_brand: Acme Labs\nscope: Web Design';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'sub_brand: Acme Labs'));
});

test('AgencyStudioDiffInspector - detects brief line deletions accurately', () => {
  const inspector = new AgencyStudioDiffInspector();
  const orig = 'role: Senior Designer\ntooling: Figma, Blender\nurgency: High\nrate: 150/hr';
  const mod = 'role: Senior Designer\ntooling: Figma, Blender\nrate: 150/hr';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'urgency: High'));
});

test('AgencyStudioDiffInspector - zero-change idempotency', () => {
  const inspector = new AgencyStudioDiffInspector();
  const text = 'phase: Discovery\ndeliverable: Style Guide\nstatus: Approved';

  inspector.computeDiff(text, text);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('AgencyStudioDiffInspector - generates unified view format', () => {
  const inspector = new AgencyStudioDiffInspector();
  const orig = 'font: Inter\nweight: 400';
  const mod = 'font: Inter\nweight: 600';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  font: Inter'));
  assert.ok(unified.includes('- weight: 400'));
  assert.ok(unified.includes('+ weight: 600'));
});
