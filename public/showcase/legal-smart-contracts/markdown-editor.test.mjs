import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsMarkdownParser } from './markdown-editor.js';

describe('LegalSmartContractsMarkdownParser', () => {
  let parser;

  beforeEach(() => {
    parser = new LegalSmartContractsMarkdownParser({ wordsPerMinute: 200 });
  });

  it('parses markdown headings correctly into HTML elements', () => {
    const raw = '# Ricardian Agreement\n\n## Arbitration Rules\n\n### Escrow Timelock';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<h1>Ricardian Agreement</h1>'));
    assert.ok(parsed.includes('<h2>Arbitration Rules</h2>'));
    assert.ok(parsed.includes('<h3>Escrow Timelock</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const raw = '**Collateral Deposit** required for *arbitration* eligibility.\n\n`address arbiter`\n\n> Signed by buyer and seller';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<strong>Collateral Deposit</strong>'));
    assert.ok(parsed.includes('<em>arbitration</em>'));
    assert.ok(parsed.includes('<code>address arbiter</code>'));
    assert.ok(parsed.includes('<blockquote>Signed by buyer and seller</blockquote>'));
  });

  it('parses unordered contract clause items', () => {
    const raw = '- Clause 1: Deposit\n- Clause 2: Verification\n- Clause 3: Release';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<li>Clause 1: Deposit</li>'));
    assert.ok(parsed.includes('<li>Clause 2: Verification</li>'));
    assert.ok(parsed.includes('<li>Clause 3: Release</li>'));
  });

  it('sanitizes malicious script tags and event handlers to prevent XSS', () => {
    const dirty = '<script>document.cookie</script><a href="javascript:steal()">Click</a><img src="x" onerror="hack()">';
    const clean = parser.sanitizeHTML(dirty);

    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('onerror='), false);
    assert.equal(clean.includes('javascript:'), false);

    const parsed = parser.parseMarkdown('# Spec\n\n<script>alert(1)</script>');
    assert.equal(parsed.includes('<script>'), false);
  });

  it('computes reading time and word counts accurately', () => {
    const text = Array(600).fill('contract').join(' ');
    const metrics = parser.computeReadingTime(text);

    assert.equal(metrics.words, 600);
    // 600 / 200 = 3 minutes
    assert.equal(metrics.minutes, 3);
    assert.equal(metrics.text, '3 min read');

    const empty = parser.computeReadingTime('');
    assert.equal(empty.words, 0);
    assert.equal(empty.minutes, 0);
  });
});
