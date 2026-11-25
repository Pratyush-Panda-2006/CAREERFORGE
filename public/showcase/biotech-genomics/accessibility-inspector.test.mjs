import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsA11yInspector } from './accessibility-inspector.js';

describe('BiotechGenomicsA11yInspector', () => {
  it('calculates relative luminance accurately for black and white', () => {
    const inspector = new BiotechGenomicsA11yInspector();
    assert.equal(inspector.getLuminance(0, 0, 0), 0);
    assert.equal(inspector.getLuminance(255, 255, 255), 1);
  });

  it('computes 21:1 contrast ratio between pure white and pure black', () => {
    const inspector = new BiotechGenomicsA11yInspector();
    const ratio = inspector.getContrastRatio([255, 255, 255], [0, 0, 0]);
    assert.equal(ratio, 21);
  });

  it('correctly evaluates WCAG AA and AAA conformance thresholds', () => {
    const inspector = new BiotechGenomicsA11yInspector();
    const pass = inspector.evaluateContrast(4.8, false);
    assert.equal(pass.aaPass, true);
    assert.equal(pass.aaaPass, false);
    assert.equal(pass.level, 'AA');

    const fail = inspector.evaluateContrast(2.5, false);
    assert.equal(fail.aaPass, false);
    assert.equal(fail.level, 'FAIL');
  });
});
