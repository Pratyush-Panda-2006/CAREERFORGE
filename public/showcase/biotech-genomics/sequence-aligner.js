/**
 * Biotech Genomics - Pairwise Dynamic Programming Smith-Waterman Local Sequence Alignment Engine
 * Computes optimal local alignment of DNA/RNA nucleotide sequences using dynamic programming,
 * configurable substitution scores, affine gap penalties, and optimal traceback path recovery.
 */

export class BiotechGenomicsSequenceAligner {
  constructor(defaultMatch = 2, defaultMismatch = -1, defaultGap = -2) {
    this.name = 'BiotechGenomicsSequenceAligner';
    this.matchScore = defaultMatch;
    this.mismatchPenalty = defaultMismatch;
    this.gapPenalty = defaultGap;
  }

  /**
   * Sanitizes nucleotide sequences by stripping whitespace, numbers, and converting to uppercase.
   * @param {string} seq - Raw sequence string
   * @returns {string} Sanitized uppercase nucleotide string
   */
  sanitizeSequence(seq) {
    if (!seq || typeof seq !== 'string') return '';
    return seq.replace(/[^A-Za-z]/g, '').toUpperCase();
  }

  /**
   * Executes Smith-Waterman local alignment dynamic programming matrix construction and traceback.
   * @param {string} rawSeqA - Reference sequence (A)
   * @param {string} rawSeqB - Query sequence (B)
   * @param {Object} options - Scoring options { match, mismatch, gap }
   * @returns {Object} Complete alignment dataset
   */
  align(rawSeqA, rawSeqB, options = {}) {
    const seqA = this.sanitizeSequence(rawSeqA);
    const seqB = this.sanitizeSequence(rawSeqB);

    if (seqA.length === 0 || seqB.length === 0) {
      return {
        score: 0,
        alignedA: '',
        alignedB: '',
        identityPct: 0,
        matches: 0,
        mismatches: 0,
        gaps: 0,
        matrix: [[0]],
        maxCoord: { i: 0, j: 0 }
      };
    }

    const match = typeof options.match === 'number' ? options.match : this.matchScore;
    const mismatch = typeof options.mismatch === 'number' ? options.mismatch : this.mismatchPenalty;
    const gap = typeof options.gap === 'number' ? options.gap : this.gapPenalty;

    const m = seqA.length;
    const n = seqB.length;

    // (m+1) x (n+1) scoring matrix and traceback matrix
    // Traceback directions: 0: STOP, 1: DIAGONAL (Match/Mismatch), 2: UP (Gap in B), 3: LEFT (Gap in A)
    const H = Array.from({ length: m + 1 }, () => new Float32Array(n + 1));
    const trace = Array.from({ length: m + 1 }, () => new Uint8Array(n + 1));

    let maxScore = 0;
    let maxI = 0;
    let maxJ = 0;

    for (let i = 1; i <= m; i++) {
      const charA = seqA[i - 1];
      for (let j = 1; j <= n; j++) {
        const charB = seqB[j - 1];
        const diagScore = H[i - 1][j - 1] + (charA === charB ? match : mismatch);
        const upScore = H[i - 1][j] + gap;
        const leftScore = H[i][j - 1] + gap;

        let best = 0;
        let direction = 0;

        if (diagScore > best) {
          best = diagScore;
          direction = 1;
        }
        if (upScore > best) {
          best = upScore;
          direction = 2;
        }
        if (leftScore > best) {
          best = leftScore;
          direction = 3;
        }

        H[i][j] = best;
        trace[i][j] = direction;

        if (best > maxScore) {
          maxScore = best;
          maxI = i;
          maxJ = j;
        }
      }
    }

    // Traceback from maximum scoring cell
    let currI = maxI;
    let currJ = maxJ;
    let revA = '';
    let revB = '';
    let matches = 0;
    let mismatches = 0;
    let gaps = 0;

    while (currI > 0 && currJ > 0 && H[currI][currJ] > 0) {
      const dir = trace[currI][currJ];
      if (dir === 1) {
        // Diagonal
        const cA = seqA[currI - 1];
        const cB = seqB[currJ - 1];
        revA += cA;
        revB += cB;
        if (cA === cB) {
          matches++;
        } else {
          mismatches++;
        }
        currI--;
        currJ--;
      } else if (dir === 2) {
        // Up (gap in B)
        revA += seqA[currI - 1];
        revB += '-';
        gaps++;
        currI--;
      } else if (dir === 3) {
        // Left (gap in A)
        revA += '-';
        revB += seqB[currJ - 1];
        gaps++;
        currJ--;
      } else {
        break;
      }
    }

    const alignedA = revA.split('').reverse().join('');
    const alignedB = revB.split('').reverse().join('');
    const totalAlignedLength = alignedA.length;
    const identityPct = totalAlignedLength > 0 ? parseFloat(((matches / totalAlignedLength) * 100).toFixed(1)) : 0;

    // Convert matrix to lightweight representation for reporting (first 30x30 max to conserve DOM)
    const exportRows = Math.min(m + 1, 30);
    const exportCols = Math.min(n + 1, 30);
    const summaryMatrix = [];
    for (let r = 0; r < exportRows; r++) {
      summaryMatrix.push(Array.from(H[r].slice(0, exportCols)));
    }

    return {
      score: maxScore,
      alignedA,
      alignedB,
      identityPct,
      matches,
      mismatches,
      gaps,
      alignedLength: totalAlignedLength,
      maxCoord: { i: maxI, j: maxJ },
      matrixPreview: summaryMatrix,
      seqALength: m,
      seqBLength: n
    };
  }

