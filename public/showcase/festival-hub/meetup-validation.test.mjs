import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('./script.js', import.meta.url), 'utf8');
const start = script.indexOf('function initMeetupLocator(');
const end = script.indexOf('\n}\n', start);
assert.ok(start > -1 && end > start, 'initMeetupLocator() not found in script.js');
const source = script.slice(start, end + 3);

// Just enough DOM to let the real initMeetupLocator() run and render its pin tray.
function makeEl() {
  const el = {
    innerHTML: '', textContent: '', hidden: false, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, appendChild() {}, setAttribute() {},
    closest: () => null, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
  };
  return el;
}

// Runs the real init with a given #hash and stored value, returns what ended up rendered/stored.
function load({ hash = '', stored } = {}) {
  const els = {};
  const document = {
    getElementById: (id) => (els[id] ||= makeEl()),
    createElement: () => makeEl(),
    querySelectorAll: () => [],
    querySelector: () => null
  };
  const store = new Map();
  if (stored !== undefined) store.set('cyberfest-meetup-waypoints', stored);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const window = { location: { hash, origin: 'http://x', pathname: '/' } };
  const run = new Function('document', 'window', 'localStorage', 'navigator', `${source}\ninitMeetupLocator();`);
  run(document, window, localStorage, {});
  return { count: els['meetup-count-badge'].textContent, stored: store.get('cyberfest-meetup-waypoints'), els };
}

const pin = (extra = {}) => ({ id: 'a', name: 'Camp', type: 'camp', xPct: 20, yPct: 30, timestamp: 1, ...extra });
const hashOf = (value) => `#meetup=${encodeURIComponent(JSON.stringify(value))}`;

test('a [null] share link is ignored and nothing bad is saved', () => {
  const r = load({ hash: hashOf([null]) });
  assert.equal(r.count, '0');
  assert.equal(r.stored, undefined);
});

test('a non-array or null value in localStorage does not break the locator', () => {
  assert.equal(load({ stored: '{"a":1}' }).count, '0');
  assert.equal(load({ stored: 'null' }).count, '0');
  assert.equal(load({ stored: '[null, 5, "x"]' }).count, '0');
});

test('pins with missing or non-finite coordinates are dropped, the good ones stay', () => {
  const r = load({ stored: JSON.stringify([pin({ xPct: 'abc' }), pin({ yPct: null }), pin({ xPct: 1e999 }), { name: 'x', type: 'camp' }, pin({ id: 'ok' })]) });
  assert.equal(r.count, '1');
  assert.equal(load({ hash: hashOf([{ name: 'n', type: 'camp', xPct: null, yPct: 5 }]) }).count, '0');
});

test('unknown pin types, even inherited ones like constructor, are dropped', () => {
  assert.equal(load({ stored: JSON.stringify([pin({ type: 'constructor' }), pin({ type: 'nope' }), pin({ name: 5 })]) }).count, '0');
});

test('a valid shared link still loads, gets saved, and coordinates are clamped to 0-100', () => {
  const r = load({ hash: hashOf([pin({ xPct: 250, yPct: -5 })]) });
  assert.equal(r.count, '1');
  const saved = JSON.parse(r.stored);
  assert.equal(saved[0].xPct, 100);
  assert.equal(saved[0].yPct, 0);
});

test('the number of pins is capped', () => {
  const many = Array.from({ length: 200 }, (_, i) => pin({ id: 'p' + i }));
  assert.equal(load({ hash: hashOf(many) }).count, '50');
});
