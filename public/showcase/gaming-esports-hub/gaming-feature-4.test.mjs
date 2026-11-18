import test from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubExportEngine } from './export-engine.js';

test('GamingEsportsHubExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'ESP-1', title: 'VCT Grand Final', prizePool: 2000000, live: true },
    { id: 'ESP-2', title: 'Worlds Semifinals', prizePool: 3000000, live: false }
  ];
  const engine = new GamingEsportsHubExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'VCT Grand Final');
  assert.equal(parsed[1].prizePool, 3000000);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('GamingEsportsHubExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'T-01',
      title: 'Simple Match',
      summary: 'Bo3 group match',
      prizePool: 50000
    },
    {
      id: 'T-02',
      title: 'Major, Finals & All-Stars', // Comma
      summary: 'Includes "seeded" teams', // Quotes
      prizePool: 500000
    },
    {
      id: 'T-03',
      title: 'Playoff\nUpper\rBracket', // Newline
      summary: 'Double elimination',
      prizePool: 250000
    }
  ];

  const engine = new GamingEsportsHubExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 4); // 1 header + 3 rows
  assert.equal(lines[0], 'id,title,summary,prizePool');

  // Row 1: Plain
  assert.equal(lines[1], 'T-01,Simple Match,Bo3 group match,50000');

  // Row 2: Commas & quotes escaped
  assert.equal(lines[2], 'T-02,"Major, Finals & All-Stars","Includes ""seeded"" teams",500000');

  // Row 3: Newline wrapped
  assert.ok(lines[3].startsWith('T-03,"Playoff\nUpper\rBracket"'));

  const csvBlob = engine.toCSVBlob();
  assert.equal(csvBlob.type, 'text/csv;charset=utf-8');
  assert.ok(csvBlob.size > 0);
});

test('GamingEsportsHubExportEngine - Custom delimiters and column selections in CSV export', () => {
  const engine = new GamingEsportsHubExportEngine();
  const sample = [
    { id: '101', category: 'FPS' },
    { id: '102', category: 'MOBA' }
  ];

  // Semicolon delimiter
  const semiCsv = engine.toCSVString(sample, { delimiter: ';' });
  assert.equal(semiCsv, 'id;category\r\n101;FPS\r\n102;MOBA');

  // Specific header without header line
  const noHeaderCsv = engine.toCSVString(sample, {
    headers: ['category'],
    includeHeaders: false
  });
  assert.equal(noHeaderCsv, 'FPS\r\nMOBA');
});

test('GamingEsportsHubExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new GamingEsportsHubExportEngine({
    data: [
      { id: 'G1', category: 'FPS', prizePool: 2000000, organizer: 'Org A' },
      { id: 'G2', category: 'MOBA', prizePool: 4000000, organizer: 'Org B' }
    ]
  });

  const markdown = engine.toMarkdownAudit();

  assert.ok(markdown.includes('# Gaming Esports Hub - Tournament & Arena Audit Report'));
  assert.ok(markdown.includes('Total Premier Tournaments:** 2'));
  assert.ok(markdown.includes('Cumulative Prize Pool:** $6,000,000'));
  assert.ok(markdown.includes('Average Championship Bounty:** $3,000,000'));
  assert.ok(markdown.includes('| id | category | prizePool | organizer |'));
  assert.ok(markdown.includes('| --- | --- | --- | --- |'));
  assert.ok(markdown.includes('| G1 | FPS | $2,000,000 | Org A |'));
});

test('GamingEsportsHubExportEngine - Handles empty dataset gracefully', () => {
  const engine = new GamingEsportsHubExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const metrics = engine.generateAuditMetrics();
  assert.equal(metrics.totalTournaments, 0);
  assert.equal(metrics.totalPrizePool, 0);
  assert.equal(metrics.avgPrizePool, 0);

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('No esports tournament records currently loaded'));
});

test('GamingEsportsHubExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new GamingEsportsHubExportEngine();

  const unsafeName = 'esports-tournaments /:*?"<>| v1 2026';
  const cleanName = engine.sanitizeFilename(unsafeName, 'csv');
  assert.equal(cleanName, 'esports-tournaments_--------_v1_2026.csv');

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(512), '512 B');
  assert.equal(engine.formatBytes(2048), '2.0 KB');
  assert.equal(engine.formatBytes(1048576 * 4), '4.0 MB');
});
