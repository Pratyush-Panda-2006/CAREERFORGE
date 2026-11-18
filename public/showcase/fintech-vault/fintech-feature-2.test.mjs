import test from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultFilterEngine } from './filter-engine.js';

const mockAssets = [
  {
    id: 'a-1',
    title: 'USDC Liquidity Pool',
    assetClass: 'Stablecoin',
    protocol: 'Aave v3',
    amount: 2500000,
    apy: 5.4,
    riskScore: 1.2,
    tags: ['stablecoin', 'defi', 'audited']
  },
  {
    id: 'a-2',
    title: 'Ethereum Staking Pool',
    assetClass: 'Layer 1',
    protocol: 'Lido Core',
    amount: 8400000,
    apy: 4.2,
    riskScore: 2.1,
    tags: ['staking', 'pos', 'audited']
  },
  {
    id: 'a-3',
    title: 'Tokenized Treasury Notes',
    assetClass: 'RWA',
    protocol: 'Ondo Finance',
    amount: 12000000,
    apy: 5.1,
    riskScore: 0.8,
    tags: ['rwa', 'treasury', 'institutional']
  },
  {
    id: 'a-4',
    title: 'Solana MEV Arbitrage',
    assetClass: 'Yield',
    protocol: 'Jito Network',
    amount: 3100000,
    apy: 11.8,
    riskScore: 3.8,
    tags: ['mev', 'high-yield', 'solana']
  }
];

test('FintechVaultFilterEngine initializes and returns full dataset', () => {
  const engine = new FintechVaultFilterEngine({ data: mockAssets });
  const results = engine.apply();

  assert.equal(results.length, 4);
  assert.equal(results[0].id, 'a-2'); // Alphabetical by title: 'Ethereum...'
});

test('filterByKeyword matches case-insensitively across fields', () => {
  const engine = new FintechVaultFilterEngine({ data: mockAssets });

  // Match title
  const r1 = engine.filterByKeyword('usdc');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 'a-1');

  // Match protocol
  const r2 = engine.filterByKeyword('LIDO');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].id, 'a-2');

  // Match asset class
  const r3 = engine.filterByKeyword('rwa');
  assert.equal(r3.length, 1);
  assert.equal(r3[0].id, 'a-3');

  // Match tag
  const r4 = engine.filterByKeyword('audited');
  assert.equal(r4.length, 2);

  // Non-matching query
  const r5 = engine.filterByKeyword('nonexistent-asset');
  assert.equal(r5.length, 0);
});

test('toggleTag supports compound tag filtering criteria', () => {
  const engine = new FintechVaultFilterEngine({ data: mockAssets });

  // Filter single tag: 'audited' -> 2 assets (a-1, a-2)
  engine.toggleTag('audited');
  let filtered = engine.apply();
  assert.equal(filtered.length, 2);

  // Add second compound tag: 'stablecoin' -> only a-1 has both 'audited' and 'stablecoin'
  engine.toggleTag('stablecoin');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'a-1');

  // Toggle off 'audited' -> matches assets with 'stablecoin'
  engine.toggleTag('audited');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 4);
});

test('sort orders numerically and alphabetically ascending/descending', () => {
  const engine = new FintechVaultFilterEngine({ data: mockAssets });

  // Numeric descending by amount
  engine.sort('amount', 'desc');
  let sorted = engine.apply();
  assert.equal(sorted[0].amount, 12000000);
  assert.equal(sorted[sorted.length - 1].amount, 2500000);

  // Numeric ascending by amount
  engine.sort('amount', 'asc');
  sorted = engine.apply();
  assert.equal(sorted[0].amount, 2500000);
  assert.equal(sorted[sorted.length - 1].amount, 12000000);

  // Alphabetical descending by title
  engine.sort('title', 'desc');
  sorted = engine.apply();
  assert.equal(sorted[0].title, 'USDC Liquidity Pool');
});

test('reset restores initial search keyword, tags, and default sort', () => {
  const engine = new FintechVaultFilterEngine({ data: mockAssets });

  engine.filterByKeyword('treasury');
  engine.toggleTag('rwa');
  engine.sort('amount', 'desc');

  assert.equal(engine.apply().length, 1);

  engine.reset();
  const res = engine.apply();
  const filters = engine.getActiveFilters();

  assert.equal(res.length, 4);
  assert.equal(filters.keyword, '');
  assert.equal(filters.tags.length, 0);
  assert.equal(filters.sortField, 'title');
  assert.equal(filters.sortDirection, 'asc');
});

test('getAllTags returns frequency count and sorted tag list', () => {
  const engine = new FintechVaultFilterEngine({ data: mockAssets });
  const tags = engine.getAllTags();

  assert.ok(tags.length > 0);
  const auditedTag = tags.find(t => t.tag === 'audited');
  assert.ok(auditedTag);
  assert.equal(auditedTag.count, 2);
});
