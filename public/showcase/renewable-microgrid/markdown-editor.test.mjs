import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridMarkdownParser } from './markdown-editor.js';

describe('RenewableMicrogridMarkdownParser', () => {
  it('instantiates correctly with proper name and reading speed', () => {
    const parser = new RenewableMicrogridMarkdownParser();
    assert.equal(parser.name, 'RenewableMicrogridMarkdownParser');
    assert.equal(parser.wordsPerMinute, 200);
  });

  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new RenewableMicrogridMarkdownParser();
    const markdown = `# Alpine Expedition Log\n## High Camp Route\n### Altitude Telemetry`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Alpine Expedition Log</h1>'));
    assert.ok(html.includes('<h2>High Camp Route</h2>'));
    assert.ok(html.includes('<h3>Altitude Telemetry</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new RenewableMicrogridMarkdownParser();
    const markdown = `> Storm warning issued\n**Crampons** and *Thermal Bivouac* with \`gps_tracker\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Storm warning issued</blockquote>'));
    assert.ok(html.includes('<strong>Crampons</strong>'));
    assert.ok(html.includes('<em>Thermal Bivouac</em>'));
    assert.ok(html.includes('<code>gps_tracker</code>'));
  });

  it('parses unordered travel route checklist items', () => {
    const parser = new RenewableMicrogridMarkdownParser();
    const markdown = `- High Camp Setup\n- Fixed Line Rigging\n- Weather Telemetry Check`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>High Camp Setup</li>'));
    assert.ok(html.includes('<li>Fixed Line Rigging</li>'));
    assert.ok(html.includes('<li>Weather Telemetry Check</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS vulnerabilities', () => {
    const parser = new RenewableMicrogridMarkdownParser();
    const malicious = `<script>alert("pwned")</script><img src="x" onerror="stealCredentials()"/>Alpine Waypoint`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Alpine Waypoint'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new RenewableMicrogridMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('voyage').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');
  });
});
