import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactPipelineEngine } from './workflow-pipeline.js';

test('NonprofitImpactPipelineEngine - initializes default columns and tasks', () => {
  const engine = new NonprofitImpactPipelineEngine();
  const columns = engine.getColumns();
  const tasks = engine.getTasks();

  assert.equal(columns.length, 4);
  assert.equal(tasks.length, 4);
  assert.ok(columns.some(c => c.id === 'grant-application'));
  assert.ok(columns.some(c => c.id === 'due-diligence'));
});

test('NonprofitImpactPipelineEngine - moves task between stages', () => {
  const engine = new NonprofitImpactPipelineEngine();
  const tasks = engine.getTasks('grant-application');
  assert.ok(tasks.length > 0);

  const taskId = tasks[0].id;
  const moveRes = engine.moveTask(taskId, 'due-diligence');

  assert.equal(moveRes.success, true);
  assert.equal(moveRes.task.columnId, 'due-diligence');
  assert.ok(engine.getTasks('due-diligence').some(t => t.id === taskId));
});

test('NonprofitImpactPipelineEngine - enforces WIP limits', () => {
  const engine = new NonprofitImpactPipelineEngine({
    columns: [
      { id: 'stage-1', title: 'Review', wipLimit: 1 },
      { id: 'stage-2', title: 'Execution', wipLimit: 1 }
    ],
    tasks: [
      { id: 't1', title: 'Task 1', columnId: 'stage-1' },
      { id: 't2', title: 'Task 2', columnId: 'stage-2' }
    ]
  });

  const result = engine.moveTask('t1', 'stage-2');
  assert.equal(result.success, false);
  assert.ok(result.reason.includes('WIP limit'));
});

test('NonprofitImpactPipelineEngine - adds and deletes tasks', () => {
  const engine = new NonprofitImpactPipelineEngine();
  const initialCount = engine.getTasks().length;

  const added = engine.addTask({
    title: 'Solar Water Desalination Pilot',
    description: 'Pilot installation in coastal drought zone',
    columnId: 'field-execution',
    priority: 'high'
  });

  assert.ok(added.id);
  assert.equal(engine.getTasks().length, initialCount + 1);

  const deleted = engine.deleteTask(added.id);
  assert.equal(deleted, true);
  assert.equal(engine.getTasks().length, initialCount);
});
