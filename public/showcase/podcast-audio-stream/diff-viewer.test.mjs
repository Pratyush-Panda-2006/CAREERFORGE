import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamDiffInspector } from './diff-viewer.js';

test('PodcastAudioStreamDiffInspector - computes diff on identical text', () => {
  const inspector = new PodcastAudioStreamDiffInspector();
  const text = 'track: 1\nbitrate: 192k\ncodec: mp3';
  const result = inspector.computeDiff(text, text);

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.unchanged, 3);
  assert.equal(result.metrics.changePercentage, 0);
  assert.equal(result.lines.length, 3);
});

test('PodcastAudioStreamDiffInspector - computes additions and deletions accurately', () => {
  const inspector = new PodcastAudioStreamDiffInspector();
  const oldText = 'lufs: -19\nmono: true';
  const newText = 'lufs: -16\nstereo: true\nhighpass: 80Hz';

  const result = inspector.computeDiff(oldText, newText);

  assert.ok(result.metrics.additions >= 1);
  assert.ok(result.metrics.deletions >= 1);
  assert.ok(result.metrics.changePercentage > 0);
});

test('PodcastAudioStreamDiffInspector - handles empty strings gracefully', () => {
  const inspector = new PodcastAudioStreamDiffInspector();
  const result = inspector.computeDiff('', '');

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.changePercentage, 0);
});

test('PodcastAudioStreamDiffInspector - loads built-in podcast presets', () => {
  const inspector = new PodcastAudioStreamDiffInspector();
  const keys = inspector.getPresetKeys();

  assert.ok(keys.includes('rssFeedUpdate'));
  assert.ok(keys.includes('hlsPlaylistRevision'));
  assert.ok(keys.includes('masteringFilter'));

  const rss = inspector.getPreset('rssFeedUpdate');
  assert.ok(rss.left.includes('Ep 101'));
  assert.ok(rss.right.includes('podcast:transcript'));
});
