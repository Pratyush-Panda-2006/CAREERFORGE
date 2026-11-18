import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayMarkdownParser } from './markdown-editor.js';

describe('DroneDeliverySkywayMarkdownParser', () => {
  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new DroneDeliverySkywayMarkdownParser();
    const markdown = `# Level 1 Corridor\n## Level 2 Vertiport\n### Level 3 Winch`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Level 1 Corridor</h1>'));
    assert.ok(html.includes('<h2>Level 2 Vertiport</h2>'));
    assert.ok(html.includes('<h3>Level 3 Winch</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new DroneDeliverySkywayMarkdownParser();
    const markdown = `> Emergency geofence trigger\n**Critical Alert** and *Altitude Loss* with \`gps-lock\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Emergency geofence trigger</blockquote>'));
    assert.ok(html.includes('<strong>Critical Alert</strong>'));
    assert.ok(html.includes('<em>Altitude Loss</em>'));
    assert.ok(html.includes('<code>gps-lock</code>'));
  });

  it('parses unordered UAV maintenance checklist lists', () => {
    const parser = new DroneDeliverySkywayMarkdownParser();
    const markdown = `- Rotor Blade Inspection\n- Battery Cell Balance\n- Parachute Deploy Test`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Rotor Blade Inspection</li>'));
    assert.ok(html.includes('<li>Battery Cell Balance</li>'));
    assert.ok(html.includes('<li>Parachute Deploy Test</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS', () => {
    const parser = new DroneDeliverySkywayMarkdownParser();
    const malicious = `<script>alert("xss")</script><img src="x" onerror="stealData()"/>Safe text`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Safe text'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new DroneDeliverySkywayMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('drone').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');

    const words450 = new Array(450).fill('skyway').join(' ');
    const stats450 = parser.computeReadingTime(words450);
    assert.equal(stats450.words, 450);
    assert.equal(stats450.minutes, 3);
    assert.equal(stats450.display, '3 min read');
  });
});
