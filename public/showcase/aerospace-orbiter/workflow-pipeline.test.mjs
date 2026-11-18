import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterPipelineEngine } from './workflow-pipeline.js';

test('AerospaceOrbiterPipelineEngine initializes flight operation columns', () => {
  const engine = new AerospaceOrbiterPipelineEngine();
  const cols = engine.getColumns();

  assert.equal(cols.length, 4);
  assert.equal(cols[0].id, 'trajectory');
  assert.equal(cols[1].id, 'thermal');
  assert.equal(cols[2].id, 'flight-readiness');
  assert.equal(cols[3].id, 'on-orbit');

  const onOrbit = engine.getColumn('on-orbit');
  assert.ok(onOrbit.cards.length >= 1);
});

test('AerospaceOrbiterPipelineEngine moves cards between columns accurately', () => {
  const engine = new AerospaceOrbiterPipelineEngine();
  const found = engine.findCard('ao-task-1');
  assert.ok(found);
  assert.equal(found.columnId, 'trajectory');

  const moved = engine.moveCard('ao-task-1', 'trajectory', 'thermal');
  assert.equal(moved, true);

  const updated = engine.findCard('ao-task-1');
  assert.equal(updated.columnId, 'thermal');
});

test('AerospaceOrbiterPipelineEngine enforces WIP limits strictly', () => {
  const engine = new AerospaceOrbiterPipelineEngine({
    columns: [
      { id: 'docking', title: 'Docking Queue', wipLimit: 2, cards: [] }
    ]
  });

  engine.addCard('docking', { id: 'd1', title: 'Soyuz Docking' });
  engine.addCard('docking', { id: 'd2', title: 'Dragon Docking' });

  assert.equal(engine.checkWipLimit('docking'), true);
  assert.throws(() => {
    engine.addCard('docking', { id: 'd3', title: 'Starliner Docking' });
  }, /WIP limit of 2 reached/);
});

test('AerospaceOrbiterPipelineEngine serializes and restores JSON correctly', () => {
  const engine = new AerospaceOrbiterPipelineEngine();
  const json = engine.exportPipelineJSON();
  assert.ok(typeof json === 'string');

  const newEngine = new AerospaceOrbiterPipelineEngine({ columns: [] });
  newEngine.importPipelineJSON(json);

  assert.equal(newEngine.getColumns().length, 4);
  assert.ok(newEngine.findCard('ao-task-1'));
});

test('AerospaceOrbiterPipelineEngine deletes card by id', () => {
  const engine = new AerospaceOrbiterPipelineEngine();
  const removed = engine.removeCard('ao-task-2');
  assert.ok(removed);
  assert.equal(removed.id, 'ao-task-2');
  assert.equal(engine.findCard('ao-task-2'), null);
});
