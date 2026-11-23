import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeReceiptGenerator } from './export-receipt.js';

describe('QuantumForgeReceiptGenerator', () => {
  it('initializes with default canvas dimensions and brand configuration', () => {
    const generator = new QuantumForgeReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    const bounds = generator.getBounds();
    assert.equal(bounds.width, 640);
    assert.equal(bounds.height, 840);
  });

  it('calculates deterministic modulo-10 parity checksums for verification codes', () => {
    const generator = new QuantumForgeReceiptGenerator();
    const parity1 = generator.calculateBarcodeParity('QF-ENTANGLE-2026-CERT-1111');
    const parity2 = generator.calculateBarcodeParity('QF-ENTANGLE-2026-CERT-1111');
    assert.equal(parity1, parity2);
    assert.ok(parity1 >= 0 && parity1 <= 9);
    assert.equal(generator.calculateBarcodeParity(''), 0);
  });

  it('generates valid barcode bit patterns with sentinel markers', () => {
    const generator = new QuantumForgeReceiptGenerator();
    const result = generator.generateBarcodePattern('QF-ENTANGLE-2026-CERT-1111');
    assert.ok(Array.isArray(result.pattern));
    assert.ok(result.pattern.length > 20);
    assert.deepEqual(result.pattern.slice(0, 6), [1, 0, 1, 0, 0, 1]);
    assert.deepEqual(result.pattern.slice(-6), [1, 1, 0, 1, 0, 1]);
  });

  it('draws barcode vectors onto mock canvas context', () => {
    const generator = new QuantumForgeReceiptGenerator();
    const rectCalls = [];
    const mockCtx = {
      fillStyle: '', font: '', textAlign: '',
      fillRect: (x, y, w, h) => { rectCalls.push({ x, y, w, h }); },
      fillText: () => {}
    };
    const out = generator.drawBarcode(mockCtx, 'QF-ENTANGLE-2026-CERT-1111', 50, 700);
    assert.ok(out);
    assert.ok(rectCalls.length > 10);
  });

  it('renders complete certificate canvas layout without runtime exceptions', () => {
    const generator = new QuantumForgeReceiptGenerator();
    const mockCtx = {
      fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '',
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {}, fillText: () => {}
    };
    const rendered = generator.renderCanvas(mockCtx, { name: 'Test Org', certId: 'QF-ENTANGLE-2026-CERT-1111' });
    assert.equal(rendered, true);
  });
});
