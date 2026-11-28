import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectType, MusicDawStudioClipboardVault, textFromCopy } from './smart-clipboard.js';

function build(options = {}) {
  const written = [];
  let tick = 0;
  const vault = new MusicDawStudioClipboardVault({
    clipboard: { writeText: async (text) => written.push(text) },
    now: () => ++tick,
    ...options,
  });
  return { vault, written };
}

const texts = (items) => items.map((item) => item.text);

test('detectType tells links, code and plain text apart', () => {
  assert.equal(detectType('https://example.com/a?b=1'), 'link');
  assert.equal(detectType('const tempo = 120'), 'code');
  assert.equal(detectType('{ "bpm": 90 }'), 'code');
  assert.equal(detectType('Kick on every beat'), 'text');
  assert.equal(detectType('see https://example.com for more'), 'text');
});

test('pushItem stacks the newest item on top and ignores blank text', () => {
  const { vault } = build();
  vault.pushItem('one');
  vault.pushItem('two');
  assert.equal(vault.pushItem('   '), null);
  assert.equal(vault.pushItem(undefined), null);
  assert.deepEqual(texts(vault.items), ['two', 'one']);
});

test('copying the same text again moves it up and keeps its id', () => {
  const { vault } = build();
  const first = vault.pushItem('one');
  vault.pushItem('two');
  const again = vault.pushItem('one');
  assert.equal(again.id, first.id);
  assert.deepEqual(texts(vault.items), ['one', 'two']);
});

test('the oldest item is dropped past the limit', () => {
  const { vault } = build({ limit: 2 });
  ['a', 'b', 'c'].forEach((text) => vault.pushItem(text));
  assert.deepEqual(texts(vault.items), ['c', 'b']);
});

test('a given type wins and an unknown type is detected instead', () => {
  const { vault } = build();
  assert.equal(vault.pushItem('const a = 1', 'text').type, 'text');
  assert.equal(vault.pushItem('https://example.com', 'video').type, 'link');
});

test('filterItems matches text without case and narrows by type', () => {
  const { vault } = build();
  vault.pushItem('Snare Pattern');
  vault.pushItem('const snare = 1;');
  vault.pushItem('hi hat');
  assert.deepEqual(texts(vault.filterItems('SNARE')), ['const snare = 1;', 'Snare Pattern']);
  assert.deepEqual(texts(vault.filterItems('snare', 'code')), ['const snare = 1;']);
  assert.equal(vault.filterItems('').length, 3);
});

test('copyToClipboard writes the stored text and moves it up', async () => {
  const { vault, written } = build();
  const first = vault.pushItem('one');
  vault.pushItem('two');
  assert.equal(await vault.copyToClipboard(first.id), true);
  assert.deepEqual(written, ['one']);
  assert.deepEqual(texts(vault.items), ['one', 'two']);
});

test('copyToClipboard reports failure for unknown ids and blocked clipboards', async () => {
  const { vault } = build({ clipboard: { writeText: async () => { throw new Error('denied'); } } });
  const first = vault.pushItem('one');
  vault.pushItem('two');
  assert.equal(await vault.copyToClipboard(999), false);
  assert.equal(await vault.copyToClipboard(first.id), false);
  assert.deepEqual(texts(vault.items), ['two', 'one']);
});

test('items can be removed one at a time or all at once', () => {
  const { vault } = build();
  const first = vault.pushItem('one');
  vault.pushItem('two');
  assert.equal(vault.removeItem(first.id), true);
  assert.equal(vault.removeItem(first.id), false);
  vault.clear();
  assert.deepEqual(vault.items, []);
});

test('textFromCopy reads the selected part of a field and skips passwords', () => {
  const field = { tagName: 'TEXTAREA', value: 'four on the floor', selectionStart: 0, selectionEnd: 4 };
  assert.equal(textFromCopy(field, ''), 'four');
  assert.equal(textFromCopy({ ...field, tagName: 'INPUT', type: 'password' }, 'secret'), '');
  assert.equal(textFromCopy({ tagName: 'PRE' }, 'page selection'), 'page selection');
});
