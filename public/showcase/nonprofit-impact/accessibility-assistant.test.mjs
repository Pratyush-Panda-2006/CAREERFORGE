import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactA11yAuditor } from './accessibility-assistant.js';

describe('NonprofitImpactA11yAuditor', () => {
  it('parses colors in hex and rgb formats accurately', () => {
    const auditor = new NonprofitImpactA11yAuditor();
    assert.deepEqual(auditor.parseColor('#ffffff'), { r: 255, g: 255, b: 255 });
    assert.deepEqual(auditor.parseColor('#000'), { r: 0, g: 0, b: 0 });
    assert.deepEqual(auditor.parseColor('rgb(50, 150, 250)'), { r: 50, g: 150, b: 250 });
  });

  it('calculates WCAG 2.1 relative luminance correctly', () => {
    const auditor = new NonprofitImpactA11yAuditor();
    const whiteLum = auditor.calculateLuminance('#ffffff');
    const blackLum = auditor.calculateLuminance('#000000');

    assert.equal(whiteLum, 1);
    assert.equal(blackLum, 0);
  });

  it('calculates contrast ratios correctly', () => {
    const auditor = new NonprofitImpactA11yAuditor();
    const ratioMax = auditor.getContrastRatio('#ffffff', '#000000');
    assert.equal(ratioMax, 21);

    const ratioSame = auditor.getContrastRatio('#ffffff', '#ffffff');
    assert.equal(ratioSame, 1);
  });

  it('evaluates WCAG compliance thresholds correctly', () => {
    const auditor = new NonprofitImpactA11yAuditor();

    const passAAA = auditor.evaluateWCAG(7.5);
    assert.equal(passAAA.aaaNormal, true);
    assert.equal(passAAA.rating, 'AAA');

    const passAA = auditor.evaluateWCAG(4.8);
    assert.equal(passAA.aaNormal, true);
    assert.equal(passAA.aaaNormal, false);
    assert.equal(passAA.rating, 'AA');

    const failAll = auditor.evaluateWCAG(2.0);
    assert.equal(failAll.aaNormal, false);
    assert.equal(failAll.rating, 'FAIL');
  });

  it('audits a collection of UI elements', () => {
    const auditor = new NonprofitImpactA11yAuditor();
    const mockElements = [
      { name: 'Donate Button', color: '#ffffff', backgroundColor: '#10b981', ariaLabel: 'Donate Now' },
      { name: 'Low Contrast Note', color: '#666666', backgroundColor: '#ffffff' }
    ];

    const results = auditor.auditElements(mockElements);
    assert.equal(results.length, 2);
    assert.equal(results[0].hasAriaLabel, true);
    assert.equal(results[1].hasAriaLabel, false);
    assert.ok(results[0].contrastRatio > 1);
  });
});
