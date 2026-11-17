import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfacePipelineEngine } from './workflow-pipeline.js';

describe('NeurotechInterfacePipelineEngine', () => {
  it('should initialize default BCI protocol columns with valid WIP limits', () => {
    const pipeline = new NeurotechInterfacePipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.equal(cols.in_progress.wipLimit, 3);
  });

  it('should transition a BCI task between columns smoothly', () => {
    const pipeline = new NeurotechInterfacePipelineEngine();
    const result = pipeline.moveCard('BCI-101', 'backlog', 'in_progress');

    assert.equal(result, true);
    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'BCI-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'BCI-101'));
  });

  it('should guard against exceeding column WIP limits', () => {
    const pipeline = new NeurotechInterfacePipelineEngine({
      columns: {
        colA: { id: 'colA', title: 'A', wipLimit: 1, tasks: [{ id: 'BCI-1' }] },
        colB: { id: 'colB', title: 'B', wipLimit: 1, tasks: [{ id: 'BCI-2' }] }
      }
    });

    assert.throws(() => {
      pipeline.moveCard('BCI-1', 'colA', 'colB');
    }, /WIP limit exceeded/);
  });

  it('should support adding cards and serialize pipeline state to JSON', () => {
    const pipeline = new NeurotechInterfacePipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'Somatosensory Evoked Potential Calibration',
      desc: 'Median nerve peripheral stimulation latency analysis'
    });

    assert.ok(newCard.id);
    const json = pipeline.exportPipelineJSON();
    assert.ok(json.includes('Somatosensory Evoked Potential Calibration'));
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog.tasks.some(t => t.title === 'Somatosensory Evoked Potential Calibration'));
  });
});
