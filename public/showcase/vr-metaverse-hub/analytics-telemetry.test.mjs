import test from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubAnalyticsEngine } from './analytics-telemetry.js';

test('VrMetaverseHubAnalyticsEngine scrubs PII emails and passwords', () => {
  const engine = new VrMetaverseHubAnalyticsEngine();
  const rawPayload = {
    avatarEmail: 'traveler@metaverse.vr',
    token: 'jwt-vr-session-token-9988',
    phone: '+1 800-555-0199',
    worldZone: 'Cyberpunk Neon City'
  };

  const event = engine.trackEvent('avatar_teleport', rawPayload);
  assert.equal(event.data.avatarEmail, '[REDACTED_EMAIL]');
  assert.equal(event.data.token, '[REDACTED_CREDENTIAL]');
  assert.equal(event.data.phone, '[REDACTED_PHONE]');
  assert.equal(event.data.worldZone, 'Cyberpunk Neon City');
});

test('clamps scroll depth percentage strictly within [0, 100]', () => {
  const engine = new VrMetaverseHubAnalyticsEngine();
  assert.equal(engine.getScrollDepthPercentage(), 0);

  // Scroll half-way
  engine.updateScrollDepth(400, 1600, 800);
  assert.equal(engine.getScrollDepthPercentage(), 50);

  // Beyond boundary scroll
  engine.updateScrollDepth(3000, 1600, 800);
  assert.equal(engine.getScrollDepthPercentage(), 100);
});

test('computes clamped session duration without negative values', () => {
  const start = 1700000000000;
  const engine = new VrMetaverseHubAnalyticsEngine({ startTime: start });

  assert.equal(engine.computeSessionDuration(start + 8500), 8500);
  assert.equal(engine.computeSessionDuration(start - 500), 0);
});

test('exports serialized telemetry report containing all tracked interaction events', () => {
  const engine = new VrMetaverseHubAnalyticsEngine();
  engine.trackEvent('hmd_fov_change', { fov: 110, refreshRate: 120 });
  engine.recordClick('button#spawn-portal');

  const report = engine.exportReportJSON();
  const parsed = JSON.parse(report);

  assert.equal(parsed.totalEventsTracked, 2);
  assert.equal(parsed.totalClicksRecorded, 1);
  assert.equal(parsed.events[0].name, 'hmd_fov_change');
  assert.equal(parsed.events[1].data.target, 'button#spawn-portal');
});
