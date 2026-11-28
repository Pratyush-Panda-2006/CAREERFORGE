import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CybersecuritySentinelKanbanBoard } from './kanban-board.js';

const memory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('adds trimmed tasks to the backlog and rejects bad input', () => {
  const board = new CybersecuritySentinelKanbanBoard({ storage: memory() });
  assert.equal(board.addTask('  Patch  ', 'high').column, 'Backlog');
  assert.equal(board.tasks[0].title, 'Patch');
  assert.equal(board.addTask('   '), null);
  assert.equal(board.addTask('x', 'urgent'), null);
  assert.equal(board.tasks.length, 1);
});

test('moves a task and keeps it after a reload', () => {
  const storage = memory();
  const board = new CybersecuritySentinelKanbanBoard({ storage });
  const { id } = board.addTask('Audit');
  assert.equal(board.moveTask(id, 'Done'), true);
  assert.equal(board.moveTask(id, 'Archive'), false);
  assert.equal(board.moveTask('missing', 'Done'), false);
  const reloaded = new CybersecuritySentinelKanbanBoard({ storage });
  assert.equal(reloaded.tasks[0].column, 'Done');
  assert.notEqual(reloaded.addTask('Next').id, id);
});

test('an emptied board stays empty and broken data falls back to the seed', () => {
  const seed = [{ id: 'task-1', title: 'Seed', priority: 'low', column: 'Review' }];
  const empty = memory();
  empty.setItem('cybersecurity-sentinel-kanban', '[]');
  assert.deepEqual(new CybersecuritySentinelKanbanBoard({ storage: empty, seed }).tasks, []);
  const broken = memory();
  broken.setItem('cybersecurity-sentinel-kanban', '{oops');
  assert.deepEqual(new CybersecuritySentinelKanbanBoard({ storage: broken, seed }).tasks, seed);
});

test('keeps working when storage is full or unavailable', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const board = new CybersecuritySentinelKanbanBoard({ storage });
  assert.ok(board.addTask('Still works'));
  assert.equal(board.saveBoardState(), false);
  assert.equal(new CybersecuritySentinelKanbanBoard({ storage: null }).saveBoardState(), false);
});
