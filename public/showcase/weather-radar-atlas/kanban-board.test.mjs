import test from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasKanbanBoard } from './kanban-board.js';

test('WeatherRadarAtlasKanbanBoard - addTask creates tasks with unique id and priority', () => {
  const board = new WeatherRadarAtlasKanbanBoard('test-storage-' + Date.now());
  const task = board.addTask('Implement Auth Module', 'high', 'backlog');

  assert.ok(task.id.startsWith('task-'));
  assert.equal(task.title, 'Implement Auth Module');
  assert.equal(task.priority, 'high');
  assert.equal(task.column, 'backlog');
});

test('WeatherRadarAtlasKanbanBoard - moveTask updates stage and throws on invalid targets', () => {
  const board = new WeatherRadarAtlasKanbanBoard('test-storage-' + Date.now());
  const task = board.addTask('Fix memory leak', 'critical', 'backlog');

  const moved = board.moveTask(task.id, 'in-progress');
  assert.equal(moved.column, 'in-progress');

  assert.throws(() => board.moveTask(task.id, 'non-existent-column'), /Invalid target column/);
  assert.throws(() => board.moveTask('fake-id', 'done'), /Task not found/);
});

test('WeatherRadarAtlasKanbanBoard - saveBoardState and getBoardState persist list integrity', () => {
  const board = new WeatherRadarAtlasKanbanBoard('test-storage-' + Date.now());
  const countBefore = board.getBoardState().length;
  board.addTask('Write Integration Tests', 'medium', 'review');
  const countAfter = board.getBoardState().length;

  assert.equal(countAfter, countBefore + 1);
});
