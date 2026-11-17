import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsPipelineEngine } from './workflow-pipeline.js';

test('SupplyChainLogisticsPipelineEngine', async (t) => {
  await t.test('should initialize with default columns and freight cards', () => {
    const pipeline = new SupplyChainLogisticsPipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.ok(cols.backlog.tasks.length >= 2);
  });

  await t.test('should transition card between columns', () => {
    const pipeline = new SupplyChainLogisticsPipelineEngine();
    const moved = pipeline.moveCard('LOG-101', 'backlog', 'in_progress');
    assert.equal(moved, true);

    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'LOG-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'LOG-101'));
  });

  await t.test('should enforce column WIP capacity limits', () => {
    const pipeline = new SupplyChainLogisticsPipelineEngine({
      columns: {
        colA: { id: 'colA', title: 'Col A', wipLimit: 1, tasks: [{ id: 'T-1' }, { id: 'T-2' }] },
        colB: { id: 'colB', title: 'Col B', wipLimit: 1, tasks: [{ id: 'T-3' }] }
      }
    });

    assert.throws(() => {
      pipeline.moveCard('T-1', 'colA', 'colB');
    }, /WIP limit exceeded/);
  });

  await t.test('should add card to designated column and export valid JSON', () => {
    const pipeline = new SupplyChainLogisticsPipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'Bunker Fuel Optimization Audit',
      desc: 'Verify IMO 2020 sulfur emissions compliant fuel bunkering in Rotterdam',
      priority: 'high',
      assignee: 'Bunker Officer'
    });

    assert.ok(newCard.id.startsWith('LOG-'));
    const cols = pipeline.getColumns();
    assert.ok(cols.backlog.tasks.some(t => t.id === newCard.id));

    const json = pipeline.exportPipelineJSON();
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog);
  });
});
