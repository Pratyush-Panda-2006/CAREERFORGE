import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsKanbanBoard } from './kanban-board.js';

test('initializes with default seed tasks when empty', () => {
  const board = new LegalSmartContractsKanbanBoard('test-key-1');
  const tasks = board.getBoardState();
  assert.ok(tasks.length >= 4);
  assert.ok(tasks.some(t => t.column === 'backlog'));
  assert.ok(tasks.some(t => t.column === 'done'));
});

test('adds new tasks with priority and target column', () => {
  const board = new LegalSmartContractsKanbanBoard('test-key-2');
  board.clearBoard();

  const task = board.addTask('Audit Settlement Vault', 'high', 'review');
  assert.equal(task.title, 'Audit Settlement Vault');
  assert.equal(task.priority, 'high');
  assert.equal(task.column, 'review');

  const inReview = board.getTasksByColumn('review');
  assert.equal(inReview.length, 1);
  assert.equal(inReview[0].id, task.id);
});

test('moves tasks between columns', () => {
  const board = new LegalSmartContractsKanbanBoard('test-key-3');
  board.clearBoard();

  const task = board.addTask('Resolve Dispute Oracle', 'critical', 'backlog');
  board.moveTask(task.id, 'in-progress');

  const inProg = board.getTasksByColumn('in-progress');
  assert.equal(inProg.length, 1);
  assert.equal(inProg[0].id, task.id);

  board.moveTask(task.id, 'done');
  assert.equal(board.getTasksByColumn('in-progress').length, 0);
  assert.equal(board.getTasksByColumn('done').length, 1);
});

test('rejects empty title and invalid column moves', () => {
  const board = new LegalSmartContractsKanbanBoard('test-key-4');
  board.clearBoard();

  assert.throws(() => board.addTask(''), /Task title cannot be empty/);
  assert.throws(() => board.addTask('   '), /Task title cannot be empty/);

  const task = board.addTask('Valid Task');
  assert.throws(() => board.moveTask(task.id, 'invalid-lane'), /Invalid target column/);
  assert.throws(() => board.moveTask('non-existent-id', 'done'), /Task not found/);
});
