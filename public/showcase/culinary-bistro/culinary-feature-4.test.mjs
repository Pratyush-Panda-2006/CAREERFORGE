import test from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroExportEngine } from './export-engine.js';

test('CulinaryBistroExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'DISH-1', title: 'A5 Wagyu Steak', price: 95.0, available: true },
    { id: 'DISH-2', title: 'Lobster Bisque', price: 22.0, available: false }
  ];
  const engine = new CulinaryBistroExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'A5 Wagyu Steak');
  assert.equal(parsed[1].price, 22.0);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('CulinaryBistroExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'D-01',
      title: 'Simple Dish',
      summary: 'Basic pasta',
      price: 18
    },
    {
      id: 'D-02',
      title: 'Truffle, Caviar & Brie', // Comma
      summary: 'Contains "artisan" cheeses', // Quotes
      price: 45
    },
    {
      id: 'D-03',
      title: 'Handmade\nSourdough\rLoaf', // Newline
      summary: 'Warm rustic loaf',
      price: 12
    }
  ];

  const engine = new CulinaryBistroExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 4); // 1 header + 3 rows
  assert.equal(lines[0], 'id,title,summary,price');

  // Row 1: Plain
  assert.equal(lines[1], 'D-01,Simple Dish,Basic pasta,18');

  // Row 2: Commas & quotes escaped
  assert.equal(lines[2], 'D-02,"Truffle, Caviar & Brie","Contains ""artisan"" cheeses",45');

  // Row 3: Newline wrapped
  assert.ok(lines[3].startsWith('D-03,"Handmade\nSourdough\rLoaf"'));

  const csvBlob = engine.toCSVBlob();
  assert.equal(csvBlob.type, 'text/csv;charset=utf-8');
  assert.ok(csvBlob.size > 0);
});

test('CulinaryBistroExportEngine - Custom delimiters and column selections in CSV export', () => {
  const engine = new CulinaryBistroExportEngine();
  const sample = [
    { id: '101', course: 'Starter' },
    { id: '102', course: 'Dessert' }
  ];

  // Semicolon delimiter
  const semiCsv = engine.toCSVString(sample, { delimiter: ';' });
  assert.equal(semiCsv, 'id;course\r\n101;Starter\r\n102;Dessert');

  // Specific header without header line
  const noHeaderCsv = engine.toCSVString(sample, {
    headers: ['course'],
    includeHeaders: false
  });
  assert.equal(noHeaderCsv, 'Starter\r\nDessert');
});

test('CulinaryBistroExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new CulinaryBistroExportEngine({
    data: [
      { id: 'C1', category: 'Mains', price: 50.00, course: 'Entrée' },
      { id: 'C2', category: 'Desserts', price: 20.00, course: 'Dessert' }
    ]
  });

  const markdown = engine.toMarkdownAudit();

  assert.ok(markdown.includes('# Culinary Bistro - Menu & Dining Audit Report'));
  assert.ok(markdown.includes('Total Catalog Items:** 2'));
  assert.ok(markdown.includes('Combined Menu Price:** $70'));
  assert.ok(markdown.includes('Average Course Price:** $35.00'));
  assert.ok(markdown.includes('| id | category | price | course |'));
  assert.ok(markdown.includes('| --- | --- | --- | --- |'));
  assert.ok(markdown.includes('| C1 | Mains | $50.00 | Entrée |'));
});

test('CulinaryBistroExportEngine - Handles empty dataset gracefully', () => {
  const engine = new CulinaryBistroExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const metrics = engine.generateAuditMetrics();
  assert.equal(metrics.totalDishes, 0);
  assert.equal(metrics.totalRevenuePotential, 0);
  assert.equal(metrics.avgPrice, 0);

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('No culinary records currently loaded'));
});

test('CulinaryBistroExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new CulinaryBistroExportEngine();

  const unsafeName = 'bistro-menu /:*?"<>| v1 2026';
  const cleanName = engine.sanitizeFilename(unsafeName, 'csv');
  assert.equal(cleanName, 'bistro-menu_--------_v1_2026.csv');

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(512), '512 B');
  assert.equal(engine.formatBytes(2048), '2.0 KB');
  assert.equal(engine.formatBytes(1048576 * 4), '4.0 MB');
});
