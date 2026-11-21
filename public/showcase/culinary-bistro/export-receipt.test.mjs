import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroReceiptGenerator } from './export-receipt.js';

describe('CulinaryBistroReceiptGenerator (Issue #1051)', () => {
  it('initializes with default canvas dimensions and brand configuration', () => {
    const generator = new CulinaryBistroReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'CULINARY BISTRO FINE DINING');
    const bounds = generator.getBounds();
    assert.equal(bounds.width, 640);
    assert.equal(bounds.height, 840);
    assert.ok(bounds.aspectRatio < 1);
  });

  it('calculates deterministic modulo-10 parity checksums for verification codes', () => {
    const generator = new CulinaryBistroReceiptGenerator();
    const parity1 = generator.calculateBarcodeParity('BISTRO-2026-T1051');
    const parity2 = generator.calculateBarcodeParity('BISTRO-2026-T1051');
    assert.equal(parity1, parity2);
    assert.ok(parity1 >= 0 && parity1 <= 9);

    // Empty and invalid input handling
    assert.equal(generator.calculateBarcodeParity(''), 0);
    assert.equal(generator.calculateBarcodeParity(null), 0);
  });

  it('generates valid barcode bit patterns with sentinel start/stop markers', () => {
    const generator = new CulinaryBistroReceiptGenerator();
    const result = generator.generateBarcodePattern('BISTRO-1051');

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
    const generator = new CulinaryBistroReceiptGenerator();
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

    const drawn = generator.drawBarcode(mockCtx, 'BISTRO-TEST', 50, 700, 2.0, 40);
    assert.ok(drawn);
    assert.ok(rectCalls.length > 10);
    assert.equal(textCalls.length, 1);
    assert.ok(drawn.totalWidth > 50);
  });

  it('renders complete certificate canvas layout without throwing exceptions', () => {
    const generator = new CulinaryBistroReceiptGenerator();
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
      name: 'Chef Michael',
      table: 'Chef Table 1',
      certId: 'BISTRO-CERT-7721',
      amount: 450
    });

    assert.equal(rendered, true);
    assert.ok(actions.length > 25);
    const hasName = actions.some(
      (a) => a.type === 'fillText' && a.args[0] === 'Chef Michael'
    );
    assert.ok(hasName);
  });

  it('handles null context and invalid canvas inputs safely', () => {
    const generator = new CulinaryBistroReceiptGenerator();
    assert.equal(generator.renderCanvas(null), false);
    assert.equal(generator.drawBarcode(null, 'CODE'), null);
    assert.equal(generator.downloadBlob(null), false);
  });
});
