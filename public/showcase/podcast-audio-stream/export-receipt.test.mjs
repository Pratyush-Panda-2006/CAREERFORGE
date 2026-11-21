import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamReceiptGenerator } from './export-receipt.js';

describe('PodcastAudioStreamReceiptGenerator (Issue #1079)', () => {
  it('initializes with default canvas dimensions and brand configuration', () => {
    const generator = new PodcastAudioStreamReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'PODCAST AUDIO STREAM BROADCASTING NETWORK');
    const bounds = generator.getBounds();
    assert.equal(bounds.width, 640);
    assert.equal(bounds.height, 840);
    assert.ok(bounds.aspectRatio < 1);
  });

  it('calculates deterministic modulo-10 parity checksums for verification codes', () => {
    const generator = new PodcastAudioStreamReceiptGenerator();
    const parity1 = generator.calculateBarcodeParity('PODCAST-AUDIO-STREAM-2026-TX1079');
    const parity2 = generator.calculateBarcodeParity('PODCAST-AUDIO-STREAM-2026-TX1079');
    assert.equal(parity1, parity2);
    assert.ok(parity1 >= 0 && parity1 <= 9);

    // Empty and invalid input handling
    assert.equal(generator.calculateBarcodeParity(''), 0);
    assert.equal(generator.calculateBarcodeParity(null), 0);
  });

  it('generates valid barcode bit patterns with sentinel start/stop markers', () => {
    const generator = new PodcastAudioStreamReceiptGenerator();
    const result = generator.generateBarcodePattern('PODCAST-AUDIO-STREAM-1079');

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
    const generator = new PodcastAudioStreamReceiptGenerator();
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

    const out = generator.drawBarcode(mockCtx, 'PODCAST-AUDIO-STREAM-1079', 50, 700);
    assert.ok(out);
    assert.ok(rectCalls.length > 10);
    assert.ok(out.totalWidth > 100);
  });

  it('renders complete certificate canvas layout without runtime exceptions', () => {
    const generator = new PodcastAudioStreamReceiptGenerator();
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
      name: 'Nexus Wavecast Studios Ltd',
      vault: 'PAS-AUDIO-2026-EP1076',
      certId: 'PODCAST-AUDIO-STREAM-2026-TX1079',
      amount: 18450
    });

    assert.equal(rendered, true);
  });
});
