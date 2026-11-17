import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusDiffInspector } from './diff-viewer.js';

test('SmartIotNexusDiffInspector - detects firmware line insertions accurately', () => {
  const inspector = new SmartIotNexusDiffInspector();
  const orig = 'node_id: IOT-10\nbaud_rate: 115200\nprotocol: MQTT';
  const mod = 'node_id: IOT-10\nbaud_rate: 115200\ntls_cert: BaltimoreCyberTrust\nprotocol: MQTT';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'tls_cert: BaltimoreCyberTrust'));
});

test('SmartIotNexusDiffInspector - detects firmware line deletions accurately', () => {
  const inspector = new SmartIotNexusDiffInspector();
  const orig = 'broker: mqtt.internal\ndebug_serial: true\nkeepalive: 60\nqos: 1';
  const mod = 'broker: mqtt.internal\nkeepalive: 60\nqos: 1';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'debug_serial: true'));
});

test('SmartIotNexusDiffInspector - zero-change idempotency', () => {
  const inspector = new SmartIotNexusDiffInspector();
  const cfg = 'device_class: SensorNode\nfrequency: 868MHz\npower_mode: SolarBattery';

  inspector.computeDiff(cfg, cfg);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('SmartIotNexusDiffInspector - generates unified view format', () => {
  const inspector = new SmartIotNexusDiffInspector();
  const orig = 'firmware: v1.0.0\nbuild: 104';
  const mod = 'firmware: v1.0.1\nbuild: 104';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('- firmware: v1.0.0'));
  assert.ok(unified.includes('+ firmware: v1.0.1'));
  assert.ok(unified.includes('  build: 104'));
});
