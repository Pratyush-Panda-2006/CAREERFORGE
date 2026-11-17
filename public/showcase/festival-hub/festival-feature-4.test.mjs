import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubExportEngine } from './export-engine.js';

test('FestivalHubExportEngine initializes with default schedule items and metadata', () => {
  const engine = new FestivalHubExportEngine();
  const items = engine.getItems();
  assert.equal(items.length, 3);
  const meta = engine.getMetadata();
  assert.equal(meta.festivalName, 'Nexus Festival 2026');
});

test('toCSVString escapes commas, double quotes and newlines accurately', () => {
  const items = [
    { id: 'act_101', name: 'Cyber "Neon" Beats, Special', stage: 'Main Stage', genre: 'Electronic', rating: 4.9, attendees: 10000, status: 'Confirmed' },
    { id: 'act_102', name: 'Sub-Bass\nVol 2', stage: 'Bass Arena', genre: 'Bass', rating: 4.5, attendees: 4000, status: 'Live' }
  ];
  const engine = new FestivalHubExportEngine({ items });
  const csv = engine.toCSVString();

  assert.ok(csv.includes('id,name,stage,genre,rating,attendees,status'));
  // Quotes escaped with double quotes
  assert.ok(csv.includes('"Cyber ""Neon"" Beats, Special"'));
  assert.ok(csv.includes('"Sub-Bass\nVol 2"'));
  assert.ok(csv.includes('"act_101"'));
});

test('toJSONBlob produces valid Blob with application/json MIME type and valid JSON payload', async () => {
  const items = [
    { id: 'act_201', name: 'Solaris Wave', stage: 'Solar Pavilion', genre: 'Ambient', rating: 4.8, attendees: 5200, status: 'Confirmed' }
  ];
  const engine = new FestivalHubExportEngine({ items });
  const blob = engine.toJSONBlob();

  assert.equal(blob.type, 'application/json');
  const text = await blob.text();
  const parsed = JSON.parse(text);

  assert.equal(parsed.recordCount, 1);
  assert.equal(parsed.schedule[0].name, 'Solaris Wave');
  assert.ok(parsed.metadata);
  assert.ok(parsed.exportedAt);
});

test('toCSVBlob produces valid Blob with text/csv;charset=utf-8; MIME type', async () => {
  const items = [
    { id: 'act_301', name: 'Lunar Echoes', stage: 'Starlight Dome', genre: 'Chillout', rating: 4.7, attendees: 3100, status: 'Confirmed' }
  ];
  const engine = new FestivalHubExportEngine({ items });
  const blob = engine.toCSVBlob();

  assert.equal(blob.type, 'text/csv;charset=utf-8;');
  const content = await blob.text();
  assert.ok(content.startsWith('id,name,stage,genre,rating,attendees,status'));
  assert.ok(content.includes('Lunar Echoes'));
});

test('toMarkdownAudit formats structured markdown summary with statistics and table', () => {
  const items = [
    { id: 'act_401', name: 'Acoustic Horizon', stage: 'Meadow', genre: 'Folk', rating: 4.6, attendees: 2000, status: 'Confirmed' },
    { id: 'act_402', name: 'Neon Pulsar', stage: 'Apex', genre: 'EDM', rating: 4.8, attendees: 8000, status: 'Confirmed' }
  ];
  const engine = new FestivalHubExportEngine({ items });
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# 🌸 Festival Hub Program Export & Audit Report'));
  assert.ok(md.includes('| ID | Performance / Artist | Stage | Genre | Rating | Attendees | Status |'));
  assert.ok(md.includes('| act_401 | Acoustic Horizon | Meadow | Folk | ⭐ 4.6 | 2,000 | Confirmed |'));
  assert.ok(md.includes('**Total Expected Attendance:** 10,000 visitors'));
  assert.ok(md.includes('**Average Overall Rating:** 4.70 / 5.00'));
});
