import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenMarkdownParser } from './markdown-editor.js';

describe('PetAdoptionHavenMarkdownParser', () => {
  let parser;

  beforeEach(() => {
    parser = new PetAdoptionHavenMarkdownParser({ wordsPerMinute: 200 });
  });

  it('parses markdown headings correctly into HTML elements', () => {
    const raw = '# Foster Care Guide\n\n## Feeding Schedule\n\n### Veterinary Emergency';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<h1>Foster Care Guide</h1>'));
    assert.ok(parsed.includes('<h2>Feeding Schedule</h2>'));
    assert.ok(parsed.includes('<h3>Veterinary Emergency</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const raw = '**Rabies Vaccine** required before *foster* placement.\n\n`tablet count = 2`\n\n> Decompress in quiet room';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<strong>Rabies Vaccine</strong>'));
    assert.ok(parsed.includes('<em>foster</em>'));
    assert.ok(parsed.includes('<code>tablet count = 2</code>'));
    assert.ok(parsed.includes('<blockquote>Decompress in quiet room</blockquote>'));
  });

  it('parses unordered list care instructions', () => {
    const raw = '- Fresh water\n- Crate training\n- Leash exercise';
    const parsed = parser.parseMarkdown(raw);

    assert.ok(parsed.includes('<li>Fresh water</li>'));
    assert.ok(parsed.includes('<li>Crate training</li>'));
    assert.ok(parsed.includes('<li>Leash exercise</li>'));
  });

  it('sanitizes malicious script tags and inline handlers to prevent XSS', () => {
    const dirty = '<script>bad()</script><a href="javascript:void(0)">Link</a><img src="x" onerror="alert(1)">';
    const clean = parser.sanitizeHTML(dirty);

    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('onerror='), false);
    assert.equal(clean.includes('javascript:'), false);

    const parsed = parser.parseMarkdown('# Care\n\n<script>alert(1)</script>');
    assert.equal(parsed.includes('<script>'), false);
  });

  it('computes reading time and word counts accurately', () => {
    const text = Array(400).fill('rescue').join(' ');
    const metrics = parser.computeReadingTime(text);

    assert.equal(metrics.words, 400);
    // 400 / 200 = 2 minutes
    assert.equal(metrics.minutes, 2);
    assert.equal(metrics.text, '2 min read');

    const empty = parser.computeReadingTime('');
    assert.equal(empty.words, 0);
    assert.equal(empty.minutes, 0);
  });
});
