import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3DSnippetVault } from './snippet-vault.js';

test('VirtualMuseum3DSnippetVault', async (t) => {
  await t.test('should filter presets accurately by category tag', () => {
    const vault = new VirtualMuseum3DSnippetVault();
    const materialPresets = vault.filterByTag('material');
    assert.ok(materialPresets.length >= 1);
    assert.ok(materialPresets.every(p => p.category === 'material' || p.tags.includes('material')));
  });

  await t.test('should search presets with multi-token query across title and code', () => {
    const vault = new VirtualMuseum3DSnippetVault();
    const results = vault.searchSnippets('marble subsurface');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'snip-mus-02');
  });

  await t.test('should add new preset and list it', () => {
    const vault = new VirtualMuseum3DSnippetVault();
    const created = vault.addSnippet({
      title: 'Antiquity Terracotta Roughness Profile',
      category: 'material',
      tags: ['material', 'terracotta', 'pbr'],
      description: 'Physical shader parameters for unglazed ceramic artifacts.',
      code: 'const terracotta = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });'
    });

    assert.ok(created.id);
    const found = vault.searchSnippets('terracotta');
    assert.equal(found.length, 1);
    assert.equal(found[0].title, 'Antiquity Terracotta Roughness Profile');
  });

  await t.test('should throw error when missing mandatory fields', () => {
    const vault = new VirtualMuseum3DSnippetVault();
    assert.throws(() => {
      vault.addSnippet({ title: 'Invalid Exhibit' });
    }, /Title and code are required/);
  });
});
