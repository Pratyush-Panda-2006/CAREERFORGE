import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PodcastAudioStreamDiffPatchEngine,
  PatchApplyError
} from './diff-patch-engine.js';

function engineWith(context = 3) {
  return new PodcastAudioStreamDiffPatchEngine({ context });
}

function countTypes(diff) {
  return diff.reduce(
    (counts, row) => {
      counts[row.type] += 1;
      return counts;
    },
    { equal: 0, insert: 0, delete: 0 }
  );
}

function lcsLength(a, b) {
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i][j] = a[i - 1] === b[j - 1]
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[a.length][b.length];
}

function mulberry32(seed) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomText(random) {
  const vocabulary = ['alpha', 'beta', 'gamma', '', '  indented', 'delta', 'epsilon'];
  const lineCount = Math.floor(random() * 7);
  const lines = Array.from({ length: lineCount }, () => vocabulary[Math.floor(random() * vocabulary.length)]);
  const text = lines.join('\n');
  return lineCount > 0 && random() < 0.35 ? `${text}\n` : text;
}

function splitForTest(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  return normalized === '' ? [] : normalized.split('\n');
}

test('identical text produces a zero-diff and an empty unified patch', () => {
  const engine = engineWith();
  const text = 'stream: live\ncodec: aac\nbitrate: 320k';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every((row) => row.type === 'equal'));

  const stats = engine.computeStats(diff);
  assert.deepEqual(
    {
      insertions: stats.insertions,
      deletions: stats.deletions,
      unchanged: stats.unchanged,
      chunks: stats.chunks,
      similarity: stats.similarity
    },
    { insertions: 0, deletions: 0, unchanged: 3, chunks: 0, similarity: 1 }
  );

  assert.equal(engine.toUnifiedFormat(diff), '');
  assert.deepEqual(engine.computeChunks(diff), []);
  assert.equal(engine.applyPatch(text, diff), text);
  assert.equal(engine.applyPatch(text, ''), text);
});

test('pure additions emit only insert rows and apply cleanly', () => {
  const engine = engineWith();
  const original = 'intro';
  const modified = 'intro\nbody\noutro';
  const diff = engine.computeDiff(original, modified);

  assert.deepEqual(countTypes(diff), { equal: 1, insert: 2, delete: 0 });

  const stats = engine.computeStats(diff);
  assert.equal(stats.insertions, 2);
  assert.equal(stats.deletions, 0);
  assert.equal(stats.unchanged, 1);
  assert.equal(stats.chunks, 1);

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('@@ -1,1 +1,3 @@'));
  assert.ok(unified.includes('+body'));
  assert.ok(unified.includes('+outro'));
  assert.ok(!unified.includes('-body'));

  assert.equal(engine.applyPatch(original, diff), modified);
  assert.equal(engine.applyPatch(original, unified), modified);
});

test('pure deletions emit only delete rows and apply cleanly', () => {
  const engine = engineWith();
  const original = 'intro\nbody\noutro';
  const modified = 'intro';
  const diff = engine.computeDiff(original, modified);

  assert.deepEqual(countTypes(diff), { equal: 1, insert: 0, delete: 2 });

  const stats = engine.computeStats(diff);
  assert.equal(stats.insertions, 0);
  assert.equal(stats.deletions, 2);
  assert.equal(stats.unchanged, 1);
  assert.equal(stats.chunks, 1);

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('@@ -1,3 +1,1 @@'));
  assert.ok(unified.includes('-body'));
  assert.ok(unified.includes('-outro'));
  assert.ok(!unified.includes('+body'));

  assert.equal(engine.applyPatch(original, diff), modified);
  assert.equal(engine.applyPatch(original, unified), modified);
});

test('replacement diffs roundtrip through both diff arrays and unified patches', () => {
  const engine = engineWith();
  const original = 'status: idle\nsample: 44.1khz\nchannels: stereo';
  const modified = 'status: active\nsample: 48khz\nchannels: stereo\ncodec: opus';

  const diff = engine.computeDiff(original, modified);
  const stats = engine.computeStats(diff);

  assert.equal(stats.insertions, 3);
  assert.equal(stats.deletions, 2);
  assert.equal(stats.unchanged, 1);
  assert.ok(stats.similarity > 0 && stats.similarity < 1);

  assert.equal(engine.applyPatch(original, diff), modified);
  assert.equal(engine.applyPatch(original, engine.toUnifiedFormat(diff)), modified);
});

