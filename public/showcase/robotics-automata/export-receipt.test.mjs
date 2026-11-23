import assert from 'node:assert/strict';
import test from 'node:test';
import {
  barcodeBits,
  poseDiagramPoints,
  poseReceipt,
  RoboticsAutomataReceiptGenerator,
} from './export-receipt.js';

test('uses the existing arm model for the joint and end position', () => {
  const straight = poseReceipt('Calibration A', 0, 0);
  assert.deepEqual(straight.joint, { x: 100, y: 0 });
  assert.deepEqual(straight.endpoint, { x: 175, y: 0 });
  assert.equal(poseReceipt('Calibration A', 0, 90).endpoint.y, 75);
});

test('normalizes out-of-range angles and keeps the pose code reproducible', () => {
  const clamped = poseReceipt('', 292, Number.NaN);
  assert.equal(clamped.title, 'Arm pose record');
  assert.equal(clamped.a, 180);
  assert.equal(clamped.b, 0);
  assert.equal(clamped.code, poseReceipt('Another label', 180, 0).code);
  assert.notEqual(clamped.code, poseReceipt('Another label', 179, 0).code);
});

test('keeps the arm geometry within the diagram at extreme and folded angles', () => {
  for (const a of [-180, -90, 0, 90, 180]) {
    for (const b of [-180, -90, 0, 90, 180]) {
      for (const { x, y } of poseDiagramPoints(poseReceipt('', a, b))) {
        assert.ok(x > 409 && x < 709);
        assert.ok(y > 154 && y < 387);
      }
    }
  }
});

test('adds start and stop guards and even parity per hex digit', () => {
  const bits = barcodeBits('012DEF');
  assert.match(bits, /^1011[01]{30}1101$/);
  for (const digit of bits.slice(4, -4).match(/.{5}/g)) {
    assert.equal([...digit].filter(bit => bit === '1').length % 2, 0);
  }
  assert.throws(() => barcodeBits('ZZZ'), RangeError);
});

test('draws a barcode within its expected canvas allocation', () => {
  const rects = [];
  const generator = new RoboticsAutomataReceiptGenerator({});
  const width = generator.drawBarcode({ fillRect: (...args) => rects.push(args) }, '012DEF', 40, 370);
  assert.equal(width, 114);
  assert.ok(rects.every(([x, y, w, h]) => x >= 40 && x + w <= 154 && y === 370 && y + h <= 400));
});

test('requests a PNG data URL and rejects an unavailable encoding', () => {
  const ready = new RoboticsAutomataReceiptGenerator({
    toDataURL(type) {
      assert.equal(type, 'image/png');
      return 'data:image/png;base64,iVBORw0KGgo=';
    },
  });
  assert.equal(ready.pngDataUrl(), 'data:image/png;base64,iVBORw0KGgo=');
  const empty = new RoboticsAutomataReceiptGenerator({ toDataURL: () => 'data:,' });
  assert.throws(() => empty.pngDataUrl(), /unavailable/);
});
