import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataContrastAuditor } from './color-contrast-auditor.js';

test('RoboticsAutomataContrastAuditor - calculateRatio returns 21:1 for black on white', () => {
  const auditor = new RoboticsAutomataContrastAuditor();
  const ratio = auditor.calculateRatio('#000000', '#ffffff');
  assert.equal(ratio, 21);
});

test('RoboticsAutomataContrastAuditor - calculateRatio returns 1:1 for identical colors', () => {
  const auditor = new RoboticsAutomataContrastAuditor();
  const ratio = auditor.calculateRatio('#ffffff', '#ffffff');
  assert.equal(ratio, 1);
});

test('RoboticsAutomataContrastAuditor - evaluateWcagCompliance accurately grades thresholds', () => {
  const auditor = new RoboticsAutomataContrastAuditor();
  const high = auditor.evaluateWcagCompliance(8.5);
  assert.equal(high.normalAA, true);
  assert.equal(high.normalAAA, true);
  assert.equal(high.largeAA, true);

  const mid = auditor.evaluateWcagCompliance(5.0);
  assert.equal(mid.normalAA, true);
  assert.equal(mid.normalAAA, false);

  const low = auditor.evaluateWcagCompliance(2.5);
  assert.equal(low.normalAA, false);
  assert.equal(low.uiComponents, false);
});