test('empty documents are handled without phantom lines', () => {
  const engine = engineWith();

  const emptyToEmpty = engine.computeDiff('', '');
  assert.equal(emptyToEmpty.length, 0);
  assert.equal(engine.toUnifiedFormat(emptyToEmpty), '');
  assert.equal(engine.applyPatch('', emptyToEmpty), '');

  const emptyToText = engine.computeDiff('', 'alpha\nbeta');
  assert.deepEqual(countTypes(emptyToText), { equal: 0, insert: 2, delete: 0 });
  assert.ok(engine.toUnifiedFormat(emptyToText).includes('@@ -0,0 +1,2 @@'));
  assert.equal(engine.applyPatch('', emptyToText), 'alpha\nbeta');
  assert.equal(engine.applyPatch('', engine.toUnifiedFormat(emptyToText)), 'alpha\nbeta');

  const textToEmpty = engine.computeDiff('alpha\nbeta', '');
  assert.deepEqual(countTypes(textToEmpty), { equal: 0, insert: 0, delete: 2 });
  assert.ok(engine.toUnifiedFormat(textToEmpty).includes('@@ -1,2 +0,0 @@'));
  assert.equal(engine.applyPatch('alpha\nbeta', textToEmpty), '');
  assert.equal(engine.applyPatch('alpha\nbeta', engine.toUnifiedFormat(textToEmpty)), '');
});

