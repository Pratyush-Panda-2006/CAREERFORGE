import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioAnalyticsEngine } from './analytics-telemetry.js';

test('AiVoiceStudioAnalyticsEngine - tracks events and prepends to history', () => {
  const engine = new AiVoiceStudioAnalyticsEngine();
  const evt = engine.trackEvent('vocoder_preset_selected', { presetId: 'deep_resonance' });

  assert.strictEqual(evt.name, 'vocoder_preset_selected');
  assert.strictEqual(engine.events.length, 1);
  assert.strictEqual(engine.getEvents()[0].name, 'vocoder_preset_selected');
});

test('AiVoiceStudioAnalyticsEngine - automatically scrubs sensitive PII fields', () => {
  const engine = new AiVoiceStudioAnalyticsEngine();
  const evt = engine.trackEvent('user_profile_save', {
    userEmail: 'user@example.com',
    auth_token: 'secret_jwt_xyz',
    pitchFactor: 1.2
  });

  assert.strictEqual(evt.data.userEmail, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.pitchFactor, 1.2);
});

test('AiVoiceStudioAnalyticsEngine - computes formatted session duration string', () => {
  const start = Date.now() - 65000; // 1 min 5 secs ago
  const engine = new AiVoiceStudioAnalyticsEngine({ startTime: start });
  const duration = engine.computeSessionDuration(start + 65000);

  assert.strictEqual(duration, '01:05');
});

test('AiVoiceStudioAnalyticsEngine - clears events and exports valid JSON payload', () => {
  const engine = new AiVoiceStudioAnalyticsEngine();
  engine.trackEvent('render_waveform', { samples: 44100 });

  const jsonStr = engine.exportTelemetryJson();
  const parsed = JSON.parse(jsonStr);
  assert.strictEqual(parsed.eventCount, 1);
  assert.strictEqual(parsed.events[0].name, 'render_waveform');

  engine.clearEvents();
  assert.strictEqual(engine.getEvents().length, 0);
});
