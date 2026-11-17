// Run with: node --test public/showcase/automotive-hypercar/encoding.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const script = read('./script.js');
const styles = read('./styles.css');

// Common double-encoded UTF-8 sequences (utf8 read back as cp1252).
const MOJIBAKE = /â€|ðŸ|Â[°±·©®«»²³]|Ã[\u0080-¿]/;

for (const [name, text] of [['script.js', script], ['styles.css', styles]]) {
  test(`${name} has no BOM and no double-encoded UTF-8 text`, () => {
    assert.notEqual(text.charCodeAt(0), 0xfeff);
    const bad = text.split('\n').map((line, i) => [i + 1, line]).filter(([, line]) => MOJIBAKE.test(line));
    assert.deepEqual(bad.map(([n]) => n), []);
  });
}

test('360 view labels use a real degree sign', () => {
  const start = script.indexOf('var ANGLES = [');
  const end = script.indexOf('];', start);
  assert.ok(start > -1 && end > start, 'ANGLES not found in script.js');
  const angles = JSON.parse(vm.runInNewContext(`(() => { ${script.slice(start, end + 2)}\nreturn JSON.stringify(ANGLES); })()`));
  assert.deepEqual(angles.map((a) => a.label), [
    '000° // FRONT 3/4',
    '090° // SIDE AERO',
    '180° // REAR DIFFUSER',
    '270° // TOP AERO'
  ]);
});
