import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelQrGenerator } from './qr-generator.js';

describe('CybersecuritySentinelQrGenerator', () => {
  it('generates 21x21 QR matrix with finder patterns', () => {
    const gen = new CybersecuritySentinelQrGenerator();
    const res = gen.generateQrMatrix('https://careerforge.dev/test');
    assert.equal(res.size, 21);
    assert.equal(res.matrix.length, 21);
    assert.equal(res.matrix[0].length, 21);
    assert.equal(res.matrix[3][3], 1);
  });

  it('renders valid standalone SVG markup string', () => {
    const gen = new CybersecuritySentinelQrGenerator();
    const matrix = gen.generateQrMatrix('https://test.link');
    const svg = gen.renderSVG(matrix);
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('rect'));
  });

  it('supports headless asset export fallback', () => {
    const gen = new CybersecuritySentinelQrGenerator();
    const res = gen.downloadAsset('<svg></svg>');
    assert.equal(res, '<svg></svg>');
  });
});
