import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarPipelineEngine } from './workflow-pipeline.js';

test('AutomotiveHypercarPipelineEngine - initializes default columns and tasks', () => {
  const engine = new AutomotiveHypercarPipelineEngine();
  const columns = engine.getColumns();
  const tasks = engine.getTasks();

  assert.equal(columns.length, 4);
  assert.equal(tasks.length, 4);
  assert.ok(columns.some(c => c.id === 'cfd-aerodynamics'));
  assert.ok(columns.some(c => c.id === 'dyno-powertrain'));
});

test('AutomotiveHypercarPipelineEngine - moves task between stages', () => {
  const engine = new AutomotiveHypercarPipelineEngine();
  const tasks = engine.getTasks('cfd-aerodynamics');
  assert.ok(tasks.length > 0);

  const taskId = tasks[0].id;
  const moveRes = engine.moveTask(taskId, 'dyno-powertrain');

  assert.equal(moveRes.success, true);
  assert.equal(moveRes.task.columnId, 'dyno-powertrain');
  assert.ok(engine.getTasks('dyno-powertrain').some(t => t.id === taskId));
});

test('AutomotiveHypercarPipelineEngine - enforces WIP limits', () => {
  const engine = new AutomotiveHypercarPipelineEngine({
    columns: [
      { id: 'col-a', title: 'Aero', wipLimit: 1 },
      { id: 'col-b', title: 'Dyno', wipLimit: 1 }
    ],
    tasks: [
      { id: 'h1', title: 'Task A', columnId: 'col-a' },
      { id: 'h2', title: 'Task B', columnId: 'col-b' }
    ]
  });

  const result = engine.moveTask('h1', 'col-b');
  assert.equal(result.success, false);
  assert.ok(result.reason.includes('WIP limit'));
});

test('AutomotiveHypercarPipelineEngine - adds and deletes tasks', () => {
  const engine = new AutomotiveHypercarPipelineEngine();
  const initialCount = engine.getTasks().length;

  const added = engine.addTask({
    title: 'Monaco Active Aero Flap Test',
    description: 'High downforce low speed hairpin configuration',
    columnId: 'track-shakedown',
    priority: 'high'
  });

  assert.ok(added.id);
  assert.equal(engine.getTasks().length, initialCount + 1);

  const deleted = engine.deleteTask(added.id);
  assert.equal(deleted, true);
  assert.equal(engine.getTasks().length, initialCount);
});
