import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayDiffInspector } from './diff-viewer.js';

test('DroneDeliverySkywayDiffInspector - detects telemetry line insertions accurately', () => {
  const inspector = new DroneDeliverySkywayDiffInspector();
  const orig = 'drone_id: DR-901\naltitude_m: 100\nheading_deg: 180';
  const mod = 'drone_id: DR-901\naltitude_m: 100\nwind_gust_mps: 12.4\nheading_deg: 180';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'wind_gust_mps: 12.4'));
});

test('DroneDeliverySkywayDiffInspector - detects telemetry line deletions accurately', () => {
  const inspector = new DroneDeliverySkywayDiffInspector();
  const orig = 'status: InAir\npayload: 1.8kg\nwinch_status: retracted\nbattery_v: 24.2';
  const mod = 'status: InAir\npayload: 1.8kg\nbattery_v: 24.2';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'winch_status: retracted'));
});

test('DroneDeliverySkywayDiffInspector - zero-change idempotency', () => {
  const inspector = new DroneDeliverySkywayDiffInspector();
  const text = 'corridor: MetroEast-01\nspeed_kmh: 75\nstatus: Nominal';

  inspector.computeDiff(text, text);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('DroneDeliverySkywayDiffInspector - generates unified view format', () => {
  const inspector = new DroneDeliverySkywayDiffInspector();
  const orig = 'wpt1\nwpt2';
  const mod = 'wpt1\nwpt2_rerouted';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  wpt1'));
  assert.ok(unified.includes('- wpt2'));
  assert.ok(unified.includes('+ wpt2_rerouted'));
});
