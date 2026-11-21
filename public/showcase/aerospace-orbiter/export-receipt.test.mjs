import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterReceiptGenerator } from './export-receipt.js';

describe('AerospaceOrbiterReceiptGenerator (Issue #1107)', () => {
  it('initializes with default canvas dimensions and brand configuration', () => {
    const generator = new AerospaceOrbiterReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'AEROSPACE ORBITER FLIGHT OPERATIONS COMMAND');
    const bounds = generator.getBounds();
    assert.equal(bounds.width, 640);
    assert.equal(bounds.height, 840);
    assert.ok(bounds.aspectRatio < 1);
  });

  it('calculates deterministic modulo-10 parity checksums for verification codes', () => {
    const generator = new AerospaceOrbiterReceiptGenerator();
    const parity1 = generator.calculateBarcodeParity('AEROSPACE-ORBITER-2026-TX1107');
    const parity2 = generator.calculateBarcodeParity('AEROSPACE-ORBITER-2026-TX1107');
    assert.equal(parity1, parity2);
    assert.ok(parity1 >= 0 && parity1 <= 9);

    // Empty and invalid input handling
    assert.equal(generator.calculateBarcodeParity(''), 0);
    assert.equal(generator.calculateBarcodeParity(null), 0);
  });

  it('generates valid barcode bit patterns with sentinel start/stop markers', () => {
    const generator = new AerospaceOrbiterReceiptGenerator();
    const result = generator.generateBarcodePattern('AEROSPACE-ORBITER-1107');

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
    const generator = new AerospaceOrbiterReceiptGenerator();
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

    const out = generator.drawBarcode(mockCtx, 'AEROSPACE-ORBITER-1107', 50, 700);
    assert.ok(out);
    assert.ok(rectCalls.length > 10);
    assert.ok(out.totalWidth > 100);
  });

  it('renders complete certificate canvas layout without runtime exceptions', () => {
    const generator = new AerospaceOrbiterReceiptGenerator();
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
      name: 'International Deep Space Consortium',
      vault: 'AO-ORBIT-2026-COSPAR1104',
      certId: 'AEROSPACE-ORBITER-2026-TX1107',
      amount: 6500
    });

    assert.equal(rendered, true);
  });
});
