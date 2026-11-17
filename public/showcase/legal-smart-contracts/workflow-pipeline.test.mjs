import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsPipelineEngine } from './workflow-pipeline.js';

test('LegalSmartContractsPipelineEngine - transitions tasks between columns correctly', () => {
  const engine = new LegalSmartContractsPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('LGL-201', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'LGL-201');
});

test('LegalSmartContractsPipelineEngine - guards against exceeding WIP limits', () => {
  const engine = new LegalSmartContractsPipelineEngine({
    columns: {
      colA: { id: 'colA', title: 'Col A', wipLimit: 3, tasks: [{ id: 'C1' }] },
      colB: { id: 'colB', title: 'Col B', wipLimit: 1, tasks: [{ id: 'C2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('colB'), true);
  assert.throws(() => {
    engine.moveCard('C1', 'colA', 'colB');
  }, /WIP limit exceeded/);
});

test('LegalSmartContractsPipelineEngine - adds card and serializes state to JSON', () => {
  const engine = new LegalSmartContractsPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'LGL-999',
    title: 'Zero-Knowledge Proof Clause',
    desc: 'Verify zkSNARK compliance proof circuit',
    priority: 'high',
    assignee: 'Cryptographer'
  });

  assert.strictEqual(card.id, 'LGL-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'LGL-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'LGL-999'));
});

test('LegalSmartContractsPipelineEngine - removes card properly', () => {
  const engine = new LegalSmartContractsPipelineEngine();
  const removed = engine.removeCard('LGL-200');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'LGL-200');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
