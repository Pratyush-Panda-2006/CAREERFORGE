import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalAnalyticsEngine } from './analytics-telemetry.js';

test('DocsPortalAnalyticsEngine - serializes and tracks reader interaction events accurately', () => {
  const engine = new DocsPortalAnalyticsEngine();
  const evt = engine.trackEvent('search_query_executed', { query: 'authentication', results: 12 });

  assert.strictEqual(evt.name, 'search_query_executed');
  assert.strictEqual(evt.data.query, 'authentication');
  assert.strictEqual(evt.data.results, 12);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('DocsPortalAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new DocsPortalAnalyticsEngine();
  const evt = engine.trackEvent('user_feedback_submit', {
    user_name: 'Developer-DocReader',
    email: 'reader@docs.example.com',
    auth_token: 'bearer_jwt_secret_token',
    secret: 'api_key_hidden',
    safe_param: 'article_id_42'
  });

  assert.strictEqual(evt.data.user_name, 'Developer-DocReader');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret, '[SCRUBBED]');
  assert.strictEqual(evt.data.safe_param, 'article_id_42');
});

test('DocsPortalAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 185000; // 3 minutes and 5 seconds ago
  const engine = new DocsPortalAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:05');
});

test('DocsPortalAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new DocsPortalAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 450,
      scrollHeight: 1500,
      clientHeight: 600
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  // (450 / (1500 - 600)) * 100 = 50%
  assert.strictEqual(depth, 50);
});
