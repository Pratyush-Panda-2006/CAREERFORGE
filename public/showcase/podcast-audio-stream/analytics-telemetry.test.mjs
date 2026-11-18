import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamAnalyticsEngine } from './analytics-telemetry.js';

test('PodcastAudioStreamAnalyticsEngine - serializes and tracks audio interaction events', () => {
  const engine = new PodcastAudioStreamAnalyticsEngine();
  const evt = engine.trackEvent('episode_play', { episodeId: 'ep_101', playbackSpeed: 1.5 });

  assert.strictEqual(evt.name, 'episode_play');
  assert.strictEqual(evt.data.episodeId, 'ep_101');
  assert.strictEqual(evt.data.playbackSpeed, 1.5);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('PodcastAudioStreamAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new PodcastAudioStreamAnalyticsEngine();
  const evt = engine.trackEvent('listener_signup', {
    listener_name: 'Jordan Reed',
    email: 'jordan@podcast.fm',
    auth_token: 'secret_jwt_token',
    password: 'mypassword123',
    bitrate_kbps: 320
  });

  assert.strictEqual(evt.data.listener_name, 'Jordan Reed');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.password, '[SCRUBBED]');
  assert.strictEqual(evt.data.bitrate_kbps, 320);
});

test('PodcastAudioStreamAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 95000; // 1 minute and 35 seconds ago
  const engine = new PodcastAudioStreamAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '01:35');
});

test('PodcastAudioStreamAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new PodcastAudioStreamAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 300,
      scrollHeight: 1000,
      clientHeight: 400
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  // (300 / (1000 - 400)) * 100 = 50%
  assert.strictEqual(depth, 50);
});
