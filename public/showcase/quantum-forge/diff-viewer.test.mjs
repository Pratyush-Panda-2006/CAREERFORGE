import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeDiffInspector } from './diff-viewer.js';

test('QuantumForgeDiffInspector detects zero changes identically', () => {
  const code = 'qubit[2] q;\nh q[0];\ncx q[0], q[1];';
  const inspector = new QuantumForgeDiffInspector(code, code);

  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 3);
  assert.equal(metrics.changePercentage, 0);
});

test('QuantumForgeDiffInspector detects pure additions and deletions', () => {
  const orig = 'h q[0];\ncx q[0], q[1];';
  const mod = 'h q[0];\nrz(pi/2) q[0];\ncx q[0], q[1];\nmeasure q;';

  const inspector = new QuantumForgeDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.additions, 2);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 2);

  const unified = inspector.generateUnifiedView();
  const addedLines = unified.filter(l => l.type === 'added');
  assert.equal(addedLines.length, 2);
  assert.equal(addedLines[0].content, 'rz(pi/2) q[0];');
  assert.equal(addedLines[1].content, 'measure q;');
});

test('QuantumForgeDiffInspector detects complete replacement', () => {
  const orig = 'gate_A();';
  const mod = 'gate_B();';

  const inspector = new QuantumForgeDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 1);
  assert.equal(metrics.additions, 1);
  assert.equal(metrics.unchanged, 0);
  assert.equal(metrics.changePercentage, 100);
});

test('QuantumForgeDiffInspector handles empty inputs gracefully', () => {
  const inspector = new QuantumForgeDiffInspector('', '');
  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
});
