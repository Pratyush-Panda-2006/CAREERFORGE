import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubAnalyticsEngine } from './analytics-telemetry.js';

test('StreamingCinemaHubAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new StreamingCinemaHubAnalyticsEngine();
  const evt = engine.trackEvent('movie_playback_started', { title: 'Neon Horizon', genre: 'Sci-Fi' });

  assert.strictEqual(evt.name, 'movie_playback_started');
  assert.ok(evt.id.startsWith('cinema_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('StreamingCinemaHubAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new StreamingCinemaHubAnalyticsEngine();
  const evt = engine.trackEvent('user_login', {
    user_id: 'viewer_42',
    email: 'user@cinema.test',
    auth_token: 'jwt_secret_token_123',
    password: 'super_secret_pw',
    user_ip: '192.168.1.1'
  });

  assert.strictEqual(evt.data.user_id, 'viewer_42');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.password, '[SCRUBBED]');
  assert.strictEqual(evt.data.user_ip, '[SCRUBBED]');
});

test('StreamingCinemaHubAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 125000; // 2 minutes and 5 seconds ago
  const engine = new StreamingCinemaHubAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '02:05');
});

test('StreamingCinemaHubAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new StreamingCinemaHubAnalyticsEngine();

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
