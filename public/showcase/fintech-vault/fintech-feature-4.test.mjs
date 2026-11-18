import test from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultExportEngine } from './export-engine.js';

test('FintechVaultExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'VAULT-1', title: 'USDC Treasury Pool', amount: 5000000, active: true },
    { id: 'VAULT-2', title: 'ETH Staking Vault', amount: 8000000, active: false }
  ];
  const engine = new FintechVaultExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'USDC Treasury Pool');
  assert.equal(parsed[1].amount, 8000000);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('FintechVaultExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'V-01',
      title: 'Simple Asset',
      summary: 'Liquid vault',
      amount: 1000000
    },
    {
      id: 'V-02',
      title: 'USDC, USDT & DAI Pool', // Comma
      summary: 'Features "smart" routing', // Quotes
      amount: 4500000
    },
    {
      id: 'V-03',
      title: 'Multi-Sig\nCold\rVault', // Newline
      summary: 'Enclave backed',
      amount: 9000000
    }
  ];

  const engine = new FintechVaultExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines.length, 4); // 1 header + 3 rows
  assert.equal(lines[0], 'id,title,summary,amount');

  // Row 1: Plain
  assert.equal(lines[1], 'V-01,Simple Asset,Liquid vault,1000000');

  // Row 2: Commas & quotes escaped
  assert.equal(lines[2], 'V-02,"USDC, USDT & DAI Pool","Features ""smart"" routing",4500000');

  // Row 3: Newline wrapped
  assert.ok(lines[3].startsWith('V-03,"Multi-Sig\nCold\rVault"'));

  const csvBlob = engine.toCSVBlob();
  assert.equal(csvBlob.type, 'text/csv;charset=utf-8');
  assert.ok(csvBlob.size > 0);
});

test('FintechVaultExportEngine - Custom delimiters and column selections in CSV export', () => {
  const engine = new FintechVaultExportEngine();
  const sample = [
    { id: '101', category: 'Stablecoin' },
    { id: '102', category: 'Yield' }
  ];

  // Semicolon delimiter
  const semiCsv = engine.toCSVString(sample, { delimiter: ';' });
  assert.equal(semiCsv, 'id;category\r\n101;Stablecoin\r\n102;Yield');

  // Specific header without header line
  const noHeaderCsv = engine.toCSVString(sample, {
    headers: ['category'],
    includeHeaders: false
  });
  assert.equal(noHeaderCsv, 'Stablecoin\r\nYield');
});

test('FintechVaultExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new FintechVaultExportEngine({
    data: [
      { id: 'F1', category: 'Stablecoin', amount: 5000000, custodian: 'Bank A' },
      { id: 'F2', category: 'Layer 1', amount: 10000000, custodian: 'Bank B' }
    ]
  });

  const markdown = engine.toMarkdownAudit();

  assert.ok(markdown.includes('# Fintech Vault - Treasury Allocation & Audit Report'));
  assert.ok(markdown.includes('Total Vault Allocations:** 2'));
  assert.ok(markdown.includes('Combined Treasury Valuation:** $15,000,000'));
  assert.ok(markdown.includes('Average Position Size:** $7,500,000'));
  assert.ok(markdown.includes('| id | category | amount | custodian |'));
  assert.ok(markdown.includes('| --- | --- | --- | --- |'));
  assert.ok(markdown.includes('| F1 | Stablecoin | $5,000,000 | Bank A |'));
});

test('FintechVaultExportEngine - Handles empty dataset gracefully', () => {
  const engine = new FintechVaultExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const metrics = engine.generateAuditMetrics();
  assert.equal(metrics.totalAssets, 0);
  assert.equal(metrics.totalValuation, 0);
  assert.equal(metrics.avgAllocation, 0);

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('No vault asset records currently loaded'));
});

test('FintechVaultExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new FintechVaultExportEngine();

  const unsafeName = 'vault-treasury /:*?"<>| v1 2026';
  const cleanName = engine.sanitizeFilename(unsafeName, 'csv');
  assert.equal(cleanName, 'vault-treasury_--------_v1_2026.csv');

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(512), '512 B');
  assert.equal(engine.formatBytes(2048), '2.0 KB');
  assert.equal(engine.formatBytes(1048576 * 4), '4.0 MB');
});
