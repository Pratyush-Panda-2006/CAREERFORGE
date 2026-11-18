import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamPipelineEngine } from './workflow-pipeline.js';

test('PodcastAudioStreamPipelineEngine - initializes default columns and tasks', () => {
  const engine = new PodcastAudioStreamPipelineEngine();
  const columns = engine.getColumns();
  const tasks = engine.getTasks();

  assert.equal(columns.length, 4);
  assert.equal(tasks.length, 4);
  assert.ok(columns.some(c => c.id === 'recording-prep'));
  assert.ok(columns.some(c => c.id === 'editing-mastering'));
});

test('PodcastAudioStreamPipelineEngine - moves task between stages', () => {
  const engine = new PodcastAudioStreamPipelineEngine();
  const tasks = engine.getTasks('recording-prep');
  assert.ok(tasks.length > 0);

  const taskId = tasks[0].id;
  const moveRes = engine.moveTask(taskId, 'editing-mastering');

  assert.equal(moveRes.success, true);
  assert.equal(moveRes.task.columnId, 'editing-mastering');
  assert.ok(engine.getTasks('editing-mastering').some(t => t.id === taskId));
});

test('PodcastAudioStreamPipelineEngine - enforces WIP limits', () => {
  const engine = new PodcastAudioStreamPipelineEngine({
    columns: [
      { id: 'stage-1', title: 'Prep', wipLimit: 1 },
      { id: 'stage-2', title: 'Master', wipLimit: 1 }
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

test('PodcastAudioStreamPipelineEngine - adds and deletes tasks', () => {
  const engine = new PodcastAudioStreamPipelineEngine();
  const initialCount = engine.getTasks().length;

  const added = engine.addTask({
    title: 'Dynamic Mid-Roll Ad Insertion Check',
    description: 'Verify SCTE-35 frame timestamp alignment',
    columnId: 'rss-cdn-syndication',
    priority: 'high'
  });

  assert.ok(added.id);
  assert.equal(engine.getTasks().length, initialCount + 1);

  const deleted = engine.deleteTask(added.id);
  assert.equal(deleted, true);
  assert.equal(engine.getTasks().length, initialCount);
});
