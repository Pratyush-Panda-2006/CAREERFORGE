import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelPipelineEngine } from './workflow-pipeline.js';

test('CybersecuritySentinelPipelineEngine initializes SOC lifecycle stages', () => {
  const engine = new CybersecuritySentinelPipelineEngine();
  const cols = engine.getColumns();

  assert.equal(cols.length, 4);
  assert.equal(cols[0].id, 'triage');
  assert.equal(cols[1].id, 'analysis');
  assert.equal(cols[2].id, 'containment');
  assert.equal(cols[3].id, 'eradication');

  const containmentCol = engine.getColumn('containment');
  assert.ok(containmentCol.cards.length >= 1);
});

test('CybersecuritySentinelPipelineEngine moves incident cards across columns', () => {
  const engine = new CybersecuritySentinelPipelineEngine();
  const found = engine.findCard('cs-task-1');
  assert.ok(found);
  assert.equal(found.columnId, 'triage');

  const moved = engine.moveCard('cs-task-1', 'triage', 'analysis');
  assert.equal(moved, true);

  const updated = engine.findCard('cs-task-1');
  assert.equal(updated.columnId, 'analysis');
});

test('CybersecuritySentinelPipelineEngine enforces WIP limits strictly', () => {
  const engine = new CybersecuritySentinelPipelineEngine({
    columns: [
      { id: 'containment-stage', title: 'Containment Zone', wipLimit: 2, cards: [] }
    ]
  });

  engine.addCard('containment-stage', { id: 'c1', title: 'Incident 1' });
  engine.addCard('containment-stage', { id: 'c2', title: 'Incident 2' });

  assert.equal(engine.checkWipLimit('containment-stage'), true);
  assert.throws(() => {
    engine.addCard('containment-stage', { id: 'c3', title: 'Incident 3' });
  }, /WIP limit of 2 reached/);
});

test('CybersecuritySentinelPipelineEngine exports and restores JSON format correctly', () => {
  const engine = new CybersecuritySentinelPipelineEngine();
  const json = engine.exportPipelineJSON();
  assert.ok(typeof json === 'string');

  const newEngine = new CybersecuritySentinelPipelineEngine({ columns: [] });
  newEngine.importPipelineJSON(json);

  assert.equal(newEngine.getColumns().length, 4);
  assert.ok(newEngine.findCard('cs-task-1'));
});

test('CybersecuritySentinelPipelineEngine removes incident card by id', () => {
  const engine = new CybersecuritySentinelPipelineEngine();
  const removed = engine.removeCard('cs-task-2');
  assert.ok(removed);
  assert.equal(removed.id, 'cs-task-2');
  assert.equal(engine.findCard('cs-task-2'), null);
});
