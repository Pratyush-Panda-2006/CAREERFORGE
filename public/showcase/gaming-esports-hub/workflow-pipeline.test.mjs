import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsPipelineEngine } from './workflow-pipeline.js';

describe('GamingEsportsPipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new GamingEsportsPipelineEngine();
  });

  it('initializes with default esports tournament columns and tasks', () => {
    const state = engine.getBoardState();
    assert.equal(state.columns.length, 4);
    assert.equal(state.totalTasks, 5);
  });

  it('moves task between stages successfully', () => {
    const res = engine.moveTask('task-e1', 'server-provisioning');
    assert.equal(res.success, true);
    assert.equal(res.task.columnId, 'server-provisioning');
  });

  it('strictly enforces WIP limits across tournament columns', () => {
    const col = engine.getColumnById('server-provisioning');
    col.wipLimit = 2; // already has task-e2 and task-e5

    const res = engine.moveTask('task-e1', 'server-provisioning');
    assert.equal(res.success, false);
    assert.ok(res.reason.includes('WIP limit reached'));
  });

  it('adds an urgent tournament ops task', () => {
    const newTask = engine.addTask({
      title: 'Soundproof Booth Acoustic Check',
      description: 'Audit player comms headsets against crowd noise isolation threshold.',
      columnId: 'tournament-scheduling',
      priority: 'high',
      assignee: 'Audio Engineer Leo'
    });

    assert.ok(newTask.id);
    assert.equal(newTask.title, 'Soundproof Booth Acoustic Check');
    assert.equal(engine.getBoardState().totalTasks, 6);
  });

  it('deletes an esports task', () => {
    const res = engine.deleteTask('task-e5');
    assert.equal(res, true);
    assert.equal(engine.getBoardState().totalTasks, 4);
    assert.equal(engine.getTaskById('task-e5'), null);
  });

  it('filters tournament tasks by priority and search keyword', () => {
    const filtered = engine.filterTasks({ priority: 'critical', query: 'Server' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'task-e2');
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
