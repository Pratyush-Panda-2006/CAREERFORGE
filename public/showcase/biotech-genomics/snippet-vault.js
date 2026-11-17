/**
 * Biotech Genomics - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores CRISPR guide RNA designs, PCR primer sequences, exome bed specifications, and FASTA records.
 */

export class BiotechGenomicsSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'crispr-cas9-grna-emx1',
        title: 'CRISPR-Cas9 High-Fidelity EMX1 Guide RNA',
        code: `{\n  "target_gene": "EMX1",\n  "protospacer": "GAGTCCGAGCAGAAGAAGAA",\n  "pam": "NGG",\n  "cas_variant": "SpCas9-HF1",\n  "predicted_on_target_score": 92.4,\n  "off_target_hits_mismatch_le3": 0\n}`,
        tags: ['crispr', 'grna', 'editing', 'emx1']
      },
      {
        id: 'brca1-exon11-pcr-primers',
        title: 'BRCA1 Exon 11 Diagnostic PCR Primer Set',
        code: `{\n  "forward_primer_5to3": "TTTCTTGTTCTTCCCCAGCA",\n  "reverse_primer_5to3": "GTCCACACTTTGTGGAGACA",\n  "amplicon_length_bp": 452,\n  "annealing_temp_celsius": 59.5,\n  "gc_content_percent": 50.0\n}`,
        tags: ['primer', 'pcr', 'brca1', 'oncology']
      },
      {
        id: 'illumina-novaseq-flowcell-config',
        title: 'NovaSeq 6000 S4 Reagent & Dual Index Layout',
        code: `{\n  "instrument": "NovaSeq 6000",\n  "flow_cell_type": "S4_v1.5",\n  "read_1_cycles": 151,\n  "index_1_cycles": 10,\n  "index_2_cycles": 10,\n  "read_2_cycles": 151,\n  "phix_spike_in_percent": 1.0\n}`,
        tags: ['ngs', 'novaseq', 'illumina', 'sequencing']
      },
      {
        id: 'human-telomere-repeat-schema',
        title: 'Vertebrate Hexameric Telomere Tandem Repeat',
        code: `{\n  "canonical_repeat": "TTAGGG",\n  "reverse_complement": "CCCTAA",\n  "strand": "5-prime to 3-prime",\n  "shelterin_complex_binding": ["TRF1", "TRF2", "POT1", "RAP1", "TIN2", "TPP1"]\n}`,
        tags: ['telomere', 'repeat', 'chromosome', 'fasta']
      },
      {
        id: 'sanger-terminator-mix-formula',
        title: 'BigDye Terminator v3.1 Cycle Sequencing Reaction',
        code: `{\n  "bigdye_terminator_ready_reaction_ul": 2.0,\n  "sequencing_buffer_5x_ul": 3.0,\n  "primer_3_2_pmol_ul": 1.0,\n  "purified_pcr_template_ng": 20.0,\n  "nuclease_free_water_ul": 14.0,\n  "total_volume_ul": 20.0\n}`,
        tags: ['sanger', 'protocol', 'chemistry', 'validation']
      }
    ];
  }

  getAllSnippets() {
    return [...this.snippets];
  }

  addSnippet(title, code, tags = []) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Snippet title is required');
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new Error('Snippet code content is required');
    }

    const trimmedTitle = title.trim();
    const id = trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const duplicate = this.snippets.some(s => s.id === id || s.title.toLowerCase() === trimmedTitle.toLowerCase());
    if (duplicate) {
      throw new Error(`Snippet with title or ID '${trimmedTitle}' already exists in vault.`);
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    const newSnippet = {
      id,
      title: trimmedTitle,
      code: code.trim(),
      tags: [...new Set(normalizedTags)]
    };

    this.snippets.push(newSnippet);
    return newSnippet;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') {
      return [...this.snippets];
    }
    const cleanTag = tag.trim().toLowerCase();
    return this.snippets.filter(s => s.tags.includes(cleanTag));
  }

  searchSnippets(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [...this.snippets];
    }

    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

    return this.snippets.filter(snippet => {
      const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
      return tokens.every(token => fullText.includes(token));
    });
  }

  getAllTags() {
    const tagSet = new Set();
    this.snippets.forEach(s => s.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('snippetsGrid');
    if (!grid) return;

    const vault = new BiotechGenomicsSnippetVault();
    let activeTag = 'all';
    let searchQuery = '';

    const searchInput = document.getElementById('searchQueryInput');
    const tagBar = document.getElementById('tagFilterBar');
    const toast = document.getElementById('copyToast');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function renderTagFilters() {
      if (!tagBar) return;
      tagBar.replaceChildren();

      const tags = ['all', ...vault.getAllTags()];
      tags.forEach(tag => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `filter-chip ${activeTag === tag ? 'active' : ''}`;
        chip.textContent = tag === 'all' ? '🧬 All Genomic Presets' : `#${tag}`;
        chip.addEventListener('click', () => {
          activeTag = tag;
          renderTagFilters();
          renderCards();
        });
        tagBar.appendChild(chip);
      });
    }

    function renderCards() {
      grid.replaceChildren();

      let results = activeTag === 'all' ? vault.getAllSnippets() : vault.filterByTag(activeTag);
      if (searchQuery) {
        const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        results = results.filter(snippet => {
          const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
          return tokens.every(token => fullText.includes(token));
        });
      }

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.gridColumn = '1 / -1';
        empty.style.textAlign = 'center';
        empty.style.padding = '3rem';
        empty.textContent = 'No matching genomic snippets found.';
        grid.appendChild(empty);
        return;
      }

      results.forEach(snippet => {
        const card = document.createElement('article');
        card.className = 'snippet-card';

        const header = document.createElement('div');
        header.className = 'card-header';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = snippet.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy Sequence';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(snippet.code);
            showToast('Sequence copied to clipboard!');
          } catch {
            showToast('Failed to copy');
          }
        });

        header.appendChild(title);
        header.appendChild(copyBtn);

        const body = document.createElement('div');
        body.className = 'card-body';
        const pre = document.createElement('pre');
        pre.className = 'code-block';
        pre.textContent = snippet.code;
        body.appendChild(pre);

        const footer = document.createElement('div');
        footer.className = 'card-footer';
        snippet.tags.forEach(t => {
          const span = document.createElement('span');
          span.className = 'card-tag';
          span.textContent = `#${t}`;
          footer.appendChild(span);
        });

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        grid.appendChild(card);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCards();
      });
    }

    renderTagFilters();
    renderCards();
  });
}
