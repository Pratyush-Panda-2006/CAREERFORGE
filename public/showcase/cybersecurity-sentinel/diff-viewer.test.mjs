import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelDiffInspector } from './diff-viewer.js';

test('CybersecuritySentinelDiffInspector confirms identical policies yield zero delta', () => {
  const policy = 'DROP TCP ANY -> ANY 23\nALERT ICMP ANY -> ANY (msg:"PING";)';
  const inspector = new CybersecuritySentinelDiffInspector(policy, policy);

  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 2);
  assert.equal(metrics.changePercentage, 0);
});

test('CybersecuritySentinelDiffInspector detects added and removed ACL rules', () => {
  const orig = 'ALLOW TCP 80\nALLOW TCP 443';
  const mod = 'ALLOW TCP 443\nALLOW TCP 8443\nDROP ALL';

  const inspector = new CybersecuritySentinelDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 1); // ALLOW TCP 80
  assert.equal(metrics.additions, 2); // ALLOW TCP 8443, DROP ALL
  assert.equal(metrics.unchanged, 1); // ALLOW TCP 443

  const unified = inspector.generateUnifiedView();
  const added = unified.filter(l => l.type === 'added');
  assert.equal(added.length, 2);
});

test('CybersecuritySentinelDiffInspector reports full replacement delta', () => {
  const orig = 'STATUS: INSECURE';
  const mod = 'STATUS: HARDENED';

  const inspector = new CybersecuritySentinelDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 1);
  assert.equal(metrics.additions, 1);
  assert.equal(metrics.changePercentage, 100);
});

test('CybersecuritySentinelDiffInspector handles empty inputs gracefully', () => {
  const inspector = new CybersecuritySentinelDiffInspector('', '');
  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.changePercentage, 0);
});
