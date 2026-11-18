import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioPipelineEngine } from './workflow-pipeline.js';

test('AiVoiceStudioPipelineEngine - initializes default columns and tasks', () => {
  const engine = new AiVoiceStudioPipelineEngine();
  const columns = engine.getColumns();
  const tasks = engine.getTasks();

  assert.equal(columns.length, 4);
  assert.equal(tasks.length, 4);
  assert.ok(columns.some(c => c.id === 'script-drafting'));
  assert.ok(columns.some(c => c.id === 'neural-synthesis'));
});

test('AiVoiceStudioPipelineEngine - moves task between columns', () => {
  const engine = new AiVoiceStudioPipelineEngine();
  const tasks = engine.getTasks('script-drafting');
  assert.ok(tasks.length > 0);

  const taskId = tasks[0].id;
  const moveRes = engine.moveTask(taskId, 'neural-synthesis');

  assert.equal(moveRes.success, true);
  assert.equal(moveRes.task.columnId, 'neural-synthesis');
  assert.ok(engine.getTasks('neural-synthesis').some(t => t.id === taskId));
});

test('AiVoiceStudioPipelineEngine - enforces WIP limits', () => {
  const engine = new AiVoiceStudioPipelineEngine({
    columns: [
      { id: 'col-1', title: 'Col 1', wipLimit: 1 },
      { id: 'col-2', title: 'Col 2', wipLimit: 1 }
    ],
    tasks: [
      { id: 't1', title: 'Task 1', columnId: 'col-1' },
      { id: 't2', title: 'Task 2', columnId: 'col-2' }
    ]
  });

  // Moving t1 to col-2 should fail because col-2 already has 1 task (wipLimit: 1)
  const result = engine.moveTask('t1', 'col-2');
  assert.equal(result.success, false);
  assert.ok(result.reason.includes('WIP limit'));
});

test('AiVoiceStudioPipelineEngine - adds and deletes tasks', () => {
  const engine = new AiVoiceStudioPipelineEngine();
  const initialCount = engine.getTasks().length;

  const added = engine.addTask({
    title: 'New Spatial Audio Render',
    description: 'Render Ambisonic B-format',
    columnId: 'final-export',
    priority: 'high'
  });

  assert.ok(added.id);
  assert.equal(engine.getTasks().length, initialCount + 1);

  const deleted = engine.deleteTask(added.id);
  assert.equal(deleted, true);
  assert.equal(engine.getTasks().length, initialCount);
});
