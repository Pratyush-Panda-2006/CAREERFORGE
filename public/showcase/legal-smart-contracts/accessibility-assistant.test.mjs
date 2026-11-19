import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsA11yAuditor } from './accessibility-assistant.js';

test('LegalSmartContractsA11yAuditor - calculates relative luminance accurately', () => {
  const auditor = new LegalSmartContractsA11yAuditor();

  const whiteLum = auditor.calculateLuminance('#ffffff');
  const blackLum = auditor.calculateLuminance('#000000');

  assert.strictEqual(whiteLum, 1);
  assert.strictEqual(blackLum, 0);
});

test('LegalSmartContractsA11yAuditor - computes 21:1 contrast ratio for pure black on pure white', () => {
  const auditor = new LegalSmartContractsA11yAuditor();
  const ratio = auditor.getContrastRatio('#ffffff', '#000000');

  assert.strictEqual(ratio, 21);
});

test('LegalSmartContractsA11yAuditor - evaluates 4.5:1 AA ratio calculations correctly', () => {
  const auditor = new LegalSmartContractsA11yAuditor();

  const passRes = auditor.evaluateWCAG(4.55);
  assert.strictEqual(passRes.passesAANormal, true);
  assert.strictEqual(passRes.passesAALarge, true);

  const failRes = auditor.evaluateWCAG(4.2);
  assert.strictEqual(failRes.passesAANormal, false);
  assert.strictEqual(failRes.passesAALarge, true);
});

test('LegalSmartContractsA11yAuditor - validates 7:1 AAA rating thresholds', () => {
  const auditor = new LegalSmartContractsA11yAuditor();

  const aaaRes = auditor.evaluateWCAG(7.5);
  assert.strictEqual(aaaRes.passesAAANormal, true);
  assert.strictEqual(aaaRes.grade, 'AAA');

  const subAaaRes = auditor.evaluateWCAG(6.8);
  assert.strictEqual(subAaaRes.passesAAANormal, false);
  assert.strictEqual(subAaaRes.grade, 'AA');
});
