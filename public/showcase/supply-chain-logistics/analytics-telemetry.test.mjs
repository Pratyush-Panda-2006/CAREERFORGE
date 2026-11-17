import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsAnalyticsEngine } from './analytics-telemetry.js';

test('SupplyChainLogisticsAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new SupplyChainLogisticsAnalyticsEngine();

  const evt = engine.trackEvent('freight_booking', { shipment_id: 'SH-4421', weight_kg: 1200 });
  assert.strictEqual(evt.name, 'freight_booking');
  assert.strictEqual(evt.data.shipment_id, 'SH-4421');
  assert.strictEqual(evt.data.weight_kg, 1200);

  const heatmap = engine.getHeatmapData();
  assert.strictEqual(heatmap.length, 1);
  assert.strictEqual(heatmap[0].target, 'freight_booking');
  assert.strictEqual(heatmap[0].clicks, 1);
});

test('SupplyChainLogisticsAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new SupplyChainLogisticsAnalyticsEngine();

  const rawData = {
    email: 'driver.john@example.com',
    auth_token: 'secret_bearer_key_xyz',
    note: 'Contact supervisor at dispatch@freight.com from 192.168.1.50',
    container_code: 'MSKU-9982'
  };

  const evt = engine.trackEvent('manifest_note', rawData);

  assert.strictEqual(evt.data.email, undefined, 'email key should be blocked');
  assert.strictEqual(evt.data.auth_token, undefined, 'auth_token key should be blocked');
  assert.ok(evt.data.note.includes('[SCRUBBED_EMAIL]'));
  assert.ok(evt.data.note.includes('[SCRUBBED_IP]'));
  assert.strictEqual(evt.data.container_code, 'MSKU-9982');
});

test('SupplyChainLogisticsAnalyticsEngine - computes and clamps session duration bounds', () => {
  const engine = new SupplyChainLogisticsAnalyticsEngine();
  const startTime = engine.sessionStartTime;

  // 120 seconds later
  const dur2Min = engine.computeSessionDuration(startTime + 120000);
  assert.strictEqual(dur2Min, 120);

  // Exceeding 24 hours: clamped to 86400
  const durExceeded = engine.computeSessionDuration(startTime + 100000000);
  assert.strictEqual(durExceeded, 86400);
});

test('SupplyChainLogisticsAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new SupplyChainLogisticsAnalyticsEngine();

  const halfScroll = engine.getScrollDepthPercentage(500, 1800, 800);
  assert.strictEqual(halfScroll, 50);

  const maxScroll = engine.getScrollDepthPercentage(1000, 1800, 800);
  assert.strictEqual(maxScroll, 100);
});
