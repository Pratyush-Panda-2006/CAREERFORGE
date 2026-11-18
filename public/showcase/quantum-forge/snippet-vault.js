/**
 * QuantumForgeSnippetVault
 * Reusable preset snippet library & tag-based search vault for quantum circuits and algorithms.
 */
export class QuantumForgeSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = new Map();

    const defaults = initialSnippets || [
      {
        id: 'qf-bell-state',
        title: 'Bell State Entanglement (|Φ+⟩)',
        description: 'Creates a maximally entangled two-qubit Bell pair using Hadamard and CNOT gates.',
        code: `// OpenQASM 3.0 Bell State
qubit[2] q;
bit[2] c;
h q[0];
cx q[0], q[1];
c = measure q;`,
        tags: ['entanglement', 'bell-state', 'qasm', 'core']
      },
      {
        id: 'qf-qpe',
        title: 'Quantum Phase Estimation (QPE)',
        description: 'Estimates the unknown eigenphase of a unitary operator with precision ancillas.',
        code: `// Quantum Phase Estimation skeleton
qubit[4] counting;
qubit[1] eigenstate;
h counting;
for i in [0:3] {
  ctrl @ power(2, i) @ U counting[i], eigenstate[0];
}
inv_qft counting;`,
        tags: ['algorithms', 'qpe', 'unitary', 'phase']
      },
      {
        id: 'qf-grover-diffusion',
        title: "Grover's Search Diffusion Operator",
        description: 'Amplifies probability amplitude of marked states around average superposition.',
        code: `// Grover Diffusion Inversion About Mean
def diffusion(qubit[4] q) {
  h q;
  x q;
  ctrl @ z q[0:2], q[3];
  x q;
  h q;
}`,
        tags: ['algorithms', 'grover', 'oracle', 'search']
      },
      {
        id: 'qf-qft',
        title: 'Quantum Fourier Transform (QFT)',
        description: 'Discrete Fourier transform on quantum state amplitudes with controlled phase rotations.',
        code: `// 3-Qubit QFT Routine
qubit[3] q;
h q[0];
cp(pi / 2) q[1], q[0];
cp(pi / 4) q[2], q[0];
h q[1];
cp(pi / 2) q[2], q[1];
h q[2];
swap q[0], q[2];`,
        tags: ['math', 'qft', 'fourier', 'phase']
      },
      {
        id: 'qf-superdense',
        title: 'Superdense Coding Protocol',
        description: 'Transmits two classical bits through one transmitted qubit using pre-shared entanglement.',
        code: `// Superdense Coding Transmitter
qubit[2] q;
// Bob prepares Bell state
h q[0];
cx q[0], q[1];
// Alice applies Pauli gate according to classical 2-bit message
if (msg == 0b10) z q[0];
else if (msg == 0b01) x q[0];
else if (msg == 0b11) { x q[0]; z q[0]; }`,
        tags: ['teleportation', 'protocol', 'comm', 'entanglement']
      }
    ];

    for (const item of defaults) {
      this.addSnippet(item);
    }
  }

  addSnippet(snippet) {
    if (!snippet || !snippet.title || !snippet.code) {
      throw new Error('Snippet requires title and code');
    }

    const id = snippet.id || `qf-snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (this.snippets.has(id)) {
      throw new Error(`Snippet with ID "${id}" already exists`);
    }

    const normalizedTags = Array.isArray(snippet.tags)
      ? snippet.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : [];

    const item = {
      id,
      title: String(snippet.title).trim(),
      description: snippet.description ? String(snippet.description).trim() : '',
      code: String(snippet.code).trim(),
      tags: normalizedTags,
      createdAt: snippet.createdAt || new Date().toISOString()
    };

    this.snippets.set(id, item);
    return item;
  }

  getById(id) {
    return this.snippets.get(id) || null;
  }

  removeSnippet(id) {
    return this.snippets.delete(id);
  }

  getAll() {
    return Array.from(this.snippets.values());
  }

  getAllTags() {
    const tagsSet = new Set();
    for (const item of this.snippets.values()) {
      for (const tag of item.tags) {
        tagsSet.add(tag);
      }
    }
    return Array.from(tagsSet).sort();
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') {
      return this.getAll();
    }
    const cleanTag = String(tag).trim().toLowerCase();
    return this.getAll().filter(item => item.tags.includes(cleanTag));
  }

  searchSnippets(query) {
    if (!query || !query.trim()) {
      return this.getAll();
    }
    const tokens = query.trim().toLowerCase().split(/\s+/);
    return this.getAll().filter(item => {
      const targetText = `${item.title} ${item.description} ${item.tags.join(' ')} ${item.code}`.toLowerCase();
      return tokens.every(token => targetText.includes(token));
    });
  }

  render(container, options = {}) {
    if (!container) return;
    container.replaceChildren();

    const items = options.items || this.getAll();
    const onCopy = options.onCopy || null;

    if (items.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'qf-empty-vault';
      emptyMsg.textContent = 'No quantum snippets match your filter criteria.';
      container.append(emptyMsg);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'qf-snippet-card';
      card.dataset.id = item.id;

      const cardHeader = document.createElement('div');
      cardHeader.className = 'qf-snippet-header';

      const title = document.createElement('h3');
      title.className = 'qf-snippet-title';
      title.textContent = item.title;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'qf-btn-copy';
      copyBtn.textContent = 'Copy Code';
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(item.code);
        }
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Code';
        }, 1500);
        if (onCopy) onCopy(item);
      });

      cardHeader.append(title, copyBtn);

      const desc = document.createElement('p');
      desc.className = 'qf-snippet-desc';
      desc.textContent = item.description;

      const codePre = document.createElement('pre');
      codePre.className = 'qf-snippet-code';
      const codeElem = document.createElement('code');
      codeElem.textContent = item.code;
      codePre.append(codeElem);

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'qf-snippet-tags';
      for (const tag of item.tags) {
        const badge = document.createElement('span');
        badge.className = 'qf-tag-chip';
        badge.textContent = `#${tag}`;
        tagsContainer.append(badge);
      }

      card.append(cardHeader, desc, codePre, tagsContainer);
      container.append(card);
    }
  }
}
