import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasMarkdownParser } from './markdown-editor.js';

describe('WeatherRadarAtlasMarkdownParser', () => {
  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new WeatherRadarAtlasMarkdownParser();
    const markdown = `# Level 1 Storm System\n## Level 2 Doppler Cut\n### Level 3 Reflectivity dBZ`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Level 1 Storm System</h1>'));
    assert.ok(html.includes('<h2>Level 2 Doppler Cut</h2>'));
    assert.ok(html.includes('<h3>Level 3 Reflectivity dBZ</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new WeatherRadarAtlasMarkdownParser();
    const markdown = `> Tornado warning issued\n**Severe Supercell** and *Hail Core* with \`nexrad-sweep\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Tornado warning issued</blockquote>'));
    assert.ok(html.includes('<strong>Severe Supercell</strong>'));
    assert.ok(html.includes('<em>Hail Core</em>'));
    assert.ok(html.includes('<code>nexrad-sweep</code>'));
  });

  it('parses unordered storm parameter checklist lists', () => {
    const parser = new WeatherRadarAtlasMarkdownParser();
    const markdown = `- Gate-to-Gate Shear Analysis\n- Differential Phase Shift\n- Vertically Integrated Liquid (VIL)`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Gate-to-Gate Shear Analysis</li>'));
    assert.ok(html.includes('<li>Differential Phase Shift</li>'));
    assert.ok(html.includes('<li>Vertically Integrated Liquid (VIL)</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS', () => {
    const parser = new WeatherRadarAtlasMarkdownParser();
    const malicious = `<script>alert("xss")</script><img src="x" onerror="stealData()"/>Safe radar observations`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Safe radar observations'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new WeatherRadarAtlasMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('weather').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');

    const words450 = new Array(450).fill('meteorology').join(' ');
    const stats450 = parser.computeReadingTime(words450);
    assert.equal(stats450.words, 450);
    assert.equal(stats450.minutes, 3);
    assert.equal(stats450.display, '3 min read');
  });
});
