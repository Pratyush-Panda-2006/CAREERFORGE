import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubAnalyticsEngine } from './analytics-telemetry.js';

test('FestivalHubAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new FestivalHubAnalyticsEngine();
  const evt = engine.trackEvent('ticket_tier_selected', { tier: 'VIP', price: 299 });

  assert.strictEqual(evt.name, 'ticket_tier_selected');
  assert.strictEqual(evt.data.tier, 'VIP');
  assert.strictEqual(evt.data.price, 299);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('FestivalHubAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new FestivalHubAnalyticsEngine();
  const evt = engine.trackEvent('attendee_checkout', {
    attendee_name: 'Alex Rivera',
    email: 'alex@example.com',
    auth_token: 'jwt_token_secret',
    password: 'password123',
    vip_wristband: 'gold_tier'
  });

  assert.strictEqual(evt.data.attendee_name, 'Alex Rivera');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.password, '[SCRUBBED]');
  assert.strictEqual(evt.data.vip_wristband, 'gold_tier');
});

test('FestivalHubAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 125000; // 2 minutes and 5 seconds ago
  const engine = new FestivalHubAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '02:05');
});

test('FestivalHubAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new FestivalHubAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 400,
      scrollHeight: 1400,
      clientHeight: 600
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  // (400 / (1400 - 600)) * 100 = 50%
  assert.strictEqual(depth, 50);
});
