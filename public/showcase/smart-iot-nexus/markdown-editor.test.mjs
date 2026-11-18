import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusMarkdownParser } from './markdown-editor.js';

test('SmartIotNexusMarkdownParser - parses headers, emphasis, and hyperlinks accurately', () => {
  const parser = new SmartIotNexusMarkdownParser();

  const h1 = parser.parseMarkdown('# IoT Gateway Architecture');
  assert.match(h1, /<h1>IoT Gateway Architecture<\/h1>/);

  const h2 = parser.parseMarkdown('## Sensor Node Cluster');
  assert.match(h2, /<h2>Sensor Node Cluster<\/h2>/);

  const boldAndItalic = parser.parseMarkdown('**Telemetry Core** is *reactive*');
  assert.match(boldAndItalic, /<strong>Telemetry Core<\/strong> is <em>reactive<\/em>/);

  const link = parser.parseMarkdown('[Dashboard](https://iot.nexus/overview)');
  assert.match(link, /<a href="https:\/\/iot\.nexus\/overview" target="_blank" rel="noopener noreferrer">Dashboard<\/a>/);
});

test('SmartIotNexusMarkdownParser - formats inline code, fenced code blocks, and blockquotes', () => {
  const parser = new SmartIotNexusMarkdownParser();

  const inline = parser.parseMarkdown('Run `iot-ctl ping` on gateway');
  assert.match(inline, /<code class="inline-code">iot-ctl ping<\/code>/);

  const blockquote = parser.parseMarkdown('> All sensor clusters operational with 99.9% SLA');
  assert.match(blockquote, /<blockquote>All sensor clusters operational with 99\.9% SLA<\/blockquote>/);

  const codeblock = parser.parseMarkdown('```json\n{\n  "voltage": 3.3\n}\n```');
  assert.match(codeblock, /<pre class="code-block" data-lang="json"><code>[\s\S]*"voltage": 3\.3[\s\S]*<\/code><\/pre>/);
});

test('SmartIotNexusMarkdownParser - parses unordered bullet lists', () => {
  const parser = new SmartIotNexusMarkdownParser();

  const markdownList = `- LoRaWAN Gateway #1\n- BLE Mesh Beacon #2\n- Zigbee Router #3`;
  const result = parser.parseMarkdown(markdownList);

  assert.match(result, /<ul class="md-list">/);
  assert.match(result, /<li>LoRaWAN Gateway #1<\/li>/);
  assert.match(result, /<li>BLE Mesh Beacon #2<\/li>/);
  assert.match(result, /<li>Zigbee Router #3<\/li>/);
});

test('SmartIotNexusMarkdownParser - sanitizes malicious XSS vectors and script tags', () => {
  const parser = new SmartIotNexusMarkdownParser();

  // Strip script tags
  const maliciousScript = 'Safe content <script>alert("hacked")</script> more content';
  const cleanScript = parser.sanitizeHTML(maliciousScript);
  assert.strictEqual(cleanScript.includes('<script>'), false);
  assert.strictEqual(cleanScript.includes('alert('), false);

  // Strip event handler attributes
  const maliciousImg = '<img src="valid.png" onerror="alert(document.cookie)">';
  const cleanImg = parser.sanitizeHTML(maliciousImg);
  assert.strictEqual(cleanImg.includes('onerror'), false);

  // Neutralize javascript: href
  const maliciousLink = '<a href="javascript:stealData()">Click here</a>';
  const cleanLink = parser.sanitizeHTML(maliciousLink);
  assert.strictEqual(cleanLink.includes('javascript:'), false);
  assert.match(cleanLink, /href="#"/);

  // Strip iframe tags
  const iframeSnippet = '<iframe src="https://evil.site"></iframe>';
  assert.strictEqual(parser.sanitizeHTML(iframeSnippet), '');
});

test('SmartIotNexusMarkdownParser - computes word count and reading time formula metrics accurately', () => {
  const parser = new SmartIotNexusMarkdownParser({ wordsPerMinute: 200 });

  // Empty string
  const emptyStats = parser.computeReadingTime('');
  assert.strictEqual(emptyStats.words, 0);
  assert.strictEqual(emptyStats.characters, 0);
  assert.strictEqual(emptyStats.formattedTime, '0 min read');

  // Short snippet (< 100 words)
  const shortSnippet = 'Smart IoT Nexus captures telemetry and delivers analytics across distributed edge networks.';
  const shortStats = parser.computeReadingTime(shortSnippet);
  assert.strictEqual(shortStats.words, 12);
  assert.strictEqual(shortStats.formattedTime, '< 1 min read');

  // Long text (250 words -> 2 min read)
  const wordChunk = 'telemetry '.repeat(250);
  const longStats = parser.computeReadingTime(wordChunk);
  assert.strictEqual(longStats.words, 250);
  assert.strictEqual(longStats.minutes, 2);
  assert.strictEqual(longStats.formattedTime, '2 min read');
});
