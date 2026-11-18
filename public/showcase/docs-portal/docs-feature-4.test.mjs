import test from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalExportEngine } from './export-engine.js';

test('DocsPortalExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'DOC-1', title: 'REST API Guide', words: 1200, published: true },
    { id: 'DOC-2', title: 'GraphQL Reference', words: 2400, published: false }
  ];
  const engine = new DocsPortalExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'REST API Guide');
  assert.equal(parsed[1].words, 2400);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('DocsPortalExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'D-01',
      title: 'Simple Guide',
      summary: 'Basic intro',
      words: 500
    },
    {
      id: 'D-02',
      title: 'OAuth, JWT & SAML', // Comma
      summary: 'Contains "quoted" options', // Quotes
      words: 1500
    },
    {
      id: 'D-03',
      title: 'Multi\nLine\rTitle', // Newline
      summary: 'Clean summary',
      words: 2000
    }
  ];

  const engine = new DocsPortalExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 4); // 1 header + 3 rows
  assert.equal(lines[0], 'id,title,summary,words');

  // Row 1: Plain
  assert.equal(lines[1], 'D-01,Simple Guide,Basic intro,500');

  // Row 2: Commas & quotes escaped
  assert.equal(lines[2], 'D-02,"OAuth, JWT & SAML","Contains ""quoted"" options",1500');

  // Row 3: Newline wrapped
  assert.ok(lines[3].startsWith('D-03,"Multi\nLine\rTitle"'));

  const csvBlob = engine.toCSVBlob();
  assert.equal(csvBlob.type, 'text/csv;charset=utf-8');
  assert.ok(csvBlob.size > 0);
});

test('DocsPortalExportEngine - Custom delimiters and column selections in CSV export', () => {
  const engine = new DocsPortalExportEngine();
  const sample = [
    { id: '101', cat: 'Security' },
    { id: '102', cat: 'API' }
  ];

  // Semicolon delimiter
  const semiCsv = engine.toCSVString(sample, { delimiter: ';' });
  assert.equal(semiCsv, 'id;cat\r\n101;Security\r\n102;API');

  // Specific header without header line
  const noHeaderCsv = engine.toCSVString(sample, {
    headers: ['cat'],
    includeHeaders: false
  });
  assert.equal(noHeaderCsv, 'Security\r\nAPI');
});

test('DocsPortalExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new DocsPortalExportEngine({
    data: [
      { id: 'D1', category: 'Security', words: 2000, readTime: 8 },
      { id: 'D2', category: 'API', words: 3000, readTime: 12 }
    ]
  });

  const markdown = engine.toMarkdownAudit();

  assert.ok(markdown.includes('# Docs Portal - Knowledge Base Audit'));
  assert.ok(markdown.includes('Total Documented Articles:** 2'));
  assert.ok(markdown.includes('Total Word Count:** 5,000 words'));
  assert.ok(markdown.includes('Cumulative Reading Time:** ~20 minutes'));
  assert.ok(markdown.includes('| id | category | words | readTime |'));
  assert.ok(markdown.includes('| --- | --- | --- | --- |'));
  assert.ok(markdown.includes('| D1 | Security | 2,000 words | 8 |'));
});

test('DocsPortalExportEngine - Handles empty dataset gracefully', () => {
  const engine = new DocsPortalExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const metrics = engine.generateAuditMetrics();
  assert.equal(metrics.totalDocs, 0);
  assert.equal(metrics.totalWords, 0);
  assert.equal(metrics.avgWords, 0);

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('No documentation records currently loaded'));
});

test('DocsPortalExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new DocsPortalExportEngine();

  const unsafeName = 'docs-export /:*?"<>| v1 2026';
  const cleanName = engine.sanitizeFilename(unsafeName, 'csv');
  assert.equal(cleanName, 'docs-export_--------_v1_2026.csv');

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(512), '512 B');
  assert.equal(engine.formatBytes(2048), '2.0 KB');
  assert.equal(engine.formatBytes(1048576 * 4), '4.0 MB');
});
