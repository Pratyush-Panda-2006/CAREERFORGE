import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusReceiptGenerator } from './export-receipt.js';

test('SmartIotNexusReceiptGenerator - calculates barcode parity bit pattern accurately', () => {
  const code = 'IOT-GW-55';
  const parity = SmartIotNexusReceiptGenerator.calculateBarcodeParity(code);

  assert.ok(typeof parity === 'string');
  assert.ok(parity.length >= code.length * 5);
  assert.match(parity, /^[01]+$/);
});

test('SmartIotNexusReceiptGenerator - generates receipt data with overrides', () => {
  const generator = new SmartIotNexusReceiptGenerator();
  const data = generator.generateReceiptData({
    gatewayName: 'Substation Edge Unit #9',
    telemetryThroughput: '3,200 msgs/sec',
    calibrationStatus: 'GRADE-A NIST'
  });

  assert.strictEqual(data.gatewayName, 'Substation Edge Unit #9');
  assert.strictEqual(data.telemetryThroughput, '3,200 msgs/sec');
  assert.strictEqual(data.calibrationStatus, 'GRADE-A NIST');
  assert.ok(data.deviceId.startsWith('IOT-GATEWAY-'));
  assert.ok(data.hardwareSignature.startsWith('0x'));
});

test('SmartIotNexusReceiptGenerator - computes barcode coordinate bounds correctly', () => {
  const generator = new SmartIotNexusReceiptGenerator({ width: 600, height: 400 });
  const mockCtx = {
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    fillStyle: ''
  };

  const bars = generator.drawBarcode(mockCtx, 'IOT-101', 40, 310, 520, 36);

  assert.ok(bars.length > 0);
  assert.strictEqual(bars[0].x, 40);
  assert.ok(bars[bars.length - 1].x < 565);
});

test('SmartIotNexusReceiptGenerator - renders canvas vector layout on mock context without throwing', () => {
  const generator = new SmartIotNexusReceiptGenerator();
  const operations = [];

  const mockCtx = {
    fillRect: (x, y, w, h) => operations.push(`fillRect ${x},${y}`),
    strokeRect: (x, y, w, h) => operations.push(`strokeRect ${x},${y}`),
    fillText: (text, x, y) => operations.push(`fillText ${text}`),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: ''
  };

  const payload = generator.renderCanvas(mockCtx, { gatewayName: 'Factory Floor Gateway' });
  assert.strictEqual(payload.gatewayName, 'Factory Floor Gateway');
  assert.ok(operations.some(op => op.includes('fillRect 0,0')));
  assert.ok(operations.some(op => op.includes('Factory Floor Gateway')));
});
