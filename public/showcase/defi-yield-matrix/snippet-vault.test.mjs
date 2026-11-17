import test from 'node:test';
import assert from 'node:assert/strict';
import { DeFiYieldMatrixSnippetVault } from './snippet-vault.js';

test('DeFiYieldMatrixSnippetVault', async (t) => {
  await t.test('should filter presets accurately by category tag', () => {
    const vault = new DeFiYieldMatrixSnippetVault();
    const lendingPresets = vault.filterByTag('lending');
    assert.ok(lendingPresets.length >= 1);
    assert.ok(lendingPresets.every(p => p.category === 'lending' || p.tags.includes('lending')));
  });

  await t.test('should search presets with multi-token query across title and code', () => {
    const vault = new DeFiYieldMatrixSnippetVault();
    const results = vault.searchSnippets('flash loan arbitrage');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'snip-defi-02');
  });

  await t.test('should add new preset and list it', () => {
    const vault = new DeFiYieldMatrixSnippetVault();
    const created = vault.addSnippet({
      title: 'Euler Liquid Staking Derivative Peg Deviation Guard',
      category: 'yield',
      tags: ['yield', 'lsd', 'peg'],
      description: 'Calculates peg discount arbitrage opportunities when stETH/ETH diverges beyond 0.5%.',
      code: 'function checkDiscount(spot, target = 1.0) { return (target - spot) / target; }'
    });

    assert.ok(created.id);
    const found = vault.searchSnippets('peg deviation');
    assert.equal(found.length, 1);
    assert.equal(found[0].title, 'Euler Liquid Staking Derivative Peg Deviation Guard');
  });

  await t.test('should throw error when missing mandatory fields', () => {
    const vault = new DeFiYieldMatrixSnippetVault();
    assert.throws(() => {
      vault.addSnippet({ title: 'Invalid Math Formula' });
    }, /Title and code are required/);
  });
});
