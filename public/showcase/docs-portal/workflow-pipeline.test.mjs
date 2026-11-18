import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalPipelineEngine } from './workflow-pipeline.js';

describe('DocsPortalPipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new DocsPortalPipelineEngine();
  });

  it('initializes with default stages and API lifecycle tasks', () => {
    const stages = engine.getStages();
    assert.equal(stages.length, 4);
    assert.equal(stages[0].id, 'draft-proposal');
    assert.equal(stages[3].id, 'published');

    const tasks = engine.getTasks();
    assert.ok(tasks.length >= 5);
  });

  it('filters tasks by stage', () => {
    const drafts = engine.getTasksByStage('draft-proposal');
    assert.ok(drafts.length >= 2);
    drafts.forEach((t) => assert.equal(t.stage, 'draft-proposal'));
  });

  it('adds a new documentation task with WIP limit enforcement', () => {
    const newTask = engine.addTask({
      title: 'gRPC streaming protobuf spec docs',
      stage: 'draft-proposal',
      priority: 'high',
      specType: 'gRPC'
    });
    assert.ok(newTask.id);
    assert.equal(newTask.stage, 'draft-proposal');
  });

  it('throws an error when exceeding WIP limit during addition', () => {
    const testEngine = new DocsPortalPipelineEngine({
      stages: [{ id: 'col1', title: 'Column 1', wipLimit: 1 }],
      tasks: [{ id: 'T1', title: 'Task 1', stage: 'col1' }]
    });

    assert.throws(() => {
      testEngine.addTask({ title: 'Task 2', stage: 'col1' });
    }, /WIP limit of 1 reached/);
  });

  it('moves task between stages respecting target WIP limit', () => {
    const moved = engine.moveTask('DOC-201', 'schema-review');
    assert.equal(moved.stage, 'schema-review');

    assert.throws(() => {
      engine.moveTask('DOC-999', 'schema-review');
    }, /Task DOC-999 not found/);
  });

  it('deletes a task by id', () => {
    const initialLen = engine.getTasks().length;
    const deleted = engine.deleteTask('DOC-204');
    assert.equal(deleted, true);
    assert.equal(engine.getTasks().length, initialLen - 1);
    assert.equal(engine.deleteTask('non-existent'), false);
  });

  it('computes correct pipeline metrics', () => {
    const metrics = engine.getMetrics();
    assert.ok(metrics.totalTasks >= 5);
    assert.equal(typeof metrics.publishedCount, 'number');
    assert.equal(typeof metrics.inFlightCount, 'number');
    assert.equal(metrics.totalTasks, metrics.publishedCount + metrics.inFlightCount);
  });
});
