/**
 * Podcast Audio Stream — Myers diff / patch engine.
 *
 * A dependency-free, in-browser line diff engine built on Myers' O(ND)
 * shortest edit script algorithm. It produces side-by-side rows, unified
 * patches with real hunk boundaries, and can apply those patches back onto a
 * source document with context validation.
 *
 * The module is intentionally split in two halves:
 *   1. `PodcastAudioStreamDiffPatchEngine` — pure, testable core (no DOM).
 *   2. `mount()` — progressive enhancement for diff-patch-engine.html.
 */

const DEFAULT_FILE_A = 'a/config.yaml';
const DEFAULT_FILE_B = 'b/config.yaml';
const DEFAULT_CONTEXT = 3;

const TYPE_EQUAL = 'equal';
const TYPE_INSERT = 'insert';
const TYPE_DELETE = 'delete';

/**
 * Raised when a patch cannot be applied because the source document does not
 * match the context or deleted lines described by the patch.
 */
export class PatchApplyError extends Error {
  constructor(message, { hunk = null } = {}) {
    super(message);
    this.name = 'PatchApplyError';
    this.hunk = hunk;
  }
}

function assertString(value, name) {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string.`);
  }
}

function assertContext(context) {
  if (!Number.isInteger(context) || context < 0 || context > 100) {
    throw new RangeError('context must be an integer between 0 and 100.');
  }
}

function normalizeNewlines(text) {
  return text.replace(/\r\n?/g, '\n');
}

/**
 * Splits a document into lines. A trailing newline is represented by a final
 * empty line, which means `lines.join('\n')` always reconstructs the source
 * exactly and "add a newline at EOF" is an ordinary insertion.
 *
 * @param {string} text
 * @returns {string[]}
 */
function splitLines(text) {
  assertString(text, 'text');
  const normalized = normalizeNewlines(text);
  if (normalized === '') return [];
  return normalized.split('\n');
}

function validateDiff(diff) {
  if (!Array.isArray(diff)) {
    throw new TypeError('diff must be an array of diff rows.');
  }

  for (const row of diff) {
    if (!row || typeof row !== 'object') {
      throw new TypeError('Every diff row must be an object.');
    }
    if (row.type !== TYPE_EQUAL && row.type !== TYPE_INSERT && row.type !== TYPE_DELETE) {
      throw new TypeError(`Unknown diff row type: ${String(row.type)}.`);
    }
    if (typeof row.text !== 'string') {
      throw new TypeError('Every diff row must have a string "text" property.');
    }
  }
}

/**
 * Recomputes 1-based old/new line numbers from row order. This keeps the
 * public helpers usable even when callers hand-build a diff array.
 */
function numberRows(diff) {
  let oldLine = 1;
  let newLine = 1;

  return diff.map((row) => {
    const numbered = {
      ...row,
      oldLine: row.type === TYPE_INSERT ? null : oldLine,
      newLine: row.type === TYPE_DELETE ? null : newLine
    };
    if (row.type !== TYPE_INSERT) oldLine += 1;
    if (row.type !== TYPE_DELETE) newLine += 1;
    return numbered;
  });
}

function formatHunkRange(start, count) {
  return `${start},${count}`;
}

export class PodcastAudioStreamDiffPatchEngine {
  /**
   * @param {{ context?: number }} [options] Default number of context lines
   *   included around each changed block in unified patches.
   */
  constructor({ context = DEFAULT_CONTEXT } = {}) {
    assertContext(context);
    this.context = context;
  }

  /**
   * Computes the shortest edit script between two documents using Myers'
   * O(ND) algorithm. Returns a flat array of rows in document order.
   *
   * @param {string} original
   * @param {string} modified
   * @returns {Array<{ type: 'equal'|'insert'|'delete', text: string, oldLine: number|null, newLine: number|null }>}
   */
  computeDiff(original, modified) {
    assertString(original, 'original');
    assertString(modified, 'modified');

    const a = splitLines(original);
    const b = splitLines(modified);
    const operations = this.#myers(a, b);

    let oldLine = 1;
    let newLine = 1;

    const rows = operations.map((operation) => {
      const row = {
        type: operation.type,
        text: operation.line,
        oldLine: operation.type === TYPE_INSERT ? null : oldLine,
        newLine: operation.type === TYPE_DELETE ? null : newLine
      };

      if (operation.type !== TYPE_INSERT) oldLine += 1;
      if (operation.type !== TYPE_DELETE) newLine += 1;
      return row;
    });

    Object.defineProperty(rows, 'meta', {
      enumerable: false,
      value: Object.freeze({
        algorithm: 'myers',
        oldLineCount: a.length,
        newLineCount: b.length
      })
    });

    return rows;
  }

  /**
   * Groups changed rows into unified-diff hunks with up to `context`
   * unchanged lines of padding. Hunks separated by more than twice the
   * context window are emitted as separate chunks.
   */
  computeChunks(diff, context = this.context) {
    validateDiff(diff);
    assertContext(context);

    const rows = numberRows(diff);
    const changed = [];

    rows.forEach((row, index) => {
      if (row.type !== TYPE_EQUAL) changed.push(index);
    });

    if (changed.length === 0) return [];

    const groups = [];
    let start = changed[0];
    let end = changed[0];

    for (let index = 1; index < changed.length; index += 1) {
      const next = changed[index];
      if (next - end - 1 <= context * 2) {
        end = next;
      } else {
        groups.push([start, end]);
        start = next;
        end = next;
      }
    }
    groups.push([start, end]);

    return groups.map(([firstChange, lastChange]) => {
      const startIndex = Math.max(0, firstChange - context);
      const endIndex = Math.min(rows.length - 1, lastChange + context);
      const chunkRows = rows.slice(startIndex, endIndex + 1);

      const oldLines = chunkRows.filter((row) => row.oldLine !== null);
      const newLines = chunkRows.filter((row) => row.newLine !== null);

      const previousOldLine = rows
        .slice(0, startIndex)
        .reverse()
        .find((row) => row.oldLine !== null)?.oldLine ?? 0;
      const previousNewLine = rows
        .slice(0, startIndex)
        .reverse()
        .find((row) => row.newLine !== null)?.newLine ?? 0;

      const oldStart = oldLines.length > 0 ? oldLines[0].oldLine : previousOldLine;
      const newStart = newLines.length > 0 ? newLines[0].newLine : previousNewLine;
      const oldCount = oldLines.length;
      const newCount = newLines.length;

      return {
        startIndex,
        endIndex,
        oldStart,
        oldCount,
        newStart,
        newCount,
        header: `@@ -${formatHunkRange(oldStart, oldCount)} +${formatHunkRange(newStart, newCount)} @@`,
        rows: chunkRows
      };
    });
  }

  /**
   * Aggregate counters used by the visualizer and by tests.
   */
  computeStats(diff, context = this.context) {
    validateDiff(diff);
    assertContext(context);

    let insertions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const row of diff) {
      if (row.type === TYPE_INSERT) insertions += 1;
      else if (row.type === TYPE_DELETE) deletions += 1;
      else unchanged += 1;
    }

    const chunks = this.computeChunks(diff, context).length;
    const oldLineCount = unchanged + deletions;
    const newLineCount = unchanged + insertions;
    const denominator = oldLineCount + newLineCount;

    return {
      insertions,
      deletions,
      unchanged,
      chunks,
      oldLineCount,
      newLineCount,
      totalRows: diff.length,
      similarity: denominator === 0 ? 1 : (2 * unchanged) / denominator
    };
  }

  /**
   * Renders a diff array as a standard unified patch. Identical documents
   * produce an empty string.
   *
   * @param {Array} diff
   * @param {string|{fileA?: string, fileB?: string, context?: number}} [fileA]
   * @param {string} [fileB]
   * @param {{ context?: number }} [options]
   */
  toUnifiedFormat(diff, fileA = DEFAULT_FILE_A, fileB = DEFAULT_FILE_B, options = {}) {
    validateDiff(diff);

    if (fileA && typeof fileA === 'object') {
      options = fileA;
      fileA = options.fileA ?? DEFAULT_FILE_A;
      fileB = options.fileB ?? DEFAULT_FILE_B;
    }

    assertString(fileA, 'fileA');
    assertString(fileB, 'fileB');

    const context = options.context ?? this.context;
    assertContext(context);

    const chunks = this.computeChunks(diff, context);
    if (chunks.length === 0) return '';

    const output = [`--- ${fileA}`, `+++ ${fileB}`];

    for (const chunk of chunks) {
      output.push(chunk.header);
      for (const row of chunk.rows) {
        if (row.type === TYPE_EQUAL) output.push(` ${row.text}`);
        else if (row.type === TYPE_DELETE) output.push(`-${row.text}`);
        else output.push(`+${row.text}`);
      }
    }

    return output.join('\n');
  }

  /**
   * Applies either a diff array or a unified patch string to a source
   * document and returns the patched text.
   *
   * Diff arrays are validated against the source line by line. Unified
   * patches are matched against their surrounding context, with a small
   * offset search so patches still apply when unrelated lines shift.
   *
   * @param {string} source
   * @param {Array|string} patch
   * @param {{ validate?: boolean }} [options]
   */
  applyPatch(source, patch, options = {}) {
    assertString(source, 'source');

    if (Array.isArray(patch)) {
      return this.#applyDiffArray(source, patch, options);
    }

    if (typeof patch === 'string') {
      return this.#applyUnifiedPatch(source, patch);
    }

    throw new TypeError('patch must be a unified diff string or a diff array.');
  }

  // ---------------------------------------------------------------------
  // Myers core
  // ---------------------------------------------------------------------

  #myers(a, b) {
    const n = a.length;
    const m = b.length;

    if (n === 0) return b.map((line) => ({ type: TYPE_INSERT, line }));
    if (m === 0) return a.map((line) => ({ type: TYPE_DELETE, line }));

    const max = n + m;
    const v = new Map([[1, 0]]);
    const trace = [];

    for (let d = 0; d <= max; d += 1) {
      // trace[d] is the V array as it stood before step d, which is exactly
      // what the backtracking pass needs to recover the chosen path.
      trace.push(new Map(v));

      for (let k = -d; k <= d; k += 2) {
        const down = v.get(k + 1);
        const right = v.get(k - 1);

        let x;
        if (k === -d || (k !== d && (right ?? Number.NEGATIVE_INFINITY) < (down ?? Number.NEGATIVE_INFINITY))) {
          x = down ?? 0;
        } else {
          x = (right ?? 0) + 1;
        }

        let y = x - k;
        while (x < n && y < m && a[x] === b[y]) {
          x += 1;
          y += 1;
        }

        v.set(k, x);

        if (x >= n && y >= m) {
          return this.#backtrack(trace, a, b);
        }
      }
    }

    throw new Error('Myers diff failed to find an edit path.');
  }

  #backtrack(trace, a, b) {
    let x = a.length;
    let y = b.length;
    const reversed = [];

    for (let d = trace.length - 1; d >= 0; d -= 1) {
      const v = trace[d];
      const k = x - y;
      const down = v.get(k + 1);
      const right = v.get(k - 1);

      let previousK;
      if (k === -d || (k !== d && (right ?? Number.NEGATIVE_INFINITY) < (down ?? Number.NEGATIVE_INFINITY))) {
        previousK = k + 1;
      } else {
        previousK = k - 1;
      }

      const previousX = v.get(previousK) ?? 0;
      const previousY = previousX - previousK;

      while (x > previousX && y > previousY) {
        reversed.push({ type: TYPE_EQUAL, line: a[x - 1] });
        x -= 1;
        y -= 1;
      }

      if (d > 0) {
        if (x === previousX) {
          reversed.push({ type: TYPE_INSERT, line: b[y - 1] });
          y -= 1;
        } else {
          reversed.push({ type: TYPE_DELETE, line: a[x - 1] });
          x -= 1;
        }
      }
    }

    reversed.reverse();
    return reversed;
  }

  // ---------------------------------------------------------------------
  // Patch application
  // ---------------------------------------------------------------------

  #applyDiffArray(source, diff, { validate = true } = {}) {
    validateDiff(diff);

    const sourceLines = splitLines(source);
    const output = [];
    let cursor = 0;

    for (const row of diff) {
      if (row.type === TYPE_INSERT) {
        output.push(row.text);
        continue;
      }

      const sourceLine = sourceLines[cursor];
      if (sourceLine === undefined) {
        throw new PatchApplyError('Diff row refers to a source line that does not exist.');
      }

      if (validate && sourceLine !== row.text) {
        throw new PatchApplyError(
          `Source line ${cursor + 1} is "${sourceLine}", but the diff expects "${row.text}".`
        );
      }

      if (row.type === TYPE_EQUAL) output.push(row.text);
      cursor += 1;
    }

    if (validate && cursor !== sourceLines.length) {
      throw new PatchApplyError(
        `Diff covers ${cursor} source line${cursor === 1 ? '' : 's'}, but the source has ${sourceLines.length}.`
      );
    }

    return output.join('\n');
  }

  #applyUnifiedPatch(source, patch) {
    if (patch.trim() === '') return source;

    const hunks = this.#parseUnifiedPatch(patch);
    if (hunks.length === 0) return source;

    const sourceLines = splitLines(source);
    const output = [];
    let cursor = 0;

    for (const hunk of hunks) {
      const expectedIndex = hunk.oldCount === 0
        ? Math.min(hunk.oldStart, sourceLines.length)
        : Math.max(0, hunk.oldStart - 1);

      const position = this.#findHunkPosition(sourceLines, hunk, expectedIndex, cursor);

      while (cursor < position) {
        output.push(sourceLines[cursor]);
        cursor += 1;
      }

      for (const line of hunk.lines) {
        if (line.type === TYPE_EQUAL) {
          if (sourceLines[cursor] !== line.text) {
            throw new PatchApplyError(
              `Context mismatch while applying ${hunk.header} at source line ${cursor + 1}.`,
              { hunk: hunk.header }
            );
          }
          output.push(sourceLines[cursor]);
          cursor += 1;
        } else if (line.type === TYPE_DELETE) {
          if (sourceLines[cursor] !== line.text) {
            throw new PatchApplyError(
              `Deletion mismatch while applying ${hunk.header} at source line ${cursor + 1}.`,
              { hunk: hunk.header }
            );
          }
          cursor += 1;
        } else {
          output.push(line.text);
        }
      }
    }

    while (cursor < sourceLines.length) {
      output.push(sourceLines[cursor]);
      cursor += 1;
    }

    return output.join('\n');
  }

  #findHunkPosition(sourceLines, hunk, expectedIndex, minimumIndex) {
    const oldSide = hunk.lines
      .filter((line) => line.type !== TYPE_INSERT)
      .map((line) => line.text);

    if (oldSide.length === 0) {
      return Math.min(Math.max(expectedIndex, minimumIndex), sourceLines.length);
    }

    const matches = (position) => {
      if (position < minimumIndex) return false;
      if (position + oldSide.length > sourceLines.length) return false;
      return oldSide.every((text, offset) => sourceLines[position + offset] === text);
    };

    const maxOffset = sourceLines.length;
    for (let offset = 0; offset <= maxOffset; offset += 1) {
      const candidates = offset === 0
        ? [expectedIndex]
        : [expectedIndex + offset, expectedIndex - offset];

      for (const candidate of candidates) {
        if (matches(candidate)) return candidate;
      }
    }

    throw new PatchApplyError(
      `Could not find matching context for ${hunk.header} in the source document.`,
      { hunk: hunk.header }
    );
  }

  #parseUnifiedPatch(patch) {
    const rawLines = normalizeNewlines(patch).split('\n');
    const hunks = [];
    let current = null;

    for (let index = 0; index < rawLines.length; index += 1) {
      const raw = rawLines[index];
      const isFinalEmpty = index === rawLines.length - 1 && raw === '';

      if (isFinalEmpty) continue;

      const headerMatch = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(raw);
      if (headerMatch) {
        current = {
          oldStart: Number(headerMatch[1]),
          oldCount: headerMatch[2] === undefined ? 1 : Number(headerMatch[2]),
          newStart: Number(headerMatch[3]),
          newCount: headerMatch[4] === undefined ? 1 : Number(headerMatch[4]),
          header: raw,
          lines: []
        };
        hunks.push(current);
        continue;
      }

      if (
        raw.startsWith('--- ') ||
        raw.startsWith('+++ ') ||
        raw.startsWith('diff ') ||
        raw.startsWith('index ') ||
        raw.startsWith('new file ') ||
        raw.startsWith('deleted file ') ||
        raw.startsWith('similarity index ') ||
        raw.startsWith('rename from ') ||
        raw.startsWith('rename to ')
      ) {
        continue;
      }

      // Standard "no newline at end of file" markers do not change the line
      // text, so they are safe to ignore for this line-based engine.
      if (raw.startsWith('\\')) continue;

      if (!current) {
        if (raw === '') continue;
        throw new PatchApplyError('Patch content was found before the first hunk header.');
      }

      const prefix = raw[0];
      const text = raw.slice(1);

      if (prefix === ' ') current.lines.push({ type: TYPE_EQUAL, text });
      else if (prefix === '+') current.lines.push({ type: TYPE_INSERT, text });
      else if (prefix === '-') current.lines.push({ type: TYPE_DELETE, text });
      else if (raw === '') current.lines.push({ type: TYPE_EQUAL, text: '' });
      else {
        throw new PatchApplyError(`Unrecognised patch line: "${raw}".`);
      }
    }

    for (const hunk of hunks) {
      const actualOld = hunk.lines.filter((line) => line.type !== TYPE_INSERT).length;
      const actualNew = hunk.lines.filter((line) => line.type !== TYPE_DELETE).length;

      if (actualOld !== hunk.oldCount || actualNew !== hunk.newCount) {
        throw new PatchApplyError(
          `Hunk ${hunk.header} declares ${hunk.oldCount}/${hunk.newCount} lines but contains ${actualOld}/${actualNew}.`,
          { hunk: hunk.header }
        );
      }
    }

    return hunks;
  }
}

// ---------------------------------------------------------------------------
// Visualizer (browser-only progressive enhancement)
// ---------------------------------------------------------------------------

const PRESETS = Object.freeze({
  showNotes: {
    label: 'Show notes revision',
    original: `episode: 142
title: Low-Latency Audio Pipelines
status: draft
bitrate: 128k
chapters:
  - 00:00 Cold open
  - 04:12 Interview`,
    modified: `episode: 142
title: Low-Latency Audio Pipelines (Remastered)
status: published
bitrate: 320k
codec: opus
chapters:
  - 00:00 Cold open
  - 04:12 Interview
  - 31:40 Listener questions
loudness: -16 LUFS`
  },
  hlsManifest: {
    label: 'HLS manifest ladder',
    original: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-STREAM-INF:BANDWIDTH=128000
audio_128k.m3u8`,
    modified: `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-TARGETDURATION:4
#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
audio_64k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=320000,CODECS="mp4a.40.2"
audio_320k.m3u8`
  },
  rssFeed: {
    label: 'RSS feed metadata',
    original: `<item>
  <title>Ep 101: Building Scalable Systems</title>
  <enclosure url="https://cdn.pod.com/101.mp3" length="48201200" type="audio/mpeg"/>
  <itunes:duration>00:45:12</itunes:duration>
</item>`,
    modified: `<item>
  <title>Ep 101: Building Scalable Systems (Remastered)</title>
  <enclosure url="https://cdn.pod.com/101-hls/master.m3u8" length="51200000" type="application/x-mpegURL"/>
  <itunes:duration>00:45:12</itunes:duration>
  <podcast:transcript url="https://cdn.pod.com/101.vtt" type="text/vtt"/>
  <podcast:chapters url="https://cdn.pod.com/101.chapters.json" type="application/json+chapters"/>
</item>`
  },
  masteringChain: {
    label: 'Mastering chain JSON',
    original: `{
  "target_lufs": -19.0,
  "highpass_hz": 50,
  "de_esser": false,
  "limiter_ceiling_db": -2.0
}`,
    modified: `{
  "target_lufs": -16.0,
  "highpass_hz": 80,
  "de_esser": true,
  "de_esser_threshold_db": -18.5,
  "limiter_ceiling_db": -1.0,
  "warmth_boost_250hz_db": 1.5
}`
  }
});

