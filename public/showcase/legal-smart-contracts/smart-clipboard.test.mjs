import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LegalSmartContractsClipboardVault } from './smart-clipboard.js';

const texts = (items) => items.map((item) => item.text);

test('detects the format of a snippet', () => {
  const vault = new LegalSmartContractsClipboardVault();
  assert.equal(vault.pushItem('0x52908400098527886E0F7030069857D2E4169EE7').type, 'address');
  assert.equal(vault.pushItem('https://example.com/a?b=1').type, 'link');
  assert.equal(vault.pushItem('function release() external {}').type, 'code');
  assert.equal(vault.pushItem('The parties agree as follows.').type, 'text');
  assert.equal(vault.pushItem('forced', 'code').type, 'code');
});

test('ignores blank copies', () => {
  const vault = new LegalSmartContractsClipboardVault();
  assert.equal(vault.pushItem('   \n'), null);
  assert.equal(vault.items.length, 0);
});

test('moves repeats to the top and keeps only the newest items', () => {
  const vault = new LegalSmartContractsClipboardVault(3);
  for (const text of ['a', 'b', 'c', 'a', 'd']) vault.pushItem(text);
  assert.deepEqual(texts(vault.items), ['d', 'a', 'c']);
});

test('filters by text and format', () => {
  const vault = new LegalSmartContractsClipboardVault();
  vault.pushItem('Escrow release clause');
  vault.pushItem('https://example.com/escrow');
  assert.equal(vault.filterItems('ESCROW').length, 2);
  assert.deepEqual(texts(vault.filterItems('escrow', 'link')), ['https://example.com/escrow']);
  assert.deepEqual(vault.filterItems('nothing'), []);
});

test('copies the chosen item and reports failures', async () => {
  const vault = new LegalSmartContractsClipboardVault();
  const item = vault.pushItem('clause 4.2');
  const written = [];
  assert.equal(await vault.copyToClipboard(item.id, { writeText: async (t) => written.push(t) }), true);
  assert.deepEqual(written, ['clause 4.2']);
  assert.equal(await vault.copyToClipboard(999, { writeText: async () => {} }), false);
  assert.equal(await vault.copyToClipboard(item.id, { writeText: async () => { throw new Error('denied'); } }), false);
});
