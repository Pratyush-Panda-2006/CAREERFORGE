import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelExportEngine } from './export-engine.js';

test('CybersecuritySentinelExportEngine - JSON serialization produces valid parsed data and correct MIME type', () => {
  const customData = [
    { id: 'T-1', title: 'SSH Brute Force', cvssScore: 9.8 },
    { id: 'T-2', title: 'SQL Injection', cvssScore: 8.6 }
  ];
  const engine = new CybersecuritySentinelExportEngine({ data: customData });

  const jsonStr = engine.toJSON();
  const parsed = JSON.parse(jsonStr);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'SSH Brute Force');
  assert.equal(parsed[1].cvssScore, 8.6);

  const jsonBlob = engine.toJSONBlob();
  assert.equal(jsonBlob.type, 'application/json;charset=utf-8');
  assert.ok(jsonBlob.size > 0);
});

test('CybersecuritySentinelExportEngine - CSV serialization strictly escapes commas, quotes, and newlines', () => {
  const testData = [
    {
      id: 'INC-01',
      title: 'Simple Ping Flood',
      summary: 'ICMP rate limit exceeded',
      cvss: 5.0
    },
    {
      id: 'INC-02',
      title: 'SQLi, Blind "Auth Bypass"', // Comma and quote
      summary: 'Exploited "admin" cookie',
      cvss: 8.6
    },
    {
      id: 'INC-03',
      title: 'Ransomware\nPayload\rCanary', // Newline
      summary: 'Automated lock triggered',
      cvss: 9.9
    }
  ];

  const engine = new CybersecuritySentinelExportEngine({ data: testData });
  const csv = engine.toCSVString();
  const lines = csv.split('\r\n');

  assert.equal(lines[0], 'id,title,summary,cvss');
  assert.equal(lines[1], 'INC-01,Simple Ping Flood,ICMP rate limit exceeded,5');
  // Quotes escaped by doubling, enclosed in quotes
  assert.ok(lines[2].includes('"SQLi, Blind ""Auth Bypass"""'));
  // Newlines enclosed in quotes
  assert.ok(lines[3].includes('"Ransomware\nPayload\rCanary"'));
});

test('CybersecuritySentinelExportEngine - Custom delimiters and column selections in CSV export', () => {
  const data = [
    { id: 'T1', title: 'Brute Force', cvss: 9.8, ip: '198.51.100.42' },
    { id: 'T2', title: 'SQLi', cvss: 8.6, ip: '203.0.113.19' }
  ];
  const engine = new CybersecuritySentinelExportEngine({ data });

  const semiColonCSV = engine.toCSVString({
    delimiter: ';',
    columns: ['title', 'cvss']
  });

  const lines = semiColonCSV.split('\r\n');
  assert.equal(lines[0], 'title;cvss');
  assert.equal(lines[1], 'Brute Force;9.8');
  assert.equal(lines[2], 'SQLi;8.6');
});

test('CybersecuritySentinelExportEngine - Generates formatted Markdown Audit Summary with metrics', () => {
  const engine = new CybersecuritySentinelExportEngine();
  const md = engine.toMarkdownAudit();

  assert.ok(md.includes('# Cybersecurity Sentinel - Incident Audit Report'));
  assert.ok(md.includes('**Total Monitored Incidents:** 5'));
  assert.ok(md.includes('**Critical Threat Count:** 3'));
  assert.ok(md.includes('### Security Incident Log Table'));
  assert.ok(md.includes('| INC-901 |'));
  assert.ok(md.includes('| INC-903 |'));
});

test('CybersecuritySentinelExportEngine - Handles empty dataset gracefully', () => {
  const engine = new CybersecuritySentinelExportEngine({ data: [] });

  assert.equal(engine.toCSVString(), '');
  assert.equal(engine.toJSON(), '[]');

  const md = engine.toMarkdownAudit();
  assert.ok(md.includes('*No threat incident records available.*'));
});

test('CybersecuritySentinelExportEngine - Sanitizes filenames and formats bytes correctly', () => {
  const engine = new CybersecuritySentinelExportEngine();

  const clean = engine.sanitizeFilename('report/\\:*?"<>| threats#1.csv');
  assert.ok(!clean.includes('/'));
  assert.ok(!clean.includes('\\'));
  assert.ok(!clean.includes(':'));

  assert.equal(engine.formatBytes(0), '0 B');
  assert.equal(engine.formatBytes(500), '500 B');
  assert.equal(engine.formatBytes(2048), '2.00 KB');
  assert.equal(engine.formatBytes(1048576 * 6.5), '6.50 MB');
});
