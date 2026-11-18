import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioPipelineEngine } from './workflow-pipeline.js';

describe('DeveloperPortfolioPipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new DeveloperPortfolioPipelineEngine();
  });

  it('initializes with default software roadmap stages and tasks', () => {
    const stages = engine.getStages();
    assert.equal(stages.length, 4);
    assert.equal(stages[0].id, 'backlog');
    assert.equal(stages[3].id, 'deployed');

    const tasks = engine.getTasks();
    assert.ok(tasks.length >= 5);
  });

  it('filters tasks by stage', () => {
    const backlogTasks = engine.getTasksByStage('backlog');
    assert.ok(backlogTasks.length >= 2);
    backlogTasks.forEach((t) => assert.equal(t.stage, 'backlog'));
  });

  it('adds a new engineering project task', () => {
    const task = engine.addTask({
      title: 'Distributed actor system in Zig',
      stage: 'backlog',
      priority: 'high',
      tech: 'Zig'
    });
    assert.ok(task.id);
    assert.equal(task.stage, 'backlog');
    assert.equal(task.tech, 'Zig');
  });

  it('enforces WIP limit when moving tasks between columns', () => {
    const testEngine = new DeveloperPortfolioPipelineEngine({
      stages: [
        { id: 's1', title: 'Stage 1', wipLimit: 2 },
        { id: 's2', title: 'Stage 2', wipLimit: 1 }
      ],
      tasks: [
        { id: 't1', title: 'Task 1', stage: 's1' },
        { id: 't2', title: 'Task 2', stage: 's2' }
      ]
    });

    assert.throws(() => {
      testEngine.moveTask('t1', 's2');
    }, /WIP limit of 1 reached/);
  });

  it('moves task successfully when target column has capacity', () => {
    const moved = engine.moveTask('DEV-101', 'code-review');
    assert.equal(moved.stage, 'code-review');

    assert.throws(() => {
      engine.moveTask('DEV-999', 'code-review');
    }, /Task DEV-999 not found/);
  });

  it('deletes an engineering task by id', () => {
    const initialLen = engine.getTasks().length;
    const deleted = engine.deleteTask('DEV-104');
    assert.equal(deleted, true);
    assert.equal(engine.getTasks().length, initialLen - 1);
    assert.equal(engine.deleteTask('invalid-id'), false);
  });

  it('computes correct pipeline metrics', () => {
    const metrics = engine.getMetrics();
    assert.ok(metrics.totalTasks >= 5);
    assert.equal(typeof metrics.deployedCount, 'number');
    assert.equal(typeof metrics.inFlightCount, 'number');
    assert.equal(metrics.totalTasks, metrics.deployedCount + metrics.inFlightCount);
  });
});
