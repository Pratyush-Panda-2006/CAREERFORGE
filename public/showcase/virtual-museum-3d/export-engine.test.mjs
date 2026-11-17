import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3DExportEngine } from './export-engine.js';

test('VirtualMuseum3DExportEngine initializes with default dataset and metadata', () => {
  const engine = new VirtualMuseum3DExportEngine();
  const items = engine.getItems();
  assert.equal(items.length, 3);
  const meta = engine.getMetadata();
  assert.ok(meta);
});

test('VirtualMuseum3DExportEngine toCSVString escapes commas, double quotes and newlines accurately', () => {
  const items = [
    { id: 'rec_101', name: 'Item "Alpha", Special Edition', category: 'Testing', rating: 4.9, metric: 10000, status: 'Active' },
    { id: 'rec_102', name: 'Multi\nLine Item', category: 'Standard', rating: 4.5, metric: 4000, status: 'Active' }
  ];
  const engine = new VirtualMuseum3DExportEngine({ items });
  const csv = engine.toCSVString();

  assert.ok(csv.includes('id,name,category,rating,metric,status'));
  assert.ok(csv.includes('"Item ""Alpha"", Special Edition"'));
  assert.ok(csv.includes('"Multi\nLine Item"'));
  assert.ok(csv.includes('"rec_101"'));
});

test('VirtualMuseum3DExportEngine toJSONBlob produces valid Blob with application/json MIME type', async () => {
  const items = [
    { id: 'rec_201', name: 'Sample Payload', category: 'Core', rating: 4.8, metric: 5200, status: 'Active' }
  ];
  const engine = new VirtualMuseum3DExportEngine({ items });
  const blob = engine.toJSONBlob();

  assert.equal(blob.type, 'application/json');
  const text = await blob.text();
  const parsed = JSON.parse(text);

  assert.equal(parsed.recordCount, 1);
  assert.equal(parsed.dataset[0].name, 'Sample Payload');
  assert.ok(parsed.metadata);
  assert.ok(parsed.exportedAt);
});

test('VirtualMuseum3DExportEngine toCSVBlob produces valid Blob with text/csv;charset=utf-8; MIME type', async () => {
  const items = [
    { id: 'rec_301', name: 'Blob Record', category: 'Metric', rating: 4.7, metric: 3100, status: 'Active' }
  ];
  const engine = new VirtualMuseum3DExportEngine({ items });
  const blob = engine.toCSVBlob();

  assert.equal(blob.type, 'text/csv;charset=utf-8;');
  const content = await blob.text();
  assert.ok(content.startsWith('id,name,category,rating,metric,status'));
  assert.ok(content.includes('Blob Record'));
});

test('VirtualMuseum3DExportEngine toMarkdownAudit formats structured markdown summary with statistics', () => {
  const items = [
    { id: 'rec_401', name: 'First Item', category: 'Testing', rating: 4.6, metric: 2000, status: 'Active' },
    { id: 'rec_402', name: 'Second Item', category: 'Testing', rating: 4.8, metric: 8000, status: 'Active' }
  ];
  const engine = new VirtualMuseum3DExportEngine({ items });
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# 📊 Implement client-side export engine & formatted summary report generator Export & Audit Report'));
  assert.ok(md.includes('| ID | Name | Category | Rating | Metric / Volume | Status |'));
  assert.ok(md.includes('| rec_401 | First Item | Testing | ⭐ 4.6 | 2,000 | Active |'));
  assert.ok(md.includes('**Total Cumulative Volume:** 10,000 units'));
  assert.ok(md.includes('**Average Quality / Rating:** 4.70 / 5.00'));
});