  /**
   * Formats alignment into visual ASCII representations.
   */
  formatAlignment(alignment) {
    if (!alignment.alignedA || !alignment.alignedB) {
      return 'No alignment found.';
    }

    let matchLine = '';
    for (let i = 0; i < alignment.alignedA.length; i++) {
      const a = alignment.alignedA[i];
      const b = alignment.alignedB[i];
      if (a === '-' || b === '-') {
        matchLine += ' ';
      } else if (a === b) {
        matchLine += '|';
      } else {
        matchLine += ':';
      }
    }

    return (
      `Ref (A): ${alignment.alignedA}\n` +
      `Match:   ${matchLine}\n` +
      `Qry (B): ${alignment.alignedB}`
    );
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const aligner = new BiotechGenomicsSequenceAligner();

    const seqAInput = document.getElementById('seq-a');
    const seqBInput = document.getElementById('seq-b');
    const alignBtn = document.getElementById('align-btn');
    const sampleBtn = document.getElementById('load-sample-btn');

    const scoreElem = document.getElementById('align-score');
    const identityElem = document.getElementById('align-identity');
    const matchesElem = document.getElementById('align-matches');
    const gapsElem = document.getElementById('align-gaps');
    const resultBox = document.getElementById('alignment-result');
    const matrixBox = document.getElementById('matrix-view');

    function executeAlignment() {
      const seqA = seqAInput?.value || '';
      const seqB = seqBInput?.value || '';

      const res = aligner.align(seqA, seqB);

      if (scoreElem) scoreElem.textContent = String(res.score);
      if (identityElem) identityElem.textContent = `${res.identityPct}%`;
      if (matchesElem) matchesElem.textContent = `${res.matches} / ${res.alignedLength}`;
      if (gapsElem) gapsElem.textContent = String(res.gaps);

      if (resultBox) {
        resultBox.textContent = aligner.formatAlignment(res);
      }

      if (matrixBox && res.matrixPreview) {
        matrixBox.innerHTML = res.matrixPreview
          .map((row) => row.map((val) => String(val).padStart(3, ' ')).join(' '))
          .join('\n');
      }
    }

    if (alignBtn) {
      alignBtn.addEventListener('click', executeAlignment);
    }

    if (sampleBtn && seqAInput && seqBInput) {
      sampleBtn.addEventListener('click', () => {
        // CRISPR-Cas9 Target and homologous guide with substitution & insertion
        seqAInput.value = 'GGCCACTGTAGGTACTAGCTAGGATCGATCG';
        seqBInput.value = 'ACTGTAGGTACTAGATAGGATCG';
        executeAlignment();
      });
    }

    executeAlignment();
  });
}
