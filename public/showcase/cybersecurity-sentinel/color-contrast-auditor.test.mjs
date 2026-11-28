import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CybersecuritySentinelContrastAuditor } from './color-contrast-auditor.js';

const auditor = new CybersecuritySentinelContrastAuditor();
const passing = (ratio) => auditor.evaluateWcagCompliance(ratio).filter((r) => r.passes).map((r) => r.id);

test('accepts short and long hex with or without #', () => {
  assert.equal(auditor.normalizeHex('ABC'), '#aabbcc');
  assert.equal(auditor.normalizeHex(' #123456 '), '#123456');
  for (const bad of ['', '#12', '#1234', 'ggg', 'red']) {
    assert.throws(() => auditor.normalizeHex(bad), Error, bad);
  }
});

test('luminance spans 0 to 1', () => {
  assert.equal(auditor.getLuminance('#000'), 0);
  assert.ok(Math.abs(auditor.getLuminance('#fff') - 1) < 1e-9);
});

test('ratio is symmetric and matches known values', () => {
  assert.equal(auditor.formatRatio(auditor.calculateRatio('#000', '#fff')), '21.00:1');
  assert.equal(auditor.calculateRatio('#fff', '#000'), auditor.calculateRatio('#000', '#fff'));
  assert.equal(auditor.formatRatio(auditor.calculateRatio('#777', '#fff')), '4.47:1');
});

test('thresholds are inclusive and never rounded up', () => {
  assert.deepEqual(passing(4.5), ['aa-normal', 'aa-large', 'aaa-large', 'ui']);
  assert.deepEqual(passing(4.499), ['aa-large', 'ui']);
  assert.equal(auditor.formatRatio(4.499), '4.49:1');
  assert.deepEqual(passing(2.9), []);
});