function buildSplitRows(rows, offset = 0) {
  const splitRows = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];

    if (row.type === TYPE_EQUAL) {
      splitRows.push({ left: row, right: row, minIndex: offset + index, maxIndex: offset + index });
      index += 1;
      continue;
    }

    const block = [];
    while (index < rows.length && rows[index].type !== TYPE_EQUAL) {
      block.push({ row: rows[index], index: offset + index });
      index += 1;
    }

    const deletions = block.filter((entry) => entry.row.type === TYPE_DELETE);
    const insertions = block.filter((entry) => entry.row.type === TYPE_INSERT);
    const pairCount = Math.max(deletions.length, insertions.length);

    for (let pair = 0; pair < pairCount; pair += 1) {
      const leftEntry = deletions[pair];
      const rightEntry = insertions[pair];
      const indices = [leftEntry?.index, rightEntry?.index].filter((value) => value !== undefined);
      splitRows.push({
        left: leftEntry?.row ?? null,
        right: rightEntry?.row ?? null,
        minIndex: Math.min(...indices),
        maxIndex: Math.max(...indices)
      });
    }
  }

  return splitRows;
}

function mount() {
  const root = document.querySelector('[data-diff-patch-lab]');
  if (!root) return;

  const byId = (id) => root.querySelector(`#${id}`);
  const engine = new PodcastAudioStreamDiffPatchEngine({ context: DEFAULT_CONTEXT });

  const originalInput = byId('original-text');
  const modifiedInput = byId('modified-text');
  const presetSelect = byId('preset-select');
  const contextSelect = byId('context-select');
  const collapseToggle = byId('collapse-toggle');
  const swapButton = byId('swap-btn');
  const computeButton = byId('compute-btn');
  const splitView = byId('split-view');
  const unifiedView = byId('unified-view');
  const copyButton = byId('copy-patch-btn');
  const applyButton = byId('apply-patch-btn');
  const applyTarget = byId('apply-target');
  const applyStatus = byId('apply-status');
  const applyPreview = byId('apply-preview');

  const statInsertions = byId('stat-insertions');
  const statDeletions = byId('stat-deletions');
  const statUnchanged = byId('stat-unchanged');
  const statChunks = byId('stat-chunks');
  const statSimilarity = byId('stat-similarity');
  const originalMeta = byId('original-meta');
  const modifiedMeta = byId('modified-meta');

  if (
    !originalInput || !modifiedInput || !splitView || !unifiedView ||
    !applyStatus || !applyPreview
  ) {
    return;
  }

  let state = { diff: [], chunks: [], unified: '', stats: null };
  let inputTimer = null;

  function setStatus(message, tone = 'idle') {
    applyStatus.textContent = message;
    applyStatus.className = `apply-status is-${tone}`;
  }

  function lineCountLabel(text) {
    const normalized = normalizeNewlines(text);
    if (normalized === '') return '0 lines';
    const lines = normalized.split('\n');
    const count = normalized.endsWith('\n') ? lines.length - 1 : lines.length;
    return `${count} line${count === 1 ? '' : 's'}`;
  }

  function updateMeta() {
    if (originalMeta) originalMeta.textContent = `v1.0 · ${lineCountLabel(originalInput.value)}`;
    if (modifiedMeta) modifiedMeta.textContent = `v1.1 · ${lineCountLabel(modifiedInput.value)}`;
  }

  function updateStats(stats) {
    if (statInsertions) statInsertions.textContent = String(stats.insertions);
    if (statDeletions) statDeletions.textContent = String(stats.deletions);
    if (statUnchanged) statUnchanged.textContent = String(stats.unchanged);
    if (statChunks) statChunks.textContent = String(stats.chunks);
    if (statSimilarity) statSimilarity.textContent = `${Math.round(stats.similarity * 100)}%`;
  }

  function createLineView(line, side) {
    const element = document.createElement('div');
    const type = line ? line.type : 'empty';
    element.className = `split-line is-${type} side-${side}`;

    const number = document.createElement('span');
    number.className = 'line-number';
    number.textContent = line
      ? String(side === 'left' ? line.oldLine : line.newLine)
      : '';

    const sign = document.createElement('span');
    sign.className = 'line-sign';
    sign.textContent = line
      ? line.type === TYPE_DELETE
        ? '-'
        : line.type === TYPE_INSERT
          ? '+'
          : ' '
      : '';

    const text = document.createElement('code');
    text.className = 'line-text';
    text.textContent = line ? line.text : '';

    if (!line) {
      element.setAttribute('aria-hidden', 'true');
    }

    element.append(number, sign, text);
    return element;
  }

  function appendSplitRow(fragment, left, right) {
    const row = document.createElement('div');
    row.className = 'split-row';
    row.append(createLineView(left, 'left'), createLineView(right, 'right'));
    fragment.append(row);
  }

  function appendChunkHeader(fragment, chunk, index) {
    const header = document.createElement('div');
    header.className = 'chunk-header';
    header.setAttribute('role', 'separator');

    const badge = document.createElement('span');
    badge.className = 'chunk-badge';
    badge.textContent = `CHUNK ${index + 1}`;

    const range = document.createElement('code');
    range.className = 'chunk-range';
    range.textContent = chunk.header;

    const detail = document.createElement('span');
    detail.className = 'chunk-detail';
    detail.textContent = `${chunk.oldCount} old · ${chunk.newCount} new`;

    header.append(badge, range, detail);
    fragment.append(header);
  }

  function appendGap(fragment, count) {
    if (count <= 0) return;
    const gap = document.createElement('div');
    gap.className = 'chunk-gap';
    const label = document.createElement('span');
    label.textContent = `⋯ ${count} unchanged line${count === 1 ? '' : 's'} skipped`;
    gap.append(label);
    fragment.append(gap);
  }

  function appendEmptyState(fragment, message) {
    const empty = document.createElement('div');
    empty.className = 'diff-empty';
    empty.textContent = message;
    fragment.append(empty);
  }

  function renderSplit(diff, chunks) {
    const fragment = document.createDocumentFragment();
    const collapse = Boolean(collapseToggle?.checked);

    if (diff.length === 0) {
      appendEmptyState(fragment, 'Both revisions are empty — there is nothing to diff.');
      splitView.replaceChildren(fragment);
      return;
    }

    if (chunks.length === 0) {
      appendEmptyState(fragment, 'Both revisions are identical — zero changes detected.');
      splitView.replaceChildren(fragment);
      return;
    }

    if (collapse) {
      let cursor = 0;
      chunks.forEach((chunk, index) => {
        appendGap(fragment, chunk.startIndex - cursor);
        appendChunkHeader(fragment, chunk, index);
        const chunkRows = diff.slice(chunk.startIndex, chunk.endIndex + 1);
        for (const splitRow of buildSplitRows(chunkRows)) {
          appendSplitRow(fragment, splitRow.left, splitRow.right);
        }
        cursor = chunk.endIndex + 1;
      });
      appendGap(fragment, diff.length - cursor);
    } else {
      const chunkStarts = new Map(chunks.map((chunk, index) => [chunk.startIndex, { chunk, index }]));
      const rendered = new Set();
      const splitRows = buildSplitRows(diff);

      for (const splitRow of splitRows) {
        for (let index = splitRow.minIndex; index <= splitRow.maxIndex; index += 1) {
          const info = chunkStarts.get(index);
          if (info && !rendered.has(index)) {
            appendChunkHeader(fragment, info.chunk, info.index);
            rendered.add(index);
          }
        }
        appendSplitRow(fragment, splitRow.left, splitRow.right);
      }
    }

    splitView.replaceChildren(fragment);
  }

  function unifiedLineClass(line) {
    if (line.startsWith('@@')) return 'u-hunk';
    if (line.startsWith('+++') || line.startsWith('---')) return 'u-meta';
    if (line.startsWith('+')) return 'u-add';
    if (line.startsWith('-')) return 'u-del';
    if (line.startsWith('\\')) return 'u-marker';
    return 'u-context';
  }

  function renderUnified(unified) {
    const fragment = document.createDocumentFragment();

    if (!unified) {
      const empty = document.createElement('span');
      empty.className = 'unified-empty';
      empty.textContent = 'No changes — the unified patch is empty.';
      fragment.append(empty);
      unifiedView.replaceChildren(fragment);
      return;
    }

    for (const line of unified.split('\n')) {
      const span = document.createElement('span');
      span.className = `u-line ${unifiedLineClass(line)}`;
      span.textContent = line === '' ? ' ' : line;
      fragment.append(span);
    }

    unifiedView.replaceChildren(fragment);
  }

  function runApply() {
    if (!applyPreview) return;

    const target = applyTarget?.value === 'modified' ? 'modified' : 'original';
    const source = target === 'modified' ? modifiedInput.value : originalInput.value;
    const expected = normalizeNewlines(modifiedInput.value);

    if (!state.unified) {
      applyPreview.textContent = source;
      setStatus('No changes to apply — the source already matches the modified revision.', 'idle');
      return;
    }

    try {
      const output = engine.applyPatch(source, state.unified);
      applyPreview.textContent = output;

      if (target === 'original') {
        if (output === expected) {
          setStatus('Patch applied cleanly · output matches the modified revision exactly.', 'success');
        } else {
          setStatus('Patch applied, but the output differs from the modified revision.', 'warn');
        }
      } else {
        setStatus('The stale source still matched the patch context — inspect the preview below.', 'warn');
      }
    } catch (error) {
      applyPreview.textContent = '';
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Patch rejected · ${message}`, 'error');
    }
  }

  function render() {
    const diff = engine.computeDiff(originalInput.value, modifiedInput.value);
    const stats = engine.computeStats(diff, engine.context);
    const chunks = engine.computeChunks(diff, engine.context);
    const unified = engine.toUnifiedFormat(diff, DEFAULT_FILE_A, DEFAULT_FILE_B, {
      context: engine.context
    });

    state = { diff, chunks, unified, stats };

    updateMeta();
    updateStats(stats);
    renderSplit(diff, chunks);
    renderUnified(unified);
    runApply();
  }

  function scheduleRender() {
    if (inputTimer !== null) window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(() => {
      inputTimer = null;
      render();
    }, 120);
  }

  function copyFallback(text) {
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.append(scratch);
    scratch.select();
    const copied = document.execCommand('copy');
    scratch.remove();
    if (!copied) throw new Error('Clipboard copy is unavailable.');
  }

  async function copyPatch() {
    if (!state.unified) {
      setStatus('There is no patch to copy — both revisions are identical.', 'idle');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(state.unified);
      } else {
        copyFallback(state.unified);
      }
      if (copyButton) {
        const previous = copyButton.textContent;
        copyButton.textContent = 'Copied ✓';
        window.setTimeout(() => {
          copyButton.textContent = previous;
        }, 1400);
      }
    } catch {
      try {
        copyFallback(state.unified);
        setStatus('Patch copied to the clipboard.', 'success');
      } catch {
        setStatus('Clipboard access was blocked by the browser.', 'error');
      }
    }
  }

  presetSelect?.addEventListener('change', () => {
    const preset = PRESETS[presetSelect.value] ?? PRESETS.showNotes;
    originalInput.value = preset.original;
    modifiedInput.value = preset.modified;
    render();
  });

  contextSelect?.addEventListener('change', () => {
    engine.context = Number(contextSelect.value);
    render();
  });

  collapseToggle?.addEventListener('change', () => {
    renderSplit(state.diff, state.chunks);
  });

  swapButton?.addEventListener('click', () => {
    const original = originalInput.value;
    originalInput.value = modifiedInput.value;
    modifiedInput.value = original;
    render();
  });

  computeButton?.addEventListener('click', render);
  originalInput.addEventListener('input', scheduleRender);
  modifiedInput.addEventListener('input', scheduleRender);
  applyButton?.addEventListener('click', render);
  applyTarget?.addEventListener('change', runApply);
  copyButton?.addEventListener('click', copyPatch);

  const initialPreset = PRESETS.showNotes;
  originalInput.value = initialPreset.original;
  modifiedInput.value = initialPreset.modified;
  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}
