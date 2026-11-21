import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyReceiptGenerator } from './export-receipt.js';

describe('TravelOdysseyReceiptGenerator (Issue #1071)', () => {
  it('initializes with default canvas dimensions and brand configuration', () => {
    const generator = new TravelOdysseyReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'TRAVEL ODYSSEY GLOBAL ITINERARY & EXPEDITIONS');
    const bounds = generator.getBounds();
    assert.equal(bounds.width, 640);
    assert.equal(bounds.height, 840);
    assert.ok(bounds.aspectRatio < 1);
  });

  it('calculates deterministic modulo-10 parity checksums for verification codes', () => {
    const generator = new TravelOdysseyReceiptGenerator();
    const parity1 = generator.calculateBarcodeParity('TRAVEL-ODYSSEY-2026-TX1071');
    const parity2 = generator.calculateBarcodeParity('TRAVEL-ODYSSEY-2026-TX1071');
    assert.equal(parity1, parity2);
    assert.ok(parity1 >= 0 && parity1 <= 9);

    // Empty and invalid input handling
    assert.equal(generator.calculateBarcodeParity(''), 0);
    assert.equal(generator.calculateBarcodeParity(null), 0);
  });

  it('generates valid barcode bit patterns with sentinel start/stop markers', () => {
    const generator = new TravelOdysseyReceiptGenerator();
    const result = generator.generateBarcodePattern('TRAVEL-ODYSSEY-1071');

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
    const generator = new TravelOdysseyReceiptGenerator();
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

    const out = generator.drawBarcode(mockCtx, 'TRAVEL-ODYSSEY-1071', 50, 700);
    assert.ok(out);
    assert.ok(rectCalls.length > 10);
    assert.ok(out.totalWidth > 100);
  });

  it('renders complete certificate canvas layout without runtime exceptions', () => {
    const generator = new TravelOdysseyReceiptGenerator();
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
      name: 'Elena Rostova (Global Explorer)',
      vault: 'TO-EXPED-2026-TYO99',
      certId: 'TRAVEL-ODYSSEY-2026-TX1071',
      amount: 4850
    });

    assert.equal(rendered, true);
  });
});
