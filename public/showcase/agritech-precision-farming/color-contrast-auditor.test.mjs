import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingContrastAuditor } from './color-contrast-auditor.js';

test('AgritechPrecisionFarmingContrastAuditor - calculates luminance accurately for black and white', () => {
  const auditor = new AgritechPrecisionFarmingContrastAuditor();
  const blackLum = auditor.getLuminance('#000000');
  const whiteLum = auditor.getLuminance('#ffffff');

  assert.equal(blackLum, 0);
  assert.equal(whiteLum, 1);
});

test('AgritechPrecisionFarmingContrastAuditor - calculateRatio computes 21:1 for black and white', () => {
  const auditor = new AgritechPrecisionFarmingContrastAuditor();
  const ratio = auditor.calculateRatio('#000000', '#ffffff');
  assert.equal(ratio, 21);
});

test('AgritechPrecisionFarmingContrastAuditor - evaluateWcagCompliance evaluates AA and AAA standard thresholds', () => {
  const auditor = new AgritechPrecisionFarmingContrastAuditor();

  // High contrast (e.g. 10:1) passes all
  const high = auditor.evaluateWcagCompliance(10.0);
  assert.equal(high.normalAA, true);
  assert.equal(high.normalAAA, true);
  assert.equal(high.largeAA, true);
  assert.equal(high.largeAAA, true);
  assert.equal(high.uiComponents, true);

  // Borderline ratio (e.g. 4.6:1) passes normal AA and large AAA, but fails normal AAA
  const med = auditor.evaluateWcagCompliance(4.6);
  assert.equal(med.normalAA, true);
  assert.equal(med.normalAAA, false);
  assert.equal(med.largeAA, true);
  assert.equal(med.largeAAA, true);

  // Low contrast (e.g. 2.1:1) fails all
  const low = auditor.evaluateWcagCompliance(2.1);
  assert.equal(low.normalAA, false);
  assert.equal(low.normalAAA, false);
  assert.equal(low.largeAA, false);
  assert.equal(low.uiComponents, false);
});

test('AgritechPrecisionFarmingContrastAuditor - handles 3-digit hex strings and throws on invalid hex', () => {
  const auditor = new AgritechPrecisionFarmingContrastAuditor();
  assert.equal(auditor.getLuminance('#fff'), 1);
  assert.equal(auditor.getLuminance('#000'), 0);
  assert.throws(() => auditor.getLuminance('invalid-hex'), /Invalid hex color/);
});
