import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsAnalyticsEngine } from './analytics-telemetry.js';

test('LuxuryRealmsAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new LuxuryRealmsAnalyticsEngine();
  const evt = engine.trackEvent('private_island_viewed', {'realm_id': 'ISL-702', 'region': 'South Pacific'});

  assert.strictEqual(evt.name, 'private_island_viewed');
  assert.ok(evt.id.startsWith('luxury-realms_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('LuxuryRealmsAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new LuxuryRealmsAnalyticsEngine();
  const evt = engine.trackEvent('user_checkout', {
    client_id: 'guest_102',
    email: 'guest@example.test',
    auth_token: 'secret_jwt_xyz',
    secret: 'api_pass',
    order_total: 145.50
  });

  assert.strictEqual(evt.data.client_id, 'guest_102');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret, '[SCRUBBED]');
  assert.strictEqual(evt.data.order_total, 145.50);
});

test('LuxuryRealmsAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 185000; // 3 minutes and 5 seconds ago
  const engine = new LuxuryRealmsAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:05');
});

test('LuxuryRealmsAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new LuxuryRealmsAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 450,
      scrollHeight: 1500,
      clientHeight: 600
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  assert.strictEqual(depth, 50);
});
