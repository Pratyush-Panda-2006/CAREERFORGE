import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansMarkdownParser } from './markdown-editor.js';

describe('CharityMicroloansMarkdownParser', () => {
  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new CharityMicroloansMarkdownParser();
    const markdown = `# Level 1 Global Syndicate\n## Level 2 Borrower Profile\n### Level 3 Repayment Schedule`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Level 1 Global Syndicate</h1>'));
    assert.ok(html.includes('<h2>Level 2 Borrower Profile</h2>'));
    assert.ok(html.includes('<h3>Level 3 Repayment Schedule</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new CharityMicroloansMarkdownParser();
    const markdown = `> 100% of capital is recycled\n**Zero Interest** and *Guarantor Vouching* with \`micro-ledger\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>100% of capital is recycled</blockquote>'));
    assert.ok(html.includes('<strong>Zero Interest</strong>'));
    assert.ok(html.includes('<em>Guarantor Vouching</em>'));
    assert.ok(html.includes('<code>micro-ledger</code>'));
  });

  it('parses unordered borrower checklist lists', () => {
    const parser = new CharityMicroloansMarkdownParser();
    const markdown = `- Mobile Wallet Onboarding\n- Agricultural Machinery Budget\n- Co-op Leader Verification`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Mobile Wallet Onboarding</li>'));
    assert.ok(html.includes('<li>Agricultural Machinery Budget</li>'));
    assert.ok(html.includes('<li>Co-op Leader Verification</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS', () => {
    const parser = new CharityMicroloansMarkdownParser();
    const malicious = `<script>alert("xss")</script><img src="x" onerror="stealData()"/>Safe impact data`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Safe impact data'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new CharityMicroloansMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('impact').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');

    const words450 = new Array(450).fill('microfinance').join(' ');
    const stats450 = parser.computeReadingTime(words450);
    assert.equal(stats450.words, 450);
    assert.equal(stats450.minutes, 3);
    assert.equal(stats450.display, '3 min read');
  });
});
