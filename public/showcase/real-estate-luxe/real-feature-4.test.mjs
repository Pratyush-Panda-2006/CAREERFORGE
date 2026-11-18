import test from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeExportEngine } from './export-engine.js';

test('RealEstateLuxeExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'EST-1', title: 'Bel-Air Villa', price: 45000000, available: true },
    { id: 'EST-2', title: 'Tribeca Penthouse', price: 25000000, available: false }
  ];
  const engine = new RealEstateLuxeExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'Bel-Air Villa');
  assert.equal(parsed[1].price, 25000000);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('RealEstateLuxeExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'E-01',
      title: 'Simple Villa',
      summary: 'Modern home',
      price: 15000000
    },
    {
      id: 'E-02',
      title: 'Ocean, Cliff & Sky Estate', // Comma
      summary: 'Features "smart" automation', // Quotes
      price: 38000000
    },
    {
      id: 'E-03',
      title: 'Multi-Level\nAlpine\rChalet', // Newline
      summary: 'Private ski lift',
      price: 29000000
    }
  ];

  const engine = new RealEstateLuxeExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 4); // 1 header + 3 rows
  assert.equal(lines[0], 'id,title,summary,price');

  // Row 1: Plain
  assert.equal(lines[1], 'E-01,Simple Villa,Modern home,15000000');

  // Row 2: Commas & quotes escaped
  assert.equal(lines[2], 'E-02,"Ocean, Cliff & Sky Estate","Features ""smart"" automation",38000000');

  // Row 3: Newline wrapped
  assert.ok(lines[3].startsWith('E-03,"Multi-Level\nAlpine\rChalet"'));

  const csvBlob = engine.toCSVBlob();
  assert.equal(csvBlob.type, 'text/csv;charset=utf-8');
  assert.ok(csvBlob.size > 0);
});

test('RealEstateLuxeExportEngine - Custom delimiters and column selections in CSV export', () => {
  const engine = new RealEstateLuxeExportEngine();
  const sample = [
    { id: '101', category: 'Penthouse' },
    { id: '102', category: 'Villa' }
  ];

  // Semicolon delimiter
  const semiCsv = engine.toCSVString(sample, { delimiter: ';' });
  assert.equal(semiCsv, 'id;category\r\n101;Penthouse\r\n102;Villa');

  // Specific header without header line
  const noHeaderCsv = engine.toCSVString(sample, {
    headers: ['category'],
    includeHeaders: false
  });
  assert.equal(noHeaderCsv, 'Penthouse\r\nVilla');
});

test('RealEstateLuxeExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new RealEstateLuxeExportEngine({
    data: [
      { id: 'R1', category: 'Villa', price: 40000000, architect: 'Studio A' },
      { id: 'R2', category: 'Penthouse', price: 20000000, architect: 'Studio B' }
    ]
  });

  const markdown = engine.toMarkdownAudit();

  assert.ok(markdown.includes('# Real Estate Luxe - Portfolio Audit & Valuation Report'));
  assert.ok(markdown.includes('Total Estate Properties:** 2'));
  assert.ok(markdown.includes('Combined Portfolio Valuation:** $60,000,000'));
  assert.ok(markdown.includes('Average Property Valuation:** $30,000,000'));
  assert.ok(markdown.includes('| id | category | price | architect |'));
  assert.ok(markdown.includes('| --- | --- | --- | --- |'));
  assert.ok(markdown.includes('| R1 | Villa | $40,000,000 | Studio A |'));
});

test('RealEstateLuxeExportEngine - Handles empty dataset gracefully', () => {
  const engine = new RealEstateLuxeExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const metrics = engine.generateAuditMetrics();
  assert.equal(metrics.totalEstates, 0);
  assert.equal(metrics.totalValuation, 0);
  assert.equal(metrics.avgPrice, 0);

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('No property records currently loaded'));
});

test('RealEstateLuxeExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new RealEstateLuxeExportEngine();

  const unsafeName = 'estate-portfolio /:*?"<>| v1 2026';
  const cleanName = engine.sanitizeFilename(unsafeName, 'csv');
  assert.equal(cleanName, 'estate-portfolio_--------_v1_2026.csv');

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(512), '512 B');
  assert.equal(engine.formatBytes(2048), '2.0 KB');
  assert.equal(engine.formatBytes(1048576 * 4), '4.0 MB');
});
