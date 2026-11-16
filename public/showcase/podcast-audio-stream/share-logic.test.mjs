import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { URL, URLSearchParams };
vm.runInNewContext(readFileSync(new URL('./share-logic.js', import.meta.url), 'utf8'), sandbox);
const { buildLink, parseLink, formatTimestamp } = sandbox.ShareLogic;

test('sharing a timestamp keeps the episode and rounds playback seconds', () => {
  const url = new URL(buildLink('https://example.org/showcase/podcast-audio-stream/index.html?old=1#player', '141', 860.8, true));
  assert.equal(url.searchParams.get('episode'), '141');
  assert.equal(url.searchParams.get('t'), '14m20s');
  assert.equal(url.hash, '');
  assert.deepEqual({ ...parseLink(url.search) }, { episode: '141', time: 860 });
});

test('sharing without a timestamp removes a previous timestamp', () => {
  const url = new URL(buildLink('https://example.org/?t=10s', '142', 20, false));
  assert.equal(url.searchParams.has('t'), false);
  assert.deepEqual({ ...parseLink(url.search) }, { episode: '142', time: 0 });
});

test('deep links reject unknown episodes and clamp oversized timestamps', () => {
  assert.equal(parseLink('?episode=999&t=15s'), null);
  assert.deepEqual({ ...parseLink('?episode=142&t=999999s') }, { episode: '142', time: 2880 });
  assert.deepEqual({ ...parseLink('?episode=142&t=bad') }, { episode: '142', time: 0 });
  assert.equal(formatTimestamp(-1), '0s');
});
