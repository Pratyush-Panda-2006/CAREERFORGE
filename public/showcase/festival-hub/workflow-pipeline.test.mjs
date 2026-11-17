import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubPipelineEngine } from './workflow-pipeline.js';

test('FestivalHubPipelineEngine initializes with default Kanban columns', () => {
  const engine = new FestivalHubPipelineEngine();
  assert.equal(engine.columns.length, 4);
  assert.equal(engine.columns[0].id, 'backlog');
  assert.equal(engine.columns[1].id, 'in_progress');
  assert.equal(engine.columns[2].id, 'review');
  assert.equal(engine.columns[3].id, 'completed');
});

test('adds tasks to columns and retrieves cards correctly', () => {
  const engine = new FestivalHubPipelineEngine();
  engine.addCard({ id: 'task-1', title: 'Setup Sound Stage', priority: 'high', columnId: 'backlog' });
  engine.addCard({ id: 'task-2', title: 'Lighting Rig Check', priority: 'medium', columnId: 'backlog' });

  const backlogCards = engine.getCardsInColumn('backlog');
  assert.equal(backlogCards.length, 2);
  assert.equal(backlogCards[0].title, 'Setup Sound Stage');
});

test('moveCard successfully transitions cards across columns', () => {
  const engine = new FestivalHubPipelineEngine();
  engine.addCard({ id: 'task-1', title: 'Security Perimeter', priority: 'critical', columnId: 'backlog' });

  engine.moveCard('task-1', 'backlog', 'in_progress');
  assert.equal(engine.getCardsInColumn('backlog').length, 0);
  assert.equal(engine.getCardsInColumn('in_progress').length, 1);
  assert.equal(engine.cards.get('task-1').columnId, 'in_progress');

  engine.moveCard('task-1', 'in_progress', 'review');
  assert.equal(engine.getCardsInColumn('in_progress').length, 0);
  assert.equal(engine.getCardsInColumn('review').length, 1);

  engine.moveCard('task-1', 'review', 'completed');
  assert.equal(engine.getCardsInColumn('review').length, 0);
  assert.equal(engine.getCardsInColumn('completed').length, 1);
});

test('enforces WIP limit threshold guards on restricted columns', () => {
  const engine = new FestivalHubPipelineEngine({
    columns: [
      { id: 'backlog', title: 'Backlog', wipLimit: 0 },
      { id: 'in_progress', title: 'In Progress', wipLimit: 2 }
    ]
  });

  engine.addCard({ id: 't1', title: 'Task 1', columnId: 'backlog' });
  engine.addCard({ id: 't2', title: 'Task 2', columnId: 'backlog' });
  engine.addCard({ id: 't3', title: 'Task 3', columnId: 'backlog' });

  assert.equal(engine.checkWipLimit('in_progress'), true);
  engine.moveCard('t1', 'backlog', 'in_progress');
  engine.moveCard('t2', 'backlog', 'in_progress');

  assert.equal(engine.checkWipLimit('in_progress'), false);
  assert.throws(() => {
    engine.moveCard('t3', 'backlog', 'in_progress');
  }, /WIP limit reached/);
});

test('exports and restores pipeline state via exportPipelineJSON and importPipelineJSON', () => {
  const engine = new FestivalHubPipelineEngine();
  engine.addCard({ id: 't-100', title: 'Vendor Onboarding', columnId: 'in_progress' });
  engine.addCard({ id: 't-101', title: 'Wristband Distribution', columnId: 'completed' });

  const jsonStr = engine.exportPipelineJSON();
  assert.ok(jsonStr.includes('Vendor Onboarding'));
  assert.ok(jsonStr.includes('Wristband Distribution'));

  const restoredEngine = new FestivalHubPipelineEngine();
  restoredEngine.importPipelineJSON(jsonStr);

  assert.equal(restoredEngine.getCardsInColumn('in_progress').length, 1);
  assert.equal(restoredEngine.getCardsInColumn('completed').length, 1);
  assert.equal(restoredEngine.cards.get('t-100').title, 'Vendor Onboarding');
});
