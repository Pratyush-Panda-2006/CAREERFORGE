import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsDiffInspector } from './diff-viewer.js';

test('LuxuryRealmsDiffInspector detects zero changes for matching deeds', () => {
  const deed = 'PARCEL_ID: MC-90210\nAREA_SQM: 1450\nOWNERSHIP: FREEHOLD';
  const inspector = new LuxuryRealmsDiffInspector(deed, deed);

  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 3);
  assert.equal(metrics.changePercentage, 0);
});

test('LuxuryRealmsDiffInspector identifies line insertions and alterations', () => {
  const orig = 'PRICE: $35M\nDEPOSIT: 10%\nCLOSING: 60_DAYS';
  const mod = 'PRICE: $36M\nDEPOSIT: 10%\nCONTINGENCY: TITLE_SEARCH\nCLOSING: 45_DAYS\nYACHT_BERTH: INCLUDED';

  const inspector = new LuxuryRealmsDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 2); // PRICE: $35M, CLOSING: 60_DAYS
  assert.equal(metrics.additions, 4); // PRICE: $36M, CONTINGENCY, CLOSING: 45_DAYS, YACHT_BERTH
  assert.equal(metrics.unchanged, 1);

  const unified = inspector.generateUnifiedView();
  const added = unified.filter(l => l.type === 'added');
  assert.equal(added.length, 4);
});

test('LuxuryRealmsDiffInspector detects complete replacement', () => {
  const orig = 'ESTATE: PENTHOUSE_ONE';
  const mod = 'ESTATE: PENTHOUSE_TWO';

  const inspector = new LuxuryRealmsDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 1);
  assert.equal(metrics.additions, 1);
  assert.equal(metrics.changePercentage, 100);
});

test('LuxuryRealmsDiffInspector handles empty inputs gracefully', () => {
  const inspector = new LuxuryRealmsDiffInspector('', '');
  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.changePercentage, 0);
});
