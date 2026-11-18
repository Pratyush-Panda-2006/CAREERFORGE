import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsExportEngine } from './export-engine.js';

const sampleEstates = [
  {
    id: 'estate-1',
    name: 'Villa Bellissima, Waterfront',
    location: 'Lake Como, Italy',
    category: 'Waterfront',
    price: 34500000,
    areaSqft: 14200,
    bedrooms: 8,
    rating: 4.95,
    status: 'Available'
  },
  {
    id: 'estate-2',
    name: 'The "Crown" Penthouse',
    location: 'New York, USA',
    category: 'Urban Penthouse',
    price: 58000000,
    areaSqft: 11500,
    bedrooms: 6,
    rating: 4.98,
    status: 'Available'
  }
];

test('LuxuryRealmsExportEngine - _escapeCSV properly quotes fields with commas, quotes, and newlines', () => {
  const engine = new LuxuryRealmsExportEngine();

  assert.equal(engine._escapeCSV('Plain'), 'Plain');
  assert.equal(engine._escapeCSV('Lake Como, Italy'), '"Lake Como, Italy"');
  assert.equal(engine._escapeCSV('The "Crown" Sky'), '"The ""Crown"" Sky"');
  assert.equal(engine._escapeCSV('Line1\nLine2'), '"Line1\nLine2"');
  assert.equal(engine._escapeCSV(['tag1', 'tag2']), 'tag1; tag2');
});

test('LuxuryRealmsExportEngine - toCSVString formats valid RFC 4180 CSV table with header', () => {
  const engine = new LuxuryRealmsExportEngine();
  const csv = engine.toCSVString(sampleEstates);

  const lines = csv.trim().split('\n');
  assert.ok(lines.length >= 3);
  assert.equal(lines[0], 'id,name,location,category,price,areaSqft,bedrooms,rating,status');
  assert.ok(lines[1].includes('"Villa Bellissima, Waterfront"'));
  assert.ok(lines[2].includes('"The ""Crown"" Penthouse"'));
});

test('LuxuryRealmsExportEngine - toJSONString produces structured JSON with schema metadata', () => {
  const engine = new LuxuryRealmsExportEngine();
  const jsonStr = engine.toJSONString(sampleEstates, { author: 'Advisory Team' });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.exportMetadata.system, 'Luxury Realms Portfolio Management');
  assert.equal(parsed.exportMetadata.version, '1.0.0');
  assert.equal(parsed.exportMetadata.totalItems, 2);
  assert.equal(parsed.exportMetadata.author, 'Advisory Team');
  assert.equal(parsed.estates.length, 2);
  assert.equal(parsed.estates[0].id, 'estate-1');
});

test('LuxuryRealmsExportEngine - toMarkdownSummary compiles executive dossier table with aggregates', () => {
  const engine = new LuxuryRealmsExportEngine();
  const md = engine.toMarkdownSummary(sampleEstates);

  assert.ok(md.includes('# ✦ Luxury Realms Portfolio Executive Summary'));
  assert.ok(md.includes('**Curated Sanctuaries:** 2'));
  assert.ok(md.includes('**Aggregate Capital Valuation:** $92.5M USD'));
  assert.ok(md.includes('| estate-1 |'));
  assert.ok(md.includes('| estate-2 |'));
});

test('LuxuryRealmsExportEngine - toJSONBlob and toCSVBlob return objects with expected MIME types', () => {
  const engine = new LuxuryRealmsExportEngine();

  const jsonBlob = engine.toJSONBlob(sampleEstates);
  assert.ok(jsonBlob.type.includes('application/json'));

  const csvBlob = engine.toCSVBlob(sampleEstates);
  assert.ok(csvBlob.type.includes('text/csv'));
});

test('LuxuryRealmsExportEngine - triggerDownload returns false in non-DOM environment safely', () => {
  const engine = new LuxuryRealmsExportEngine();
  const result = engine.triggerDownload('estates.csv', { content: 'test', type: 'text/csv' });
  assert.equal(result, false);
});
