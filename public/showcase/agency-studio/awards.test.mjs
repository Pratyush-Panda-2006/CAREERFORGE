// Run with: node --test public/showcase/agency-studio/awards.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('./script.js', import.meta.url), 'utf8');

// Provide minimal mock environment for script evaluation
const ctx = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  localStorage: {
    getItem: () => '[]',
    setItem: () => {}
  },
  performance: {
    now: () => 0
  },
  requestAnimationFrame: () => {}
};
ctx.window = ctx;

vm.createContext(ctx);
vm.runInContext(src, ctx);

const awards = ctx.AWARDS_DATA;
const caseStudies = ctx.CASE_STUDIES;

test('awards dataset contains 8 curated accolades', () => {
  assert.ok(Array.isArray(awards), 'AWARDS_DATA should be an array');
  assert.equal(awards.length, 8, 'Should contain 8 accolades');
});

test('awards cover all major design authorities: Awwwards, FWA, Red Dot, and Webby', () => {
  const orgs = new Set(awards.map(a => a.org));
  assert.ok(orgs.has('awwwards'), 'Missing Awwwards');
  assert.ok(orgs.has('fwa'), 'Missing FWA');
  assert.ok(orgs.has('reddot'), 'Missing Red Dot');
  assert.ok(orgs.has('webby'), 'Missing Webby');
});

test('every award record contains complete title, client, citation, and scores', () => {
  awards.forEach(a => {
    assert.ok(a.id && a.id.length > 0, 'Missing id');
    assert.ok(a.title && a.title.length > 0, `Award ${a.id} missing title`);
    assert.ok(a.client && a.client.length > 0, `Award ${a.id} missing client`);
    assert.ok(a.citation && a.citation.length > 20, `Award ${a.id} missing citation`);
    assert.ok(a.overallScore && a.overallScore.length > 0, `Award ${a.id} missing overallScore`);
    assert.ok(Array.isArray(a.scores) && a.scores.length >= 4, `Award ${a.id} missing scores array`);
  });
});

test('awards with projectId properly map to existing case studies', () => {
  const linked = awards.filter(a => a.projectId != null);
  assert.ok(linked.length >= 4, 'At least 4 awards should link to portfolio case studies');
  linked.forEach(a => {
    assert.ok(caseStudies[a.projectId], `Project ${a.projectId} should exist in CASE_STUDIES`);
  });
});

test('awards span years 2024 through 2026', () => {
  const years = new Set(awards.map(a => a.year));
  assert.ok(years.has('2026'), 'Missing 2026 distinction');
  assert.ok(years.has('2025'), 'Missing 2025 distinction');
  assert.ok(years.has('2024'), 'Missing 2024 distinction');
});
