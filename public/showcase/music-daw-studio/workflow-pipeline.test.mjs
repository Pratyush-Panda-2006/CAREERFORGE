import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioPipelineEngine } from './workflow-pipeline.js';

test('MusicDawStudioPipelineEngine - transitions tasks between columns correctly', () => {
  const engine = new MusicDawStudioPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('DAW-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'DAW-101');
});

test('MusicDawStudioPipelineEngine - guards against exceeding WIP limits', () => {
  const engine = new MusicDawStudioPipelineEngine({
    columns: {
      colA: { id: 'colA', title: 'Col A', wipLimit: 3, tasks: [{ id: 'M1' }] },
      colB: { id: 'colB', title: 'Col B', wipLimit: 1, tasks: [{ id: 'M2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('colB'), true);
  assert.throws(() => {
    engine.moveCard('M1', 'colA', 'colB');
  }, /WIP limit exceeded/);
});

test('MusicDawStudioPipelineEngine - adds card and serializes state to JSON', () => {
  const engine = new MusicDawStudioPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'DAW-999',
    title: 'Analog Summer Calibration',
    desc: 'Align Neve summing box gain staging',
    priority: 'high',
    assignee: 'Hardware Tech'
  });

  assert.strictEqual(card.id, 'DAW-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'DAW-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'DAW-999'));
});

test('MusicDawStudioPipelineEngine - removes card properly', () => {
  const engine = new MusicDawStudioPipelineEngine();
  const removed = engine.removeCard('DAW-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'DAW-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
