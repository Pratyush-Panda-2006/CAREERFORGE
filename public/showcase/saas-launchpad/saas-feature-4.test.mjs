import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadExportEngine } from './export-engine.js';

test('SaasLaunchpadExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'SUB-1', name: 'Alpha Corp', mrr: 1500, active: true },
    { id: 'SUB-2', name: 'Beta Ltd', mrr: 3200, active: false }
  ];
  const engine = new SaasLaunchpadExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'Alpha Corp');
  assert.equal(parsed[1].mrr, 3200);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('SaasLaunchpadExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'REC-01',
      company: 'Standard Corp',
      description: 'Simple description',
      revenue: 1000
    },
    {
      id: 'REC-02',
      company: 'Smith, Jones & Co.', // Comma test
      description: 'Contains "quoted" text', // Quote test
      revenue: 2500
    },
    {
      id: 'REC-03',
      company: 'Multi\nLine\rCo', // Newline test
      description: 'Normal text',
      revenue: 3000
    }
  ];

  const engine = new SaasLaunchpadExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 4); // 1 header + 3 rows
  assert.equal(lines[0], 'id,company,description,revenue');

  // Row 1: No quotes needed
  assert.equal(lines[1], 'REC-01,Standard Corp,Simple description,1000');

  // Row 2: Commas & quotes escaped
  assert.equal(lines[2], 'REC-02,"Smith, Jones & Co.","Contains ""quoted"" text",2500');

  // Row 3: Newline wrapped in quotes
  assert.ok(lines[3].startsWith('REC-03,"Multi\nLine\rCo"'));

  const csvBlob = engine.toCSVBlob();
  assert.equal(csvBlob.type, 'text/csv;charset=utf-8');
  assert.ok(csvBlob.size > 0);
});

test('SaasLaunchpadExportEngine - Custom delimiters and column selections in CSV export', () => {
  const engine = new SaasLaunchpadExportEngine();
  const sample = [
    { code: 'A1', val: 10 },
    { code: 'B2', val: 20 }
  ];

  // Semicolon delimiter
  const semicolonCsv = engine.toCSVString(sample, { delimiter: ';' });
  assert.equal(semicolonCsv, 'code;val\r\nA1;10\r\nB2;20');

  // Specific header subset without header line
  const noHeaderCsv = engine.toCSVString(sample, {
    headers: ['val'],
    includeHeaders: false
  });
  assert.equal(noHeaderCsv, '10\r\n20');
});

test('SaasLaunchpadExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new SaasLaunchpadExportEngine({
    data: [
      { id: 'A', tier: 'Enterprise', mrr: 5000, seats: 100 },
      { id: 'B', tier: 'Growth', mrr: 2000, seats: 40 }
    ]
  });

  const markdown = engine.toMarkdownAudit();

  assert.ok(markdown.includes('# SaaS Launchpad - Executive Portfolio Audit'));
  assert.ok(markdown.includes('Total Subscriptions:** 2'));
  assert.ok(markdown.includes('Monthly Recurring Revenue (MRR):** $7,000'));
  assert.ok(markdown.includes('Annual Run Rate (ARR):** $84,000'));
  assert.ok(markdown.includes('| id | tier | mrr | seats |'));
  assert.ok(markdown.includes('| --- | --- | --- | --- |'));
  assert.ok(markdown.includes('| A | Enterprise | $5,000 | 100 |'));
});

test('SaasLaunchpadExportEngine - Handles empty dataset gracefully', () => {
  const engine = new SaasLaunchpadExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const metrics = engine.generateAuditMetrics();
  assert.equal(metrics.totalRecords, 0);
  assert.equal(metrics.totalMRR, 0);
  assert.equal(metrics.avgMRR, 0);

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('No account records currently loaded'));
});

test('SaasLaunchpadExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new SaasLaunchpadExportEngine();

  const unsafeName = 'report /:*?"<>| test 2026';
  const cleanName = engine.sanitizeFilename(unsafeName, 'csv');
  assert.equal(cleanName, 'report_--------_test_2026.csv');

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(512), '512 B');
  assert.equal(engine.formatBytes(2048), '2.0 KB');
  assert.equal(engine.formatBytes(1048576 * 3.5), '3.5 MB');
});
