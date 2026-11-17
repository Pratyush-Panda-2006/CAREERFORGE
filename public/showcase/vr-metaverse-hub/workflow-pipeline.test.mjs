import test from 'node:test';
import assert from 'node:assert/strict';
import { VRMetaverseHubPipelineEngine } from './workflow-pipeline.js';

test('VRMetaverseHubPipelineEngine', async (t) => {
  await t.test('should initialize with default columns and WebXR cards', () => {
    const pipeline = new VRMetaverseHubPipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.ok(cols.backlog.tasks.length >= 2);
  });

  await t.test('should move card between workflow columns', () => {
    const pipeline = new VRMetaverseHubPipelineEngine();
    const moved = pipeline.moveCard('VR-101', 'backlog', 'in_progress');
    assert.equal(moved, true);

    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'VR-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'VR-101'));
  });

  await t.test('should enforce column WIP capacity limits', () => {
    const pipeline = new VRMetaverseHubPipelineEngine({
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
    const pipeline = new VRMetaverseHubPipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'Neural Radiance Field (NeRF) View Synthesis Pipeline',
      desc: 'Real-time ray-marching volume rendering shader pass',
      priority: 'high',
      assignee: 'Graphics Dev'
    });

    assert.ok(newCard.id.startsWith('VR-'));
    const cols = pipeline.getColumns();
    assert.ok(cols.backlog.tasks.some(t => t.id === newCard.id));

    const json = pipeline.exportPipelineJSON();
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog);
  });
});
