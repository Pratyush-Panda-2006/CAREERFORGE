import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyExportEngine } from './export-engine.js';

test('TravelOdysseyExportEngine initializes with default dataset and metadata', () => {
  const engine = new TravelOdysseyExportEngine();
  const items = engine.getItems();
  assert.equal(items.length, 3);
  const meta = engine.getMetadata();
  assert.ok(meta);
  assert.equal(meta.systemName, 'Travel Odyssey Expeditions & Itineraries');
});

test('TravelOdysseyExportEngine toCSVString escapes commas, double quotes and newlines accurately', () => {
  const items = [
    { id: 'trv_101', name: 'Alps "Summit", Luxury Tour', category: 'Alpine', rating: 4.9, metric: 50, status: 'Confirmed' },
    { id: 'trv_102', name: 'Multi\nLine Itinerary', category: 'Standard', rating: 4.5, metric: 20, status: 'Open' }
  ];
  const engine = new TravelOdysseyExportEngine({ items });
  const csv = engine.toCSVString();

  assert.ok(csv.includes('id,name,category,rating,metric,status'));
  assert.ok(csv.includes('"Alps ""Summit"", Luxury Tour"'));
  assert.ok(csv.includes('"Multi\nLine Itinerary"'));
  assert.ok(csv.includes('"trv_101"'));
});

test('TravelOdysseyExportEngine toJSONBlob produces valid Blob with application/json MIME type', async () => {
  const items = [
    { id: 'trv_201', name: 'Galapagos Marine Cruise', category: 'Wild', rating: 4.95, metric: 35, status: 'Confirmed' }
  ];
  const engine = new TravelOdysseyExportEngine({ items });
  const blob = engine.toJSONBlob();

  assert.equal(blob.type, 'application/json');
  const text = await blob.text();
  const parsed = JSON.parse(text);

  assert.equal(parsed.recordCount, 1);
  assert.equal(parsed.dataset[0].name, 'Galapagos Marine Cruise');
  assert.ok(parsed.metadata);
  assert.ok(parsed.exportedAt);
});

test('TravelOdysseyExportEngine toCSVBlob produces valid Blob with text/csv;charset=utf-8; MIME type', async () => {
  const items = [
    { id: 'trv_301', name: 'Sahara Desert Stargazing', category: 'Desert', rating: 4.8, metric: 80, status: 'Open' }
  ];
  const engine = new TravelOdysseyExportEngine({ items });
  const blob = engine.toCSVBlob();

  assert.equal(blob.type, 'text/csv;charset=utf-8;');
  const content = await blob.text();
  assert.ok(content.startsWith('id,name,category,rating,metric,status'));
  assert.ok(content.includes('Sahara Desert Stargazing'));
});

test('TravelOdysseyExportEngine toMarkdownAudit formats structured markdown summary with statistics', () => {
  const items = [
    { id: 'trv_401', name: 'Kyoto Heritage Tour', category: 'Culture', rating: 4.9, metric: 120, status: 'Confirmed' },
    { id: 'trv_402', name: 'Serengeti Safari', category: 'Adventure', rating: 4.7, metric: 80, status: 'Waitlist' }
  ];
  const engine = new TravelOdysseyExportEngine({ items });
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# 📊 Travel Odyssey Export & Itinerary Summary Report'));
  assert.ok(md.includes('| ID | Name | Category | Rating | Travelers / Metric | Status |'));
  assert.ok(md.includes('| trv_401 | Kyoto Heritage Tour | Culture | ⭐ 4.9 | 120 | Confirmed |'));
  assert.ok(md.includes('**Total Cumulative Volume:** 200 units'));
  assert.ok(md.includes('**Average Quality / Rating:** 4.80 / 5.00'));
});
