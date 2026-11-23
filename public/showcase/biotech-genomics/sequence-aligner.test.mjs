import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsSequenceAligner } from './sequence-aligner.js';

describe('BiotechGenomicsSequenceAligner', () => {
  it('instantiates correctly with default scoring penalties', () => {
    const aligner = new BiotechGenomicsSequenceAligner();
    assert.equal(aligner.name, 'BiotechGenomicsSequenceAligner');
    assert.equal(aligner.matchScore, 2);
    assert.equal(aligner.mismatchPenalty, -1);
    assert.equal(aligner.gapPenalty, -2);
  });

  it('handles empty, invalid, and whitespace-padded sequences cleanly', () => {
    const aligner = new BiotechGenomicsSequenceAligner();
    const resEmpty = aligner.align('', 'ATCG');
    assert.equal(resEmpty.score, 0);
    assert.equal(resEmpty.alignedA, '');
    assert.equal(resEmpty.alignedB, '');

    const resSanitized = aligner.align(' atcg 123 ', 'ATCG');
    assert.equal(resSanitized.score, 8); // 4 matches * 2
    assert.equal(resSanitized.identityPct, 100);
  });

  it('computes exact optimal local alignment on identical DNA sequences', () => {
    const aligner = new BiotechGenomicsSequenceAligner();
    const dna = 'ACGTACGT';
    const res = aligner.align(dna, dna);

    assert.equal(res.score, 16);
    assert.equal(res.matches, 8);
    assert.equal(res.mismatches, 0);
    assert.equal(res.gaps, 0);
    assert.equal(res.alignedA, dna);
    assert.equal(res.alignedB, dna);
    assert.equal(res.identityPct, 100);
  });

  it('identifies local substring alignments surrounded by flanking noise', () => {
    const aligner = new BiotechGenomicsSequenceAligner();
    // Conserved target 'TGCATGCA' surrounded by discordant sequences
    const seqA = 'AAAAAATGCATGCAAAAAAA';
    const seqB = 'CCCCCCCTGCATGCACCCCCCC';

    const res = aligner.align(seqA, seqB);
    assert.equal(res.alignedA, 'TGCATGCA');
    assert.equal(res.alignedB, 'TGCATGCA');
    assert.equal(res.score, 16);
    assert.equal(res.identityPct, 100);
  });

  it('handles substitutions and indels accurately during traceback', () => {
    const aligner = new BiotechGenomicsSequenceAligner();
    // Substitution test: 'ACGTACGT' vs 'ACTTACGT'
    const subRes = aligner.align('ACGTACGT', 'ACTTACGT');
    assert.equal(subRes.mismatches, 1);
    assert.equal(subRes.gaps, 0);
    assert.equal(subRes.score, 13);

    // Indel (deletion) test: 'ACGTACGT' vs 'ACGACGT'
    const indelRes = aligner.align('ACGTACGT', 'ACGACGT');
    assert.equal(indelRes.gaps, 1);
    assert.equal(indelRes.alignedB, 'ACG-ACGT');
    assert.equal(indelRes.score, 12);
  });

  it('formats alignment display string with match connectors accurately', () => {
    const aligner = new BiotechGenomicsSequenceAligner();
    const res = aligner.align('ACGT', 'ACGT');
    const display = aligner.formatAlignment(res);

    assert.ok(display.includes('Ref (A): ACGT'));
    assert.ok(display.includes('Match:   ||||'));
    assert.ok(display.includes('Qry (B): ACGT'));
  });
});
