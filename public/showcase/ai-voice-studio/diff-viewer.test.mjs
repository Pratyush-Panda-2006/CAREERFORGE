import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioDiffInspector } from './diff-viewer.js';

test('AiVoiceStudioDiffInspector - computes diff on identical text', () => {
  const inspector = new AiVoiceStudioDiffInspector();
  const text = 'Line 1\nLine 2\nLine 3';
  const result = inspector.computeDiff(text, text);

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.unchanged, 3);
  assert.equal(result.metrics.changePercentage, 0);
  assert.equal(result.lines.length, 3);
});

test('AiVoiceStudioDiffInspector - detects additions and deletions accurately', () => {
  const inspector = new AiVoiceStudioDiffInspector();
  const oldText = 'voice: mono\nrate: 22050';
  const newText = 'voice: stereo\nrate: 22050\nchannels: 2';

  const result = inspector.computeDiff(oldText, newText);

  assert.ok(result.metrics.additions >= 1);
  assert.ok(result.metrics.deletions >= 1);
  assert.ok(result.metrics.unchanged >= 1);
  assert.ok(result.metrics.changePercentage > 0);
});

test('AiVoiceStudioDiffInspector - handles empty strings gracefully', () => {
  const inspector = new AiVoiceStudioDiffInspector();
  const result = inspector.computeDiff('', '');

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.changePercentage, 0);
});

test('AiVoiceStudioDiffInspector - loads built-in presets', () => {
  const inspector = new AiVoiceStudioDiffInspector();
  const keys = inspector.getPresetKeys();

  assert.ok(keys.includes('ssmlRevision'));
  assert.ok(keys.includes('phonemeMapping'));
  assert.ok(keys.includes('masteringFilter'));

  const ssml = inspector.getPreset('ssmlRevision');
  assert.ok(ssml.left.includes('<speak>'));
  assert.ok(ssml.right.includes('<prosody'));
});
