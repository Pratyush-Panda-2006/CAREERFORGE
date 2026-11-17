import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasPipelineEngine } from './workflow-pipeline.js';

describe('WeatherRadarAtlasPipelineEngine', () => {
  it('should initialize default radar operations columns with valid WIP limits', () => {
    const pipeline = new WeatherRadarAtlasPipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.equal(cols.in_progress.wipLimit, 3);
  });

  it('should transition a radar task between columns smoothly', () => {
    const pipeline = new WeatherRadarAtlasPipelineEngine();
    const result = pipeline.moveCard('RAD-101', 'backlog', 'in_progress');

    assert.equal(result, true);
    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'RAD-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'RAD-101'));
  });

  it('should guard against exceeding column WIP limits', () => {
    const pipeline = new WeatherRadarAtlasPipelineEngine({
      columns: {
        colA: { id: 'colA', title: 'A', wipLimit: 1, tasks: [{ id: 'RAD-1' }] },
        colB: { id: 'colB', title: 'B', wipLimit: 1, tasks: [{ id: 'RAD-2' }] }
      }
    });

    assert.throws(() => {
      pipeline.moveCard('RAD-1', 'colA', 'colB');
    }, /WIP limit exceeded/);
  });

  it('should support adding cards and serialize pipeline state to JSON', () => {
    const pipeline = new WeatherRadarAtlasPipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'TVS Vorticity Couplet Scan',
      desc: 'Rapid elevation tilt scan'
    });

    assert.ok(newCard.id);
    const json = pipeline.exportPipelineJSON();
    assert.ok(json.includes('TVS Vorticity Couplet Scan'));
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog.tasks.some(t => t.title === 'TVS Vorticity Couplet Scan'));
  });
});
