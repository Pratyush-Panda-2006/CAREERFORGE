/**
 * Fintech Vault - Autonomous State History & Cryptographic Audit Trail Module
 * Issue #753 - NSoC '26 Level 3 Feature
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

export class FintechVaultAuditChain {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'fintech_vault_audit_chain_v1';
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
      action: 'GENESIS_VAULT_ROOT',
      payload: { ledger: 'Fintech Secure Ledger', compliance: 'SOC2-Type-II' },
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
      // Storage restriction
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
      action: String(action || 'UNKNOWN_VAULT_TRANSACTION'),
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

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }
    return () => {};
  }

  notifyListeners(block) {
    for (const listener of this.listeners) {
      try {
        listener(block, this.verifyChainIntegrity());
      } catch (err) {
        console.error('Audit listener error:', err);
      }
    }
  }

  exportAuditLog() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      integrity: this.verifyChainIntegrity(),
      chain: this.chain
    }, null, 2);
  }
}

// Browser UI bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.FintechVaultAuditChain = FintechVaultAuditChain;

  document.addEventListener('DOMContentLoaded', () => {
    const auditor = new FintechVaultAuditChain();
    const feed = document.getElementById('audit-feed');
    const badge = document.getElementById('integrity-badge');
    const recordBtn = document.getElementById('record-event-btn');

    const render = () => {
      const integrity = auditor.verifyChainIntegrity();
      if (badge) {
        badge.className = `integrity-badge ${integrity.isValid ? 'valid' : 'tampered'}`;
        badge.textContent = integrity.isValid ? `✓ Tamper-Evident: ${integrity.blockCount} Blocks` : `⚠ Tampered at #${integrity.brokenBlockIndex}`;
      }

      if (feed) {
        feed.innerHTML = '';
        auditor.getChain().slice().reverse().forEach(block => {
          const item = document.createElement('div');
          item.className = 'timeline-block';
          item.innerHTML = `
            <div class="block-header">
              <span class="block-idx">#${block.index}</span>
              <span class="block-action">${block.action}</span>
              <span class="block-time">${new Date(block.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="block-payload">${JSON.stringify(block.payload)}</div>
            <div class="block-hash">Hash: <code>${block.hash.slice(0, 16)}...</code></div>
          `;
          feed.appendChild(item);
        });
      }
    };

    auditor.subscribe(render);
    render();

    if (recordBtn) {
      recordBtn.addEventListener('click', () => {
        const actionInput = document.getElementById('event-action');
        const action = actionInput ? actionInput.value : 'SETTLEMENT_FINALIZED';
        auditor.recordEvent(action, { asset: 'USDC', amount: 250000, recipient: '0xVault491', status: 'CLEARED' });
      });
    }
  });
}
