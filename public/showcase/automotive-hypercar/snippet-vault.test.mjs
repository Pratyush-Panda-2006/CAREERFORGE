import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarSnippetVault } from './snippet-vault.js';

test('AutomotiveHypercarSnippetVault - initializes with presets', () => {
  const vault = new AutomotiveHypercarSnippetVault();
  const list = vault.getSnippets();
  assert.ok(list.length >= 5);
  assert.ok(list.some(s => s.tags.includes('aero')));
  assert.ok(list.some(s => s.tags.includes('torque')));
});

test('AutomotiveHypercarSnippetVault - extracts tags and categories', () => {
  const vault = new AutomotiveHypercarSnippetVault();
  const tags = vault.getAllTags();
  assert.ok(tags.includes('aero'));
  assert.ok(tags.includes('yaw'));
  assert.ok(tags.includes('regen'));

  const categories = vault.getAllCategories();
  assert.ok(categories.includes('Aerodynamics'));
  assert.ok(categories.includes('Powertrain'));
  assert.ok(categories.includes('Chassis'));
});

test('AutomotiveHypercarSnippetVault - search filters correctly', () => {
  const vault = new AutomotiveHypercarSnippetVault();
  const aeroMatches = vault.search('monza', 'aero');
  assert.ok(aeroMatches.length >= 1);
  assert.ok(aeroMatches[0].title.includes('Monza'));

  const empty = vault.search('nonexistent_track_spec_999');
  assert.equal(empty.length, 0);
});

test('AutomotiveHypercarSnippetVault - adds and removes snippets', () => {
  const vault = new AutomotiveHypercarSnippetVault();
  const initialCount = vault.getSnippets().length;

  const added = vault.addSnippet({
    title: 'Nürburgring Nordschleife Damper Setup',
    description: 'High compliance spring rates for carousel dip',
    category: 'Chassis',
    tags: ['nurburgring', 'chassis', 'damper'],
    code: '{"front_spring_n_mm": 180, "rear_spring_n_mm": 210}'
  });

  assert.ok(added.id);
  assert.equal(vault.getSnippets().length, initialCount + 1);

  const res = vault.removeSnippet(added.id);
  assert.equal(res, true);
  assert.equal(vault.getSnippets().length, initialCount);
});
