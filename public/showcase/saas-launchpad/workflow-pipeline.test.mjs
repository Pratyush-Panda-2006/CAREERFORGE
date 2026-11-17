import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadPipelineEngine } from './workflow-pipeline.js';

test('SaasLaunchpadPipelineEngine initializes with standard agile Kanban columns', () => {
  const engine = new SaasLaunchpadPipelineEngine();
  assert.equal(engine.columns.length, 4);
  assert.equal(engine.columns[0].id, 'backlog');
  assert.equal(engine.columns[1].id, 'in_progress');
  assert.equal(engine.columns[2].id, 'review');
  assert.equal(engine.columns[3].id, 'completed');
});

test('adds tasks to columns and retrieves cards correctly', () => {
  const engine = new SaasLaunchpadPipelineEngine();
  engine.addCard({ id: 'saas-1', title: 'Stripe Billing Webhook', priority: 'high', columnId: 'backlog' });
  engine.addCard({ id: 'saas-2', title: 'Redis Cache Cluster', priority: 'medium', columnId: 'backlog' });

  const backlogCards = engine.getCardsInColumn('backlog');
  assert.equal(backlogCards.length, 2);
  assert.equal(backlogCards[0].title, 'Stripe Billing Webhook');
});

test('moveCard successfully transitions tasks through sprint pipeline', () => {
  const engine = new SaasLaunchpadPipelineEngine();
  engine.addCard({ id: 'task-10', title: 'OAuth2 Integration', priority: 'critical', columnId: 'backlog' });

  engine.moveCard('task-10', 'backlog', 'in_progress');
  assert.equal(engine.getCardsInColumn('backlog').length, 0);
  assert.equal(engine.getCardsInColumn('in_progress').length, 1);
  assert.equal(engine.cards.get('task-10').columnId, 'in_progress');

  engine.moveCard('task-10', 'in_progress', 'review');
  assert.equal(engine.getCardsInColumn('in_progress').length, 0);
  assert.equal(engine.getCardsInColumn('review').length, 1);

  engine.moveCard('task-10', 'review', 'completed');
  assert.equal(engine.getCardsInColumn('review').length, 0);
  assert.equal(engine.getCardsInColumn('completed').length, 1);
});

test('enforces WIP limit threshold guards on restricted sprint columns', () => {
  const engine = new SaasLaunchpadPipelineEngine({
    columns: [
      { id: 'backlog', title: 'Backlog', wipLimit: 0 },
      { id: 'in_progress', title: 'In Progress', wipLimit: 2 }
    ]
  });

  engine.addCard({ id: 's1', title: 'Task 1', columnId: 'backlog' });
  engine.addCard({ id: 's2', title: 'Task 2', columnId: 'backlog' });
  engine.addCard({ id: 's3', title: 'Task 3', columnId: 'backlog' });

  assert.equal(engine.checkWipLimit('in_progress'), true);
  engine.moveCard('s1', 'backlog', 'in_progress');
  engine.moveCard('s2', 'backlog', 'in_progress');

  assert.equal(engine.checkWipLimit('in_progress'), false);
  assert.throws(() => {
    engine.moveCard('s3', 'backlog', 'in_progress');
  }, /WIP limit reached/);
});

test('exports and restores pipeline state via exportPipelineJSON and importPipelineJSON', () => {
  const engine = new SaasLaunchpadPipelineEngine();
  engine.addCard({ id: 'saas-100', title: 'GraphQL Gateway', columnId: 'in_progress' });
  engine.addCard({ id: 'saas-101', title: 'Postgres Replica Sync', columnId: 'completed' });

  const jsonStr = engine.exportPipelineJSON();
  assert.ok(jsonStr.includes('GraphQL Gateway'));
  assert.ok(jsonStr.includes('Postgres Replica Sync'));

  const restoredEngine = new SaasLaunchpadPipelineEngine();
  restoredEngine.importPipelineJSON(jsonStr);

  assert.equal(restoredEngine.getCardsInColumn('in_progress').length, 1);
  assert.equal(restoredEngine.getCardsInColumn('completed').length, 1);
  assert.equal(restoredEngine.cards.get('saas-100').title, 'GraphQL Gateway');
});
