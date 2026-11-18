import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalitySnippetVault } from './snippet-vault.js';

describe('HealthVitalitySnippetVault', () => {
  let vault;

  beforeEach(() => {
    vault = new HealthVitalitySnippetVault();
  });

  it('loads default clinical and biometric presets', () => {
    const list = vault.getAllSnippets();
    assert.ok(list.length >= 5);
    const cooper = vault.getSnippetById('cooper-vo2max');
    assert.ok(cooper);
    assert.equal(cooper.category, 'Cardio Fitness');
  });

  it('filters presets by query search', () => {
    const results = vault.search('RMSSD');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'rmssd-hrv');
  });

  it('filters presets by tag', () => {
    const results = vault.search('', 'vo2max');
    assert.ok(results.length >= 1);
    assert.ok(results.every((s) => s.tags.includes('vo2max')));
  });

  it('combines text query and tag filtering', () => {
    const results = vault.search('caloric', 'nutrition');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'keto-macro-ratio');
  });

  it('adds and retrieves a custom snippet', () => {
    const added = vault.addCustomSnippet({
      id: 'custom-lactate-threshold',
      title: 'Lactate Threshold Deflection Calculator',
      code: 'function lactateDeflection() { return 4.0; }',
      category: 'Endurance Physiology',
      tags: ['lactate', 'endurance']
    });

    assert.equal(added.id, 'custom-lactate-threshold');
    const fetched = vault.getSnippetById('custom-lactate-threshold');
    assert.ok(fetched);
    assert.equal(fetched.title, 'Lactate Threshold Deflection Calculator');
  });

  it('retrieves copyable code content', () => {
    const code = vault.copySnippet('isotonic-osmolarity');
    assert.ok(code.includes('formulateRehydrationMix'));
  });

  it('returns null when copying invalid snippet id', () => {
    assert.equal(vault.copySnippet('invalid-id'), null);
  });
});
