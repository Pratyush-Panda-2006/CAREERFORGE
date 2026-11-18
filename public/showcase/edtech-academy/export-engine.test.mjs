import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyExportEngine } from './export-engine.js';

test('EdtechAcademyExportEngine initializes with default dataset and metadata', () => {
  const engine = new EdtechAcademyExportEngine();
  const items = engine.getItems();
  assert.equal(items.length, 3);
  const meta = engine.getMetadata();
  assert.ok(meta);
  assert.equal(meta.systemName, 'Edtech Academy Learning & Certification LMS');
});

test('EdtechAcademyExportEngine toCSVString escapes commas, double quotes and newlines accurately', () => {
  const items = [
    { id: 'edt_101', name: 'Cloud "Architect", Specialization', category: 'Cloud', rating: 4.9, metric: 2500, status: 'Active' },
    { id: 'edt_102', name: 'Multi\nLine Syllabus', category: 'Standard', rating: 4.5, metric: 1200, status: 'Open' }
  ];
  const engine = new EdtechAcademyExportEngine({ items });
  const csv = engine.toCSVString();

  assert.ok(csv.includes('id,name,category,rating,metric,status'));
  assert.ok(csv.includes('"Cloud ""Architect"", Specialization"'));
  assert.ok(csv.includes('"Multi\nLine Syllabus"'));
  assert.ok(csv.includes('"edt_101"'));
});

test('EdtechAcademyExportEngine toJSONBlob produces valid Blob with application/json MIME type', async () => {
  const items = [
    { id: 'edt_201', name: 'Cybersecurity Analyst Certificate', category: 'Security', rating: 4.88, metric: 3100, status: 'Active' }
  ];
  const engine = new EdtechAcademyExportEngine({ items });
  const blob = engine.toJSONBlob();

  assert.equal(blob.type, 'application/json');
  const text = await blob.text();
  const parsed = JSON.parse(text);

  assert.equal(parsed.recordCount, 1);
  assert.equal(parsed.dataset[0].name, 'Cybersecurity Analyst Certificate');
  assert.ok(parsed.metadata);
  assert.ok(parsed.exportedAt);
});

test('EdtechAcademyExportEngine toCSVBlob produces valid Blob with text/csv;charset=utf-8; MIME type', async () => {
  const items = [
    { id: 'edt_301', name: 'Quantum Computing Foundations', category: 'Quantum', rating: 4.75, metric: 900, status: 'Enrolling' }
  ];
  const engine = new EdtechAcademyExportEngine({ items });
  const blob = engine.toCSVBlob();

  assert.equal(blob.type, 'text/csv;charset=utf-8;');
  const content = await blob.text();
  assert.ok(content.startsWith('id,name,category,rating,metric,status'));
  assert.ok(content.includes('Quantum Computing Foundations'));
});

test('EdtechAcademyExportEngine toMarkdownAudit formats structured markdown summary with statistics', () => {
  const items = [
    { id: 'edt_401', name: 'Web Dev Mastery', category: 'Frontend', rating: 4.9, metric: 4000, status: 'Active' },
    { id: 'edt_402', name: 'Data Engineering', category: 'Data', rating: 4.7, metric: 2000, status: 'Active' }
  ];
  const engine = new EdtechAcademyExportEngine({ items });
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# 📊 Edtech Academy Learning Progress & Course Export Report'));
  assert.ok(md.includes('| ID | Name | Category | Rating | Students / Metric | Status |'));
  assert.ok(md.includes('| edt_401 | Web Dev Mastery | Frontend | ⭐ 4.9 | 4,000 | Active |'));
  assert.ok(md.includes('**Total Cumulative Volume:** 6,000 units'));
  assert.ok(md.includes('**Average Quality / Rating:** 4.80 / 5.00'));
});
