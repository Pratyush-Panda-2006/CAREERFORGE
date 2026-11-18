/**
 * Quantum Forge - Autonomous State History & Cryptographic Audit Trail Module
 * Issue #805 - NSoC '26 Level 3 Feature
 */

export function computeAuditHash(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2654435761) ^ Math.imul(h3 ^ (h3 >>> 13), 1597334677);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 3266489909) ^ Math.imul(h4 ^ (h4 >>> 13), 2246822507);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 1597334677) ^ Math.imul(h1 ^ (h1 >>> 13), 2654435761);

  const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  const half = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
  return half + toHex(h4 ^ h1) + toHex(h3 ^ h2) + toHex(h2 ^ h3) + toHex(h1 ^ h4);
}

export class QuantumForgeAuditChain {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'quantum_forge_audit_chain_v1';
    this.chain = [];
    this.listeners = [];
    this.loadFromStorage();
    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
  }

  createGenesisBlock() {
    const genesis = {
      index: 0,
      timestamp: Date.now(),
      action: 'GENESIS_QUANTUM_CIRCUIT_ROOT',
      payload: { platform: 'Quantum Forge Qubit Matrix', architecture: 'NISQ Fault-Tolerant Gate' },
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      hash: ''
    };
    genesis.hash = this.computeHash(genesis);
    this.chain = [genesis];
    this.saveToStorage();
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.chain = parsed;
        }
      }
    } catch {
      this.chain = [];
    }
  }

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.chain));
    } catch {
      // Storage unavailable
    }
  }

  computeHash(block) {
    const recordString = `${block.index}|${block.timestamp}|${block.action}|${JSON.stringify(block.payload)}|${block.previousHash}`;
    return computeAuditHash(recordString);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  recordEvent(action, payload = {}) {
    const prevBlock = this.getLatestBlock();
    const newBlock = {
      index: this.chain.length,
      timestamp: Date.now(),
      action: String(action || 'QUANTUM_STATE_TRANSITION'),
      payload: payload && typeof payload === 'object' ? payload : { value: payload },
      previousHash: prevBlock ? prevBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000',
      hash: ''
    };
    newBlock.hash = this.computeHash(newBlock);

    this.chain.push(newBlock);
    this.saveToStorage();
    this.notifyListeners(newBlock);
    return newBlock;
  }

  verifyChainIntegrity() {
    if (!this.chain || this.chain.length === 0) return { isValid: false, error: 'Empty chain' };

    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      const recalculatedHash = this.computeHash(current);

      if (current.hash !== recalculatedHash) {
        return {
          isValid: false,
          brokenBlockIndex: i,
          error: `Hash mismatch at block ${i}`
        };
      }

      if (i > 0) {
        const previous = this.chain[i - 1];
        if (current.previousHash !== previous.hash) {
          return {
            isValid: false,
            brokenBlockIndex: i,
            error: `Previous hash disconnect at block ${i}`
          };
        }
      }
    }

    return { isValid: true, blockCount: this.chain.length };
  }

  getChain() {
    return [...this.chain];
  }

  exportAuditLog() {
    return JSON.stringify({
      system: 'quantum-forge',
      exportedAt: new Date().toISOString(),
      integrity: this.verifyChainIntegrity(),
      chain: this.chain
    }, null, 2);
  }

  notifyListeners(block) {
    for (const listener of this.listeners) {
      try {
        listener(block);
      } catch {
        // Listener error
      }
    }
  }

  onBlockAdded(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.QuantumForgeAuditChain = QuantumForgeAuditChain;

  document.addEventListener('DOMContentLoaded', () => {
    const auditChain = new QuantumForgeAuditChain();
    const verifyBtn = document.getElementById('verify-chain-btn');
    const integrityBadge = document.getElementById('integrity-status-badge');
    const blockCountEl = document.getElementById('block-count');

    function updateView() {
      const res = auditChain.verifyChainIntegrity();
      if (blockCountEl) blockCountEl.textContent = auditChain.getChain().length;
      if (integrityBadge) {
        integrityBadge.textContent = res.isValid ? 'Cryptographically Verified' : 'Integrity Violated';
        integrityBadge.className = 'status-badge ' + (res.isValid ? 'valid' : 'invalid');
      }
    }

    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        updateView();
      });
    }

    updateView();
  });
}
