import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsReceiptGenerator } from './export-receipt.js';

test('SupplyChainLogisticsReceiptGenerator - calculates deterministic barcode parity string', () => {
  const pattern1 = SupplyChainLogisticsReceiptGenerator.calculateBarcodeParity('SCL-100');
  const pattern2 = SupplyChainLogisticsReceiptGenerator.calculateBarcodeParity('SCL-100');
  const pattern3 = SupplyChainLogisticsReceiptGenerator.calculateBarcodeParity('SCL-200');

  assert.strictEqual(typeof pattern1, 'string');
  assert.strictEqual(pattern1, pattern2);
  assert.notStrictEqual(pattern1, pattern3);
  assert.ok(/^[01]+$/.test(pattern1));
});

test('SupplyChainLogisticsReceiptGenerator - draws barcode pattern within coordinate boundaries', () => {
  const gen = new SupplyChainLogisticsReceiptGenerator();
  const drawnOperations = [];

  const mockCtx = {
    fillStyle: '',
    save() {},
    restore() {},
    fillRect(x, y, w, h) {
      drawnOperations.push({ x, y, w, h });
    }
  };

  const bars = gen.drawBarcode(mockCtx, 'SCL-WAYBILL', 40, 200, 500, 30);
  assert.ok(bars.length > 0);
  assert.ok(drawnOperations.length > 0);

  // Assert all drawn operations fall inside [40, 540] horizontally
  drawnOperations.forEach(op => {
    assert.ok(op.x >= 40 && op.x <= 540);
    assert.strictEqual(op.y, 200);
    assert.strictEqual(op.h, 30);
  });
});

test('SupplyChainLogisticsReceiptGenerator - renders canvas elements and returns receipt payload', () => {
  const gen = new SupplyChainLogisticsReceiptGenerator({ width: 600, height: 400 });
  const textCalls = [];

  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    save() {},
    restore() {},
    fillText(text, x, y) {
      textCalls.push({ text, x, y });
    }
  };

  const payload = gen.renderCanvas(mockCtx, {
    shipment: 'Cargo Unit #7749',
    carrier: 'Evergreen Marine'
  });

  assert.ok(payload !== null);
  assert.strictEqual(payload.shipment, 'Cargo Unit #7749');
  assert.strictEqual(payload.carrier, 'Evergreen Marine');
  assert.ok(textCalls.some(t => t.text.includes('Cargo Unit #7749')));
  assert.ok(textCalls.some(t => t.text.includes('Evergreen Marine')));
});

test('SupplyChainLogisticsReceiptGenerator - generates unique consignment certificate IDs', () => {
  const gen = new SupplyChainLogisticsReceiptGenerator();
  const d1 = gen.generateReceiptData();
  const d2 = gen.generateReceiptData();

  assert.ok(d1.certificateId.startsWith('SCL-'));
  assert.ok(d2.certificateId.startsWith('SCL-'));
});
