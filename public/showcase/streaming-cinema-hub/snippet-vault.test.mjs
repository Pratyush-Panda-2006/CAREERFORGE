import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubSnippetVault } from './snippet-vault.js';

test('StreamingCinemaHubSnippetVault - filters cinema presets by tag accurately', () => {
  const vault = new StreamingCinemaHubSnippetVault();
  const hlsSnippets = vault.filterByTag('hls');
  const hdrSnippets = vault.filterByTag('hdr');

  assert.ok(hlsSnippets.length >= 1);
  assert.strictEqual(hlsSnippets[0].id, 'hls-adaptive-4k-manifest');

  assert.ok(hdrSnippets.length >= 1);
  assert.strictEqual(hdrSnippets[0].id, 'dolby-vision-color-profile');
});

test('StreamingCinemaHubSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new StreamingCinemaHubSnippetVault();
  const searchResults = vault.searchSnippets('dolby vision bt.2020');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'dolby-vision-color-profile');
});

test('StreamingCinemaHubSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new StreamingCinemaHubSnippetVault();

  assert.throws(() => {
    vault.addSnippet('HLS 4K UltraHD Multi-Bitrate Ladder Manifest', '{}', ['hls']);
  }, /already exists/);
});

test('StreamingCinemaHubSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new StreamingCinemaHubSnippetVault();
  const added = vault.addSnippet('AV1 NextGen Compression Preset', '{"codec": "libsvtav1"}', ['av1', 'compression']);

  assert.strictEqual(added.id, 'av1-nextgen-compression-preset');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('av1'));
  assert.ok(tags.includes('compression'));

  const filtered = vault.filterByTag('av1');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'av1-nextgen-compression-preset');
});
