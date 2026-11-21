import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityMarkdownParser } from './markdown-editor.js';

describe('HealthVitalityMarkdownParser', () => {
  it('instantiates correctly with proper name and reading speed', () => {
    const parser = new HealthVitalityMarkdownParser();
    assert.equal(parser.name, 'HealthVitalityMarkdownParser');
    assert.equal(parser.wordsPerMinute, 200);
  });

  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new HealthVitalityMarkdownParser();
    const markdown = `# Robotics Master Controller\n## Joint Kinematics\n### Harmonic Reducer Torque`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Robotics Master Controller</h1>'));
    assert.ok(html.includes('<h2>Joint Kinematics</h2>'));
    assert.ok(html.includes('<h3>Harmonic Reducer Torque</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new HealthVitalityMarkdownParser();
    const markdown = `> Emergency stop active\n**Servo Motor** and *Encoder Feedback* with \`inverse_kinematics\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Emergency stop active</blockquote>'));
    assert.ok(html.includes('<strong>Servo Motor</strong>'));
    assert.ok(html.includes('<em>Encoder Feedback</em>'));
    assert.ok(html.includes('<code>inverse_kinematics</code>'));
  });

  it('parses unordered robotics parameter checklist items', () => {
    const parser = new HealthVitalityMarkdownParser();
    const markdown = `- Arm J1 Calibration\n- Gripper Pressure Sensor\n- Light Curtain Safety`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Arm J1 Calibration</li>'));
    assert.ok(html.includes('<li>Gripper Pressure Sensor</li>'));
    assert.ok(html.includes('<li>Light Curtain Safety</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS vulnerabilities', () => {
    const parser = new HealthVitalityMarkdownParser();
    const malicious = `<script>alert("pwned")</script><img src="x" onerror="stealCredentials()"/>Robotics Telemetry`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Robotics Telemetry'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new HealthVitalityMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('automata').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');
  });
});
