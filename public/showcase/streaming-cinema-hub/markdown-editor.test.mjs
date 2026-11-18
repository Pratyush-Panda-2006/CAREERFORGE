import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubMarkdownParser } from './markdown-editor.js';

describe('StreamingCinemaHubMarkdownParser', () => {
  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new StreamingCinemaHubMarkdownParser();
    const markdown = `# Level 1 4K HDR Stream\n## Level 2 Color Mastering\n### Level 3 Atmos Channels`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Level 1 4K HDR Stream</h1>'));
    assert.ok(html.includes('<h2>Level 2 Color Mastering</h2>'));
    assert.ok(html.includes('<h3>Level 3 Atmos Channels</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new StreamingCinemaHubMarkdownParser();
    const markdown = `> Theatrical grading active\n**Dolby Vision** and *Rec.2020* with \`av1-decoder\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Theatrical grading active</blockquote>'));
    assert.ok(html.includes('<strong>Dolby Vision</strong>'));
    assert.ok(html.includes('<em>Rec.2020</em>'));
    assert.ok(html.includes('<code>av1-decoder</code>'));
  });

  it('parses unordered cinema technical checklist lists', () => {
    const parser = new StreamingCinemaHubMarkdownParser();
    const markdown = `- 12-Bit Master Quantization\n- Spatial Audio Downmix Test\n- Seamless CDN Failover`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>12-Bit Master Quantization</li>'));
    assert.ok(html.includes('<li>Spatial Audio Downmix Test</li>'));
    assert.ok(html.includes('<li>Seamless CDN Failover</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS', () => {
    const parser = new StreamingCinemaHubMarkdownParser();
    const malicious = `<script>alert("xss")</script><img src="x" onerror="stealData()"/>Safe film description`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Safe film description'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new StreamingCinemaHubMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('cinema').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');

    const words450 = new Array(450).fill('streaming').join(' ');
    const stats450 = parser.computeReadingTime(words450);
    assert.equal(stats450.words, 450);
    assert.equal(stats450.minutes, 3);
    assert.equal(stats450.display, '3 min read');
  });
});
