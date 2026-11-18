import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarAnalyticsEngine } from './analytics-telemetry.js';

test('AutomotiveHypercarAnalyticsEngine - tracks events and prepends to history', () => {
  const engine = new AutomotiveHypercarAnalyticsEngine();
  const evt = engine.trackEvent('powertrain_boost_engaged', { kilowatts: 750 });

  assert.strictEqual(evt.name, 'powertrain_boost_engaged');
  assert.strictEqual(engine.events.length, 1);
  assert.strictEqual(engine.getEvents()[0].name, 'powertrain_boost_engaged');
});

test('AutomotiveHypercarAnalyticsEngine - automatically scrubs sensitive PII fields', () => {
  const engine = new AutomotiveHypercarAnalyticsEngine();
  const evt = engine.trackEvent('driver_profile_sync', {
    driverEmail: 'pilot@hypercar.racing',
    auth_token: 'secret_key_88',
    telemetryFps: 60
  });

  assert.strictEqual(evt.data.driverEmail, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.telemetryFps, 60);
});

test('AutomotiveHypercarAnalyticsEngine - computes formatted session duration string', () => {
  const start = Date.now() - 135000; // 2 min 15 secs ago
  const engine = new AutomotiveHypercarAnalyticsEngine({ startTime: start });
  const duration = engine.computeSessionDuration(start + 135000);

  assert.strictEqual(duration, '02:15');
});

test('AutomotiveHypercarAnalyticsEngine - clears events and exports valid JSON payload', () => {
  const engine = new AutomotiveHypercarAnalyticsEngine();
  engine.trackEvent('telemetry_snapshot', { speedKmh: 320 });

  const jsonStr = engine.exportTelemetryJson();
  const parsed = JSON.parse(jsonStr);
  assert.strictEqual(parsed.eventCount, 1);
  assert.strictEqual(parsed.events[0].name, 'telemetry_snapshot');

  engine.clearEvents();
  assert.strictEqual(engine.getEvents().length, 0);
});
