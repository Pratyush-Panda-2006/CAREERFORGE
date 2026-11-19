import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceAnalyticsEngine } from './analytics-telemetry.js';

test('NeurotechInterfaceAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new NeurotechInterfaceAnalyticsEngine();
  const evt = engine.trackEvent('eeg_stream_started', {'channels': 16, 'sampling_rate': 250});

  assert.strictEqual(evt.name, 'eeg_stream_started');
  assert.ok(evt.id.startsWith('neurotech-interface_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('NeurotechInterfaceAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new NeurotechInterfaceAnalyticsEngine();
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

test('NeurotechInterfaceAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 185000; // 3 minutes and 5 seconds ago
  const engine = new NeurotechInterfaceAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:05');
});

test('NeurotechInterfaceAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new NeurotechInterfaceAnalyticsEngine();

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
