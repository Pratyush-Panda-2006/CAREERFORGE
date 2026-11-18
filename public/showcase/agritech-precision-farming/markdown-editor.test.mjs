import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingMarkdownParser } from './markdown-editor.js';

describe('AgritechPrecisionFarmingMarkdownParser', () => {
  let parser;

  beforeEach(() => {
    parser = new AgritechPrecisionFarmingMarkdownParser({ wordsPerMinute: 200 });
  });

  it('parses markdown headings correctly into HTML tags', () => {
    const raw = '# Field Operations\n\n## Subsurface Drip\n\n### Sensor Calibration';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<h1>Field Operations</h1>'));
    assert.ok(parsed.includes('<h2>Subsurface Drip</h2>'));
    assert.ok(parsed.includes('<h3>Sensor Calibration</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const raw = '**High Nitrogen** alert with *elevated* soil tension.\n\n`pH = 6.8`\n\n> Important sensor note';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<strong>High Nitrogen</strong>'));
    assert.ok(parsed.includes('<em>elevated</em>'));
    assert.ok(parsed.includes('<code>pH = 6.8</code>'));
    assert.ok(parsed.includes('<blockquote>Important sensor note</blockquote>'));
  });

  it('parses unordered list items', () => {
    const raw = '- Probe A\n- Probe B\n- Probe C';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<li>Probe A</li>'));
    assert.ok(parsed.includes('<li>Probe B</li>'));
    assert.ok(parsed.includes('<li>Probe C</li>'));
  });

  it('sanitizes script tags and malicious attributes to prevent XSS', () => {
    const dangerous = '<script>alert("xss")</script><img src="x" onerror="evil()"><iframe src="bad.com"></iframe>';
    const clean = parser.sanitizeHTML(dangerous);

    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('onerror='), false);
    assert.equal(clean.includes('<iframe'), false);

    const parsed = parser.parseMarkdown('# Title\n\n<script>alert(1)</script>');
    assert.equal(parsed.includes('<script>'), false);
  });

  it('accurately computes reading time and word counts', () => {
    const sampleText = Array(450).fill('sensor').join(' ');
    const metrics = parser.computeReadingTime(sampleText);

    assert.equal(metrics.words, 450);
    // 450 words / 200 wpm = ceil(2.25) = 3 minutes
    assert.equal(metrics.minutes, 3);
    assert.equal(metrics.text, '3 min read');

    const emptyMetrics = parser.computeReadingTime('');
    assert.equal(emptyMetrics.words, 0);
    assert.equal(emptyMetrics.minutes, 0);
  });
});
