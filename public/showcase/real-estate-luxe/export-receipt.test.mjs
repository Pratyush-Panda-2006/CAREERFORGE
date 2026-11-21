import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeReceiptGenerator } from './export-receipt.js';

describe('RealEstateLuxeReceiptGenerator (Issue #1055)', () => {
  it('initializes with default canvas dimensions and brand configuration', () => {
    const generator = new RealEstateLuxeReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'REAL ESTATE LUXE ESCROW & TITLE');
    const bounds = generator.getBounds();
    assert.equal(bounds.width, 640);
    assert.equal(bounds.height, 840);
    assert.ok(bounds.aspectRatio < 1);
  });

  it('calculates deterministic modulo-10 parity checksums for verification codes', () => {
    const generator = new RealEstateLuxeReceiptGenerator();
    const parity1 = generator.calculateBarcodeParity('LUXE-2026-E1055');
    const parity2 = generator.calculateBarcodeParity('LUXE-2026-E1055');
    assert.equal(parity1, parity2);
    assert.ok(parity1 >= 0 && parity1 <= 9);

    // Empty and invalid input handling
    assert.equal(generator.calculateBarcodeParity(''), 0);
    assert.equal(generator.calculateBarcodeParity(null), 0);
  });

  it('generates valid barcode bit patterns with sentinel start/stop markers', () => {
    const generator = new RealEstateLuxeReceiptGenerator();
    const result = generator.generateBarcodePattern('LUXE-1055');

    assert.ok(Array.isArray(result.pattern));
    assert.ok(result.pattern.length > 20);

    // Verify start sentinel: 101001
    assert.deepEqual(result.pattern.slice(0, 6), [1, 0, 1, 0, 0, 1]);

    // Verify stop sentinel: 110101
    assert.deepEqual(result.pattern.slice(-6), [1, 1, 0, 1, 0, 1]);

    // Verify all pattern elements are strictly 0 or 1
    result.pattern.forEach((bit) => {
      assert.ok(bit === 0 || bit === 1);
    });
  });

  it('draws barcode vectors accurately onto mock canvas context', () => {
    const generator = new RealEstateLuxeReceiptGenerator();
    const rectCalls = [];
    const textCalls = [];

    const mockCtx = {
      fillStyle: '',
      font: '',
      textAlign: '',
      fillRect: (x, y, w, h) => {
        rectCalls.push({ x, y, w, h });
      },
      fillText: (text, x, y) => {
        textCalls.push({ text, x, y });
      }
    };

    const drawn = generator.drawBarcode(mockCtx, 'LUXE-TEST', 50, 700, 2.0, 40);
    assert.ok(drawn);
    assert.ok(rectCalls.length > 10);
    assert.equal(textCalls.length, 1);
    assert.ok(drawn.totalWidth > 50);
  });

  it('renders complete certificate canvas layout without throwing exceptions', () => {
    const generator = new RealEstateLuxeReceiptGenerator();
    const actions = [];

    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      fillRect: (...args) => actions.push({ type: 'fillRect', args }),
      strokeRect: (...args) => actions.push({ type: 'strokeRect', args }),
      beginPath: () => actions.push({ type: 'beginPath' }),
      moveTo: (...args) => actions.push({ type: 'moveTo', args }),
      lineTo: (...args) => actions.push({ type: 'lineTo', args }),
      stroke: () => actions.push({ type: 'stroke' }),
      fill: () => actions.push({ type: 'fill' }),
      fillText: (...args) => actions.push({ type: 'fillText', args })
    };

    const rendered = generator.renderCanvas(mockCtx, {
      name: 'Vance Family Trust',
      estate: '100 Sunset Blvd',
      certId: 'LUXE-CERT-9901',
      valuation: 22000000
    });

    assert.equal(rendered, true);
    assert.ok(actions.length > 25);
    const hasName = actions.some(
      (a) => a.type === 'fillText' && a.args[0] === 'Vance Family Trust'
    );
    assert.ok(hasName);
  });

  it('handles null context and invalid canvas inputs safely', () => {
    const generator = new RealEstateLuxeReceiptGenerator();
    assert.equal(generator.renderCanvas(null), false);
    assert.equal(generator.drawBarcode(null, 'CODE'), null);
    assert.equal(generator.downloadBlob(null), false);
  });
});
