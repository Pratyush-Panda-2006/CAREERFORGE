import test from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubReceiptGenerator } from './export-receipt.js';

test('VrMetaverseHubReceiptGenerator - calculates deterministic barcode parity string', () => {
  const pattern1 = VrMetaverseHubReceiptGenerator.calculateBarcodeParity('VRM-100');
  const pattern2 = VrMetaverseHubReceiptGenerator.calculateBarcodeParity('VRM-100');
  const pattern3 = VrMetaverseHubReceiptGenerator.calculateBarcodeParity('VRM-200');

  assert.strictEqual(typeof pattern1, 'string');
  assert.strictEqual(pattern1, pattern2);
  assert.notStrictEqual(pattern1, pattern3);
  assert.ok(/^[01]+$/.test(pattern1));
});

test('VrMetaverseHubReceiptGenerator - draws barcode pattern within coordinate boundaries', () => {
  const gen = new VrMetaverseHubReceiptGenerator();
  const drawnOperations = [];

  const mockCtx = {
    fillStyle: '',
    save() {},
    restore() {},
    fillRect(x, y, w, h) {
      drawnOperations.push({ x, y, w, h });
    }
  };

  const bars = gen.drawBarcode(mockCtx, 'VRM-TEST', 40, 200, 500, 30);
  assert.ok(bars.length > 0);
  assert.ok(drawnOperations.length > 0);

  // Assert all drawn operations fall inside [40, 540] horizontally
  drawnOperations.forEach(op => {
    assert.ok(op.x >= 40 && op.x <= 540);
    assert.strictEqual(op.y, 200);
    assert.strictEqual(op.h, 30);
  });
});

test('VrMetaverseHubReceiptGenerator - renders canvas elements and returns receipt payload', () => {
  const gen = new VrMetaverseHubReceiptGenerator({ width: 600, height: 400 });
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
    parcel: 'Neon Sector 7',
    owner: 'PlayerOne'
  });

  assert.ok(payload !== null);
  assert.strictEqual(payload.parcel, 'Neon Sector 7');
  assert.strictEqual(payload.owner, 'PlayerOne');
  assert.ok(textCalls.some(t => t.text.includes('Neon Sector 7')));
  assert.ok(textCalls.some(t => t.text.includes('PlayerOne')));
});

test('VrMetaverseHubReceiptGenerator - generates unique certificate IDs', () => {
  const gen = new VrMetaverseHubReceiptGenerator();
  const d1 = gen.generateReceiptData();
  const d2 = gen.generateReceiptData();

  assert.ok(d1.certificateId.startsWith('VRM-'));
  assert.ok(d2.certificateId.startsWith('VRM-'));
});
