import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProMarkdownParser } from './markdown-editor.js';

describe('FitnessCrossfitProMarkdownParser', () => {
  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new FitnessCrossfitProMarkdownParser();
    const markdown = `# Level 1 Barbell Foundations\n## Level 2 Metcon Capacity\n### Level 3 Gymnastic Scaling`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Level 1 Barbell Foundations</h1>'));
    assert.ok(html.includes('<h2>Level 2 Metcon Capacity</h2>'));
    assert.ok(html.includes('<h3>Level 3 Gymnastic Scaling</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new FitnessCrossfitProMarkdownParser();
    const markdown = `> Rx weights apply\n**Strict Form** and *Cardio Pacing* with \`wod-timer\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Rx weights apply</blockquote>'));
    assert.ok(html.includes('<strong>Strict Form</strong>'));
    assert.ok(html.includes('<em>Cardio Pacing</em>'));
    assert.ok(html.includes('<code>wod-timer</code>'));
  });

  it('parses unordered movement standard checklist lists', () => {
    const parser = new FitnessCrossfitProMarkdownParser();
    const markdown = `- Barbell Deadlift Touch-and-Go\n- Ring Muscle-Up Turnout\n- Handstand Push-Up Lockout`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Barbell Deadlift Touch-and-Go</li>'));
    assert.ok(html.includes('<li>Ring Muscle-Up Turnout</li>'));
    assert.ok(html.includes('<li>Handstand Push-Up Lockout</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS', () => {
    const parser = new FitnessCrossfitProMarkdownParser();
    const malicious = `<script>alert("xss")</script><img src="x" onerror="stealData()"/>Safe WOD notes`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Safe WOD notes'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new FitnessCrossfitProMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('wod').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');

    const words450 = new Array(450).fill('crossfit').join(' ');
    const stats450 = parser.computeReadingTime(words450);
    assert.equal(stats450.words, 450);
    assert.equal(stats450.minutes, 3);
    assert.equal(stats450.display, '3 min read');
  });
});
