import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterAnalyticsEngine } from './analytics-telemetry.js';

test('AerospaceOrbiterAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new AerospaceOrbiterAnalyticsEngine();
  const evt = engine.trackEvent('burn_command_logged', { stage: 2, thrust_kn: 450 });

  assert.strictEqual(evt.name, 'burn_command_logged');
  assert.strictEqual(evt.data.stage, 2);
  assert.strictEqual(evt.data.thrust_kn, 450);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('AerospaceOrbiterAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new AerospaceOrbiterAnalyticsEngine();
  const evt = engine.trackEvent('commander_login', {
    pilot_callsign: 'Astro-1',
    email: 'commander@nasa.test',
    auth_token: 'secret_jwt_xyz',
    secret: 'override_99',
    safe_param: 'orbit_apogee_350km'
  });

  assert.strictEqual(evt.data.pilot_callsign, 'Astro-1');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret, '[SCRUBBED]');
  assert.strictEqual(evt.data.safe_param, 'orbit_apogee_350km');
});

test('AerospaceOrbiterAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 185000; // 3 minutes and 5 seconds ago
  const engine = new AerospaceOrbiterAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:05');
});

test('AerospaceOrbiterAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new AerospaceOrbiterAnalyticsEngine();

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
