import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EcommercePipelineEngine } from './workflow-pipeline.js';

describe('EcommercePipelineEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new EcommercePipelineEngine();
  });

  it('initializes with default fulfillment stages and orders', () => {
    const stages = engine.getStages();
    assert.equal(stages.length, 4);
    assert.equal(stages[0].id, 'order-placed');
    assert.equal(stages[3].id, 'delivered');

    const orders = engine.getTasks();
    assert.ok(orders.length >= 5);
  });

  it('filters orders by stage', () => {
    const placed = engine.getTasksByStage('order-placed');
    assert.ok(placed.length >= 2);
    placed.forEach((o) => assert.equal(o.stage, 'order-placed'));
  });

  it('adds a new fulfillment order with WIP limit enforcement', () => {
    const order = engine.addTask({
      title: 'Smart Home Hub Controller',
      stage: 'order-placed',
      priority: 'high',
      courier: 'FedEx Express',
      value: '$129.00'
    });
    assert.ok(order.id);
    assert.equal(order.stage, 'order-placed');
  });

  it('throws an error when moving into a stage that reached WIP limit', () => {
    const testEngine = new EcommercePipelineEngine({
      stages: [
        { id: 'c1', title: 'Cart', wipLimit: 2 },
        { id: 'c2', title: 'Pack', wipLimit: 1 }
      ],
      tasks: [
        { id: 'o1', title: 'Item 1', stage: 'c1' },
        { id: 'o2', title: 'Item 2', stage: 'c2' }
      ]
    });

    assert.throws(() => {
      testEngine.moveTask('o1', 'c2');
    }, /WIP limit of 1 reached/);
  });

  it('moves orders successfully between stages', () => {
    const moved = engine.moveTask('ORD-8801', 'picking-packing');
    assert.equal(moved.stage, 'picking-packing');

    assert.throws(() => {
      engine.moveTask('ORD-9999', 'picking-packing');
    }, /Task ORD-9999 not found/);
  });

  it('deletes an order by id', () => {
    const initialLen = engine.getTasks().length;
    const deleted = engine.deleteTask('ORD-8804');
    assert.equal(deleted, true);
    assert.equal(engine.getTasks().length, initialLen - 1);
    assert.equal(engine.deleteTask('non-existent'), false);
  });

  it('computes correct fulfillment metrics', () => {
    const metrics = engine.getMetrics();
    assert.ok(metrics.totalTasks >= 5);
    assert.equal(typeof metrics.deliveredCount, 'number');
    assert.equal(typeof metrics.inFulfillmentCount, 'number');
    assert.equal(metrics.totalTasks, metrics.deliveredCount + metrics.inFulfillmentCount);
  });
});
