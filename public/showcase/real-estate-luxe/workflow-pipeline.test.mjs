import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxePipelineEngine } from './workflow-pipeline.js';

describe('RealEstateLuxePipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new RealEstateLuxePipelineEngine();
  });

  it('initializes with default luxury real estate columns and tasks', () => {
    const state = engine.getBoardState();
    assert.equal(state.columns.length, 4);
    assert.equal(state.totalTasks, 5);
  });

  it('moves estate transaction task between stages successfully', () => {
    const res = engine.moveTask('task-r1', 'buyer-verification');
    assert.equal(res.success, true);
    assert.equal(res.task.columnId, 'buyer-verification');
  });

  it('strictly enforces WIP limits across estate columns', () => {
    const col = engine.getColumnById('buyer-verification');
    col.wipLimit = 1; // already has task-r2

    const res = engine.moveTask('task-r1', 'buyer-verification');
    assert.equal(res.success, false);
    assert.ok(res.reason.includes('WIP limit reached'));
  });

  it('adds an urgent title audit task', () => {
    const newTask = engine.addTask({
      title: 'Architectural Heritage Preservation Review',
      description: 'Confirm landmark historic facade protection covenant with municipal board.',
      columnId: 'escrow-due-diligence',
      priority: 'high',
      assignee: 'Heritage Consultant'
    });

    assert.ok(newTask.id);
    assert.equal(newTask.title, 'Architectural Heritage Preservation Review');
    assert.equal(engine.getBoardState().totalTasks, 6);
  });

  it('deletes an estate workflow task', () => {
    const res = engine.deleteTask('task-r5');
    assert.equal(res, true);
    assert.equal(engine.getBoardState().totalTasks, 4);
    assert.equal(engine.getTaskById('task-r5'), null);
  });

  it('filters estate tasks by priority and search keyword', () => {
    const filtered = engine.filterTasks({ priority: 'critical', query: 'KYC' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'task-r2');
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
