import test from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansA11yAuditor, parseColor, composite, tabSequence, referenceProblems } from './accessibility-assistant.js';
const audit = new CharityMicroloansA11yAuditor();
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
test('published sRGB primary weights and black/white contrast', () => {
  near(audit.calculateLuminance([255, 0, 0]), .2126); near(audit.calculateLuminance([0, 255, 0]), .7152); near(audit.calculateLuminance([0, 0, 255]), .0722);
  near(audit.getContrastRatio([0, 0, 0], [255, 255, 255]), 21); near(audit.getContrastRatio([44, 61, 17], [44, 61, 17]), 1);
});
test('independent grayscale inverse fixtures on both sRGB branches', () => {
  for (let i = 0; i <= 100; i++) {
    const luminance = i / 100, channel = 255 * (luminance <= .0031308 ? 12.92 * luminance : 1.055 * luminance ** (1 / 2.4) - .055);
    near(audit.calculateLuminance([channel, channel, channel]), luminance);
    near(audit.getContrastRatio([channel, channel, channel], [0, 0, 0]), (luminance + .05) / .05);
  }
  near(audit.calculateLuminance([10, 10, 10]), 10 / 255 / 12.92);
});
test('contrast symmetry, finite bounds, and all three channels matter', () => {
  for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) {
    const a = [r, g, 153], b = [255 - g, r, 51], ratio = audit.getContrastRatio(a, b);
    assert.ok(ratio >= 1 && ratio <= 21); near(ratio, audit.getContrastRatio(b, a));
  }
});
test('AA and AAA thresholds never round a failing value into a pass', () => {
  assert.equal(audit.evaluateWCAG(4.499999).aa, false); assert.equal(audit.evaluateWCAG(4.5).aa, true);
  assert.equal(audit.evaluateWCAG(6.999999).aaa, false); assert.equal(audit.evaluateWCAG(7).aaa, true);
  assert.equal(audit.evaluateWCAG(2.999999, true).aa, false); assert.equal(audit.evaluateWCAG(3, true).aa, true);
  assert.equal(audit.evaluateWCAG(4.499999, true).aaa, false); assert.equal(audit.evaluateWCAG(4.5, true).aaa, true);
});
test('invalid inputs fail before calculation', () => {
  for (const value of [null, [], [0, 0], [NaN, 0, 0], [-1, 0, 0], [256, 0, 0], ['1', 0, 0]]) assert.throws(() => audit.calculateLuminance(value), RangeError);
  for (const value of [0, 21.1, NaN, Infinity, '4.5']) assert.throws(() => audit.evaluateWCAG(value), RangeError);
});
test('computed RGB syntax, transparent layers, and unsupported colors', () => {
  assert.deepEqual(parseColor('rgb(12, 34, 56)'), { channels: [12, 34, 56], alpha: 1 });
  assert.deepEqual(parseColor('rgba(12, 34, 56, 0.5)'), { channels: [12, 34, 56], alpha: .5 });
  for (const value of ['url(secret)', 'color(display-p3 1 0 0)', 'rgb(999,0,0)', 'rgba(0,0,0,2)']) assert.equal(parseColor(value), null);
  assert.deepEqual(composite({ channels: [0, 100, 200], alpha: .25 }, [200, 100, 0]), [150, 100, 50]);
  assert.throws(() => composite({ channels: [0, 0, 0], alpha: 2 }, [255, 255, 255]), RangeError);
});
test('ARIA ID lists report missing and duplicate targets without interpreting markup', () => {
  assert.deepEqual(referenceProblems(['label', 'help', 'panel'], [{ label: 'amount', attribute: 'aria-labelledby', value: 'label help' }]), []);
  const errors = referenceProblems(['same', 'same'], [{ label: 'terms', attribute: 'aria-controls', value: 'same missing' }]);
  assert.equal(errors.length, 2); assert.match(errors[0], /duplicate/); assert.match(errors[1], /missing/);
  assert.match(referenceProblems([], [{ label: 'terms', attribute: 'aria-controls', value: '   ' }])[0], /no target ID/);
});
test('positive indices precede natural order stably; hidden/disabled/negative never enter the route', () => {
  const controls = [{ id: 'first', tabIndex: 0 }, { id: 'later', tabIndex: 3 }, { id: 'priority', tabIndex: 1 }, { id: 'equal', tabIndex: 1 }, { id: 'last', tabIndex: 0 }, { id: 'disabled', tabIndex: 2, disabled: true }, { id: 'hidden', tabIndex: 1, hidden: true }, { id: 'programmatic', tabIndex: -1 }];
  const before = JSON.stringify(controls);
  assert.deepEqual(tabSequence(controls).map(v => v.id), ['priority', 'equal', 'later', 'first', 'last']); assert.equal(JSON.stringify(controls), before);
});
test('empty and all-excluded routes remain empty', () => {
  assert.deepEqual(tabSequence([]), []); assert.deepEqual(tabSequence([{ tabIndex: -1 }, { tabIndex: 0, hidden: true }]), []);
});
