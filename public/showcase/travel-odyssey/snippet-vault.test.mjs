import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseySnippetVault } from './snippet-vault.js';

test('TravelOdysseySnippetVault - initializes with presets', () => {
  const vault = new TravelOdysseySnippetVault();
  const list = vault.getSnippets();
  assert.ok(list.length >= 5);
  assert.ok(list.some(s => s.tags.includes('visa')));
  assert.ok(list.some(s => s.tags.includes('health')));
});

test('TravelOdysseySnippetVault - extracts unique tags and categories', () => {
  const vault = new TravelOdysseySnippetVault();
  const tags = vault.getAllTags();
  assert.ok(tags.includes('visa'));
  assert.ok(tags.includes('schengen'));
  assert.ok(tags.includes('iata'));

  const categories = vault.getAllCategories();
  assert.ok(categories.includes('Visa & Immigration'));
  assert.ok(categories.includes('Health & Vaccines'));
  assert.ok(categories.includes('Flight Logistics'));
});

test('TravelOdysseySnippetVault - search filters correctly', () => {
  const vault = new TravelOdysseySnippetVault();
  const schengenMatches = vault.search('passport', 'visa');
  assert.ok(schengenMatches.length >= 1);
  assert.ok(schengenMatches[0].title.includes('Schengen'));

  const empty = vault.search('nonexistent_travel_visa_xyz_999');
  assert.equal(empty.length, 0);
});

test('TravelOdysseySnippetVault - adds and removes snippets', () => {
  const vault = new TravelOdysseySnippetVault();
  const initialCount = vault.getSnippets().length;

  const added = vault.addSnippet({
    title: 'Japan Rail Pass Eligibility Criteria',
    description: 'Temporary visitor stamp verification protocol',
    category: 'Transit Logistics',
    tags: ['japan', 'rail', 'jrpass'],
    code: '{"visa_status": "Temporary Visitor", "pass_duration_days": 14}'
  });

  assert.ok(added.id);
  assert.equal(vault.getSnippets().length, initialCount + 1);

  const res = vault.removeSnippet(added.id);
  assert.equal(res, true);
  assert.equal(vault.getSnippets().length, initialCount);
});
