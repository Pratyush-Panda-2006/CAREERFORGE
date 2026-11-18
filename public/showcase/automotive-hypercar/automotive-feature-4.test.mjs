import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarExportEngine } from './export-engine.js';

test('AutomotiveHypercarExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'HC-1', name: 'Apex Valkyrie', horsepower: 1160 },
    { id: 'HC-2', name: 'Nevera', horsepower: 1914 }
  ];
  const engine = new AutomotiveHypercarExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'Apex Valkyrie');
  assert.equal(parsed[1].horsepower, 1914);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('AutomotiveHypercarExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'HC-01',
      name: 'Simple Model',
      summary: 'Naturally aspirated',
      horsepower: 800
    },
    {
      id: 'HC-02',
      name: 'Jesko, Record "Edition"', // Comma and quote
      summary: 'Twin-turbo V8',
      horsepower: 1600
    },
    {
      id: 'HC-03',
      name: 'Track\nSpecial\rMonoposto', // Newline
      summary: 'High downforce aero',
      horsepower: 850
    }
  ];

  const engine = new AutomotiveHypercarExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines[0], 'id,name,summary,horsepower');
  assert.equal(lines[1], 'HC-01,Simple Model,Naturally aspirated,800');
  // Quotes escaped by doubling, enclosed in quotes
  assert.ok(lines[2].includes('"Jesko, Record ""Edition"""'));
  // Newlines enclosed in quotes
  assert.ok(lines[3].includes('"Track\nSpecial\rMonoposto"'));
});

test('AutomotiveHypercarExportEngine - Custom delimiters and column selections in CSV export', () => {
  const data = [
    { id: 'C1', brand: 'Bugatti', hp: 1500, price: 3000000 },
    { id: 'C2', brand: 'Pagani', hp: 850, price: 3500000 }
  ];
  const engine = new AutomotiveHypercarExportEngine({ data });

  const semiColonCSV = engine.toCSVString({
    delimiter: ';',
    columns: ['brand', 'hp']
  });

  const lines = semiColonCSV.split('\r\n');
  assert.equal(lines[0], 'brand;hp');
  assert.equal(lines[1], 'Bugatti;1500');
  assert.equal(lines[2], 'Pagani;850');
});

test('AutomotiveHypercarExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new AutomotiveHypercarExportEngine();
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# Automotive Hypercar - Performance Audit Report'));
  assert.ok(md.includes('**Total Monitored Vehicles:** 5'));
  assert.ok(md.includes('**Fleet Average Power:**'));
  assert.ok(md.includes('### Vehicle Fleet Specifications Table'));
  assert.ok(md.includes('| HC-01 |'));
  assert.ok(md.includes('| HC-03 |'));
});

test('AutomotiveHypercarExportEngine - Handles empty dataset gracefully', () => {
  const engine = new AutomotiveHypercarExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('*No vehicle records available.*'));
});

test('AutomotiveHypercarExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new AutomotiveHypercarExportEngine();

  const clean = engine.sanitizeFilename('report/\\:*?"<>| test#2.csv');
  assert.ok(!clean.includes('/'));
  assert.ok(!clean.includes('\\'));
  assert.ok(!clean.includes(':'));

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(500), '500 B');
  assert.equal(engine.formatBytes(2048), '2.00 KB');
  assert.equal(engine.formatBytes(1048576 * 3.5), '3.50 MB');
});
