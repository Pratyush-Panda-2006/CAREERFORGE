import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixMarkdownParser } from './markdown-editor.js';

test('DefiYieldMatrixMarkdownParser - parses headers, emphasis, and hyperlinks accurately', () => {
  const parser = new DefiYieldMatrixMarkdownParser();

  const h1 = parser.parseMarkdown('# Liquidity Vault Protocol');
  assert.match(h1, /<h1>Liquidity Vault Protocol<\/h1>/);

  const h2 = parser.parseMarkdown('## Delta-Neutral Hedging Strategy');
  assert.match(h2, /<h2>Delta-Neutral Hedging Strategy<\/h2>/);

  const boldAndItalic = parser.parseMarkdown('**APY Returns** are *compoundable*');
  assert.match(boldAndItalic, /<strong>APY Returns<\/strong> are <em>compoundable<\/em>/);

  const link = parser.parseMarkdown('[Yield Matrix Portal](https://defi.matrix/vaults)');
  assert.match(link, /<a href="https:\/\/defi\.matrix\/vaults" target="_blank" rel="noopener noreferrer">Yield Matrix Portal<\/a>/);
});

test('DefiYieldMatrixMarkdownParser - formats inline code, fenced code blocks, and blockquotes', () => {
  const parser = new DefiYieldMatrixMarkdownParser();

  const inline = parser.parseMarkdown('Call `vault.harvest()` after epoch');
  assert.match(inline, /<code class="inline-code">vault\.harvest\(\)<\/code>/);

  const blockquote = parser.parseMarkdown('> Protocol solvency verified at 99.9% reserve ratio');
  assert.match(blockquote, /<blockquote>Protocol solvency verified at 99\.9% reserve ratio<\/blockquote>/);

  const codeblock = parser.parseMarkdown('```solidity\nfunction stake(uint256 amount) external {\n  require(amount > 0);\n}\n```');
  assert.match(codeblock, /<pre class="code-block" data-lang="solidity"><code>[\s\S]*function stake[\s\S]*<\/code><\/pre>/);
});

test('DefiYieldMatrixMarkdownParser - parses unordered bullet lists', () => {
  const parser = new DefiYieldMatrixMarkdownParser();

  const markdownList = `- USDC/ETH Liquidity Pool\n- WBTC Concentrated Vault\n- ARB Staking Contract`;
  const result = parser.parseMarkdown(markdownList);

  assert.match(result, /<ul class="md-list">/);
  assert.match(result, /<li>USDC\/ETH Liquidity Pool<\/li>/);
  assert.match(result, /<li>WBTC Concentrated Vault<\/li>/);
  assert.match(result, /<li>ARB Staking Contract<\/li>/);
});

test('DefiYieldMatrixMarkdownParser - sanitizes malicious XSS vectors and script tags', () => {
  const parser = new DefiYieldMatrixMarkdownParser();

  // Strip script tags
  const maliciousScript = 'Safe content <script>alert("exploit")</script> more content';
  const cleanScript = parser.sanitizeHTML(maliciousScript);
  assert.strictEqual(cleanScript.includes('<script>'), false);
  assert.strictEqual(cleanScript.includes('alert('), false);

  // Strip event handler attributes
  const maliciousImg = '<img src="token.png" onerror="alert(document.cookie)">';
  const cleanImg = parser.sanitizeHTML(maliciousImg);
  assert.strictEqual(cleanImg.includes('onerror'), false);

  // Neutralize javascript: href
  const maliciousLink = '<a href="javascript:stealTokens()">Stake Tokens</a>';
  const cleanLink = parser.sanitizeHTML(maliciousLink);
  assert.strictEqual(cleanLink.includes('javascript:'), false);
  assert.match(cleanLink, /href="#"/);

  // Strip iframe tags
  const iframeSnippet = '<iframe src="https://phishing.site"></iframe>';
  assert.strictEqual(parser.sanitizeHTML(iframeSnippet), '');
});

test('DefiYieldMatrixMarkdownParser - computes word count and reading time formula metrics accurately', () => {
  const parser = new DefiYieldMatrixMarkdownParser({ wordsPerMinute: 200 });

  // Empty string
  const emptyStats = parser.computeReadingTime('');
  assert.strictEqual(emptyStats.words, 0);
  assert.strictEqual(emptyStats.characters, 0);
  assert.strictEqual(emptyStats.formattedTime, '0 min read');

  // Short snippet (< 100 words)
  const shortSnippet = 'DeFi Yield Matrix coordinates decentralized liquidity farming strategies across multi-chain ecosystems.';
  const shortStats = parser.computeReadingTime(shortSnippet);
  assert.strictEqual(shortStats.words, 11);
  assert.strictEqual(shortStats.formattedTime, '< 1 min read');

  // Long text (250 words -> 2 min read)
  const wordChunk = 'liquidity '.repeat(250);
  const longStats = parser.computeReadingTime(wordChunk);
  assert.strictEqual(longStats.words, 250);
  assert.strictEqual(longStats.minutes, 2);
  assert.strictEqual(longStats.formattedTime, '2 min read');
});
