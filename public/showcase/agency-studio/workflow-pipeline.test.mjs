import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioPipelineEngine } from './workflow-pipeline.js';

test('AgencyStudioPipelineEngine - transitions tasks between columns correctly', () => {
  const engine = new AgencyStudioPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('AGN-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'AGN-101');
});

test('AgencyStudioPipelineEngine - guards against exceeding WIP limits', () => {
  const engine = new AgencyStudioPipelineEngine({
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

test('AgencyStudioPipelineEngine - adds card and serializes state to JSON', () => {
  const engine = new AgencyStudioPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'AGN-999',
    title: 'AR Augmented Reality Mirror App',
    desc: 'Validate WebXR anchors and real-time mesh face occlusion',
    priority: 'high',
    assignee: 'XR Specialist'
  });

  assert.strictEqual(card.id, 'AGN-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'AGN-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'AGN-999'));
});

test('AgencyStudioPipelineEngine - removes card properly', () => {
  const engine = new AgencyStudioPipelineEngine();
  const removed = engine.removeCard('AGN-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'AGN-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
