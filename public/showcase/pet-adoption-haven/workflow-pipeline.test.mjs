import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenPipelineEngine } from './workflow-pipeline.js';

test('PetAdoptionHavenPipelineEngine - transitions tasks between columns correctly', () => {
  const engine = new PetAdoptionHavenPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('PET-301', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'PET-301');
});

test('PetAdoptionHavenPipelineEngine - guards against exceeding WIP limits', () => {
  const engine = new PetAdoptionHavenPipelineEngine({
    columns: {
      colA: { id: 'colA', title: 'Col A', wipLimit: 3, tasks: [{ id: 'P1' }] },
      colB: { id: 'colB', title: 'Col B', wipLimit: 1, tasks: [{ id: 'P2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('colB'), true);
  assert.throws(() => {
    engine.moveCard('P1', 'colA', 'colB');
  }, /WIP limit exceeded/);
});

test('PetAdoptionHavenPipelineEngine - adds card and serializes state to JSON', () => {
  const engine = new PetAdoptionHavenPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'PET-999',
    title: 'Dental Scaling & Polishing',
    desc: 'Sedated dental cleaning for senior beagle',
    priority: 'high',
    assignee: 'Dental Vet'
  });

  assert.strictEqual(card.id, 'PET-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'PET-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'PET-999'));
});

test('PetAdoptionHavenPipelineEngine - removes card properly', () => {
  const engine = new PetAdoptionHavenPipelineEngine();
  const removed = engine.removeCard('PET-300');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'PET-300');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
