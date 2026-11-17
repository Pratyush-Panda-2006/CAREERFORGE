import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreSnippetVault } from './snippet-vault.js';

test('EcommerceStoreSnippetVault - filters store templates by tag accurately', () => {
  const vault = new EcommerceStoreSnippetVault();
  const discountSnippets = vault.filterByTag('discount');
  const shippingSnippets = vault.filterByTag('shipping');

  assert.ok(discountSnippets.length >= 1);
  assert.strictEqual(discountSnippets[0].id, 'promo-flash-discount');

  assert.ok(shippingSnippets.length >= 1);
  assert.strictEqual(shippingSnippets[0].id, 'free-shipping-threshold');
});

test('EcommerceStoreSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new EcommerceStoreSnippetVault();
  const searchResults = vault.searchSnippets('flash sale percentage');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'promo-flash-discount');
});

test('EcommerceStoreSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new EcommerceStoreSnippetVault();

  assert.throws(() => {
    vault.addSnippet('Flash Sale Percentage & Tiered Cart Discount', '{}', ['discount']);
  }, /already exists/);
});

test('EcommerceStoreSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new EcommerceStoreSnippetVault();
  const added = vault.addSnippet('Buy One Get One Free Schema', '{"bogo": true}', ['bogo', 'promo']);

  assert.strictEqual(added.id, 'buy-one-get-one-free-schema');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('bogo'));
  assert.ok(tags.includes('promo'));

  const filtered = vault.filterByTag('bogo');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'buy-one-get-one-free-schema');
});
