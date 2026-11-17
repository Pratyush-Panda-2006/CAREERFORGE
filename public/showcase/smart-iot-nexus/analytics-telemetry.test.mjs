import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusAnalyticsEngine } from './analytics-telemetry.js';

test('SmartIotNexusAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new SmartIotNexusAnalyticsEngine();
  const evt = engine.trackEvent('user_interaction', { target: 'main_panel', code: 200 });

  assert.strictEqual(evt.name, 'user_interaction');
  assert.strictEqual(evt.data.target, 'main_panel');
  assert.strictEqual(evt.data.code, 200);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('SmartIotNexusAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new SmartIotNexusAnalyticsEngine();
  const evt = engine.trackEvent('user_login', {
    user_id: 'user_84',
    email: 'user@test.io',
    auth_token: 'secret_jwt_xyz',
    secret: 'top_secret',
    safe_param: 'ok'
  });

  assert.strictEqual(evt.data.user_id, 'user_84');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret, '[SCRUBBED]');
  assert.strictEqual(evt.data.safe_param, 'ok');
});

test('SmartIotNexusAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 125000;
  const engine = new SmartIotNexusAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '02:05');
});

test('SmartIotNexusAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new SmartIotNexusAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 300,
      scrollHeight: 1000,
      clientHeight: 400
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  assert.strictEqual(depth, 50);
});