test('trailing-newline changes are an empty final line and roundtrip exactly', () => {
  const engine = engineWith();

  const addNewline = engine.computeDiff('alpha', 'alpha\n');
  assert.deepEqual(countTypes(addNewline), { equal: 1, insert: 1, delete: 0 });
  assert.equal(addNewline.find((row) => row.type === 'insert').text, '');

  const addUnified = engine.toUnifiedFormat(addNewline);
  assert.ok(addUnified.split('\n').includes('+'));
  assert.equal(engine.applyPatch('alpha', addNewline), 'alpha\n');
  assert.equal(engine.applyPatch('alpha', addUnified), 'alpha\n');

  const removeNewline = engine.computeDiff('alpha\n', 'alpha');
  assert.deepEqual(countTypes(removeNewline), { equal: 1, insert: 0, delete: 1 });
  assert.equal(removeNewline.find((row) => row.type === 'delete').text, '');

  const removeUnified = engine.toUnifiedFormat(removeNewline);
  assert.ok(removeUnified.split('\n').includes('-'));
  assert.equal(engine.applyPatch('alpha\n', removeNewline), 'alpha');
  assert.equal(engine.applyPatch('alpha\n', removeUnified), 'alpha');

  const identical = engine.computeDiff('alpha\n', 'alpha\n');
  assert.equal(identical.length, 2);
  assert.ok(identical.every((row) => row.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(identical), '');
});

test('line numbers follow each side independently', () => {
  const engine = engineWith();
  const diff = engine.computeDiff('a\nb\nc', 'a\nB\nc\nd');

  const equalA = diff.find((row) => row.type === 'equal' && row.text === 'a');
  assert.equal(equalA.oldLine, 1);
  assert.equal(equalA.newLine, 1);

  const deletedB = diff.find((row) => row.type === 'delete' && row.text === 'b');
  assert.equal(deletedB.oldLine, 2);
  assert.equal(deletedB.newLine, null);

  const insertedB = diff.find((row) => row.type === 'insert' && row.text === 'B');
  assert.equal(insertedB.oldLine, null);
  assert.equal(insertedB.newLine, 2);

  const equalC = diff.find((row) => row.type === 'equal' && row.text === 'c');
  assert.equal(equalC.oldLine, 3);
  assert.equal(equalC.newLine, 3);

  const insertedD = diff.find((row) => row.type === 'insert' && row.text === 'd');
  assert.equal(insertedD.oldLine, null);
  assert.equal(insertedD.newLine, 4);
});

test('distant changes split into separate hunks with accurate headers', () => {
  const engine = engineWith(2);
  const originalLines = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`);
  const modifiedLines = [...originalLines];
  modifiedLines[1] = 'LINE 2';
  modifiedLines[17] = 'LINE 18';

  const original = originalLines.join('\n');
  const modified = modifiedLines.join('\n');
  const diff = engine.computeDiff(original, modified);
  const chunks = engine.computeChunks(diff, 2);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].header, '@@ -1,4 +1,4 @@');
  assert.equal(chunks[0].startIndex, 0);
  assert.equal(chunks[1].header, '@@ -16,5 +16,5 @@');

  const unified = engine.toUnifiedFormat(diff, { context: 2 });
  assert.ok(unified.includes('@@ -1,4 +1,4 @@'));
  assert.ok(unified.includes('@@ -16,5 +16,5 @@'));
  assert.equal(engine.applyPatch(original, unified), modified);
  assert.equal(engine.applyPatch(original, diff), modified);
});

test('context zero produces compact hunks that still apply', () => {
  const engine = engineWith(0);
  const original = 'one\ntwo\nthree\nfour\nfive';
  const modified = 'one\nTWO\nthree\nfour\nFIVE';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff, { context: 0 });
  const headers = unified.split('\n').filter((line) => line.startsWith('@@'));

  assert.deepEqual(headers, ['@@ -2,1 +2,1 @@', '@@ -5,1 +5,1 @@']);
  assert.equal(engine.applyPatch(original, unified), modified);
});

test('unified patches apply with a line offset when unrelated lines shift', () => {
  const engine = engineWith();
  const original = 'alpha\nbeta\ngamma';
  const modified = 'alpha\nBETA\ngamma';
  const unified = engine.toUnifiedFormat(engine.computeDiff(original, modified));

  const shiftedSource = `prelude one\nprelude two\n${original}`;
  const patched = engine.applyPatch(shiftedSource, unified);

  assert.equal(patched, `prelude one\nprelude two\n${modified}`);
});

test('stale sources are rejected with PatchApplyError', () => {
  const engine = engineWith();
  const original = 'alpha\nbeta\ngamma';
  const modified = 'alpha\nBETA\ngamma';
  const unified = engine.toUnifiedFormat(engine.computeDiff(original, modified));

  assert.throws(
    () => engine.applyPatch('alpha\ndifferent\ngamma', unified),
    (error) => error instanceof PatchApplyError && /context|mismatch/i.test(error.message)
  );

  const diff = engine.computeDiff(original, modified);
  assert.throws(
    () => engine.applyPatch('alpha\nnot beta\ngamma', diff),
    (error) => error instanceof PatchApplyError && /source line/i.test(error.message)
  );

  assert.throws(
    () => engine.applyPatch('alpha\nbeta', diff),
    (error) => error instanceof PatchApplyError && /does not exist|source has/i.test(error.message)
  );
});

test('invalid inputs fail with descriptive errors', () => {
  const engine = engineWith();

  assert.throws(() => engine.computeDiff(1, 'text'), TypeError);
  assert.throws(() => engine.computeDiff('text', null), TypeError);
  assert.throws(() => engine.applyPatch(null, ''), TypeError);
  assert.throws(() => engine.applyPatch('text', 42), TypeError);
  assert.throws(() => engine.toUnifiedFormat('not an array'), TypeError);
  assert.throws(() => engine.computeChunks([], -1), RangeError);
  assert.throws(() => engine.computeChunks([], 101), RangeError);
  assert.throws(() => new PodcastAudioStreamDiffPatchEngine({ context: 1.5 }), RangeError);
  assert.throws(
    () => engine.computeChunks([{ type: 'rewrite', text: 'x' }]),
    /Unknown diff row type/
  );
});

test('default headers are stable and external patch syntax is accepted', () => {
  const engine = engineWith();
  const diff = engine.computeDiff('one\ntwo\nthree', 'one\nTWO\nthree');
  const unified = engine.toUnifiedFormat(diff);

  assert.ok(unified.startsWith('--- a/config.yaml\n+++ b/config.yaml\n@@'));
  assert.equal(engine.applyPatch('one\ntwo\nthree', unified), 'one\nTWO\nthree');

  // Unified diffs are allowed to omit ",1" when a hunk covers one line.
  const compact = [
    '--- a/file',
    '+++ b/file',
    '@@ -2 +2 @@',
    '-two',
    '+TWO'
  ].join('\n');
  assert.equal(engine.applyPatch('one\ntwo\nthree', compact), 'one\nTWO\nthree');

  // The no-newline marker is tolerated and does not change line text.
  const marked = [
    '--- a/file',
    '+++ b/file',
    '@@ -1 +1 @@',
    '-old',
    '+new',
    '\\ No newline at end of file'
  ].join('\n');
  assert.equal(engine.applyPatch('old', marked), 'new');
});

test('CRLF sources are normalised and still roundtrip', () => {
  const engine = engineWith();
  const original = 'alpha\r\nbeta\r\ngamma\r\n';
  const modified = 'alpha\r\nBETA\r\ngamma\r\n';
  const diff = engine.computeDiff(original, modified);

  assert.equal(engine.applyPatch(original, diff), 'alpha\nBETA\ngamma\n');
  assert.equal(engine.applyPatch(original, engine.toUnifiedFormat(diff)), 'alpha\nBETA\ngamma\n');

  const crlfPatch = engine.toUnifiedFormat(diff).replace(/\n/g, '\r\n');
  assert.equal(engine.applyPatch(original, crlfPatch), 'alpha\nBETA\ngamma\n');
});

test('Myers output is a minimal edit script and every fuzzed patch roundtrips', () => {
  const engine = engineWith();
  const random = mulberry32(0xc0ffee);

  for (let iteration = 0; iteration < 300; iteration += 1) {
    const original = randomText(random);
    const modified = randomText(random);

    const diff = engine.computeDiff(original, modified);
    const stats = engine.computeStats(diff);
    const originalLines = splitForTest(original);
    const modifiedLines = splitForTest(modified);
    const minimumEdits = originalLines.length + modifiedLines.length - 2 * lcsLength(originalLines, modifiedLines);

    assert.equal(
      stats.insertions + stats.deletions,
      minimumEdits,
      `non-minimal diff for ${JSON.stringify(original)} -> ${JSON.stringify(modified)}`
    );

    assert.equal(engine.applyPatch(original, diff), modified);

    const unified = engine.toUnifiedFormat(diff);
    if (unified === '') {
      assert.equal(original, modified);
    } else {
      assert.equal(engine.applyPatch(original, unified), modified);
    }
  }
});
