import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayPipelineEngine } from './workflow-pipeline.js';

test('DroneDeliverySkywayPipelineEngine - transitions missions between columns correctly', () => {
  const engine = new DroneDeliverySkywayPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('DRN-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'DRN-101');
});

test('DroneDeliverySkywayPipelineEngine - guards against exceeding WIP limits', () => {
  const engine = new DroneDeliverySkywayPipelineEngine({
    columns: {
      colA: { id: 'colA', title: 'Col A', wipLimit: 3, tasks: [{ id: 'D1' }] },
      colB: { id: 'colB', title: 'Col B', wipLimit: 1, tasks: [{ id: 'D2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('colB'), true);
  assert.throws(() => {
    engine.moveCard('D1', 'colA', 'colB');
  }, /WIP limit exceeded/);
});

test('DroneDeliverySkywayPipelineEngine - adds card and serializes state to JSON', () => {
  const engine = new DroneDeliverySkywayPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'DRN-999',
    title: 'Surveillance Tether Calibration',
    desc: 'Verify optical zoom gimbal tracking',
    priority: 'high',
    assignee: 'Drone Flight Unit 8'
  });

  assert.strictEqual(card.id, 'DRN-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'DRN-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'DRN-999'));
});

test('DroneDeliverySkywayPipelineEngine - removes card properly', () => {
  const engine = new DroneDeliverySkywayPipelineEngine();
  const removed = engine.removeCard('DRN-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'DRN-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
