import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceMarkdownParser } from './markdown-editor.js';

describe('NeurotechInterfaceMarkdownParser', () => {
  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new NeurotechInterfaceMarkdownParser();
    const markdown = `# Level 1 Neural BCI Pipeline\n## Level 2 EEG Montage\n### Level 3 Kalman Decoding`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Level 1 Neural BCI Pipeline</h1>'));
    assert.ok(html.includes('<h2>Level 2 EEG Montage</h2>'));
    assert.ok(html.includes('<h3>Level 3 Kalman Decoding</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new NeurotechInterfaceMarkdownParser();
    const markdown = `> Low impedance verified\n**Active Shielding** and *Bandpass Filter* with \`eeg-stream\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Low impedance verified</blockquote>'));
    assert.ok(html.includes('<strong>Active Shielding</strong>'));
    assert.ok(html.includes('<em>Bandpass Filter</em>'));
    assert.ok(html.includes('<code>eeg-stream</code>'));
  });

  it('parses unordered neural calibration checklist lists', () => {
    const parser = new NeurotechInterfaceMarkdownParser();
    const markdown = `- Scalp Impedance Check < 5kOhm\n- EOG Blink Rejection Calibration\n- Motor Cortex Spike Clustering`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Scalp Impedance Check < 5kOhm</li>'));
    assert.ok(html.includes('<li>EOG Blink Rejection Calibration</li>'));
    assert.ok(html.includes('<li>Motor Cortex Spike Clustering</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS', () => {
    const parser = new NeurotechInterfaceMarkdownParser();
    const malicious = `<script>alert("xss")</script><img src="x" onerror="stealData()"/>Safe neural data`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Safe neural data'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new NeurotechInterfaceMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('neuro').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');

    const words450 = new Array(450).fill('interface').join(' ');
    const stats450 = parser.computeReadingTime(words450);
    assert.equal(stats450.words, 450);
    assert.equal(stats450.minutes, 3);
    assert.equal(stats450.display, '3 min read');
  });
});
