import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataA11yAuditor } from './accessibility-assistant.js';

test('RoboticsAutomataA11yAuditor - calculates relative luminance accurately', () => {
  const auditor = new RoboticsAutomataA11yAuditor();

  const whiteLum = auditor.calculateLuminance('#ffffff');
  const blackLum = auditor.calculateLuminance('#000000');

  assert.strictEqual(whiteLum, 1);
  assert.strictEqual(blackLum, 0);
});

test('RoboticsAutomataA11yAuditor - computes 21:1 contrast ratio for pure black on pure white', () => {
  const auditor = new RoboticsAutomataA11yAuditor();
  const ratio = auditor.getContrastRatio('#ffffff', '#000000');

  assert.strictEqual(ratio, 21);
});

test('RoboticsAutomataA11yAuditor - evaluates 4.5:1 AA ratio calculations correctly', () => {
  const auditor = new RoboticsAutomataA11yAuditor();

  const passRes = auditor.evaluateWCAG(4.55);
  assert.strictEqual(passRes.passesAANormal, true);
  assert.strictEqual(passRes.passesAALarge, true);

  const failRes = auditor.evaluateWCAG(4.2);
  assert.strictEqual(failRes.passesAANormal, false);
  assert.strictEqual(failRes.passesAALarge, true);
});

test('RoboticsAutomataA11yAuditor - validates 7:1 AAA rating thresholds', () => {
  const auditor = new RoboticsAutomataA11yAuditor();

  const aaaRes = auditor.evaluateWCAG(7.5);
  assert.strictEqual(aaaRes.passesAAANormal, true);
  assert.strictEqual(aaaRes.grade, 'AAA');

  const subAaaRes = auditor.evaluateWCAG(6.8);
  assert.strictEqual(subAaaRes.passesAAANormal, false);
  assert.strictEqual(subAaaRes.grade, 'AA');
});
