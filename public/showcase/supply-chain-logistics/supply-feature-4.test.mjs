import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsExportEngine, SAMPLE_SUPPLY_DATA } from './export-engine.js';

test('SupplyChainLogisticsExportEngine - CSV escaping of commas and quotes', () => {
  const engine = new SupplyChainLogisticsExportEngine();
  const testData = [
    { id: '1', note: 'Standard note' },
    { id: '2', note: 'Note with, comma' },
    { id: '3', note: 'Note with "quotes"' },
    { id: '4', note: 'Note with, both "quotes" and commas' }
  ];

  const csv = engine.toCSVString(testData);
  assert.ok(csv.includes('id,note'));
  assert.ok(csv.includes('"Note with, comma"'));
  assert.ok(csv.includes('"Note with ""quotes"""'));
  assert.ok(csv.includes('"Note with, both ""quotes"" and commas"'));
});

test('SupplyChainLogisticsExportEngine - valid JSON blob creation and structure', () => {
  const engine = new SupplyChainLogisticsExportEngine();
  const blob = engine.toJSONBlob(SAMPLE_SUPPLY_DATA);
  assert.equal(blob.type, 'application/json');

  // Verify JSON string format
  let rawJson = '';
  if (typeof Blob !== 'undefined' && blob instanceof Blob) {
    // browser/node Blob
    assert.equal(blob.type, 'application/json');
  } else {
    rawJson = blob.data;
    const parsed = JSON.parse(rawJson);
    assert.equal(parsed.length, SAMPLE_SUPPLY_DATA.length);
    assert.equal(parsed[0].id, 'TRK-101');
  }
});

test('SupplyChainLogisticsExportEngine - CSV blob MIME type is text/csv', () => {
  const engine = new SupplyChainLogisticsExportEngine();
  const blob = engine.toCSVBlob(SAMPLE_SUPPLY_DATA);
  assert.ok(blob.type.includes('text/csv'));
});

test('SupplyChainLogisticsExportEngine - generateMarkdownSummary format', () => {
  const engine = new SupplyChainLogisticsExportEngine();
  const md = engine.generateMarkdownSummary(SAMPLE_SUPPLY_DATA);
  assert.ok(md.includes('# Supply Chain Logistics Audit Report'));
  assert.ok(md.includes('| TRK-101 | Rotterdam -> Berlin | IN_TRANSIT | 450 |'));
});

test('SupplyChainLogisticsExportEngine - escapeCSVField edge cases', () => {
  const engine = new SupplyChainLogisticsExportEngine();
  assert.equal(engine.escapeCSVField(null), '');
  assert.equal(engine.escapeCSVField(undefined), '');
  assert.equal(engine.escapeCSVField(42), '42');
  assert.equal(engine.escapeCSVField('hello\nworld'), '"hello\nworld"');
});
