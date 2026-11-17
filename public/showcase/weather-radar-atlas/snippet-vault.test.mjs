import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasSnippetVault } from './snippet-vault.js';

describe('WeatherRadarAtlasSnippetVault', () => {
  it('should filter presets accurately by category tag', () => {
    const vault = new WeatherRadarAtlasSnippetVault();
    const dopplerPresets = vault.filterByTag('doppler');

    assert.ok(dopplerPresets.length > 0);
    assert.ok(dopplerPresets.every(p => p.tags.includes('doppler')));
  });

  it('should search presets with multi-token query across title, code, and tags', () => {
    const vault = new WeatherRadarAtlasSnippetVault();
    const results = vault.searchSnippets('reflectivity dbz');

    assert.ok(results.length > 0);
    assert.ok(results[0].title.toLowerCase().includes('reflectivity'));
  });

  it('should prevent adding duplicate presets with same title or identifier', () => {
    const vault = new WeatherRadarAtlasSnippetVault();

    assert.throws(() => {
      vault.addSnippet('NWS Standard dBZ Reflectivity Color Palette', '{}', ['nexrad']);
    }, /already exists/);
  });

  it('should allow adding new meteorological presets and maintain unique tags', () => {
    const vault = new WeatherRadarAtlasSnippetVault();
    const created = vault.addSnippet(
      'Supercell Mesocyclone Detection Algorithm 2.0',
      'const mdaThreshold = 25.0;',
      ['mda', 'supercell', 'radar']
    );

    assert.equal(created.id, 'supercell-mesocyclone-detection-algorithm-2-0');
    assert.ok(vault.getAllTags().includes('supercell'));
  });
});
