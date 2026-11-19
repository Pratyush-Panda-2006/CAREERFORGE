import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactReceiptGenerator, encodeReference, normalizeReceipt, wrapText } from './export-receipt.js';

const sample = () => ({ title: 'Thank you for making a difference.', recipient: 'Asha Rao', contribution: '12 volunteer hours', message: 'Our community grows because of you.', date: '2026-11-19', reference: 'IMPACT-014' });
function fixture() {
  const rects = [], texts = [], transforms = []; let clears = 0, saves = 0, restores = 0, format;
  const canvas = { width: 0, height: 0, getContext: () => ctx, toDataURL(type) { format = type; return 'data:image/png;base64,iVBORw0KGgo='; }, toBlob(callback, type) { format = type; callback(new Blob([new Uint8Array([137, 80, 78, 71])], { type })); } };
  const ctx = {
    canvas, font: '', save() { saves++; }, restore() { restores++; },
    setTransform(...args) { transforms.push(args); }, clearRect() { clears++; },
    fillRect(...args) { rects.push(args); }, strokeRect(...args) { rects.push(args); },
    measureText(text) { return { width: [...text].length * 9 }; },
    fillText(text, x, y) { texts.push({ text, x, y }); },
  };
  const generator = new NonprofitImpactReceiptGenerator(canvas);
  return { generator, canvas, ctx, rects, texts, transforms, counts: () => ({ clears, saves, restores, format }) };
}

test('normalizes a defensive copy, preserving Unicode and literal markup as text', () => {
  const data = sample(); data.reference = ' impact-014 '; data.recipient = '  Zoë   <b>Rao</b>  ';
  const result = normalizeReceipt(data);
  assert.equal(result.reference, 'IMPACT-014'); assert.equal(result.recipient, 'Zoë <b>Rao</b>');
  result.message = 'Local'; assert.equal(data.message, sample().message);
});

test('validates real calendar dates including leap years, not normalized impossible dates', () => {
  for (const date of ['2024-02-29', '2026-01-31', '2026-12-31']) assert.equal(normalizeReceipt({ ...sample(), date }).date, date);
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '', '2026-1-01', 'not-a-date']) assert.throws(() => normalizeReceipt({ ...sample(), date }));
});

test('rejects absent, wrong-type, blank, oversized and control-bearing details', () => {
  for (const value of [undefined, null, 3, [], {}]) assert.throws(() => normalizeReceipt(value));
  for (const field of ['title', 'recipient', 'contribution', 'message']) {
    for (const value of [undefined, null, 42, '   ', 'x'.repeat(181), '\u0000bad']) assert.throws(() => normalizeReceipt({ ...sample(), [field]: value }));
  }
  for (const reference of ['', 'a/b', '<script>', 'x'.repeat(25), 'one two', 7]) assert.throws(() => normalizeReceipt({ ...sample(), reference }));
});

test('reference pattern has known guards, seven ASCII data bits and independent odd parity', () => {
  assert.deepEqual(encodeReference('A').groups, ['10000011']);
  assert.deepEqual(encodeReference('0').groups, ['01100001']);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  for (const character of alphabet) {
    const encoded = encodeReference(character), group = encoded.groups[0];
    assert.equal(parseInt(group.slice(0, 7), 2), character.charCodeAt(0));
    assert.equal([...group].filter(bit => bit === '1').length % 2, 1);
    assert.equal(encoded.modules, '10110' + group + '1101');
    // Flipping any one module in the payload violates odd parity.
    for (let index = 0; index < 8; index++) {
      const flipped = [...group]; flipped[index] = flipped[index] === '1' ? '0' : '1';
      assert.equal(flipped.filter(bit => bit === '1').length % 2, 0);
    }
  }
});

test('bounds every reference length with equal quiet zones and no out-of-frame bars', () => {
  for (let length = 1; length <= 24; length++) {
    const f = fixture(), code = 'A'.repeat(length);
    const bounds = f.generator.drawBarcode(f.ctx, code, 96, 450);
    const unit = 808 / (encodeReference(code).modules.length + 20);
    assert.equal(bounds.modules, 9 + length * 8);
    assert.ok(Math.abs(f.rects[0][0] - (96 + 10 * unit)) < 1e-8);
    for (const [x, y, width, height] of f.rects) { assert.ok(x >= 96 && x + width <= 904 + 1e-8); assert.equal(y, 450); assert.equal(height, 54); }
    const last = f.rects.at(-1); assert.ok(Math.abs(904 - (last[0] + last[2]) - 10 * unit) < 1e-8);
  }
});

