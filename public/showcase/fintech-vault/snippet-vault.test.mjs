import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultSnippetVault } from './snippet-vault.js';

describe('FintechVaultSnippetVault', () => {
  let vault;

  beforeEach(() => {
    vault = new FintechVaultSnippetVault();
  });

  it('loads default banking and financial models', () => {
    const list = vault.getAllSnippets();
    assert.ok(list.length >= 5);
    const bs = vault.getSnippetById('black-scholes-call');
    assert.ok(bs);
    assert.equal(bs.category, 'Quantitative Finance');
  });

  it('filters presets by query search', () => {
    const results = vault.search('Basel');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'liquidity-coverage-ratio');
  });

  it('filters presets by tag', () => {
    const results = vault.search('', 'amortization');
    assert.ok(results.length >= 1);
    assert.ok(results.every((s) => s.tags.includes('amortization')));
  });

  it('combines text query and tag filtering', () => {
    const results = vault.search('volatility', 'options');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'black-scholes-call');
  });

  it('adds and retrieves a custom financial formula', () => {
    const added = vault.addCustomSnippet({
      id: 'custom-sharpe-ratio',
      title: 'Annualized Portfolio Sharpe Ratio',
      code: 'function sharpeRatio(returnRate, rfRate, stdDev) { return (returnRate - rfRate) / stdDev; }',
      category: 'Portfolio Analytics',
      tags: ['sharpe', 'risk']
    });

    assert.equal(added.id, 'custom-sharpe-ratio');
    const fetched = vault.getSnippetById('custom-sharpe-ratio');
    assert.ok(fetched);
    assert.equal(fetched.title, 'Annualized Portfolio Sharpe Ratio');
  });

  it('retrieves copyable code snippet', () => {
    const code = vault.copySnippet('value-at-risk-var');
    assert.ok(code.includes('calculateParametricVaR'));
  });

  it('returns null when copying invalid snippet id', () => {
    assert.equal(vault.copySnippet('non-existent'), null);
  });
});
