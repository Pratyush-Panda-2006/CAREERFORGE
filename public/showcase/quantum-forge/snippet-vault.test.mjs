import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeSnippetVault } from './snippet-vault.js';

test('QuantumForgeSnippetVault initializes with core quantum presets', () => {
  const vault = new QuantumForgeSnippetVault();
  const all = vault.getAll();
  assert.ok(all.length >= 4);

  const bellState = vault.getById('qf-bell-state');
  assert.ok(bellState);
  assert.equal(bellState.title, 'Bell State Entanglement (|Φ+⟩)');
  assert.ok(bellState.tags.includes('entanglement'));
});

test('QuantumForgeSnippetVault filters by tag accurately', () => {
  const vault = new QuantumForgeSnippetVault();
  const algorithms = vault.filterByTag('algorithms');
  assert.ok(algorithms.length >= 2);
  for (const item of algorithms) {
    assert.ok(item.tags.includes('algorithms'));
  }

  const allItems = vault.filterByTag('all');
  assert.equal(allItems.length, vault.getAll().length);
});

test('QuantumForgeSnippetVault multi-token search functions correctly', () => {
  const vault = new QuantumForgeSnippetVault();
  const results = vault.searchSnippets('grover diffusion');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'qf-grover-diffusion');

  const emptyResults = vault.searchSnippets('nonexistent_quantum_gadget_xyz');
  assert.equal(emptyResults.length, 0);
});

test('QuantumForgeSnippetVault rejects duplicate IDs on addSnippet', () => {
  const vault = new QuantumForgeSnippetVault();
  assert.throws(() => {
    vault.addSnippet({
      id: 'qf-bell-state',
      title: 'Duplicate Bell State',
      code: 'h q[0];'
    });
  }, /already exists/);
});

test('QuantumForgeSnippetVault adds and removes custom snippet', () => {
  const vault = new QuantumForgeSnippetVault();
  const custom = vault.addSnippet({
    id: 'qf-deutsch-jozsa',
    title: 'Deutsch-Jozsa Algorithm',
    code: 'h q; oracle q; h q;',
    tags: ['algorithm', 'oracle']
  });

  assert.ok(custom);
  assert.equal(vault.getById('qf-deutsch-jozsa').title, 'Deutsch-Jozsa Algorithm');
  const removed = vault.removeSnippet('qf-deutsch-jozsa');
  assert.equal(removed, true);
  assert.equal(vault.getById('qf-deutsch-jozsa'), null);
});
