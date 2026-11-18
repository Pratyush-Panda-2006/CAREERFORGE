import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultPipelineEngine } from './workflow-pipeline.js';

describe('FintechVaultPipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new FintechVaultPipelineEngine();
  });

  it('initializes with default banking and payment columns and tasks', () => {
    const state = engine.getBoardState();
    assert.equal(state.columns.length, 4);
    assert.equal(state.totalTasks, 5);
  });

  it('moves wire task between stages successfully', () => {
    const res = engine.moveTask('task-f1', 'aml-compliance');
    assert.equal(res.success, true);
    assert.equal(res.task.columnId, 'aml-compliance');
  });

  it('strictly enforces WIP limits across payment columns', () => {
    const col = engine.getColumnById('aml-compliance');
    col.wipLimit = 1; // already has task-f2

    const res = engine.moveTask('task-f1', 'aml-compliance');
    assert.equal(res.success, false);
    assert.ok(res.reason.includes('WIP limit reached'));
  });

  it('adds an urgent compliance audit task', () => {
    const newTask = engine.addTask({
      title: 'Targeted SAR Filing (Suspicious Activity Report)',
      description: 'Submit regulatory FinCEN Form 111 document package for high-risk transfer.',
      columnId: 'aml-compliance',
      priority: 'critical',
      assignee: 'Chief Compliance Officer'
    });

    assert.ok(newTask.id);
    assert.equal(newTask.title, 'Targeted SAR Filing (Suspicious Activity Report)');
    assert.equal(engine.getBoardState().totalTasks, 6);
  });

  it('deletes a financial workflow task', () => {
    const res = engine.deleteTask('task-f5');
    assert.equal(res, true);
    assert.equal(engine.getBoardState().totalTasks, 4);
    assert.equal(engine.getTaskById('task-f5'), null);
  });

  it('filters payment tasks by priority and search keyword', () => {
    const filtered = engine.filterTasks({ priority: 'critical', query: 'OFAC' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'task-f2');
  });

  it('notifies subscribers upon pipeline state update', () => {
    let triggered = false;
    const unsub = engine.subscribe(() => {
      triggered = true;
    });

    engine.addTask({ title: 'Subscriber Test' });
    assert.equal(triggered, true);
    unsub();
  });
});
