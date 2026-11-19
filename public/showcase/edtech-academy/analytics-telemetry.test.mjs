import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyAnalyticsEngine } from './analytics-telemetry.js';

test('EdtechAcademyAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new EdtechAcademyAnalyticsEngine();
  const evt = engine.trackEvent('lecture_completed', {'course_id': 'CS-101', 'lesson': 'Async Programming'});

  assert.strictEqual(evt.name, 'lecture_completed');
  assert.ok(evt.id.startsWith('edtech-academy_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('EdtechAcademyAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new EdtechAcademyAnalyticsEngine();
  const evt = engine.trackEvent('user_checkout', {
    client_id: 'guest_102',
    email: 'guest@example.test',
    auth_token: 'secret_jwt_xyz',
    secret: 'api_pass',
    order_total: 145.50
  });

  assert.strictEqual(evt.data.client_id, 'guest_102');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret, '[SCRUBBED]');
  assert.strictEqual(evt.data.order_total, 145.50);
});

test('EdtechAcademyAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 185000; // 3 minutes and 5 seconds ago
  const engine = new EdtechAcademyAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:05');
});

test('EdtechAcademyAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new EdtechAcademyAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 450,
      scrollHeight: 1500,
      clientHeight: 600
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  assert.strictEqual(depth, 50);
});
