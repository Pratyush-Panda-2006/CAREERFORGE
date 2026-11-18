import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioSnippetVault } from './snippet-vault.js';

describe('DeveloperPortfolioSnippetVault', () => {
  let vault;

  beforeEach(() => {
    vault = new DeveloperPortfolioSnippetVault();
  });

  it('initializes with default software engineering snippets', () => {
    const snippets = vault.getAllSnippets();
    assert.ok(snippets.length >= 5);
    const lru = vault.getSnippetById('lru-cache');
    assert.ok(lru);
    assert.equal(lru.category, 'Data Structures');
  });

  it('searches snippets by title, description, and code', () => {
    const lruRes = vault.search('LRU');
    assert.equal(lruRes.length, 1);
    assert.equal(lruRes[0].id, 'lru-cache');

    const matrixRes = vault.search('Matrix');
    assert.equal(matrixRes.length, 1);
    assert.equal(matrixRes[0].id, 'canvas-matrix-rain');
  });

  it('filters snippets by tag correctly', () => {
    const asyncSnippets = vault.search('', 'async');
    assert.ok(asyncSnippets.length >= 1);
    assert.equal(asyncSnippets[0].id, 'async-concurrency-pool');
  });

  it('extracts all unique tags sorted', () => {
    const tags = vault.getAllTags();
    assert.ok(tags.includes('performance'));
    assert.ok(tags.includes('cache'));
    assert.ok(tags.includes('canvas'));
  });

  it('adds and searches custom algorithm snippets', () => {
    const custom = vault.addCustomSnippet({
      title: 'Trie Prefix Search Tree',
      code: 'class TrieNode {}',
      tags: ['trie', 'search', 'algorithms'],
      category: 'Data Structures'
    });
    assert.ok(custom.id);
    assert.equal(vault.getSnippetById(custom.id).title, 'Trie Prefix Search Tree');

    const searchRes = vault.search('Prefix');
    assert.equal(searchRes.length, 1);
  });

  it('validates custom snippet input parameters', () => {
    assert.throws(() => {
      vault.addCustomSnippet({ title: '' });
    }, /Title and code are required/);
  });

  it('copies code by snippet id', () => {
    const code = vault.copySnippet('debounced-throttle');
    assert.ok(code.includes('createDebounceThrottle'));
    assert.equal(vault.copySnippet('non-existent'), null);
  });
});
