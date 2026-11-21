import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyReceiptGenerator } from './export-receipt.js';

describe('EdtechAcademyReceiptGenerator (Issue #1075)', () => {
  it('initializes with default canvas dimensions and brand configuration', () => {
    const generator = new EdtechAcademyReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'EDTECH ACADEMY GLOBAL ACCREDITATION');
    const bounds = generator.getBounds();
    assert.equal(bounds.width, 640);
    assert.equal(bounds.height, 840);
    assert.ok(bounds.aspectRatio < 1);
  });

  it('calculates deterministic modulo-10 parity checksums for verification codes', () => {
    const generator = new EdtechAcademyReceiptGenerator();
    const parity1 = generator.calculateBarcodeParity('EDTECH-ACADEMY-2026-TX1075');
    const parity2 = generator.calculateBarcodeParity('EDTECH-ACADEMY-2026-TX1075');
    assert.equal(parity1, parity2);
    assert.ok(parity1 >= 0 && parity1 <= 9);

    // Empty and invalid input handling
    assert.equal(generator.calculateBarcodeParity(''), 0);
    assert.equal(generator.calculateBarcodeParity(null), 0);
  });

  it('generates valid barcode bit patterns with sentinel start/stop markers', () => {
    const generator = new EdtechAcademyReceiptGenerator();
    const result = generator.generateBarcodePattern('EDTECH-ACADEMY-1075');

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
    const generator = new EdtechAcademyReceiptGenerator();
    const rectCalls = [];

    const mockCtx = {
      fillStyle: '',
      font: '',
      textAlign: '',
      fillRect: (x, y, w, h) => {
        rectCalls.push({ x, y, w, h });
      },
      fillText: () => {}
    };

    const out = generator.drawBarcode(mockCtx, 'EDTECH-ACADEMY-1075', 50, 700);
    assert.ok(out);
    assert.ok(rectCalls.length > 10);
    assert.ok(out.totalWidth > 100);
  });

  it('renders complete certificate canvas layout without runtime exceptions', () => {
    const generator = new EdtechAcademyReceiptGenerator();
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {}
    };

    const rendered = generator.renderCanvas(mockCtx, {
      name: 'Marcus Aurelius Vance',
      vault: 'ETA-DIPLOMA-2026-CS401',
      certId: 'EDTECH-ACADEMY-2026-TX1075',
      amount: 975
    });

    assert.equal(rendered, true);
  });
});
