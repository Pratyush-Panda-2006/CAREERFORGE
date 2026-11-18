import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterExportEngine } from './export-engine.js';

const sampleCraft = [
  {
    id: 'craft-1',
    name: 'ISS, Alpha Station',
    noradId: 25544,
    orbitType: 'LEO',
    altitudeKm: 418.5,
    velocityKmS: 7.66,
    inclinationDeg: 51.64,
    massKg: 450000,
    status: 'Operational'
  },
  {
    id: 'craft-2',
    name: 'JWST "Webb" Observatory',
    noradId: 50463,
    orbitType: 'Lagrange L2',
    altitudeKm: 1500000,
    velocityKmS: 0.22,
    inclinationDeg: 0.05,
    massKg: 6500,
    status: 'Operational'
  }
];

test('AerospaceOrbiterExportEngine - _escapeCSV properly handles commas, quotes, and newlines', () => {
  const engine = new AerospaceOrbiterExportEngine();

  assert.equal(engine._escapeCSV('ISS'), 'ISS');
  assert.equal(engine._escapeCSV('ISS, Alpha Station'), '"ISS, Alpha Station"');
  assert.equal(engine._escapeCSV('JWST "Webb"'), '"JWST ""Webb"""');
  assert.equal(engine._escapeCSV('Line1\nLine2'), '"Line1\nLine2"');
  assert.equal(engine._escapeCSV(['tag1', 'tag2']), 'tag1; tag2');
});

test('AerospaceOrbiterExportEngine - toCSVString formats valid RFC 4180 CSV table with header', () => {
  const engine = new AerospaceOrbiterExportEngine();
  const csv = engine.toCSVString(sampleCraft);

  const lines = csv.trim().split('\n');
  assert.ok(lines.length >= 3);
  assert.equal(lines[0], 'id,name,noradId,orbitType,altitudeKm,velocityKmS,inclinationDeg,massKg,status');
  assert.ok(lines[1].includes('"ISS, Alpha Station"'));
  assert.ok(lines[2].includes('"JWST ""Webb"" Observatory"'));
});

test('AerospaceOrbiterExportEngine - toJSONString produces structured JSON with schema metadata', () => {
  const engine = new AerospaceOrbiterExportEngine();
  const jsonStr = engine.toJSONString(sampleCraft, { station: 'Houston Flight Dynamics' });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.exportMetadata.system, 'Aerospace Orbiter Flight Telemetry Suite');
  assert.equal(parsed.exportMetadata.version, '1.0.0');
  assert.equal(parsed.exportMetadata.totalCraft, 2);
  assert.equal(parsed.exportMetadata.station, 'Houston Flight Dynamics');
  assert.equal(parsed.spacecraft.length, 2);
  assert.equal(parsed.spacecraft[0].id, 'craft-1');
});

test('AerospaceOrbiterExportEngine - toMarkdownSummary compiles orbital dossier table with aggregates', () => {
  const engine = new AerospaceOrbiterExportEngine();
  const md = engine.toMarkdownSummary(sampleCraft);

  assert.ok(md.includes('# ⌬ Aerospace Orbiter Orbital Flight Summary'));
  assert.ok(md.includes('**Tracked Spacecraft:** 2'));
  assert.ok(md.includes('**Combined Orbital Mass:** 456,500 kg'));
  assert.ok(md.includes('| craft-1 |'));
  assert.ok(md.includes('| craft-2 |'));
});

test('AerospaceOrbiterExportEngine - toJSONBlob and toCSVBlob return objects with expected MIME types', () => {
  const engine = new AerospaceOrbiterExportEngine();

  const jsonBlob = engine.toJSONBlob(sampleCraft);
  assert.ok(jsonBlob.type.includes('application/json'));

  const csvBlob = engine.toCSVBlob(sampleCraft);
  assert.ok(csvBlob.type.includes('text/csv'));
});

test('AerospaceOrbiterExportEngine - triggerDownload returns false in non-DOM environment safely', () => {
  const engine = new AerospaceOrbiterExportEngine();
  const result = engine.triggerDownload('spacecraft.csv', { content: 'test', type: 'text/csv' });
  assert.equal(result, false);
});
