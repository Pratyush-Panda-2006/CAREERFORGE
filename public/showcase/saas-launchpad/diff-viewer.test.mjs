import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadDiffInspector } from './diff-viewer.js';

test('SaasLaunchpadDiffInspector calculates zero-change idempotency', () => {
  const text = 'ENVIRONMENT=production\nPORT=8080\nCACHE_DRIVER=redis';
  const inspector = new SaasLaunchpadDiffInspector();
  const diffs = inspector.computeDiff(text, text);

  assert.equal(diffs.length, 3);
  assert.ok(diffs.every(d => d.type === 'equal'));

  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 3);
  assert.equal(metrics.changePercentage, 0);
});

test('detects line insertions accurately in config states', () => {
  const original = 'RATE_LIMIT=100\nTIMEOUT=30s';
  const modified = 'RATE_LIMIT=100\nMAX_BURST=200\nTIMEOUT=30s';

  const inspector = new SaasLaunchpadDiffInspector({ original, modified });
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.additions, 1);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 2);

  const unified = inspector.generateUnifiedView();
  assert.ok(unified.includes('+ MAX_BURST=200'));
});

test('detects line deletions and replacements correctly', () => {
  const original = 'SSL_CERT_PATH=/etc/certs\nLEGACY_AUTH=enabled\nENABLE_SWAGGER=true';
  const modified = 'SSL_CERT_PATH=/etc/certs\nOAUTH_PROVIDER=auth0';

  const inspector = new SaasLaunchpadDiffInspector();
  inspector.computeDiff(original, modified);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 2);
  assert.equal(metrics.additions, 1);

  const sideBySide = inspector.generateSideBySideView();
  assert.ok(sideBySide.left.some(l => l.text.includes('LEGACY_AUTH=enabled') && l.type === 'delete'));
  assert.ok(sideBySide.right.some(r => r.text.includes('OAUTH_PROVIDER=auth0') && r.type === 'insert'));
});

test('handles JSON objects by formatting diff changes', () => {
  const stateA = { tier: 'starter', maxUsers: 5, ssoEnabled: false };
  const stateB = { tier: 'enterprise', maxUsers: 50, ssoEnabled: true };

  const inspector = new SaasLaunchpadDiffInspector();
  inspector.computeDiff(stateA, stateB);
  const metrics = inspector.getChangeMetrics();

  assert.ok(metrics.totalChanges > 0);
  assert.ok(inspector.generateUnifiedView().includes('"tier": "enterprise"'));
});
