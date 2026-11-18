import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixReceiptGenerator } from './export-receipt.js';

test('DefiYieldMatrixReceiptGenerator - calculates barcode parity bit pattern accurately', () => {
  const code = 'DYM-994';
  const parity = DefiYieldMatrixReceiptGenerator.calculateBarcodeParity(code);

  assert.ok(typeof parity === 'string');
  assert.ok(parity.length >= code.length * 5);
  // Contains only binary digits
  assert.match(parity, /^[01]+$/);
});

test('DefiYieldMatrixReceiptGenerator - generates receipt data with overrides', () => {
  const generator = new DefiYieldMatrixReceiptGenerator();
  const data = generator.generateReceiptData({
    pool: 'Arbitrum Alpha Yield',
    stakeAmount: '50,000 USDT',
    apy: '22.4% APY'
  });

  assert.strictEqual(data.pool, 'Arbitrum Alpha Yield');
  assert.strictEqual(data.stakeAmount, '50,000 USDT');
  assert.strictEqual(data.apy, '22.4% APY');
  assert.ok(data.certificateId.startsWith('DYM-'));
  assert.ok(data.txHash.startsWith('0x'));
});

test('DefiYieldMatrixReceiptGenerator - computes barcode coordinate bounds correctly', () => {
  const generator = new DefiYieldMatrixReceiptGenerator({ width: 600, height: 400 });
  const mockCtx = {
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    fillStyle: ''
  };

  const bars = generator.drawBarcode(mockCtx, 'TEST-123', 40, 310, 520, 36);

  assert.ok(bars.length > 0);
  assert.strictEqual(bars[0].x, 40);
  assert.ok(bars[bars.length - 1].x < 565);
});

test('DefiYieldMatrixReceiptGenerator - renders canvas vector layout on mock context without throwing', () => {
  const generator = new DefiYieldMatrixReceiptGenerator();
  const operations = [];

  const mockCtx = {
    fillRect: (x, y, w, h) => operations.push(`fillRect ${x},${y}`),
    strokeRect: (x, y, w, h) => operations.push(`strokeRect ${x},${y}`),
    fillText: (text, x, y) => operations.push(`fillText ${text}`),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: ''
  };

  const payload = generator.renderCanvas(mockCtx, { pool: 'WBTC Staking' });
  assert.strictEqual(payload.pool, 'WBTC Staking');
  assert.ok(operations.some(op => op.includes('fillRect 0,0')));
  assert.ok(operations.some(op => op.includes('WBTC Staking')));
});
