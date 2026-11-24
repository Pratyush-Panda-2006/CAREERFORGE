import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubMarkdownParser } from './markdown-editor.js';

describe('FestivalHubMarkdownParser', () => {
  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new FestivalHubMarkdownParser();
    const md = '# Main Header\n## Sub Heading\n### Section Title';
    const html = parser.parseMarkdown(md);

    assert.ok(html.includes('<h1>Main Header</h1>'));
    assert.ok(html.includes('<h2>Sub Heading</h2>'));
    assert.ok(html.includes('<h3>Section Title</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new FestivalHubMarkdownParser();
    const md = '> Important Note\n**bold statement** and *italic accent* with `inline code`';
    const html = parser.parseMarkdown(md);

    assert.ok(html.includes('<blockquote>Important Note</blockquote>'));
    assert.ok(html.includes('<strong>bold statement</strong>'));
    assert.ok(html.includes('<em>italic accent</em>'));
    assert.ok(html.includes('<code>inline code</code>'));
  });

  it('parses unordered checklists and bullet lists', () => {
    const parser = new FestivalHubMarkdownParser();
    const md = '- Item Alpha\n- Item Beta\n- Item Gamma';
    const html = parser.parseMarkdown(md);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Item Alpha</li>'));
    assert.ok(html.includes('<li>Item Beta</li>'));
    assert.ok(html.includes('<li>Item Gamma</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS', () => {
    const parser = new FestivalHubMarkdownParser();
    const malicious = '<script>alert("xss")<\/script><img src="x" onerror="evil()" /> Safe text';
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Safe text'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new FestivalHubMarkdownParser({ wordsPerMinute: 100 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.display, '0 min read');

    const sampleText = Array(150).fill('word').join(' ');
    const stats = parser.computeReadingTime(sampleText);
    assert.equal(stats.words, 150);
    assert.equal(stats.minutes, 2);
    assert.equal(stats.display, '2 min read');
  });
});
