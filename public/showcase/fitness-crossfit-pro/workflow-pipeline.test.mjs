import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProPipelineEngine } from './workflow-pipeline.js';

test('FitnessCrossfitProPipelineEngine - transitions training sessions between columns correctly', () => {
  const engine = new FitnessCrossfitProPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('FIT-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'FIT-101');
});

test('FitnessCrossfitProPipelineEngine - guards against exceeding WIP limits', () => {
  const engine = new FitnessCrossfitProPipelineEngine({
    columns: {
      colA: { id: 'colA', title: 'Col A', wipLimit: 3, tasks: [{ id: 'F1' }] },
      colB: { id: 'colB', title: 'Col B', wipLimit: 1, tasks: [{ id: 'F2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('colB'), true);
  assert.throws(() => {
    engine.moveCard('F1', 'colA', 'colB');
  }, /WIP limit exceeded/);
});

test('FitnessCrossfitProPipelineEngine - adds card and serializes state to JSON', () => {
  const engine = new FitnessCrossfitProPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'FIT-999',
    title: 'GHD Sit-Up Core Stamina Test',
    desc: 'Verify hyperextension control and quad engagement',
    priority: 'high',
    assignee: 'Gymnastics Coach'
  });

  assert.strictEqual(card.id, 'FIT-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'FIT-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'FIT-999'));
});

test('FitnessCrossfitProPipelineEngine - removes card properly', () => {
  const engine = new FitnessCrossfitProPipelineEngine();
  const removed = engine.removeCard('FIT-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'FIT-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
