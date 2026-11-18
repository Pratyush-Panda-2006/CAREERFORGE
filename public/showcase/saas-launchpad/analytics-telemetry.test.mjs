import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadAnalyticsEngine } from './analytics-telemetry.js';

test('SaasLaunchpadAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new SaasLaunchpadAnalyticsEngine();
  const evt = engine.trackEvent('pricing_plan_selected', { plan: 'enterprise', seats: 25 });

  assert.strictEqual(evt.name, 'pricing_plan_selected');
  assert.strictEqual(evt.data.plan, 'enterprise');
  assert.strictEqual(evt.data.seats, 25);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('SaasLaunchpadAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new SaasLaunchpadAnalyticsEngine();
  const evt = engine.trackEvent('user_signup_form', {
    company: 'TechCorp',
    email: 'alice@company.test',
    auth_token: 'secret_jwt_bearer',
    user_password: 'super_secret_password',
    phone_number: '+15551234567',
    safe_param: 'campaign_spring26'
  });

  assert.strictEqual(evt.data.company, 'TechCorp');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.user_password, '[SCRUBBED]');
  assert.strictEqual(evt.data.phone_number, '[SCRUBBED]');
  assert.strictEqual(evt.data.safe_param, 'campaign_spring26');
});

test('SaasLaunchpadAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 125000; // 2 minutes and 5 seconds ago
  const engine = new SaasLaunchpadAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '02:05');
});

test('SaasLaunchpadAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new SaasLaunchpadAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 300,
      scrollHeight: 1600,
      clientHeight: 600
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  // (300 / (1600 - 600)) * 100 = 30%
  assert.strictEqual(depth, 30);
});
