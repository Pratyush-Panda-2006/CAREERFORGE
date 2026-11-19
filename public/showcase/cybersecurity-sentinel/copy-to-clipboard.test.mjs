import test from 'node:test';
import assert from 'node:assert/strict';
import { copyText } from './copy-to-clipboard.js';

test('copies the supplied sample command', async () => {
  let copied;
  await copyText('curl https://api.sentinel.example', {
    writeText: async (value) => { copied = value; }
  });
  assert.equal(copied, 'curl https://api.sentinel.example');
});

test('propagates clipboard write failures', async () => {
  await assert.rejects(
    copyText('sample', { writeText: async () => { throw new Error('denied'); } }),
    /denied/
  );
});

test('reports unavailable clipboard support', async () => {
  await assert.rejects(copyText('sample', null), /Clipboard access is unavailable/);
});
