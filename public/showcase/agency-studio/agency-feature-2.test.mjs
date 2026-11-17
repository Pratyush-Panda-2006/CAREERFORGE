import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/agency-studio/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function createEnvironment() {
  const sandbox = {
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    JSON,
    Set,
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    },
    window: {
      addEventListener: () => {}
    }
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(scriptCode, sandbox);
  sandbox.AgencyStudioFilterEngine = sandbox.AgencyStudioFilterEngine || sandbox.window?.AgencyStudioFilterEngine;
  return sandbox;
}

const mockProjects = [
  {
    id: 'solana-pay',
    title: 'Solana Pay Mobile Web3 App',
    desc: 'Sub-second QR settlement and non-custodial crypto payment experience',
    tags: ['Web3 Fintech', 'Mobile Architecture'],
    rating: 4.9
  },
  {
    id: 'vortex-ai',
    title: 'Vortex AI Neural Interface',
    desc: 'Spatial node-based model training studio and 60fps WebGL particle visualizer',
    tags: ['AI SaaS', 'WebGL 3D'],
    rating: 4.7
  },
  {
    id: 'hyper-commerce',
    title: 'HyperScale Commerce Engine',
    desc: 'Global headless storefront with sub-millisecond edge edge caching and SSR',
    tags: ['Web3 Fintech', 'AI SaaS'],
    rating: 4.8
  }
];

test('AgencyStudioFilterEngine filters items case-insensitively by keyword', () => {
  const env = createEnvironment();
  assert.ok(env.AgencyStudioFilterEngine, 'AgencyStudioFilterEngine must be defined');
  const engine = new env.AgencyStudioFilterEngine(mockProjects);

  const results = engine.filterByKeyword('vortex');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'vortex-ai');

  const descResults = engine.filterByKeyword('HEADLESS');
  assert.equal(descResults.length, 1);
  assert.equal(descResults[0].id, 'hyper-commerce');
});

test('toggleTag applies compound tag filtering correctly', () => {
  const env = createEnvironment();
  const engine = new env.AgencyStudioFilterEngine(mockProjects);

  // Toggle single tag
  const fintechItems = engine.toggleTag('Web3 Fintech');
  assert.equal(fintechItems.length, 2);

  // Compound filter: both 'Web3 Fintech' AND 'AI SaaS'
  const compoundItems = engine.toggleTag('AI SaaS');
  assert.equal(compoundItems.length, 1);
  assert.equal(compoundItems[0].id, 'hyper-commerce');

  // Untoggle 'Web3 Fintech'
  const untoggled = engine.toggleTag('Web3 Fintech');
  assert.equal(untoggled.length, 2);
});

test('sort correctly orders items in ascending and descending directions', () => {
  const env = createEnvironment();
  const engine = new env.AgencyStudioFilterEngine(mockProjects);

  // Sort ascending by title
  const asc = engine.sort('title', 'asc');
  assert.equal(asc[0].id, 'hyper-commerce');
  assert.equal(asc[2].id, 'vortex-ai');

  // Sort descending by rating
  const descRating = engine.sort('rating', 'desc');
  assert.equal(descRating[0].id, 'solana-pay');
  assert.equal(descRating[1].id, 'hyper-commerce');
  assert.equal(descRating[2].id, 'vortex-ai');
});

test('clearTags resets tag selection and restores matching list', () => {
  const env = createEnvironment();
  const engine = new env.AgencyStudioFilterEngine(mockProjects);

  engine.toggleTag('Mobile Architecture');
  assert.equal(engine.getFilteredItems().length, 1);

  engine.clearTags();
  assert.equal(engine.getFilteredItems().length, 3);
});

test('filterByKeyword handles empty queries and non-matching searches gracefully', () => {
  const env = createEnvironment();
  const engine = new env.AgencyStudioFilterEngine(mockProjects);

  const noMatches = engine.filterByKeyword('nonexistent-tech-query-12345');
  assert.equal(noMatches.length, 0);

  const resetAll = engine.filterByKeyword('');
  assert.equal(resetAll.length, 3);
});
