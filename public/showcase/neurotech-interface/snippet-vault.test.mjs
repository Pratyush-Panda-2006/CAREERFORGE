import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceSnippetVault } from './snippet-vault.js';

describe('NeurotechInterfaceSnippetVault', () => {
  it('should filter BCI presets accurately by category tag', () => {
    const vault = new NeurotechInterfaceSnippetVault();
    const dspPresets = vault.filterByTag('dsp');

    assert.ok(dspPresets.length > 0);
    assert.ok(dspPresets.every(p => p.tags.includes('dsp')));
  });

  it('should search presets with multi-token query across title, code, and tags', () => {
    const vault = new NeurotechInterfaceSnippetVault();
    const results = vault.searchSnippets('kalman kinematic');

    assert.ok(results.length > 0);
    assert.ok(results[0].title.toLowerCase().includes('kalman'));
  });

  it('should prevent adding duplicate presets with same title or identifier', () => {
    const vault = new NeurotechInterfaceSnippetVault();

    assert.throws(() => {
      vault.addSnippet('EEG 0.5Hz - 45Hz 4th-Order Butterworth Bandpass Filter', '{}', ['dsp']);
    }, /already exists/);
  });

  it('should allow adding new BCI algorithms and maintain unique tags', () => {
    const vault = new NeurotechInterfaceSnippetVault();
    const created = vault.addSnippet(
      'Deep Riemannian Manifold Spatial Covariance Classifier',
      'const riemannianMetric = "AIRM";',
      ['riemannian', 'bci', 'manifold']
    );

    assert.equal(created.id, 'deep-riemannian-manifold-spatial-covariance-classifier');
    assert.ok(vault.getAllTags().includes('riemannian'));
  });
});
