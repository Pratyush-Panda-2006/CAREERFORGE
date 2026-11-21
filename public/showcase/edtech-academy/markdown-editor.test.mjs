import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyMarkdownParser } from './markdown-editor.js';

describe('EdtechAcademyMarkdownParser', () => {
  it('instantiates correctly with proper name and reading speed', () => {
    const parser = new EdtechAcademyMarkdownParser();
    assert.equal(parser.name, 'EdtechAcademyMarkdownParser');
    assert.equal(parser.wordsPerMinute, 200);
  });

  it('parses markdown headings correctly into HTML elements', () => {
    const parser = new EdtechAcademyMarkdownParser();
    const markdown = `# Course Syllabus\n## Module 1: Python\n### Algorithmic Logic`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<h1>Course Syllabus</h1>'));
    assert.ok(html.includes('<h2>Module 1: Python</h2>'));
    assert.ok(html.includes('<h3>Algorithmic Logic</h3>'));
  });

  it('parses bold, italic, code spans, and blockquotes', () => {
    const parser = new EdtechAcademyMarkdownParser();
    const markdown = `> Assignment due soon\n**Homework 1** and *Peer Review* with \`test_runner\`.`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<blockquote>Assignment due soon</blockquote>'));
    assert.ok(html.includes('<strong>Homework 1</strong>'));
    assert.ok(html.includes('<em>Peer Review</em>'));
    assert.ok(html.includes('<code>test_runner</code>'));
  });

  it('parses unordered coursework checklist items', () => {
    const parser = new EdtechAcademyMarkdownParser();
    const markdown = `- Lab 1 Setup\n- Code Review\n- Quiz Submission`;
    const html = parser.parseMarkdown(markdown);

    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Lab 1 Setup</li>'));
    assert.ok(html.includes('<li>Code Review</li>'));
    assert.ok(html.includes('<li>Quiz Submission</li>'));
    assert.ok(html.includes('</ul>'));
  });

  it('sanitizes script tags and inline event handlers to prevent XSS vulnerabilities', () => {
    const parser = new EdtechAcademyMarkdownParser();
    const malicious = `<script>alert("pwned")</script><img src="x" onerror="stealCredentials()"/>Curriculum Lesson`;
    const sanitized = parser.sanitizeHTML(malicious);

    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('onerror'), false);
    assert.ok(sanitized.includes('Curriculum Lesson'));
  });

  it('computes reading time and word counts accurately', () => {
    const parser = new EdtechAcademyMarkdownParser({ wordsPerMinute: 200 });
    const emptyStats = parser.computeReadingTime('');
    assert.equal(emptyStats.words, 0);
    assert.equal(emptyStats.minutes, 0);

    const words100 = new Array(100).fill('syllabus').join(' ');
    const stats100 = parser.computeReadingTime(words100);
    assert.equal(stats100.words, 100);
    assert.equal(stats100.minutes, 1);
    assert.equal(stats100.display, '1 min read');
  });
});
