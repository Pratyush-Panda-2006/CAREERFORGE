import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridSnippetVault } from './snippet-vault.js';

test('RenewableMicrogridSnippetVault', async (t) => {
  await t.test('should filter presets accurately by category tag', () => {
    const vault = new RenewableMicrogridSnippetVault();
    const batteryPresets = vault.filterByTag('battery');
    assert.ok(batteryPresets.length >= 1);
    assert.ok(batteryPresets.every(p => p.category === 'battery' || p.tags.includes('battery')));
  });

  await t.test('should search presets with multi-token query across title and code', () => {
    const vault = new RenewableMicrogridSnippetVault();
    const results = vault.searchSnippets('mppt perturb');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'snip-micro-01');
  });

  await t.test('should add new preset and list it', () => {
    const vault = new RenewableMicrogridSnippetVault();
    const created = vault.addSnippet({
      title: 'Dynamic Spinning Reserve Allocation Matrix',
      category: 'grid',
      tags: ['grid', 'reserve', 'dispatch'],
      description: 'Calculates necessary spinning reserve based on loss-of-largest-infeed risk.',
      code: 'function calcReserve(largestMw, contingencyPct = 0.15) { return largestMw * (1 + contingencyPct); }'
    });

    assert.ok(created.id);
    const found = vault.searchSnippets('spinning reserve');
    assert.equal(found.length, 1);
    assert.equal(found[0].title, 'Dynamic Spinning Reserve Allocation Matrix');
  });

  await t.test('should throw error when missing mandatory fields', () => {
    const vault = new RenewableMicrogridSnippetVault();
    assert.throws(() => {
      vault.addSnippet({ title: 'Invalid Equation' });
    }, /Title and code are required/);
  });
});
