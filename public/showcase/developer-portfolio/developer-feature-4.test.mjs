import test from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioExportEngine } from './export-engine.js';

test('DeveloperPortfolioExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'REPO-1', title: 'Rust Core Engine', stars: 2500, active: true },
    { id: 'REPO-2', title: 'WASM Compiler', stars: 1200, active: false }
  ];
  const engine = new DeveloperPortfolioExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'Rust Core Engine');
  assert.equal(parsed[1].stars, 1200);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('DeveloperPortfolioExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'P-01',
      title: 'Simple Project',
      desc: 'Standard tool',
      stars: 100
    },
    {
      id: 'P-02',
      title: 'Compiler, Parser & AST', // Comma
      desc: 'Contains "quoted" options', // Double quotes
      stars: 450
    },
    {
      id: 'P-03',
      title: 'Multi\nLine\rName', // Newline
      desc: 'Clean text',
      stars: 800
    }
  ];

  const engine = new DeveloperPortfolioExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 4); // 1 header + 3 rows
  assert.equal(lines[0], 'id,title,desc,stars');

  // Row 1: No quotes
  assert.equal(lines[1], 'P-01,Simple Project,Standard tool,100');

  // Row 2: Quotes and commas escaped
  assert.equal(lines[2], 'P-02,"Compiler, Parser & AST","Contains ""quoted"" options",450');

  // Row 3: Newlines wrapped
  assert.ok(lines[3].startsWith('P-03,"Multi\nLine\rName"'));

  const csvBlob = engine.toCSVBlob();
  assert.equal(csvBlob.type, 'text/csv;charset=utf-8');
  assert.ok(csvBlob.size > 0);
});

test('DeveloperPortfolioExportEngine - Custom delimiters and column selections in CSV export', () => {
  const engine = new DeveloperPortfolioExportEngine();
  const sample = [
    { id: '1', lang: 'Rust' },
    { id: '2', lang: 'Go' }
  ];

  // Tab delimiter
  const tabCsv = engine.toCSVString(sample, { delimiter: '\t' });
  assert.equal(tabCsv, 'id\tlang\r\n1\tRust\r\n2\tGo');

  // Specific header without header line
  const noHeaderCsv = engine.toCSVString(sample, {
    headers: ['lang'],
    includeHeaders: false
  });
  assert.equal(noHeaderCsv, 'Rust\r\nGo');
});

test('DeveloperPortfolioExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new DeveloperPortfolioExportEngine({
    data: [
      { id: 'R1', language: 'Rust', stars: 5000, forks: 400 },
      { id: 'R2', language: 'TypeScript', stars: 2000, forks: 150 }
    ]
  });

  const markdown = engine.toMarkdownAudit();

  assert.ok(markdown.includes('# Developer Portfolio - Repository & Skillset Audit'));
  assert.ok(markdown.includes('Total Repositories:** 2'));
  assert.ok(markdown.includes('Cumulative GitHub Stars:** ★ 7,000'));
  assert.ok(markdown.includes('Cumulative Network Forks:** ⑂ 550'));
  assert.ok(markdown.includes('| id | language | stars | forks |'));
  assert.ok(markdown.includes('| --- | --- | --- | --- |'));
  assert.ok(markdown.includes('| R1 | Rust | ★ 5,000 | 400 |'));
});

test('DeveloperPortfolioExportEngine - Handles empty dataset gracefully', () => {
  const engine = new DeveloperPortfolioExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const metrics = engine.generateAuditMetrics();
  assert.equal(metrics.totalProjects, 0);
  assert.equal(metrics.totalStars, 0);
  assert.equal(metrics.avgStars, 0);

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('No repository records currently loaded'));
});

test('DeveloperPortfolioExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new DeveloperPortfolioExportEngine();

  const unsafeName = 'dev-export /:*?"<>| build 2026';
  const cleanName = engine.sanitizeFilename(unsafeName, 'csv');
  assert.equal(cleanName, 'dev-export_--------_build_2026.csv');

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(1024), '1.0 KB');
  assert.equal(engine.formatBytes(1048576 * 2.5), '2.5 MB');
});
