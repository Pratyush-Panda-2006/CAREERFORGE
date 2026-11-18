import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelFilterEngine } from './filter-engine.js';

test('CybersecuritySentinelFilterEngine - filterByKeyword performs case-insensitive search across title, vector, IP, and tags', () => {
  const engine = new CybersecuritySentinelFilterEngine();

  // Search by title keyword
  const brute = engine.filterByKeyword('brute');
  assert.equal(brute.length, 1);
  assert.equal(brute[0].id, 'threat-1');

  // Search by IP uppercase/case
  const ip = engine.filterByKeyword('203.0.113.19');
  assert.equal(ip.length, 1);
  assert.equal(ip[0].title, 'SQL Injection Probe');

  // Search by vector
  const proto = engine.filterByKeyword('protocol');
  assert.equal(proto.length, 1);
  assert.equal(proto[0].id, 'threat-4');

  // Search with no matches
  const none = engine.filterByKeyword('nonexistent-zero-day');
  assert.equal(none.length, 0);

  // Clear query restores all
  const all = engine.filterByKeyword('');
  assert.equal(all.length, 6);
});

test('CybersecuritySentinelFilterEngine - compound tag filtering strictly enforces all selected tags', () => {
  const engine = new CybersecuritySentinelFilterEngine();

  // Single tag filter
  engine.toggleTag('web');
  const webThreats = engine.apply();
  assert.equal(webThreats.length, 2); // SQLi and XSS

  // Compound tag: 'injection'
  engine.toggleTag('injection');
  const sqliOnly = engine.apply();
  assert.equal(sqliOnly.length, 1); // Only SQLi has both
  assert.equal(sqliOnly[0].id, 'threat-2');

  // Untoggle 'injection'
  engine.toggleTag('injection');
  assert.equal(engine.apply().length, 2);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 6);
});

test('CybersecuritySentinelFilterEngine - sort handles ascending and descending ordering accurately', () => {
  const engine = new CybersecuritySentinelFilterEngine();

  // CVSS score descending
  const byCvssDesc = engine.sort('cvssScore', 'desc');
  assert.equal(byCvssDesc[0].cvssScore, 9.9); // Ransomware
  assert.equal(byCvssDesc[byCvssDesc.length - 1].cvssScore, 4.3); // XSS

  // CVSS score ascending
  const byCvssAsc = engine.sort('cvssScore', 'asc');
  assert.equal(byCvssAsc[0].cvssScore, 4.3);
  assert.equal(byCvssAsc[byCvssAsc.length - 1].cvssScore, 9.9);

  // Events count descending
  const byEventsDesc = engine.sort('eventsCount', 'desc');
  assert.equal(byEventsDesc[0].eventsCount, 4280); // SSH Brute Force
});

test('CybersecuritySentinelFilterEngine - setRange filters items within numerical boundaries', () => {
  const engine = new CybersecuritySentinelFilterEngine();

  // CVSS range between 8.5 and 9.5
  engine.setRange('cvssScore', 8.5, 9.5);
  const midHigh = engine.apply();
  assert.equal(midHigh.length, 2); // SQLi (8.6) and PrivEsc (9.1)
  assert.ok(midHigh.every(t => t.cvssScore >= 8.5 && t.cvssScore <= 9.5));

  // Clear range
  engine.setRange('cvssScore', null, null);
  assert.equal(engine.apply().length, 6);
});

test('CybersecuritySentinelFilterEngine - reset completely restores default state and parameters', () => {
  const engine = new CybersecuritySentinelFilterEngine();
  engine.filterByKeyword('ransomware');
  engine.toggleTag('crypto');
  engine.sort('eventsCount', 'asc');

  assert.equal(engine.apply().length, 1);

  const resetItems = engine.reset();
  assert.equal(resetItems.length, 6);
  assert.equal(engine.getActiveTags().length, 0);
  assert.equal(engine.searchQuery, '');
  assert.equal(engine.sortField, 'cvssScore');
  assert.equal(engine.sortDirection, 'desc');
});

test('CybersecuritySentinelFilterEngine - subscribe alerts callbacks on filter adjustments', () => {
  const engine = new CybersecuritySentinelFilterEngine();
  let callCount = 0;
  let lastState = null;

  const unsubscribe = engine.subscribe(state => {
    callCount++;
    lastState = state;
  });

  engine.filterByKeyword('SSH');
  assert.equal(callCount, 1);
  assert.equal(lastState.query, 'ssh');
  assert.equal(lastState.count, 1);

  engine.toggleTag('network');
  assert.equal(callCount, 2);
  assert.ok(lastState.tags.includes('network'));

  unsubscribe();
  engine.clearTags();
  assert.equal(callCount, 2); // Unsubscribed
});
