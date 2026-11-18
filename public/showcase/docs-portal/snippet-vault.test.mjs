import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalSnippetVault } from './snippet-vault.js';

describe('DocsPortalSnippetVault', () => {
  let vault;

  beforeEach(() => {
    vault = new DocsPortalSnippetVault();
  });

  it('initializes with default integration snippets', () => {
    const snippets = vault.getAllSnippets();
    assert.ok(snippets.length >= 5);
    const hmacSnippet = vault.getSnippetById('hmac-webhook-verify');
    assert.ok(hmacSnippet);
    assert.equal(hmacSnippet.category, 'Webhook Security');
  });

  it('searches snippets by text query matching title, category, and code', () => {
    const results = vault.search('hmac');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'hmac-webhook-verify');

    const retryResults = vault.search('jitter');
    assert.ok(retryResults.length >= 1);
    assert.equal(retryResults[0].id, 'exponential-jitter-retry');
  });

  it('filters snippets by tag', () => {
    const pkceResults = vault.search('', 'oauth');
    assert.ok(pkceResults.length >= 1);
    assert.equal(pkceResults[0].id, 'pkce-auth-challenge');
  });

  it('collects all unique tags in sorted order', () => {
    const tags = vault.getAllTags();
    assert.ok(tags.includes('webhook'));
    assert.ok(tags.includes('security'));
    assert.ok(tags.includes('auth'));
  });

  it('supports adding and querying custom snippets', () => {
    const custom = vault.addCustomSnippet({
      title: 'Custom GraphQL Batch Loader',
      code: 'function batchLoad() {}',
      tags: ['graphql', 'batch'],
      category: 'Data Layer'
    });
    assert.ok(custom.id);
    assert.equal(vault.getSnippetById(custom.id).title, 'Custom GraphQL Batch Loader');

    const searchRes = vault.search('Batch Loader');
    assert.equal(searchRes.length, 1);
    assert.equal(searchRes[0].id, custom.id);
  });

  it('validates custom snippet input', () => {
    assert.throws(() => {
      vault.addCustomSnippet({ title: '' });
    }, /Title and code are required/);
  });

  it('copies snippet code by id', () => {
    const code = vault.copySnippet('hmac-webhook-verify');
    assert.ok(code.includes('verifyWebhookSignature'));
    assert.equal(vault.copySnippet('non-existent'), null);
  });
});
