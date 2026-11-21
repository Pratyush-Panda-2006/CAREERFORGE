const encoder = new TextEncoder();
const subtle = globalThis.crypto?.subtle;

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('Expected a 32-byte SHA-256 hash');
  return Uint8Array.from(hex.match(/../g), (pair) => Number.parseInt(pair, 16));
}

function normalizeLeaf(leaf) {
  if (!leaf || typeof leaf !== 'object' || Array.isArray(leaf)) {
    throw new TypeError('A leaf must be an account balance record');
  }
  const account = String(leaf.account ?? '').trim();
  const balance = String(leaf.balance ?? '').trim();
  if (!account || !/^[0-9]+(?:\.[0-9]+)?$/.test(balance)) {
    throw new TypeError('An account and a nonnegative decimal balance are required');
  }
  return { account, balance };
}

async function sha256(bytes) {
  if (!subtle) throw new Error('Web Crypto SHA-256 is unavailable');
  return new Uint8Array(await subtle.digest('SHA-256', bytes));
}

async function leafHash(leaf) {
  const canonical = JSON.stringify(normalizeLeaf(leaf));
  const data = encoder.encode(canonical);
  const input = new Uint8Array(data.length + 1);
  input[0] = 0; // Domain separation prevents a leaf from posing as an internal node.
  input.set(data, 1);
  return sha256(input);
}

async function parentHash(left, right) {
  const input = new Uint8Array(65);
  input[0] = 1;
  input.set(left, 1);
  input.set(right, 33);
  return sha256(input);
}

export class CryptoExchangeProMerkleTree {
  constructor() {
    this.leaves = [];
    this.levels = [];
  }

  async buildTree(leaves) {
    if (!Array.isArray(leaves) || leaves.length === 0) {
      throw new TypeError('Provide at least one account balance');
    }
    const normalized = leaves.map(normalizeLeaf);
    const levels = [await Promise.all(normalized.map(leafHash))];
    while (levels.at(-1).length > 1) {
      const current = levels.at(-1);
      const parents = [];
      for (let index = 0; index < current.length; index += 2) {
        // Duplicate the final node at odd-width levels; proof generation mirrors this.
        parents.push(await parentHash(current[index], current[index + 1] ?? current[index]));
      }
      levels.push(parents);
    }
    this.leaves = normalized;
    this.levels = levels;
    return this.getRoot();
  }

  getRoot() {
    return this.levels.length ? bytesToHex(this.levels.at(-1)[0]) : null;
  }

  generateProof(leafIndex) {
    if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new RangeError('Leaf index is outside the tree');
    }
    const proof = [];
    let index = leafIndex;
    for (const level of this.levels.slice(0, -1)) {
      const isRight = index % 2 === 1;
      const sibling = isRight ? index - 1 : Math.min(index + 1, level.length - 1);
      proof.push({ hash: bytesToHex(level[sibling]), position: isRight ? 'left' : 'right' });
      index = Math.floor(index / 2);
    }
    return proof;
  }

  async verifyProof(leaf, proof, expectedRoot) {
    if (!Array.isArray(proof)) return false;
    try {
      let current = await leafHash(leaf);
      for (const step of proof) {
        if (!step || !['left', 'right'].includes(step.position)) return false;
        const sibling = hexToBytes(step.hash);
        current = step.position === 'left'
          ? await parentHash(sibling, current)
          : await parentHash(current, sibling);
      }
      return bytesToHex(current) === String(expectedRoot).toLowerCase();
    } catch {
      return false;
    }
  }
}

function renderTree(tree, container) {
  container.replaceChildren();
  tree.levels.slice().reverse().forEach((level, depth) => {
    const row = document.createElement('div');
    row.className = 'tree-level';
    row.setAttribute('aria-label', depth === 0 ? 'Merkle root' : `Tree level ${depth}`);
    level.forEach((hash) => {
      const node = document.createElement('code');
      node.className = depth === 0 ? 'tree-node root-node' : 'tree-node';
      node.title = bytesToHex(hash);
      node.textContent = `${bytesToHex(hash).slice(0, 12)}…`;
      row.append(node);
    });
    container.append(row);
  });
}

async function startWorkbench() {
  const form = document.querySelector('#tree-form');
  if (!form) return;
  const tree = new CryptoExchangeProMerkleTree();
  const recordsInput = document.querySelector('#records');
  const leafSelect = document.querySelector('#leaf-index');
  const rootOutput = document.querySelector('#root-hash');
  const proofOutput = document.querySelector('#proof-output');
  const verification = document.querySelector('#verification');
  const auditInput = document.querySelector('#audit-record');
  const status = document.querySelector('#status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const records = recordsInput.value.split('\n').filter((line) => line.trim()).map((line) => {
        const separator = line.indexOf(',');
        if (separator < 0) throw new Error('Use one account,balance pair per line');
        return { account: line.slice(0, separator), balance: line.slice(separator + 1) };
      });
      await tree.buildTree(records);
      rootOutput.textContent = tree.getRoot();
      leafSelect.replaceChildren();
      tree.leaves.forEach((leaf, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = leaf.account;
        leafSelect.append(option);
      });
      renderTree(tree, document.querySelector('#tree-canvas'));
      status.textContent = `Built a tree with ${records.length} records.`;
      leafSelect.dispatchEvent(new Event('change'));
    } catch (error) {
      status.textContent = error.message;
    }
  });

  leafSelect.addEventListener('change', () => {
    const index = Number(leafSelect.value);
    if (!tree.leaves[index]) return;
    auditInput.value = JSON.stringify(tree.leaves[index]);
    proofOutput.textContent = JSON.stringify(tree.generateProof(index), null, 2);
    verification.textContent = 'Proof ready to verify';
    verification.dataset.verified = '';
  });

  document.querySelector('#verify-proof').addEventListener('click', async () => {
    try {
      const valid = await tree.verifyProof(
        JSON.parse(auditInput.value),
        JSON.parse(proofOutput.textContent),
        rootOutput.textContent,
      );
      verification.textContent = valid ? 'Verified: balance is included' : 'Not verified: record or proof differs';
      verification.dataset.verified = String(valid);
    } catch {
      verification.textContent = 'Not verified: invalid record or proof';
      verification.dataset.verified = 'false';
    }
  });
}

if (typeof document !== 'undefined') startWorkbench();
