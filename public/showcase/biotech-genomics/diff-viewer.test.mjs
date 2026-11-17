import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsDiffInspector } from './diff-viewer.js';

test('BiotechGenomicsDiffInspector - detects sequence line insertions accurately', () => {
  const inspector = new BiotechGenomicsDiffInspector();
  const orig = 'exon_1: ATGCGT\nexon_2: CCGGTA\nexon_3: TTTTAA';
  const mod = 'exon_1: ATGCGT\nexon_1_splice_tag: GT\nexon_2: CCGGTA\nexon_3: TTTTAA';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'exon_1_splice_tag: GT'));
});

test('BiotechGenomicsDiffInspector - detects sequence line deletions accurately', () => {
  const inspector = new BiotechGenomicsDiffInspector();
  const orig = 'primer_fwd: AGCTAGCT\npcr_buffer: 10mM_TRIS\nanneal_temp_c: 58\npoly_tail: AAAA';
  const mod = 'primer_fwd: AGCTAGCT\nanneal_temp_c: 58\npoly_tail: AAAA';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'pcr_buffer: 10mM_TRIS'));
});

test('BiotechGenomicsDiffInspector - zero-change idempotency', () => {
  const inspector = new BiotechGenomicsDiffInspector();
  const seq = '>sample_chr1\nATGCGATCGATC\nstatus: Homoplasmic';

  inspector.computeDiff(seq, seq);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('BiotechGenomicsDiffInspector - generates unified view format', () => {
  const inspector = new BiotechGenomicsDiffInspector();
  const orig = 'codon: UAA\ntype: Stop';
  const mod = 'codon: UAG\ntype: Stop';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('- codon: UAA'));
  assert.ok(unified.includes('+ codon: UAG'));
  assert.ok(unified.includes('  type: Stop'));
});
