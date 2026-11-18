import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProPipelineEngine } from './workflow-pipeline.js';

test('CryptoExchangeProPipelineEngine initializes trading lifecycle columns', () => {
  const engine = new CryptoExchangeProPipelineEngine();
  const cols = engine.getColumns();

  assert.equal(cols.length, 4);
  assert.equal(cols[0].id, 'alpha-research');
  assert.equal(cols[1].id, 'risk-review');
  assert.equal(cols[2].id, 'paper-trading');
  assert.equal(cols[3].id, 'live-production');

  const live = engine.getColumn('live-production');
  assert.ok(live.cards.length >= 1);
});

test('CryptoExchangeProPipelineEngine moves strategy cards across columns', () => {
  const engine = new CryptoExchangeProPipelineEngine();
  const found = engine.findCard('cep-task-1');
  assert.ok(found);
  assert.equal(found.columnId, 'alpha-research');

  const moved = engine.moveCard('cep-task-1', 'alpha-research', 'risk-review');
  assert.equal(moved, true);

  const updated = engine.findCard('cep-task-1');
  assert.equal(updated.columnId, 'risk-review');
});

test('CryptoExchangeProPipelineEngine enforces WIP limits strictly', () => {
  const engine = new CryptoExchangeProPipelineEngine({
    columns: [
      { id: 'vault-stage', title: 'Vault Review', wipLimit: 2, cards: [] }
    ]
  });

  engine.addCard('vault-stage', { id: 's1', title: 'Strategy 1' });
  engine.addCard('vault-stage', { id: 's2', title: 'Strategy 2' });

  assert.equal(engine.checkWipLimit('vault-stage'), true);
  assert.throws(() => {
    engine.addCard('vault-stage', { id: 's3', title: 'Strategy 3' });
  }, /WIP limit of 2 reached/);
});

test('CryptoExchangeProPipelineEngine serializes and restores JSON correctly', () => {
  const engine = new CryptoExchangeProPipelineEngine();
  const json = engine.exportPipelineJSON();
  assert.ok(typeof json === 'string');

  const newEngine = new CryptoExchangeProPipelineEngine({ columns: [] });
  newEngine.importPipelineJSON(json);

  assert.equal(newEngine.getColumns().length, 4);
  assert.ok(newEngine.findCard('cep-task-1'));
});

test('CryptoExchangeProPipelineEngine deletes strategy card by id', () => {
  const engine = new CryptoExchangeProPipelineEngine();
  const removed = engine.removeCard('cep-task-2');
  assert.ok(removed);
  assert.equal(removed.id, 'cep-task-2');
  assert.equal(engine.findCard('cep-task-2'), null);
});
