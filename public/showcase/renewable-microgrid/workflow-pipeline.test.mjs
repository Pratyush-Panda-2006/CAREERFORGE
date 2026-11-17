import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridPipelineEngine } from './workflow-pipeline.js';

test('RenewableMicrogridPipelineEngine', async (t) => {
  await t.test('should initialize with default columns and grid task cards', () => {
    const pipeline = new RenewableMicrogridPipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.ok(cols.backlog.tasks.length >= 2);
  });

  await t.test('should move card between workflow columns', () => {
    const pipeline = new RenewableMicrogridPipelineEngine();
    const moved = pipeline.moveCard('GRID-101', 'backlog', 'in_progress');
    assert.equal(moved, true);

    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'GRID-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'GRID-101'));
  });

  await t.test('should enforce column WIP capacity limits', () => {
    const pipeline = new RenewableMicrogridPipelineEngine({
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
    const pipeline = new RenewableMicrogridPipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'Synchronous Condenser Flywheel Vacuum Depressurization',
      desc: 'Verify chamber pressure < 0.01 mbar to minimize windage aerodynamic drag losses',
      priority: 'high',
      assignee: 'Mechanical Specialist'
    });

    assert.ok(newCard.id.startsWith('GRID-'));
    const cols = pipeline.getColumns();
    assert.ok(cols.backlog.tasks.some(t => t.id === newCard.id));

    const json = pipeline.exportPipelineJSON();
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog);
  });
});
