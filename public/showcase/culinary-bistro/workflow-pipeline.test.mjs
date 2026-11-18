import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroPipelineEngine } from './workflow-pipeline.js';

describe('CulinaryBistroPipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new CulinaryBistroPipelineEngine();
  });

  it('initializes with default restaurant pass columns and tickets', () => {
    const state = engine.getBoardState();
    assert.equal(state.columns.length, 4);
    assert.equal(state.totalTasks, 5);
  });

  it('moves ticket between kitchen stations successfully', () => {
    const res = engine.moveTask('task-c1', 'station-prep');
    assert.equal(res.success, true);
    assert.equal(res.task.columnId, 'station-prep');
  });

  it('strictly enforces WIP limits across kitchen stations', () => {
    const col = engine.getColumnById('station-prep');
    col.wipLimit = 2; // already has task-c2 and task-c5

    const res = engine.moveTask('task-c1', 'station-prep');
    assert.equal(res.success, false);
    assert.ok(res.reason.includes('WIP limit reached'));
  });

  it('adds an urgent kitchen order ticket', () => {
    const newTask = engine.addTask({
      title: 'Table 7 Allergy Note: Gluten-Free Brioche Substitute',
      description: 'Prepare rice-flour pain de mie for Foie Gras course on sanitized cutting board.',
      columnId: 'station-prep',
      priority: 'critical',
      assignee: 'Pastry Station'
    });

    assert.ok(newTask.id);
    assert.equal(newTask.title, 'Table 7 Allergy Note: Gluten-Free Brioche Substitute');
    assert.equal(engine.getBoardState().totalTasks, 6);
  });

  it('deletes a completed kitchen ticket', () => {
    const res = engine.deleteTask('task-c4');
    assert.equal(res, true);
    assert.equal(engine.getBoardState().totalTasks, 4);
    assert.equal(engine.getTaskById('task-c4'), null);
  });

  it('filters kitchen tickets by priority and search keyword', () => {
    const filtered = engine.filterTasks({ priority: 'critical', query: 'Truffle' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'task-c2');
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
