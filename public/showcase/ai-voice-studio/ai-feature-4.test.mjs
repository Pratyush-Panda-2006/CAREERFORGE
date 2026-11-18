import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioExportEngine } from './export-engine.js';

test('AiVoiceStudioExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'V-1', name: 'Aura Pro', clarityScore: 99.4 },
    { id: 'V-2', name: 'Sol Conversational', clarityScore: 97.8 }
  ];
  const engine = new AiVoiceStudioExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'Aura Pro');
  assert.equal(parsed[1].clarityScore, 97.8);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('AiVoiceStudioExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'V-01',
      name: 'Standard Voice',
      summary: 'Clean studio tone',
      clarity: 98
    },
    {
      id: 'V-02',
      name: 'Sol, Special "Broadcast"', // Comma and quote
      summary: 'Includes "neural" prosody',
      clarity: 99
    },
    {
      id: 'V-03',
      name: 'Cinematic\nTrailer\rVoice', // Newline
      summary: 'Deep vocal resonance',
      clarity: 97
    }
  ];

  const engine = new AiVoiceStudioExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines[0], 'id,name,summary,clarity');
  assert.equal(lines[1], 'V-01,Standard Voice,Clean studio tone,98');
  // Quotes escaped by doubling, enclosed in quotes
  assert.ok(lines[2].includes('"Sol, Special ""Broadcast"""'));
  // Newlines enclosed in quotes
  assert.ok(lines[3].includes('"Cinematic\nTrailer\rVoice"'));
});

test('AiVoiceStudioExportEngine - Custom delimiters and column selections in CSV export', () => {
  const data = [
    { id: 'V1', name: 'Aura', clarity: 99, sampleRate: 48000 },
    { id: 'V2', name: 'Zephyr', clarity: 98, sampleRate: 96000 }
  ];
  const engine = new AiVoiceStudioExportEngine({ data });

  const semiColonCSV = engine.toCSVString({
    delimiter: ';',
    columns: ['name', 'sampleRate']
  });

  const lines = semiColonCSV.split('\r\n');
  assert.equal(lines[0], 'name;sampleRate');
  assert.equal(lines[1], 'Aura;48000');
  assert.equal(lines[2], 'Zephyr;96000');
});

test('AiVoiceStudioExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new AiVoiceStudioExportEngine();
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# AI Voice Studio - Neural Model Catalog Audit'));
  assert.ok(md.includes('**Total Catalog Voices:** 5'));
  assert.ok(md.includes('**Average Clarity Index:**'));
  assert.ok(md.includes('### Neural Voice Model Manifest'));
  assert.ok(md.includes('| VOICE-101 |'));
  assert.ok(md.includes('| VOICE-103 |'));
});

test('AiVoiceStudioExportEngine - Handles empty dataset gracefully', () => {
  const engine = new AiVoiceStudioExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('*No neural voice records available.*'));
});

test('AiVoiceStudioExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new AiVoiceStudioExportEngine();

  const clean = engine.sanitizeFilename('report/\\:*?"<>| voices#1.json');
  assert.ok(!clean.includes('/'));
  assert.ok(!clean.includes('\\'));
  assert.ok(!clean.includes(':'));

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(500), '500 B');
  assert.equal(engine.formatBytes(2048), '2.00 KB');
  assert.equal(engine.formatBytes(1048576 * 4.2), '4.20 MB');
});
