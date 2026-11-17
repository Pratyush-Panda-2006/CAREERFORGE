// Run with: node --test public/showcase/fintech-vault/encoding.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('./script.js', import.meta.url), 'utf8');

// Common double-encoded UTF-8 sequences (utf8 read back as cp1252).
const MOJIBAKE = /â€|ðŸ|Â[°·©®«»]|Ã[\u0080-¿]/;

test('script.js has no BOM and no double-encoded UTF-8 text', () => {
  assert.notEqual(script.charCodeAt(0), 0xfeff);
  const bad = script.split('\n').map((line, i) => [i + 1, line]).filter(([, line]) => MOJIBAKE.test(line));
  assert.deepEqual(bad.map(([n]) => n), []);
});

test('CURRENCY_MAP has the real euro and pound signs and bullets in the preset chips', () => {
  const start = script.indexOf('const CURRENCY_MAP = {');
  const end = script.indexOf('let currentCurrencyKey', start);
  assert.ok(start > -1 && end > start, 'CURRENCY_MAP not found in script.js');
  const map = JSON.parse(vm.runInNewContext(`(() => { ${script.slice(start, end)}\nreturn JSON.stringify(CURRENCY_MAP); })()`));

  assert.equal(map.USD.symbol, '$');
  assert.equal(map.EUR.symbol, '€');
  assert.equal(map.GBP.symbol, '£');
  assert.deepEqual(map.EUR.initialMarks, ['€0', '€50k', '€150k', '€250k+']);
  assert.deepEqual(map.GBP.monthlyMarks, ['£0', '£2,500', '£5,000', '£10,000+']);
  assert.equal(map.USD.presets[0], '$500/mo • 8.5% • 25 Yrs');
  assert.equal(map.EUR.presets[3], '€250/mo • 5.2% • 10 Yrs');
  assert.equal(map.GBP.presets[1], '£1.2k/mo • 11.5% • 30 Yrs');
});
