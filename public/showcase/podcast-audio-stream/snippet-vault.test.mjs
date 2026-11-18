import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamSnippetVault } from './snippet-vault.js';

test('PodcastAudioStreamSnippetVault - initializes with presets', () => {
  const vault = new PodcastAudioStreamSnippetVault();
  const list = vault.getSnippets();
  assert.ok(list.length >= 5);
  assert.ok(list.some(s => s.tags.includes('rss')));
  assert.ok(list.some(s => s.tags.includes('hls')));
});

test('PodcastAudioStreamSnippetVault - extracts unique tags and categories', () => {
  const vault = new PodcastAudioStreamSnippetVault();
  const tags = vault.getAllTags();
  assert.ok(tags.includes('rss'));
  assert.ok(tags.includes('streaming'));
  assert.ok(tags.includes('lufs'));

  const categories = vault.getAllCategories();
  assert.ok(categories.includes('RSS Feed 2.0'));
  assert.ok(categories.includes('HLS Streaming'));
  assert.ok(categories.includes('Audio Mastering'));
});

test('PodcastAudioStreamSnippetVault - search filters correctly', () => {
  const vault = new PodcastAudioStreamSnippetVault();
  const hlsMatches = vault.search('bitrate', 'hls');
  assert.ok(hlsMatches.length >= 1);
  assert.ok(hlsMatches[0].title.includes('HLS'));

  const empty = vault.search('nonexistent_podcast_audio_spec_xyz');
  assert.equal(empty.length, 0);
});

test('PodcastAudioStreamSnippetVault - adds and removes snippets', () => {
  const vault = new PodcastAudioStreamSnippetVault();
  const initialCount = vault.getSnippets().length;

  const added = vault.addSnippet({
    title: 'Opus Audio Codec Compression Config',
    description: 'Ultra-low latency speech profile',
    category: 'Audio Mastering',
    tags: ['opus', 'codec', 'compression'],
    code: '{"codec": "libopus", "bitrate_kbps": 48}'
  });

  assert.ok(added.id);
  assert.equal(vault.getSnippets().length, initialCount + 1);

  const res = vault.removeSnippet(added.id);
  assert.equal(res, true);
  assert.equal(vault.getSnippets().length, initialCount);
});
