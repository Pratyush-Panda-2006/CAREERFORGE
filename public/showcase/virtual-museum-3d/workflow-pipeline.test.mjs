import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3DPipelineEngine } from './workflow-pipeline.js';

test('VirtualMuseum3DPipelineEngine', async (t) => {
  await t.test('should initialize with default columns and curatorial task cards', () => {
    const pipeline = new VirtualMuseum3DPipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.ok(cols.backlog.tasks.length >= 2);
  });

  await t.test('should move card between workflow columns', () => {
    const pipeline = new VirtualMuseum3DPipelineEngine();
    const moved = pipeline.moveCard('MUS-101', 'backlog', 'in_progress');
    assert.equal(moved, true);

    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'MUS-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'MUS-101'));
  });

  await t.test('should enforce column WIP capacity limits', () => {
    const pipeline = new VirtualMuseum3DPipelineEngine({
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
    const pipeline = new VirtualMuseum3DPipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'Byzantine Gold Coin Reflectance Transformation Imaging (RTI)',
      desc: 'Capture multi-directional light gradient micro-relief topology',
      priority: 'high',
      assignee: 'Numismatics Expert'
    });

    assert.ok(newCard.id.startsWith('MUS-'));
    const cols = pipeline.getColumns();
    assert.ok(cols.backlog.tasks.some(t => t.id === newCard.id));

    const json = pipeline.exportPipelineJSON();
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog);
  });
});
