import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsPipelineEngine } from './workflow-pipeline.js';

test('BiotechGenomicsPipelineEngine - transitions assay cards between columns accurately', () => {
  const engine = new BiotechGenomicsPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('BIO-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'BIO-101');
});

test('BiotechGenomicsPipelineEngine - enforces WIP limit guards on assay stages', () => {
  const engine = new BiotechGenomicsPipelineEngine({
    columns: {
      extract: { id: 'extract', title: 'Extraction', wipLimit: 2, tasks: [{ id: 'S1' }] },
      seq: { id: 'seq', title: 'Sequencing', wipLimit: 1, tasks: [{ id: 'S2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('seq'), true);
  assert.throws(() => {
    engine.moveCard('S1', 'extract', 'seq');
  }, /WIP limit exceeded/);
});

test('BiotechGenomicsPipelineEngine - adds new assay card and exports valid state JSON', () => {
  const engine = new BiotechGenomicsPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'BIO-999',
    title: 'Epigenetic DNA Methylation Microarray',
    desc: 'Bisulfite conversion protocol and Illumina EPIC array scanning',
    priority: 'high',
    assignee: 'Dr. Evelyn Reed'
  });

  assert.strictEqual(card.id, 'BIO-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'BIO-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'BIO-999'));
});

test('BiotechGenomicsPipelineEngine - removes card accurately', () => {
  const engine = new BiotechGenomicsPipelineEngine();
  const removed = engine.removeCard('BIO-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'BIO-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
