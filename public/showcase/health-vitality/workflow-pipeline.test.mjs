import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityPipelineEngine } from './workflow-pipeline.js';

describe('HealthVitalityPipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new HealthVitalityPipelineEngine();
  });

  it('initializes with default clinical columns and tasks', () => {
    const state = engine.getBoardState();
    assert.equal(state.columns.length, 4);
    assert.equal(state.totalTasks, 5);
  });

  it('moves task successfully between columns', () => {
    const res = engine.moveTask('task-h1', 'biomarker-screening');
    assert.equal(res.success, true);
    assert.equal(res.task.columnId, 'biomarker-screening');
  });

  it('enforces WIP limits when moving tasks', () => {
    const targetCol = engine.getColumnById('biomarker-screening');
    targetCol.wipLimit = 1;

    // Col already has task-h2 (1 task)
    const res = engine.moveTask('task-h1', 'biomarker-screening');
    assert.equal(res.success, false);
    assert.ok(res.reason.includes('WIP limit reached'));
  });

  it('adds a new clinical task with default priority', () => {
    const newTask = engine.addTask({
      title: 'DEXA Body Composition Scan',
      description: 'Quantify visceral adipose tissue and bone mineral density.',
      columnId: 'intake-assessment',
      priority: 'high',
      assignee: 'Radiology Center'
    });

    assert.ok(newTask.id);
    assert.equal(newTask.title, 'DEXA Body Composition Scan');
    assert.equal(engine.getBoardState().totalTasks, 6);
  });

  it('deletes an existing task', () => {
    const deleted = engine.deleteTask('task-h5');
    assert.equal(deleted, true);
    assert.equal(engine.getBoardState().totalTasks, 4);
    assert.equal(engine.getTaskById('task-h5'), null);
  });

  it('filters tasks by priority and search keyword', () => {
    const filtered = engine.filterTasks({ priority: 'critical', query: 'Lipid' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'task-h2');
  });

  it('notifies subscribers on pipeline mutations', () => {
    let notified = false;
    const unsub = engine.subscribe(() => {
      notified = true;
    });

    engine.addTask({ title: 'Subscriber Notification Event' });
    assert.equal(notified, true);
    unsub();
  });
});
