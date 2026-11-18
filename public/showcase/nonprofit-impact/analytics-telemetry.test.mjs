import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactAnalyticsEngine } from './analytics-telemetry.js';

test('NonprofitImpactAnalyticsEngine - serializes and tracks impact interaction events', () => {
  const engine = new NonprofitImpactAnalyticsEngine();
  const evt = engine.trackEvent('donation_pledge', { causeId: 'cause_clean_water', amount: 50 });

  assert.strictEqual(evt.name, 'donation_pledge');
  assert.strictEqual(evt.data.causeId, 'cause_clean_water');
  assert.strictEqual(evt.data.amount, 50);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('NonprofitImpactAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new NonprofitImpactAnalyticsEngine();
  const evt = engine.trackEvent('donor_checkout', {
    donor_name: 'Taylor Smith',
    email: 'taylor@example.org',
    auth_token: 'secret_donor_token',
    password: 'password456',
    credit_card: '4111222233334444',
    impact_tier: 'benefactor'
  });

  assert.strictEqual(evt.data.donor_name, 'Taylor Smith');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.password, '[SCRUBBED]');
  assert.strictEqual(evt.data.credit_card, '[SCRUBBED]');
  assert.strictEqual(evt.data.impact_tier, 'benefactor');
});

test('NonprofitImpactAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 145000; // 2 minutes and 25 seconds ago
  const engine = new NonprofitImpactAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '02:25');
});

test('NonprofitImpactAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new NonprofitImpactAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 500,
      scrollHeight: 1500,
      clientHeight: 500
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  // (500 / (1500 - 500)) * 100 = 50%
  assert.strictEqual(depth, 50);
});
