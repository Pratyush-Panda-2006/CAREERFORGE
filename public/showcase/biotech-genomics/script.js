/**
 * GENOME-LAB // CRISPR-Cas9 & DNA Sequence Workbench
 * Isolated Showcase Module for CAREERFORGE
 */


export const CODON_TABLE = {
  'AUG': 'Met (Start)', 'UUU': 'Phe', 'UUC': 'Phe', 'UUA': 'Leu', 'UUG': 'Leu',
  'GCU': 'Ala', 'GCC': 'Ala', 'GCA': 'Ala', 'GCG': 'Ala',
  'GAU': 'Asp', 'GAC': 'Asp', 'GAA': 'Glu', 'GAG': 'Glu',
  'UAA': 'STOP', 'UAG': 'STOP', 'UGA': 'STOP'
};

export function transcribeDNAtoRNA(dna) {
  return dna.toUpperCase().replace(/T/g, 'U');
}

export function translateRNA(rna) {
  const cleaned = rna.toUpperCase().replace(/[^AUCG]/g, '');
  const peptide = [];
  for (let i = 0; i < cleaned.length - 2; i += 3) {
    const codon = cleaned.substring(i, i + 3);
    const aa = CODON_TABLE[codon] || 'Unknown';
    peptide.push(aa);
    if (aa === 'STOP') break;
  }
  return peptide;
}
    

// Client-side UI Interactions
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const calcBtn = document.getElementById('run-calc-btn');
    const outputEl = document.getElementById('calc-output');
    const inputEl = document.getElementById('main-input');

    if (calcBtn && outputEl) {
      calcBtn.addEventListener('click', () => {
        const val = inputEl ? inputEl.value : '';
        outputEl.textContent = `[Telemetry Ready] Processed parameter input: "${val || 'Default Execution'}" at ${new Date().toISOString()}`;
      });
    }

    // Metric animation ticker
    const metricEl = document.getElementById('live-metric-val');
    if (metricEl) {
      let tick = 0;
      setInterval(() => {
        tick++;
        const base = parseFloat(metricEl.getAttribute('data-base') || '100');
        const jitter = (Math.sin(tick) * 2.5).toFixed(1);
        metricEl.textContent = (base + parseFloat(jitter)).toFixed(1);
      }, 2500);
    }
  });
}