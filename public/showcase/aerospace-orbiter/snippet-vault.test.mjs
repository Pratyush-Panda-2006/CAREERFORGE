import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterSnippetVault } from './snippet-vault.js';

test('AerospaceOrbiterSnippetVault loads core orbital mechanics presets', () => {
  const vault = new AerospaceOrbiterSnippetVault();
  const all = vault.getAll();
  assert.ok(all.length >= 4);

  const hohmann = vault.getById('ao-hohmann-transfer');
  assert.ok(hohmann);
  assert.equal(hohmann.title, 'Hohmann Transfer Orbit Delta-V');
  assert.ok(hohmann.tags.includes('astrodynamics'));
});

test('AerospaceOrbiterSnippetVault filters presets by tag correctly', () => {
  const vault = new AerospaceOrbiterSnippetVault();
  const propulsion = vault.filterByTag('propulsion');
  assert.ok(propulsion.length >= 1);
  assert.equal(propulsion[0].id, 'ao-tsiolkovsky-rocket');

  const all = vault.filterByTag('all');
  assert.equal(all.length, vault.getAll().length);
});

test('AerospaceOrbiterSnippetVault performs multi-token search accurately', () => {
  const vault = new AerospaceOrbiterSnippetVault();
  const searchResults = vault.searchSnippets('vis viva speed');
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, 'ao-vis-viva');

  const noResults = vault.searchSnippets('intergalactic_hyperdrive_xyz');
  assert.equal(noResults.length, 0);
});

test('AerospaceOrbiterSnippetVault guards against duplicate snippet ID', () => {
  const vault = new AerospaceOrbiterSnippetVault();
  assert.throws(() => {
    vault.addSnippet({
      id: 'ao-hohmann-transfer',
      title: 'Duplicate Transfer',
      code: 'function dup() {}'
    });
  }, /already exists/);
});

test('AerospaceOrbiterSnippetVault dynamically adds and removes snippet', () => {
  const vault = new AerospaceOrbiterSnippetVault();
  const snippet = vault.addSnippet({
    id: 'ao-bi-elliptic',
    title: 'Bi-Elliptic Transfer Orbit',
    code: 'function biElliptic() {}',
    tags: ['maneuver', 'transfer']
  });

  assert.ok(snippet);
  assert.equal(vault.getById('ao-bi-elliptic').title, 'Bi-Elliptic Transfer Orbit');
  const removed = vault.removeSnippet('ao-bi-elliptic');
  assert.equal(removed, true);
  assert.equal(vault.getById('ao-bi-elliptic'), null);
});
