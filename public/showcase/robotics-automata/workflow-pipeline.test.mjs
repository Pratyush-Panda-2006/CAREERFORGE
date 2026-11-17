import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataPipelineEngine } from './workflow-pipeline.js';

describe('RoboticsAutomataPipelineEngine', () => {
  it('should initialize default robotics motion columns with valid WIP limits', () => {
    const pipeline = new RoboticsAutomataPipelineEngine();
    const cols = pipeline.getColumns();

    assert.ok(cols.backlog);
    assert.ok(cols.in_progress);
    assert.ok(cols.review);
    assert.ok(cols.completed);
    assert.equal(cols.in_progress.wipLimit, 3);
  });

  it('should transition a robotics task between columns smoothly', () => {
    const pipeline = new RoboticsAutomataPipelineEngine();
    const result = pipeline.moveCard('ROB-101', 'backlog', 'in_progress');

    assert.equal(result, true);
    const cols = pipeline.getColumns();
    assert.ok(!cols.backlog.tasks.some(t => t.id === 'ROB-101'));
    assert.ok(cols.in_progress.tasks.some(t => t.id === 'ROB-101'));
  });

  it('should guard against exceeding column WIP limits', () => {
    const pipeline = new RoboticsAutomataPipelineEngine({
      columns: {
        colA: { id: 'colA', title: 'A', wipLimit: 1, tasks: [{ id: 'ROB-1' }] },
        colB: { id: 'colB', title: 'B', wipLimit: 1, tasks: [{ id: 'ROB-2' }] }
      }
    });

    assert.throws(() => {
      pipeline.moveCard('ROB-1', 'colA', 'colB');
    }, /WIP limit exceeded/);
  });

  it('should support adding cards and serialize pipeline state to JSON', () => {
    const pipeline = new RoboticsAutomataPipelineEngine();
    const newCard = pipeline.addCard('backlog', {
      title: 'Cartesian Force Compliance Loop',
      desc: '6-axis F/T sensor real-time feedback'
    });

    assert.ok(newCard.id);
    const json = pipeline.exportPipelineJSON();
    assert.ok(json.includes('Cartesian Force Compliance Loop'));
    const parsed = JSON.parse(json);
    assert.ok(parsed.backlog.tasks.some(t => t.title === 'Cartesian Force Compliance Loop'));
  });
});
