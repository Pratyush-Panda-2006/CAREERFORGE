import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyPipelineEngine } from './workflow-pipeline.js';

test('EdtechAcademyPipelineEngine - initializes default columns and tasks', () => {
  const engine = new EdtechAcademyPipelineEngine();
  const columns = engine.getColumns();
  const tasks = engine.getTasks();

  assert.equal(columns.length, 4);
  assert.equal(tasks.length, 4);
  assert.ok(columns.some(c => c.id === 'course-authoring'));
  assert.ok(columns.some(c => c.id === 'peer-review'));
});

test('EdtechAcademyPipelineEngine - moves task between stages', () => {
  const engine = new EdtechAcademyPipelineEngine();
  const tasks = engine.getTasks('course-authoring');
  assert.ok(tasks.length > 0);

  const taskId = tasks[0].id;
  const moveRes = engine.moveTask(taskId, 'peer-review');

  assert.equal(moveRes.success, true);
  assert.equal(moveRes.task.columnId, 'peer-review');
  assert.ok(engine.getTasks('peer-review').some(t => t.id === taskId));
});

test('EdtechAcademyPipelineEngine - enforces WIP limits', () => {
  const engine = new EdtechAcademyPipelineEngine({
    columns: [
      { id: 'stage-1', title: 'Authoring', wipLimit: 1 },
      { id: 'stage-2', title: 'Review', wipLimit: 1 }
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

test('EdtechAcademyPipelineEngine - adds and deletes tasks', () => {
  const engine = new EdtechAcademyPipelineEngine();
  const initialCount = engine.getTasks().length;

  const added = engine.addTask({
    title: 'Rust Concurrency Sandbox Exercise',
    description: 'Add thread safety unit tests and autograder scripts',
    columnId: 'published-live',
    priority: 'high'
  });

  assert.ok(added.id);
  assert.equal(engine.getTasks().length, initialCount + 1);

  const deleted = engine.deleteTask(added.id);
  assert.equal(deleted, true);
  assert.equal(engine.getTasks().length, initialCount);
});
