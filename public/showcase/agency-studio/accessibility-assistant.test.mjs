import test from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioA11yAuditor } from './accessibility-assistant.js';

test('AgencyStudioA11yAuditor calculates luminance accurately', () => {
  const auditor = new AgencyStudioA11yAuditor();
  const whiteLum = auditor.calculateLuminance('#ffffff');
  const blackLum = auditor.calculateLuminance('#000000');

  assert.equal(whiteLum, 1);
  assert.equal(blackLum, 0);
});

test('AgencyStudioA11yAuditor calculates contrast ratio accurately', () => {
  const auditor = new AgencyStudioA11yAuditor();
  const ratio = auditor.getContrastRatio('#ffffff', '#000000');
  assert.equal(ratio, 21);

  const sameRatio = auditor.getContrastRatio('#ffffff', '#ffffff');
  assert.equal(sameRatio, 1);
});

test('AgencyStudioA11yAuditor evaluates WCAG criteria correctly', () => {
  const auditor = new AgencyStudioA11yAuditor();
  const failEval = auditor.evaluateWCAG(2.5);
  assert.equal(failEval.rating, 'FAIL');
  assert.equal(failEval.aaNormal, false);

  const aaEval = auditor.evaluateWCAG(5.0);
  assert.equal(aaEval.rating, 'AA');
  assert.equal(aaEval.aaNormal, true);
  assert.equal(aaEval.aaaNormal, false);

  const aaaEval = auditor.evaluateWCAG(8.5);
  assert.equal(aaaEval.rating, 'AAA');
  assert.equal(aaaEval.aaaNormal, true);
});

test('AgencyStudioA11yAuditor parses various color formats', () => {
  const auditor = new AgencyStudioA11yAuditor();
  assert.deepEqual(auditor.parseColor('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(auditor.parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30 });
  assert.deepEqual(auditor.parseColor([50, 100, 150]), { r: 50, g: 100, b: 150 });
});

test('AgencyStudioA11yAuditor audits element list properly', () => {
  const auditor = new AgencyStudioA11yAuditor();
  const elements = [
    { name: 'Agency Primary CTA', color: '#ffffff', backgroundColor: '#000000', ariaLabel: 'Sign Contract' },
    { name: 'Low Contrast Banner', color: '#777777', backgroundColor: '#888888', ariaLabel: '' }
  ];

  const results = auditor.auditElements(elements);
  assert.equal(results.length, 2);
  assert.equal(results[0].passed, true);
  assert.equal(results[1].passed, false);
});
