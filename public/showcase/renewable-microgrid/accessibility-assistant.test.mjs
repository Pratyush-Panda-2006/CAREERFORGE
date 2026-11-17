import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridA11yAuditor } from './accessibility-assistant.js';

test('RenewableMicrogridA11yAuditor calculates accurate relative luminance values', () => {
  const auditor = new RenewableMicrogridA11yAuditor();

  // Pure white has luminance 1.0
  const whiteLum = auditor.calculateLuminance('#ffffff');
  assert.equal(whiteLum, 1.0);

  // Pure black has luminance 0.0
  const blackLum = auditor.calculateLuminance('#000000');
  assert.equal(blackLum, 0.0);

  // Luminance for mid grey #777777 is between 0.15 and 0.25
  const midLum = auditor.calculateLuminance('#777777');
  assert.ok(midLum > 0.15 && midLum < 0.25);
});

test('calculates correct contrast ratio for black-on-white and identical colors', () => {
  const auditor = new RenewableMicrogridA11yAuditor();

  // White on black = 21:1
  const maxRatio = auditor.getContrastRatio('#ffffff', '#000000');
  assert.equal(maxRatio, 21);

  // Identical colors = 1:1
  const identicalRatio = auditor.getContrastRatio('#34d399', '#34d399');
  assert.equal(identicalRatio, 1);
});

test('evaluateWCAG evaluates 4.5:1 AA and 7:1 AAA thresholds', () => {
  const auditor = new RenewableMicrogridA11yAuditor();

  // Low contrast fail (< 3.0)
  const fail = auditor.evaluateWCAG(2.5);
  assert.equal(fail.rating, 'FAIL');
  assert.equal(fail.aaNormal, false);
  assert.equal(fail.aaaNormal, false);

  // AA pass (>= 4.5, < 7.0)
  const aa = auditor.evaluateWCAG(5.2);
  assert.equal(aa.rating, 'AA');
  assert.equal(aa.aaNormal, true);
  assert.equal(aa.aaaNormal, false);

  // AAA pass (>= 7.0)
  const aaa = auditor.evaluateWCAG(8.5);
  assert.equal(aaa.rating, 'AAA');
  assert.equal(aaa.aaNormal, true);
  assert.equal(aaa.aaaNormal, true);
});

test('generates comprehensive compliance scorecard', () => {
  const auditor = new RenewableMicrogridA11yAuditor();
  const elements = [
    { id: 'btn-power', color: '#ffffff', backgroundColor: '#064e3b', hasAriaLabel: true, tabIndex: 0 },
    { id: 'text-sub', color: '#10b981', backgroundColor: '#022c22', hasAriaLabel: true, tabIndex: 0 },
    { id: 'bad-contrast', color: '#4b5563', backgroundColor: '#1f2937', hasAriaLabel: false, tabIndex: -1 }
  ];

  auditor.auditElements(elements);
  const scorecard = auditor.getScorecard();

  assert.equal(scorecard.total, 3);
  assert.equal(scorecard.passed, 2);
  assert.equal(scorecard.failed, 1);
  assert.ok(scorecard.passRate >= 66);
});
