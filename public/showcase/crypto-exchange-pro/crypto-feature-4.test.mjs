import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProExportEngine } from './export-engine.js';

const samplePairs = [
  {
    id: 'pair-1',
    symbol: 'BTC/USDT, Spot',
    base: 'BTC',
    quote: 'USDT',
    category: 'Layer-1',
    lastPrice: 91450.25,
    change24h: 3.45,
    volume24h: 4280000000,
    fundingRate: 0.0125
  },
  {
    id: 'pair-2',
    symbol: 'ETH/"Mainnet"',
    base: 'ETH',
    quote: 'USDT',
    category: 'Layer-1',
    lastPrice: 3420.80,
    change24h: 5.12,
    volume24h: 2150000000,
    fundingRate: 0.0098
  }
];

test('CryptoExchangeProExportEngine - _escapeCSV properly handles commas, quotes, and newlines', () => {
  const engine = new CryptoExchangeProExportEngine();

  assert.equal(engine._escapeCSV('BTC/USDT'), 'BTC/USDT');
  assert.equal(engine._escapeCSV('BTC/USDT, Spot'), '"BTC/USDT, Spot"');
  assert.equal(engine._escapeCSV('ETH/"Mainnet"'), '"ETH/""Mainnet"""');
  assert.equal(engine._escapeCSV('Line1\nLine2'), '"Line1\nLine2"');
  assert.equal(engine._escapeCSV(['tag1', 'tag2']), 'tag1; tag2');
});

test('CryptoExchangeProExportEngine - toCSVString formats valid RFC 4180 CSV table with header', () => {
  const engine = new CryptoExchangeProExportEngine();
  const csv = engine.toCSVString(samplePairs);

  const lines = csv.trim().split('\n');
  assert.ok(lines.length >= 3);
  assert.equal(lines[0], 'id,symbol,base,quote,category,lastPrice,change24h,volume24h,fundingRate');
  assert.ok(lines[1].includes('"BTC/USDT, Spot"'));
  assert.ok(lines[2].includes('"ETH/""Mainnet"""'));
});

test('CryptoExchangeProExportEngine - toJSONString produces structured JSON with schema metadata', () => {
  const engine = new CryptoExchangeProExportEngine();
  const jsonStr = engine.toJSONString(samplePairs, { desk: 'Derivatives' });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.exportMetadata.system, 'Crypto Exchange Pro Terminal');
  assert.equal(parsed.exportMetadata.version, '1.0.0');
  assert.equal(parsed.exportMetadata.totalPairs, 2);
  assert.equal(parsed.exportMetadata.desk, 'Derivatives');
  assert.equal(parsed.markets.length, 2);
  assert.equal(parsed.markets[0].id, 'pair-1');
});

test('CryptoExchangeProExportEngine - toMarkdownSummary compiles executive summary table with aggregates', () => {
  const engine = new CryptoExchangeProExportEngine();
  const md = engine.toMarkdownSummary(samplePairs);

  assert.ok(md.includes('# ❖ Crypto Exchange Pro Market Summary'));
  assert.ok(md.includes('**Active Trading Pairs:** 2'));
  assert.ok(md.includes('**24h Aggregate Volume:** $6.43B USDT'));
  assert.ok(md.includes('| pair-1 |'));
  assert.ok(md.includes('| pair-2 |'));
});

test('CryptoExchangeProExportEngine - toJSONBlob and toCSVBlob return objects with expected MIME types', () => {
  const engine = new CryptoExchangeProExportEngine();

  const jsonBlob = engine.toJSONBlob(samplePairs);
  assert.ok(jsonBlob.type.includes('application/json'));

  const csvBlob = engine.toCSVBlob(samplePairs);
  assert.ok(csvBlob.type.includes('text/csv'));
});

test('CryptoExchangeProExportEngine - triggerDownload returns false in non-DOM environment safely', () => {
  const engine = new CryptoExchangeProExportEngine();
  const result = engine.triggerDownload('markets.csv', { content: 'test', type: 'text/csv' });
  assert.equal(result, false);
});
