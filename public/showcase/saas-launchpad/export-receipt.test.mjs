import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadReceiptGenerator } from './export-receipt.js';

describe('SaasLaunchpadReceiptGenerator (Issue #1039)', () => {
  it('initializes with default canvas dimensions and cloud branding options', () => {
    const generator = new SaasLaunchpadReceiptGenerator();
    assert.equal(generator.width, 640);
    assert.equal(generator.height, 840);
    assert.equal(generator.brandName, 'SAAS LAUNCHPAD CLOUD');
    assert.equal(generator.themeColors.primary, '#3b82f6');
  });

  it('calculates weighted modulo-10 parity checksum for billing invoices', () => {
    const generator = new SaasLaunchpadReceiptGenerator();
    const parity = generator.calculateBarcodeParity('INV-2026-CLOUD-9942');
    assert.ok(typeof parity === 'number');
    assert.ok(parity >= 0 && parity <= 9);

    // Empty string fallback
    assert.equal(generator.calculateBarcodeParity(''), 0);
  });

  it('generates binary barcode pattern with valid start/stop guard bits', () => {
    const generator = new SaasLaunchpadReceiptGenerator();
    const { pattern, fullCode, parity } = generator.generateBarcodePattern('INV-900');
    assert.ok(pattern.startsWith('101'));
    assert.ok(pattern.endsWith('101'));
    assert.ok(fullCode.startsWith('INV-900-'));
    assert.equal(fullCode.endsWith(String(parity)), true);
    assert.ok(/^[01]+$/.test(pattern));
  });

  it('draws barcode vectors and returns coordinate bounding metrics', () => {
    const generator = new SaasLaunchpadReceiptGenerator();
    const mockCtx = {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      fillText: () => {}
    };

    const result = generator.drawBarcode(mockCtx, 'INV-CLOUD-500', 60, 120, 320, 55);
    assert.equal(result.drawn, true);
    assert.equal(result.x, 60);
    assert.equal(result.y, 120);
    assert.equal(result.width, 320);
    assert.equal(result.height, 55);
    assert.ok(result.fullCode.startsWith('INV-CLOUD-500-'));

    // Null context handling
    const nullResult = generator.drawBarcode(null, 'CODE', 0, 0);
    assert.equal(nullResult.drawn, false);
  });

  it('renders canvas pass layout with customizable enterprise subscription metadata', () => {
    const generator = new SaasLaunchpadReceiptGenerator();
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
      customer: 'Acme Cloud Corp',
      invoiceId: 'INV-ACME-01',
      plan: 'ENTERPRISE SCALE',
      totalAmount: '$120,000.00 USD'
    });

    assert.equal(renderResult.success, true);
    assert.equal(renderResult.customer, 'Acme Cloud Corp');
    assert.equal(renderResult.invoiceId, 'INV-ACME-01');
    assert.equal(renderResult.dimensions.width, 640);
    assert.equal(renderResult.dimensions.height, 840);
  });

  it('safely handles non-browser environments for PNG download trigger', () => {
    const generator = new SaasLaunchpadReceiptGenerator();
    const result = generator.downloadBlob(null, 'test.png');
    assert.equal(result.success, false);
    assert.equal(result.reason, 'SSR / Non-browser environment');
  });
});
