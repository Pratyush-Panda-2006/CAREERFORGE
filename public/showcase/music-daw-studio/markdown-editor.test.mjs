import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioMarkdownParser } from './markdown-editor.js';

describe('MusicDawStudioMarkdownParser', () => {
  let parser;

  beforeEach(() => {
    parser = new MusicDawStudioMarkdownParser({ wordsPerMinute: 200 });
  });

  it('parses markdown headings correctly into HTML elements', () => {
    const raw = '# Synthwave Production\n\n## FM Synthesizer\n\n### Bus Compressor';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<h1>Synthwave Production</h1>'));
    assert.ok(parsed.includes('<h2>FM Synthesizer</h2>'));
    assert.ok(parsed.includes('<h3>Bus Compressor</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const raw = '**Sawtooth Wave** with *polyphonic* unison.\n\n`attack = 10ms`\n\n> Cut low frequencies below 30Hz';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<strong>Sawtooth Wave</strong>'));
    assert.ok(parsed.includes('<em>polyphonic</em>'));
    assert.ok(parsed.includes('<code>attack = 10ms</code>'));
    assert.ok(parsed.includes('<blockquote>Cut low frequencies below 30Hz</blockquote>'));
  });

  it('parses unordered track instrument lists', () => {
    const raw = '- Kick drum\n- Acid Bass\n- Pad synth';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<li>Kick drum</li>'));
    assert.ok(parsed.includes('<li>Acid Bass</li>'));
    assert.ok(parsed.includes('<li>Pad synth</li>'));
  });

  it('sanitizes script tags and inline handlers to prevent XSS', () => {
    const dirty = '<script>run()</script><a href="javascript:void(0)">Link</a><img src="x" onerror="evil()">';
    const clean = parser.sanitizeHTML(dirty);

    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('onerror='), false);
    assert.equal(clean.includes('javascript:'), false);

    const parsed = parser.parseMarkdown('# Track\n\n<script>alert(1)</script>');
    assert.equal(parsed.includes('<script>'), false);
  });

  it('computes reading time and word counts accurately', () => {
    const text = Array(500).fill('audio').join(' ');
    const metrics = parser.computeReadingTime(text);

    assert.equal(metrics.words, 500);
    // 500 / 200 = ceil(2.5) = 3 minutes
    assert.equal(metrics.minutes, 3);
    assert.equal(metrics.text, '3 min read');

    const empty = parser.computeReadingTime('');
    assert.equal(empty.words, 0);
    assert.equal(empty.minutes, 0);
  });
});
