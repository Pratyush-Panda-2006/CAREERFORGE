import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubPipelineEngine } from './workflow-pipeline.js';

describe('StreamingCinemaHubPipelineEngine', () => {
  it('should initialize default cinema columns with valid WIP limits', () => {
    const pipeline = new StreamingCinemaHubPipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.equal(cols.in_progress.wipLimit, 3);
  });

  it('should transition a task between columns smoothly', () => {
    const pipeline = new StreamingCinemaHubPipelineEngine();
    const result = pipeline.moveCard('MOV-101', 'backlog', 'in_progress');

    assert.equal(result, true);
    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'MOV-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'MOV-101'));
  });

  it('should guard against exceeding column WIP limits', () => {
    const pipeline = new StreamingCinemaHubPipelineEngine({
      columns: {
        colA: { id: 'colA', title: 'A', wipLimit: 1, tasks: [{ id: 'MOV-1' }] },
        colB: { id: 'colB', title: 'B', wipLimit: 1, tasks: [{ id: 'MOV-2' }] }
      }
    });

    assert.throws(() => {
      pipeline.moveCard('MOV-1', 'colA', 'colB');
    }, /WIP limit exceeded/);
  });

  it('should support adding cards and serialize pipeline state to JSON', () => {
    const pipeline = new StreamingCinemaHubPipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'Solaris 4K Remaster',
      desc: 'Restoration scan from negative'
    });

    assert.ok(newCard.id);
    const json = pipeline.exportPipelineJSON();
    assert.ok(json.includes('Solaris 4K Remaster'));
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog.tasks.some(t => t.title === 'Solaris 4K Remaster'));
  });
});
