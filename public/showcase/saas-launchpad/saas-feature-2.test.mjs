import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadFilterEngine } from './filter-engine.js';

const mockSubscriptions = [
  {
    id: 'sub-01',
    name: 'Enterprise Cloud Stack',
    tier: 'Enterprise',
    mrr: 12500,
    users: 480,
    churnRate: 0.8,
    tags: ['cloud', 'enterprise', 'sla99']
  },
  {
    id: 'sub-02',
    name: 'Startup Growth Booster',
    tier: 'Growth',
    mrr: 2900,
    users: 65,
    churnRate: 1.4,
    tags: ['growth', 'analytics']
  },
  {
    id: 'sub-03',
    name: 'Solo Creator Launchpad',
    tier: 'Starter',
    mrr: 450,
    users: 12,
    churnRate: 3.2,
    tags: ['starter', 'creator']
  },
  {
    id: 'sub-04',
    name: 'Fintech Secure Enclave',
    tier: 'Enterprise',
    mrr: 24000,
    users: 920,
    churnRate: 0.2,
    tags: ['enterprise', 'compliance', 'fintech']
  }
];

test('SaasLaunchpadFilterEngine initializes and returns full dataset', () => {
  const engine = new SaasLaunchpadFilterEngine({ data: mockSubscriptions });
  const results = engine.apply();
  assert.equal(results.length, 4);
});

test('filterByKeyword matches across name, tier, and identifiers', () => {
  const engine = new SaasLaunchpadFilterEngine({ data: mockSubscriptions });

  const r1 = engine.filterByKeyword('enterprise');
  assert.equal(r1.length, 2); // Cloud Stack, Fintech Enclave

  const r2 = engine.filterByKeyword('GROWTH');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].name, 'Startup Growth Booster');

  const r3 = engine.filterByKeyword('sub-03');
  assert.equal(r3.length, 1);
  assert.equal(r3[0].name, 'Solo Creator Launchpad');

  const rEmpty = engine.filterByKeyword('missing-tenant');
  assert.equal(rEmpty.length, 0);
});

test('toggleTag supports compound filtering criteria', () => {
  const engine = new SaasLaunchpadFilterEngine({ data: mockSubscriptions });

  engine.toggleTag('enterprise');
  let results = engine.apply();
  assert.equal(results.length, 2);

  engine.toggleTag('fintech');
  results = engine.apply();
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Fintech Secure Enclave');

  // Untoggle fintech
  engine.toggleTag('fintech');
  results = engine.apply();
  assert.equal(results.length, 2);
});

test('sort orders numerically and alphabetically ascending/descending', () => {
  const engine = new SaasLaunchpadFilterEngine({ data: mockSubscriptions });

  // MRR Descending (Highest MRR first)
  const byMRR = engine.sort('mrr', 'desc');
  assert.equal(byMRR[0].mrr, 24000);
  assert.equal(byMRR[byMRR.length - 1].mrr, 450);

  // Users Ascending
  const byUsers = engine.sort('users', 'asc');
  assert.equal(byUsers[0].users, 12);
  assert.equal(byUsers[byUsers.length - 1].users, 920);

  // Lowest Churn Rate
  const byChurn = engine.sort('churnRate', 'asc');
  assert.equal(byChurn[0].churnRate, 0.2);
});

test('reset resets search keyword, tag filters and default sort', () => {
  const engine = new SaasLaunchpadFilterEngine({ data: mockSubscriptions });
  engine.filterByKeyword('cloud');
  engine.toggleTag('enterprise');
  engine.sort('mrr', 'desc');

  assert.equal(engine.apply().length, 1);

  const reset = engine.reset();
  assert.equal(reset.length, 4);
  const state = engine.getActiveState();
  assert.equal(state.keyword, '');
  assert.equal(state.tags.length, 0);
  assert.equal(state.sortField, 'name');
});
