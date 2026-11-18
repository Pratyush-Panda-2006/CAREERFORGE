import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeSnippetVault } from './snippet-vault.js';

describe('RealEstateLuxeSnippetVault', () => {
  let vault;

  beforeEach(() => {
    vault = new RealEstateLuxeSnippetVault();
  });

  it('loads default luxury real estate valuation models', () => {
    const list = vault.getAllSnippets();
    assert.ok(list.length >= 5);
    const cap = vault.getSnippetById('cap-rate-noi');
    assert.ok(cap);
    assert.equal(cap.category, 'Estate Valuation');
  });

  it('filters presets by query search', () => {
    const results = vault.search('mansion');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'luxury-stamp-duty');
  });

  it('filters presets by tag', () => {
    const results = vault.search('', 'dscr');
    assert.ok(results.length >= 1);
    assert.ok(results.every((s) => s.tags.includes('dscr')));
  });

  it('combines text query and tag filtering', () => {
    const results = vault.search('multiplier', 'yield');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'gross-rent-multiplier');
  });

  it('adds and retrieves a custom appraisal formula', () => {
    const added = vault.addCustomSnippet({
      id: 'custom-land-sqft',
      title: 'Beverly Hills Per-Square-Foot Land Valuation',
      code: 'function landValuation(sqft, pricePerSqft) { return sqft * pricePerSqft; }',
      category: 'Land Appraisal',
      tags: ['land', 'sqft']
    });

    assert.equal(added.id, 'custom-land-sqft');
    const fetched = vault.getSnippetById('custom-land-sqft');
    assert.ok(fetched);
    assert.equal(fetched.title, 'Beverly Hills Per-Square-Foot Land Valuation');
  });

  it('retrieves copyable code snippet', () => {
    const code = vault.copySnippet('irr-cash-flow');
    assert.ok(code.includes('computeCashOnCash'));
  });

  it('returns null when copying invalid snippet id', () => {
    assert.equal(vault.copySnippet('non-existent'), null);
  });
});
