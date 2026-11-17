import test from 'node:test';
import assert from 'node:assert/strict';
import { VRMetaverseHubSnippetVault } from './snippet-vault.js';

test('VRMetaverseHubSnippetVault', async (t) => {
  await t.test('should filter presets accurately by category tag', () => {
    const vault = new VRMetaverseHubSnippetVault();
    const audioPresets = vault.filterByTag('audio');
    assert.ok(audioPresets.length >= 1);
    assert.ok(audioPresets.every(p => p.category === 'audio' || p.tags.includes('audio')));
  });

  await t.test('should search presets with multi-token query across title and code', () => {
    const vault = new VRMetaverseHubSnippetVault();
    const results = vault.searchSnippets('binaural panner');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'snip-vr-02');
  });

  await t.test('should add new preset and list it', () => {
    const vault = new VRMetaverseHubSnippetVault();
    const created = vault.addSnippet({
      title: 'Dynamic Resolution Downsampling Guard',
      category: 'rendering',
      tags: ['perf', 'resolution', 'guard'],
      description: 'Downsamples framebuffer when frame budget exceeds 11.1ms.',
      code: 'function adaptScale(delta) { if (delta > 11.1) scale *= 0.9; }'
    });

    assert.ok(created.id);
    const found = vault.searchSnippets('downsampling');
    assert.equal(found.length, 1);
    assert.equal(found[0].title, 'Dynamic Resolution Downsampling Guard');
  });

  await t.test('should throw error when missing mandatory fields', () => {
    const vault = new VRMetaverseHubSnippetVault();
    assert.throws(() => {
      vault.addSnippet({ title: 'Invalid Preset' });
    }, /Title and code are required/);
  });
});
