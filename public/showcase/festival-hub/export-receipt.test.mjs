import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubReceiptGenerator } from './export-receipt.js';

describe('FestivalHubReceiptGenerator (Issue #1035)', () => {
  it('initializes with default canvas dimensions and branding options', () => {
    const generator = new FestivalHubReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'FESTIVAL HUB LIVE');
    assert.equal(generator.themeColors.accent, '#ec4899');
  });

  it('calculates weighted modulo-10 parity checksum for ticket barcodes', () => {
    const generator = new FestivalHubReceiptGenerator();
    const parity = generator.calculateBarcodeParity('FEST-2026-VIP-8891');
    assert.ok(typeof parity === 'number');
    assert.ok(parity >= 0 && parity <= 9);

    // Empty string edge case
    assert.equal(generator.calculateBarcodeParity(''), 0);
  });

  it('generates binary barcode pattern with valid start/stop guard bits', () => {
    const generator = new FestivalHubReceiptGenerator();
    const { pattern, fullCode, parity } = generator.generateBarcodePattern('TKT-990');
    assert.ok(pattern.startsWith('101')); // Start guard
    assert.ok(pattern.endsWith('101'));   // Stop guard
    assert.ok(fullCode.startsWith('TKT-990-'));
    assert.equal(fullCode.endsWith(String(parity)), true);
    assert.ok(/^[01]+$/.test(pattern)); // Only 0s and 1s
  });

  it('draws barcode vectors and returns coordinate bounding metrics', () => {
    const generator = new FestivalHubReceiptGenerator();
    const mockCtx = {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      fillText: () => {}
    };

    const result = generator.drawBarcode(mockCtx, 'FEST-PASS-100', 50, 100, 300, 50);
    assert.equal(result.drawn, true);
    assert.equal(result.x, 50);
    assert.equal(result.y, 100);
    assert.equal(result.width, 300);
    assert.equal(result.height, 50);
    assert.ok(result.fullCode.startsWith('FEST-PASS-100-'));

    // Null context handling
    const nullResult = generator.drawBarcode(null, 'CODE', 0, 0);
    assert.equal(nullResult.drawn, false);
  });

  it('renders canvas pass layout with customizable attendee and event metadata', () => {
    const generator = new FestivalHubReceiptGenerator();
    const mockCtx = {
      clearRect: () => {},
      fillRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillText: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {}
    };

    const renderResult = generator.renderCanvas(mockCtx, {
      attendee: 'Morgan Freeman',
      ticketId: 'VIP-777',
      tier: 'ALL-ACCESS PASS',
      totalAmount: '$499.00 USD'
    });

    assert.equal(renderResult.success, true);
    assert.equal(renderResult.attendee, 'Morgan Freeman');
    assert.equal(renderResult.ticketId, 'VIP-777');
    assert.equal(renderResult.dimensions.width, 640);
    assert.equal(renderResult.dimensions.height, 840);
  });

  it('safely handles non-browser environments for PNG download trigger', () => {
    const generator = new FestivalHubReceiptGenerator();
    const result = generator.downloadBlob(null, 'test.png');
    assert.equal(result.success, false);
    assert.equal(result.reason, 'SSR / Non-browser environment');
  });
});
