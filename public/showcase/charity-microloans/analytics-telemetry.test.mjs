import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansAnalyticsEngine } from './analytics-telemetry.js';

test('CharityMicroloansAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new CharityMicroloansAnalyticsEngine();
  const evt = engine.trackEvent('microloan_funded', { loan_id: 'ML-101', amount: 100 });

  assert.strictEqual(evt.name, 'microloan_funded');
  assert.ok(evt.id.startsWith('charity_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('CharityMicroloansAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new CharityMicroloansAnalyticsEngine();
  const evt = engine.trackEvent('donor_checkout', {
    donor_id: 'donor_99',
    email: 'donor@charity.test',
    auth_token: 'bearer_token_xyz',
    secret_key: 'top_secret',
    donor_phone: '+1-555-0199'
  });

  assert.strictEqual(evt.data.donor_id, 'donor_99');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret_key, '[SCRUBBED]');
  assert.strictEqual(evt.data.donor_phone, '[SCRUBBED]');
});

test('CharityMicroloansAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 245000; // 4 minutes and 5 seconds ago
  const engine = new CharityMicroloansAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '04:05');
});

test('CharityMicroloansAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new CharityMicroloansAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 400,
      scrollHeight: 1600,
      clientHeight: 800
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  assert.strictEqual(depth, 50);
});
