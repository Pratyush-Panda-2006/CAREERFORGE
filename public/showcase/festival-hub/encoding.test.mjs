import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const script = read('./script.js');
const html = read('./index.html');

// Common double-encoded UTF-8 sequences (utf8 read back as cp1252).
const MOJIBAKE = /\u00e2\u20ac|\u00f0\u0178|\u00c2[\u00b0\u00b7\u00a9\u00ae\u00ab\u00bb]|\u00c3[\u0080-\u00bf]/;

test('script.js has no BOM and no double-encoded UTF-8 text', () => {
  assert.notEqual(script.charCodeAt(0), 0xfeff);
  const bad = script.split('\n').map((line, i) => [i + 1, line]).filter(([, line]) => MOJIBAKE.test(line));
  assert.deepEqual(bad.map(([n]) => n), []);
});

test('headlinersFor() finds the headliners listed on the lineup cards', () => {
  const start = script.indexOf('function headlinersFor(');
  const end = script.indexOf('function setsFor(');
  assert.ok(start > -1 && end > start, 'headlinersFor() not found in script.js');

  // Pull the stage cards out of index.html and fake just enough DOM for the function.
  const cards = [...html.matchAll(/<article class="artist-card"[^>]*data-stage="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)].map((m) => {
    const grab = (re) => (m[2].match(re) || [])[1];
    const node = (text) => (text === undefined ? null : { textContent: text });
    return {
      stage: m[1],
      h3: node(grab(/<h3>([^<]*)<\/h3>/)),
      details: node(grab(/<p class="artist-details">([^<]*)<\/p>/)),
      genre: node(grab(/<span class="artist-genre">([^<]*)<\/span>/))
    };
  });
  assert.ok(cards.length >= 9);

  const document = {
    querySelectorAll(selector) {
      const stage = selector.match(/data-stage="([^"]+)"/)[1];
      return cards.filter((c) => c.stage === stage).map((c) => ({
        querySelector: (s) => (s === 'h3' ? c.h3 : s === '.artist-details' ? c.details : c.genre)
      }));
    }
  };
  const headlinersFor = new Function('document', `${script.slice(start, end)}\nreturn headlinersFor;`)(document);

  const main = headlinersFor('main-stage');
  assert.equal(main.length, 3);
  assert.deepEqual(main[0], { day: 'Oct 24', time: '21:00–22:30', artist: 'NEON APEX', genre: 'Cyberpunk Synthwave', headliner: true });
});