test('rejects bad coordinates before painting reference modules', () => {
  const f = fixture();
  for (const args of [[-1, 20, 100, 40], [0, 0, 1001, 40], [0, 690, 100, 20], [0, 0, 0, 20], [NaN, 0, 100, 20], [0, 0, Infinity, 20]]) assert.throws(() => f.generator.drawBarcode(f.ctx, 'A', ...args));
  assert.equal(f.rects.length, 0);
});

test('wraps long unbroken text, keeps every nonspace character and rejects line overflow', () => {
  const { ctx } = fixture();
  const source = 'Readable text andaverylongunbrokenword';
  const lines = wrapText(ctx, source, 90, 5);
  assert.equal(lines.join('').replaceAll(' ', ''), source.replaceAll(' ', ''));
  assert.ok(lines.every(line => ctx.measureText(line).width <= 90));
  assert.throws(() => wrapText(ctx, source, 90, 1));
  assert.throws(() => wrapText(ctx, 'W', 1, 1));
});

test('renders high-resolution artwork with all geometry and text inside logical bounds', () => {
  const f = fixture(), result = f.generator.render(sample());
  assert.equal(f.canvas.width, 2000); assert.equal(f.canvas.height, 1400);
  assert.deepEqual(result, sample()); assert.deepEqual(f.transforms, [[2, 0, 0, 2, 0, 0]]);
  assert.equal(f.counts().clears, 1); assert.equal(f.counts().saves, f.counts().restores);
  for (const [x, y, width, height] of f.rects) { assert.ok(x >= 0 && x + width <= 1000 + 1e-8); assert.ok(y >= 0 && y + height <= 700); }
  for (const { text, x, y } of f.texts) { assert.ok(x >= 0 && x + f.ctx.measureText(text).width <= 1000); assert.ok(y >= 0 && y <= 700); }
  assert.ok(f.texts.some(item => item.text.includes('Asha Rao')));
});

test('keeps the last valid preview after invalid input or overflowing text', () => {
  const f = fixture(); f.generator.render(sample());
  assert.throws(() => f.generator.render({ ...sample(), date: '2026-02-30' }));
  // Force real layout failure independently of character-count validation.
  f.ctx.measureText = text => ({ width: [...text].length * 900 });
  assert.throws(() => f.generator.render(sample()));
  assert.equal(f.counts().clears, 1); assert.deepEqual(f.generator.lastReceipt, sample());
  assert.equal(f.counts().saves, f.counts().restores);
});

test('delegates PNG data URLs and Blob encoding to canvas only after a valid render', async () => {
  const f = fixture(); assert.throws(() => f.generator.toDataURL());
  await assert.rejects(f.generator.downloadBlob('impact.png'));
  f.generator.render(sample());
  assert.match(f.generator.toDataURL(), /^data:image\/png;base64,/); assert.equal(f.counts().format, 'image/png');
  const result = await f.generator.downloadBlob('impact-014.png');
  assert.equal(result.filename, 'impact-014.png'); assert.equal(result.blob.type, 'image/png'); assert.ok(result.blob.size > 0);
  for (const filename of ['../outside.png', 'data:image/png', 'x.svg', '', 'a'.repeat(81) + '.png']) await assert.rejects(f.generator.downloadBlob(filename));
});

test('reports null, empty, wrong-type and throwing canvas encoders', async () => {
  for (const value of [null, new Blob([],{type:'image/png'}), new Blob(['x'],{type:'text/plain'})]) {
    const f = fixture(); f.generator.render(sample()); f.canvas.toBlob = callback => callback(value);
    await assert.rejects(f.generator.downloadBlob('impact.png'), /PNG export failed/);
  }
  const f = fixture(); f.generator.render(sample()); f.canvas.toBlob = () => { throw new Error('Encoder unavailable'); };
  await assert.rejects(f.generator.downloadBlob('impact.png'), /Encoder unavailable/);
  f.canvas.toDataURL = () => 'data:,'; assert.throws(() => f.generator.toDataURL(), /encoding failed/);
});

test('rejects unavailable or incorrectly sized drawing surfaces', () => {
  assert.throws(() => new NonprofitImpactReceiptGenerator(null));
  const f = fixture(); assert.throws(() => f.generator.renderCanvas(null, sample()));
  f.canvas.width = 1; assert.throws(() => f.generator.render(sample()), /2000/);
});
