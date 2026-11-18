import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsSnippetVault } from './snippet-vault.js';

describe('GamingEsportsSnippetVault', () => {
  let vault;

  beforeEach(() => {
    vault = new GamingEsportsSnippetVault();
  });

  it('loads default esports and netcode presets', () => {
    const list = vault.getAllSnippets();
    assert.ok(list.length >= 5);
    const elo = vault.getSnippetById('elo-mmr-rating');
    assert.ok(elo);
    assert.equal(elo.category, 'Matchmaking Math');
  });

  it('filters presets by query search', () => {
    const results = vault.search('subtick');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'subtick-interpolation');
  });

  it('filters presets by tag', () => {
    const results = vault.search('', 'mmr');
    assert.ok(results.length >= 1);
    assert.ok(results.every((s) => s.tags.includes('mmr')));
  });

  it('combines text query and tag filtering', () => {
    const results = vault.search('recoil', 'physics');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'recoil-pattern-curve');
  });

  it('adds and retrieves a custom preset', () => {
    const added = vault.addCustomSnippet({
      id: 'custom-aim-curve',
      title: 'Custom Aim Acceleration Polynomial',
      code: 'function aimCurve(input) { return Math.pow(input, 1.4); }',
      category: 'Input Dynamics',
      tags: ['aim', 'input']
    });

    assert.equal(added.id, 'custom-aim-curve');
    const fetched = vault.getSnippetById('custom-aim-curve');
    assert.ok(fetched);
    assert.equal(fetched.title, 'Custom Aim Acceleration Polynomial');
  });

  it('retrieves copyable code snippet', () => {
    const code = vault.copySnippet('economy-loss-bonus');
    assert.ok(code.includes('getLossStreakPayout'));
  });

  it('returns null when copying invalid snippet id', () => {
    assert.equal(vault.copySnippet('non-existent'), null);
  });
});
