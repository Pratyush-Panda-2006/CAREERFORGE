import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyPipelineEngine } from './workflow-pipeline.js';

test('TravelOdysseyPipelineEngine - initializes default columns and tasks', () => {
  const engine = new TravelOdysseyPipelineEngine();
  const columns = engine.getColumns();
  const tasks = engine.getTasks();

  assert.equal(columns.length, 4);
  assert.equal(tasks.length, 4);
  assert.ok(columns.some(c => c.id === 'itinerary-planning'));
  assert.ok(columns.some(c => c.id === 'booking-reservations'));
});

test('TravelOdysseyPipelineEngine - moves task between stages', () => {
  const engine = new TravelOdysseyPipelineEngine();
  const tasks = engine.getTasks('itinerary-planning');
  assert.ok(tasks.length > 0);

  const taskId = tasks[0].id;
  const moveRes = engine.moveTask(taskId, 'booking-reservations');

  assert.equal(moveRes.success, true);
  assert.equal(moveRes.task.columnId, 'booking-reservations');
  assert.ok(engine.getTasks('booking-reservations').some(t => t.id === taskId));
});

test('TravelOdysseyPipelineEngine - enforces WIP limits', () => {
  const engine = new TravelOdysseyPipelineEngine({
    columns: [
      { id: 'stage-1', title: 'Planning', wipLimit: 1 },
      { id: 'stage-2', title: 'Booking', wipLimit: 1 }
    ],
    tasks: [
      { id: 't1', title: 'Trip A', columnId: 'stage-1' },
      { id: 't2', title: 'Trip B', columnId: 'stage-2' }
    ]
  });

  const result = engine.moveTask('t1', 'stage-2');
  assert.equal(result.success, false);
  assert.ok(result.reason.includes('WIP limit'));
});

test('TravelOdysseyPipelineEngine - adds and deletes tasks', () => {
  const engine = new TravelOdysseyPipelineEngine();
  const initialCount = engine.getTasks().length;

  const added = engine.addTask({
    title: 'Galapagos Marine Sanctuary Boat Charter',
    description: 'Verify naturalist permit and eco-docking fee',
    columnId: 'itinerary-planning',
    priority: 'high'
  });

  assert.ok(added.id);
  assert.equal(engine.getTasks().length, initialCount + 1);

  const deleted = engine.deleteTask(added.id);
  assert.equal(deleted, true);
  assert.equal(engine.getTasks().length, initialCount);
});
