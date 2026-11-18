import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgePipelineEngine } from './workflow-pipeline.js';

test('QuantumForgePipelineEngine initializes default Kanban columns and tasks', () => {
  const engine = new QuantumForgePipelineEngine();
  const cols = engine.getColumns();

  assert.equal(cols.length, 4);
  assert.equal(cols[0].id, 'formulation');
  assert.equal(cols[1].id, 'simulation');
  assert.equal(cols[2].id, 'execution');
  assert.equal(cols[3].id, 'analysis');

  const executionCol = engine.getColumn('execution');
  assert.ok(executionCol.cards.length >= 1);
});

test('QuantumForgePipelineEngine moves cards between columns successfully', () => {
  const engine = new QuantumForgePipelineEngine();
  const found = engine.findCard('qf-task-1');
  assert.ok(found);
  assert.equal(found.columnId, 'formulation');

  const success = engine.moveCard('qf-task-1', 'formulation', 'simulation');
  assert.equal(success, true);

  const moved = engine.findCard('qf-task-1');
  assert.equal(moved.columnId, 'simulation');
});

test('QuantumForgePipelineEngine enforces WIP limits strictly', () => {
  const engine = new QuantumForgePipelineEngine({
    columns: [
      { id: 'c1', title: 'Test Col', wipLimit: 2, cards: [] }
    ]
  });

  engine.addCard('c1', { id: 'k1', title: 'Task 1' });
  engine.addCard('c1', { id: 'k2', title: 'Task 2' });

  assert.equal(engine.checkWipLimit('c1'), true);
  assert.throws(() => {
    engine.addCard('c1', { id: 'k3', title: 'Task 3' });
  }, /WIP limit of 2 reached/);
});

test('QuantumForgePipelineEngine exports and imports JSON state correctly', () => {
  const engine = new QuantumForgePipelineEngine();
  const json = engine.exportPipelineJSON();
  assert.ok(typeof json === 'string');

  const newEngine = new QuantumForgePipelineEngine({ columns: [] });
  newEngine.importPipelineJSON(json);

  assert.equal(newEngine.getColumns().length, 4);
  assert.ok(newEngine.findCard('qf-task-1'));
});

test('QuantumForgePipelineEngine removes card by id', () => {
  const engine = new QuantumForgePipelineEngine();
  const removed = engine.removeCard('qf-task-2');
  assert.ok(removed);
  assert.equal(removed.id, 'qf-task-2');
  assert.equal(engine.findCard('qf-task-2'), null);
});
