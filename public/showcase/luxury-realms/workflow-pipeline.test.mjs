import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsPipelineEngine } from './workflow-pipeline.js';

test('LuxuryRealmsPipelineEngine initializes trophy deal stages', () => {
  const engine = new LuxuryRealmsPipelineEngine();
  const cols = engine.getColumns();

  assert.equal(cols.length, 4);
  assert.equal(cols[0].id, 'prospecting');
  assert.equal(cols[1].id, 'due-diligence');
  assert.equal(cols[2].id, 'escrow');
  assert.equal(cols[3].id, 'concierge-onboarding');

  const escrowCol = engine.getColumn('escrow');
  assert.ok(escrowCol.cards.length >= 1);
});

test('LuxuryRealmsPipelineEngine moves deal cards between stages', () => {
  const engine = new LuxuryRealmsPipelineEngine();
  const found = engine.findCard('lr-task-1');
  assert.ok(found);
  assert.equal(found.columnId, 'prospecting');

  const moved = engine.moveCard('lr-task-1', 'prospecting', 'due-diligence');
  assert.equal(moved, true);

  const updated = engine.findCard('lr-task-1');
  assert.equal(updated.columnId, 'due-diligence');
});

test('LuxuryRealmsPipelineEngine enforces WIP limits strictly', () => {
  const engine = new LuxuryRealmsPipelineEngine({
    columns: [
      { id: 'notary-stage', title: 'Notary Queue', wipLimit: 2, cards: [] }
    ]
  });

  engine.addCard('notary-stage', { id: 'd1', title: 'Deal 1' });
  engine.addCard('notary-stage', { id: 'd2', title: 'Deal 2' });

  assert.equal(engine.checkWipLimit('notary-stage'), true);
  assert.throws(() => {
    engine.addCard('notary-stage', { id: 'd3', title: 'Deal 3' });
  }, /WIP limit of 2 reached/);
});

test('LuxuryRealmsPipelineEngine serializes and restores JSON correctly', () => {
  const engine = new LuxuryRealmsPipelineEngine();
  const json = engine.exportPipelineJSON();
  assert.ok(typeof json === 'string');

  const newEngine = new LuxuryRealmsPipelineEngine({ columns: [] });
  newEngine.importPipelineJSON(json);

  assert.equal(newEngine.getColumns().length, 4);
  assert.ok(newEngine.findCard('lr-task-1'));
});

test('LuxuryRealmsPipelineEngine removes deal card by id', () => {
  const engine = new LuxuryRealmsPipelineEngine();
  const removed = engine.removeCard('lr-task-2');
  assert.ok(removed);
  assert.equal(removed.id, 'lr-task-2');
  assert.equal(engine.findCard('lr-task-2'), null);
});
