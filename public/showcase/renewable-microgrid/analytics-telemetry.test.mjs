import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridAnalyticsEngine } from './analytics-telemetry.js';

test('RenewableMicrogridAnalyticsEngine scrubs PII emails and passwords', () => {
  const engine = new RenewableMicrogridAnalyticsEngine();
  const rawPayload = {
    userEmail: 'operator@microgrid.energy',
    password: 'superSecret123!',
    phone: '555-123-4567',
    gridSubstation: 'Solar-Array-North'
  };

  const event = engine.trackEvent('turbine_status_check', rawPayload);
  assert.equal(event.data.userEmail, '[REDACTED_EMAIL]');
  assert.equal(event.data.password, '[REDACTED_CREDENTIAL]');
  assert.equal(event.data.phone, '[REDACTED_PHONE]');
  assert.equal(event.data.gridSubstation, 'Solar-Array-North');
});

test('clamps scroll depth percentage strictly within [0, 100]', () => {
  const engine = new RenewableMicrogridAnalyticsEngine();
  assert.equal(engine.getScrollDepthPercentage(), 0);

  // 50% scroll
  engine.updateScrollDepth(500, 2000, 1000);
  assert.equal(engine.getScrollDepthPercentage(), 50);

  // Overflow scroll
  engine.updateScrollDepth(2500, 2000, 1000);
  assert.equal(engine.getScrollDepthPercentage(), 100);
});

test('computes clamped session duration without negative values', () => {
  const start = 1700000000000;
  const engine = new RenewableMicrogridAnalyticsEngine({ startTime: start });

  // Normal progression
  assert.equal(engine.computeSessionDuration(start + 5000), 5000);

  // Clock anomaly / negative progression clamped to 0
  assert.equal(engine.computeSessionDuration(start - 1000), 0);
});

test('exports serialized telemetry report containing all tracked interaction events', () => {
  const engine = new RenewableMicrogridAnalyticsEngine();
  engine.trackEvent('battery_charge_view', { batterySoc: 85.4 });
  engine.recordClick('button#toggle-inverter');

  const report = engine.exportReportJSON();
  const parsed = JSON.parse(report);

  assert.equal(parsed.totalEventsTracked, 2);
  assert.equal(parsed.totalClicksRecorded, 1);
  assert.equal(parsed.events[0].name, 'battery_charge_view');
  assert.equal(parsed.events[1].data.target, 'button#toggle-inverter');
});
