import test from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubExportEngine } from './export-engine.js';

test('VrMetaverseHubExportEngine initializes with default realms items and metadata', () => {
  const engine = new VrMetaverseHubExportEngine();
  const items = engine.getItems();
  assert.equal(items.length, 3);
  const meta = engine.getMetadata();
  assert.equal(meta.hubName, 'VR Metaverse Hub Matrix');
});

test('toCSVString escapes commas, double quotes and newlines accurately', () => {
  const items = [
    { id: 'realm_101', name: 'Cyber "Neon" Club, Special', realm: 'Metropolis', userCount: 1500, fps: 90, status: 'LIVE' },
    { id: 'realm_102', name: 'Zen Garden\nBamboo Zone', realm: 'Sanctuary', userCount: 120, fps: 120, status: 'IDLE' }
  ];
  const engine = new VrMetaverseHubExportEngine({ items });
  const csv = engine.toCSVString();

  assert.ok(csv.includes('id,name,realm,userCount,fps,status'));
  // Quotes escaped with double quotes
  assert.ok(csv.includes('"Cyber ""Neon"" Club, Special"'));
  assert.ok(csv.includes('"Zen Garden\nBamboo Zone"'));
  assert.ok(csv.includes('"realm_101"'));
});

test('toJSONBlob produces valid Blob with application/json MIME type and valid JSON payload', async () => {
  const items = [
    { id: 'realm_201', name: 'Solaris Orbit', realm: 'Space Station', userCount: 650, fps: 90, status: 'LIVE' }
  ];
  const engine = new VrMetaverseHubExportEngine({ items });
  const blob = engine.toJSONBlob();

  assert.equal(blob.type, 'application/json');
  const text = await blob.text();
  const parsed = JSON.parse(text);

  assert.equal(parsed.recordCount, 1);
  assert.equal(parsed.realms[0].name, 'Solaris Orbit');
  assert.ok(parsed.metadata);
  assert.ok(parsed.exportedAt);
});

test('toCSVBlob produces valid Blob with text/csv;charset=utf-8; MIME type', async () => {
  const items = [
    { id: 'realm_301', name: 'Pixel Arcade', realm: 'Gaming Lounge', userCount: 920, fps: 144, status: 'LIVE' }
  ];
  const engine = new VrMetaverseHubExportEngine({ items });
  const blob = engine.toCSVBlob();

  assert.equal(blob.type, 'text/csv;charset=utf-8;');
  const text = await blob.text();
  assert.ok(text.includes('Pixel Arcade'));
});

test('toMarkdownAudit formats comprehensive summary audit report with aggregated stats', () => {
  const items = [
    { id: 'r1', name: 'Cyber Nexus', realm: 'Metropolis', userCount: 1000, fps: 90, status: 'LIVE' },
    { id: 'r2', name: 'Orbit Station', realm: 'Space', userCount: 500, fps: 60, status: 'LIVE' }
  ];
  const engine = new VrMetaverseHubExportEngine({ items });
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# 🌐 VR Metaverse Hub Realm Audit'));
  assert.ok(md.includes('1,500 concurrent avatars'));
  assert.ok(md.includes('75.0 FPS'));
  assert.ok(md.includes('| r1 | Cyber Nexus |'));
});
