import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioAnalyticsEngine } from './analytics-telemetry.js';

test('DeveloperPortfolioAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new DeveloperPortfolioAnalyticsEngine();
  const evt = engine.trackEvent('project_viewed', { project_id: 'hyper-compiler', stars: 340 });

  assert.strictEqual(evt.name, 'project_viewed');
  assert.strictEqual(evt.data.project_id, 'hyper-compiler');
  assert.strictEqual(evt.data.stars, 340);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('DeveloperPortfolioAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new DeveloperPortfolioAnalyticsEngine();
  const evt = engine.trackEvent('visitor_message', {
    sender_name: 'Tech Recruiter',
    email: 'recruiter@techcorp.test',
    auth_token: 'secret_jwt_xyz',
    secret: 'override_99',
    safe_param: 'role_fullstack_lead'
  });

  assert.strictEqual(evt.data.sender_name, 'Tech Recruiter');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret, '[SCRUBBED]');
  assert.strictEqual(evt.data.safe_param, 'role_fullstack_lead');
});

test('DeveloperPortfolioAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 185000; // 3 minutes and 5 seconds ago
  const engine = new DeveloperPortfolioAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:05');
});

test('DeveloperPortfolioAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new DeveloperPortfolioAnalyticsEngine();

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
