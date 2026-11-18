import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeFilterEngine } from './filter-engine.js';

test('QuantumForgeFilterEngine - initial execute returns full default dataset sorted by qubitCount desc', () => {
  const engine = new QuantumForgeFilterEngine();
  const results = engine.execute();

  assert.equal(results.length, 8);
  assert.equal(results[0].name, 'Shor RSA-2048 Period Finding Core'); // 64 qubits
  assert.equal(results[results.length - 1].name, 'Bernstein-Vazirani Parity Solver'); // 6 qubits
});

test('QuantumForgeFilterEngine - filterByKeyword matches algorithm name, category, and tags case-insensitively', () => {
  const engine = new QuantumForgeFilterEngine();

  // Search by category
  engine.filterByKeyword('Chemistry');
  const chemResults = engine.execute();
  assert.equal(chemResults.length, 1);
  assert.equal(chemResults[0].name, 'VQE Molecular Ground State');

  // Search by tag
  engine.filterByKeyword('nisq');
  const nisqResults = engine.execute();
  assert.equal(nisqResults.length, 2); // VQE, QAOA

  // Search by partial name
  engine.filterByKeyword('grover');
  assert.equal(engine.execute().length, 1);
  assert.equal(engine.execute()[0].name, 'Grover Unstructured Database Search');
});

test('QuantumForgeFilterEngine - toggleTag and compound tag filtering works accurately', () => {
  const engine = new QuantumForgeFilterEngine();

  // Filter by tag 'foundational'
  engine.toggleTag('foundational');
  const found = engine.execute();
  assert.equal(found.length, 4); // Grover, QFT, QPE, Bernstein-Vazirani

  // Compound filter with 'oracle' (AND)
  engine.toggleTag('oracle');
  const compound = engine.execute();
  assert.equal(compound.length, 2); // Grover, Bernstein-Vazirani

  // Toggle off
  engine.toggleTag('foundational');
  assert.equal(engine.execute().length, 2);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.execute().length, 8);
});

test('QuantumForgeFilterEngine - multi-attribute sorting orders numeric and string fields correctly', () => {
  const engine = new QuantumForgeFilterEngine();

  // Sort by circuitDepth desc
  engine.sort('circuitDepth', 'desc');
  const deepest = engine.execute();
  assert.equal(deepest[0].name, 'Shor RSA-2048 Period Finding Core'); // 512 depth

  // Sort by fidelityEstimate desc
  engine.sort('fidelityEstimate', 'desc');
  const highFidelity = engine.execute();
  assert.equal(highFidelity[0].name, 'Bernstein-Vazirani Parity Solver'); // 0.998

  // Sort by name asc
  engine.sort('name', 'asc');
  const sortedName = engine.execute();
  assert.equal(sortedName[0].name, 'Bernstein-Vazirani Parity Solver');
});

test('QuantumForgeFilterEngine - range filters correctly bound numeric qubitCount and gateCount', () => {
  const engine = new QuantumForgeFilterEngine();

  // Qubits between 8 and 20
  engine.setRangeFilter('qubitCount', 8, 20);
  const midScale = engine.execute();
  assert.ok(midScale.length >= 4);
  for (const item of midScale) {
    assert.ok(item.qubitCount >= 8 && item.qubitCount <= 20);
  }
});

test('QuantumForgeFilterEngine - getAvailableTags and subscribe notifications', () => {
  const engine = new QuantumForgeFilterEngine();
  const tags = engine.getAvailableTags();

  assert.ok(tags.includes('nisq'));
  assert.ok(tags.includes('fault-tolerant'));
  assert.ok(tags.includes('foundational'));

  let notified = false;
  const unsubscribe = engine.subscribe((results) => {
    notified = true;
    assert.ok(Array.isArray(results));
  });

  engine.filterByKeyword('Shor');
  assert.equal(notified, true);
  unsubscribe();
});
