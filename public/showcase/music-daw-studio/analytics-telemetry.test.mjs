import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioAnalyticsEngine } from './analytics-telemetry.js';

test('MusicDawStudioAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new MusicDawStudioAnalyticsEngine();
  const evt = engine.trackEvent('stem_exported', { stem: 'Kick Drum', duration_sec: 180 });

  assert.strictEqual(evt.name, 'stem_exported');
  assert.ok(evt.id.startsWith('daw_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('MusicDawStudioAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new MusicDawStudioAnalyticsEngine();
  const evt = engine.trackEvent('producer_login', {
    producer_id: 'producer_seven',
    email: 'producer@studio.test',
    auth_token: 'secret_jwt_auth_key',
    user_password: 'super_secret_sound',
    ip_addr: '127.0.0.1'
  });

  assert.strictEqual(evt.data.producer_id, 'producer_seven');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.user_password, '[SCRUBBED]');
  assert.strictEqual(evt.data.ip_addr, '[SCRUBBED]');
});

test('MusicDawStudioAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 305000; // 5 minutes and 5 seconds ago
  const engine = new MusicDawStudioAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '05:05');
});

test('MusicDawStudioAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new MusicDawStudioAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 350,
      scrollHeight: 1400,
      clientHeight: 700
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  assert.strictEqual(depth, 50);
});
