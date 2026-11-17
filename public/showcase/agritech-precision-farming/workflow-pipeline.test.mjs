import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingPipelineEngine } from './workflow-pipeline.js';

test('AgritechPrecisionFarmingPipelineEngine - moves card between columns correctly', () => {
  const engine = new AgritechPrecisionFarmingPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('TASK-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'TASK-101');
});

test('AgritechPrecisionFarmingPipelineEngine - blocks moving card when WIP limit is reached', () => {
  const engine = new AgritechPrecisionFarmingPipelineEngine({
    columns: {
      colA: { id: 'colA', title: 'Col A', wipLimit: 5, tasks: [{ id: 'T1' }] },
      colB: { id: 'colB', title: 'Col B', wipLimit: 1, tasks: [{ id: 'T2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('colB'), true);
  assert.throws(() => {
    engine.moveCard('T1', 'colA', 'colB');
  }, /WIP limit exceeded/);
});

test('AgritechPrecisionFarmingPipelineEngine - adds new card and exports state to JSON', () => {
  const engine = new AgritechPrecisionFarmingPipelineEngine();
  const newCard = engine.addCard('backlog', {
    id: 'TASK-999',
    title: 'Satellite Calibrator',
    desc: 'Verify multispectral reflectance',
    priority: 'high',
    assignee: 'Orbital Ops'
  });

  assert.strictEqual(newCard.id, 'TASK-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'TASK-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'TASK-999'));
});

test('AgritechPrecisionFarmingPipelineEngine - removes card properly', () => {
  const engine = new AgritechPrecisionFarmingPipelineEngine();
  const removed = engine.removeCard('TASK-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'TASK-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
