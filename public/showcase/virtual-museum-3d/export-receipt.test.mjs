import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dReceiptGenerator } from './export-receipt.js';

test('VirtualMuseum3dReceiptGenerator - computes consistent barcode bit patterns', () => {
  const gen = new VirtualMuseum3dReceiptGenerator();
  const pattern1 = gen.computeBarcodePattern('REF-100');
  const pattern2 = gen.computeBarcodePattern('REF-100');

  assert.ok(Array.isArray(pattern1));
  assert.ok(pattern1.length > 0);
  assert.deepStrictEqual(pattern1, pattern2);

  const patternDiff = gen.computeBarcodePattern('DIFFERENT');
  assert.notDeepStrictEqual(pattern1, patternDiff);
});

test('VirtualMuseum3dReceiptGenerator - executes mock canvas context drawing calls without error', () => {
  const gen = new VirtualMuseum3dReceiptGenerator();

  const calls = [];
  const mockCtx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    fillRect: (x, y, w, h) => calls.push({ type: 'fillRect', x, y, w, h }),
    strokeRect: (x, y, w, h) => calls.push({ type: 'strokeRect', x, y, w, h }),
    fillText: (text, x, y) => calls.push({ type: 'fillText', text, x, y }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif'
  };

  gen.renderCanvas(mockCtx, {
    title: 'Test Certificate',
    recipient: 'Alice',
    refCode: 'CODE-99'
  });

  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('restore'));
  assert.ok(calls.some(c => c.type === 'fillText' && c.text.includes('Test Certificate')));
});
