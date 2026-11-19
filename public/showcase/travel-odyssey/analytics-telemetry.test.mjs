import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyAnalyticsEngine } from './analytics-telemetry.js';

test('TravelOdysseyAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new TravelOdysseyAnalyticsEngine();
  const evt = engine.trackEvent('flight_route_searched', {'origin': 'JFK', 'destination': 'HND'});

  assert.strictEqual(evt.name, 'flight_route_searched');
  assert.ok(evt.id.startsWith('travel-odyssey_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('TravelOdysseyAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new TravelOdysseyAnalyticsEngine();
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

test('TravelOdysseyAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 185000; // 3 minutes and 5 seconds ago
  const engine = new TravelOdysseyAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:05');
});

test('TravelOdysseyAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new TravelOdysseyAnalyticsEngine();

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
