import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProAnalyticsEngine } from './analytics-telemetry.js';

test('FitnessCrossfitProAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new FitnessCrossfitProAnalyticsEngine();
  const evt = engine.trackEvent('wod_round_completed', { round: 4, split_time_secs: 142 });

  assert.strictEqual(evt.name, 'wod_round_completed');
  assert.ok(evt.id.startsWith('fitness_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('FitnessCrossfitProAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new FitnessCrossfitProAnalyticsEngine();
  const evt = engine.trackEvent('athlete_profile_sync', {
    athlete_id: 'crossfit_pro_88',
    email: 'athlete@crossfit.test',
    auth_token: 'secret_bearer_token',
    user_password: 'hashed_password_xyz',
    ip_address: '10.0.0.1'
  });

  assert.strictEqual(evt.data.athlete_id, 'crossfit_pro_88');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.user_password, '[SCRUBBED]');
  assert.strictEqual(evt.data.ip_address, '[SCRUBBED]');
});

test('FitnessCrossfitProAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 365000; // 6 minutes and 5 seconds ago
  const engine = new FitnessCrossfitProAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '06:05');
});

test('FitnessCrossfitProAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new FitnessCrossfitProAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 500,
      scrollHeight: 2000,
      clientHeight: 1000
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  assert.strictEqual(depth, 50);
});
