import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamCompressionEngine } from './compression-suite.js';

test('PodcastAudioStreamCompressionEngine - instantiation and name', () => {
  const engine = new PodcastAudioStreamCompressionEngine();
  assert.equal(engine.name, 'PodcastAudioStreamCompressionEngine');
});

test('PodcastAudioStreamCompressionEngine - handles empty and edge inputs', () => {
  const engine = new PodcastAudioStreamCompressionEngine();
  assert.deepEqual(engine.compressLZW(''), []);
  assert.deepEqual(engine.compressLZW(null), []);
  assert.deepEqual(engine.compressLZW(undefined), []);
  assert.equal(engine.decompressLZW([]), '');
  assert.equal(engine.decompressLZW(null), '');
});

test('PodcastAudioStreamCompressionEngine - lossless roundtrip compression and decompression', () => {
  const engine = new PodcastAudioStreamCompressionEngine();
  const sampleRss = `
    <rss version="2.0">
      <channel>
        <title>Tech Podcasts Daily</title>
        <description>Daily tech news, interviews with AI researchers, and sound design.</description>
        <item>
          <title>Episode 42: Modern Streaming Architecture</title>
          <guid>episode-42-uuid-98471924</guid>
        </item>
      </channel>
    </rss>
  `;

  const compressed = engine.compressLZW(sampleRss);
  assert.ok(Array.isArray(compressed));
  assert.ok(compressed.length > 0);

  const restored = engine.decompressLZW(compressed);
  assert.equal(restored, sampleRss);
});

test('PodcastAudioStreamCompressionEngine - unicode character support and audio emojis', () => {
  const engine = new PodcastAudioStreamCompressionEngine();
  const unicodePayload = '🎧 Podcast Episode 99: 🎙️ Sound Design & 🎵 Synthesis (44.1kHz / 24-bit 🎛️) — «¡Hola Mundo! 🚀»';

  const compressed = engine.compressLZW(unicodePayload);
  const restored = engine.decompressLZW(compressed);
  assert.equal(restored, unicodePayload);
});

test('PodcastAudioStreamCompressionEngine - savings ratio and metrics calculation', () => {
  const engine = new PodcastAudioStreamCompressionEngine();
  const repeatedText = 'PODCAST_AUDIO_STREAM_CHAPTER_MARKER_METADATA_'.repeat(20);

  const compressed = engine.compressLZW(repeatedText);
  const metrics = engine.computeSavingsRatio(repeatedText, compressed);

  assert.ok(metrics.rawBytes > 0);
  assert.ok(metrics.compressedBytes > 0);
  assert.ok(metrics.savingsPercent > 0);
  assert.ok(metrics.compressionRatio > 1.0);

  // Empty metrics
  const emptyMetrics = engine.computeSavingsRatio('', []);
  assert.equal(emptyMetrics.rawBytes, 0);
  assert.equal(emptyMetrics.compressedBytes, 0);
  assert.equal(emptyMetrics.savingsPercent, 0);
  assert.equal(emptyMetrics.compressionRatio, 1);
});

test('PodcastAudioStreamCompressionEngine - error handling on corrupted stream', () => {
  const engine = new PodcastAudioStreamCompressionEngine();
  // Code 9999 is outside valid dictionary range
  assert.throws(() => engine.decompressLZW([9999]), /Invalid initial code in LZW stream/);
});
