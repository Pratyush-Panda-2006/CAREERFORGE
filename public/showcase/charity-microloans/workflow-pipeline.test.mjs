import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansPipelineEngine } from './workflow-pipeline.js';

test('CharityMicroloansPipelineEngine - transitions loans between columns correctly', () => {
  const engine = new CharityMicroloansPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('MIC-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'MIC-101');
});

test('CharityMicroloansPipelineEngine - guards against exceeding WIP limits', () => {
  const engine = new CharityMicroloansPipelineEngine({
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

test('CharityMicroloansPipelineEngine - adds card and serializes state to JSON', () => {
  const engine = new CharityMicroloansPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'MIC-999',
    title: 'Rainwater Harvesting Tank Microloan',
    desc: 'Verify civil engineering invoice for community reservoir',
    priority: 'high',
    assignee: 'Water Engineer'
  });

  assert.strictEqual(card.id, 'MIC-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'MIC-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'MIC-999'));
});

test('CharityMicroloansPipelineEngine - removes card properly', () => {
  const engine = new CharityMicroloansPipelineEngine();
  const removed = engine.removeCard('MIC-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'MIC-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
