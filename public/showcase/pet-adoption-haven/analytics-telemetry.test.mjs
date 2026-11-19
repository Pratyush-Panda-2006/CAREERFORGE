import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenAnalyticsEngine } from './analytics-telemetry.js';

test('PetAdoptionHavenAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new PetAdoptionHavenAnalyticsEngine();
  const evt = engine.trackEvent('pet_favorited', { pet_id: 'CAT-102', name: 'Luna' });

  assert.strictEqual(evt.name, 'pet_favorited');
  assert.ok(evt.id.startsWith('pet_evt_'));

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('PetAdoptionHavenAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new PetAdoptionHavenAnalyticsEngine();
  const evt = engine.trackEvent('adopter_contact_saved', {
    adopter_id: 'adopter_22',
    email: 'adopter@haven.test',
    auth_token: 'secret_user_token',
    secret_key: 'top_secret',
    phone_number: '555-0123'
  });

  assert.strictEqual(evt.data.adopter_id, 'adopter_22');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.secret_key, '[SCRUBBED]');
  assert.strictEqual(evt.data.phone_number, '[SCRUBBED]');
});

test('PetAdoptionHavenAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 195000; // 3 minutes and 15 seconds ago
  const engine = new PetAdoptionHavenAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '03:15');
});

test('PetAdoptionHavenAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new PetAdoptionHavenAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 600,
      scrollHeight: 2400,
      clientHeight: 1200
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  assert.strictEqual(depth, 50);
});
