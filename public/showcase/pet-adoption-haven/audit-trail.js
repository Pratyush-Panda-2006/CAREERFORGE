/**
 * Pet Adoption Haven - Autonomous State History & Cryptographic Audit Trail Module
 * Issue #862 - NSoC '26 Level 3 Feature
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

export class PetAdoptionHavenAuditChain {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'pet_adoption_haven_audit_trail_v1';
    this.chain = [];
    this.loadFromStorage();
    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
  }

  computeHash(block) {
    const dataString = `${block.index}|${block.timestamp}|${block.action}|${JSON.stringify(block.payload)}|${block.previousHash}`;
    return computeAuditHash(dataString);
  }

  createGenesisBlock() {
    const genesis = {
      index: 0,
      timestamp: Date.now(),
      action: 'GENESIS_INIT',
      payload: { system: 'Pet Adoption Haven Audit Ledger', version: '1.0.0' },
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      hash: ''
    };
    genesis.hash = this.computeHash(genesis);
    this.chain = [genesis];
    this.saveToStorage();
    return genesis;
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
    } catch {}
  }

  recordEvent(action, payload = {}) {
    const prevBlock = this.chain[this.chain.length - 1];
    const newBlock = {
      index: this.chain.length,
      timestamp: Date.now(),
      action: String(action).toUpperCase(),
      payload: JSON.parse(JSON.stringify(payload)),
      previousHash: prevBlock ? prevBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000',
      hash: ''
    };
    newBlock.hash = this.computeHash(newBlock);
    this.chain.push(newBlock);
    this.saveToStorage();
    return newBlock;
  }

  verifyChainIntegrity() {
    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      const recalculated = this.computeHash(current);

      if (current.hash !== recalculated) {
        return {
          isValid: false,
          invalidBlockIndex: current.index,
          reason: 'Hash mismatch'
        };
      }

      if (i > 0) {
        const prev = this.chain[i - 1];
        if (current.previousHash !== prev.hash) {
          return {
            isValid: false,
            invalidBlockIndex: current.index,
            reason: 'Previous hash reference mismatch'
          };
        }
      }
    }

    return {
      isValid: true,
      totalBlocks: this.chain.length,
      headHash: this.chain[this.chain.length - 1]?.hash || null
    };
  }

  getChain() {
    return [...this.chain];
  }

  filterByAction(action) {
    const act = String(action).toUpperCase();
    return this.chain.filter(b => b.action === act);
  }

  exportChainJson() {
    return JSON.stringify({
      ledger: 'PetAdoptionHavenAuditTrail',
      exportedAt: Date.now(),
      blocks: this.chain
    }, null, 2);
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const auditor = new PetAdoptionHavenAuditChain();

    const recordBtn = document.getElementById('recordEventBtn');
    const verifyBtn = document.getElementById('verifyChainBtn');
    const eventTypeSelect = document.getElementById('eventTypeSelect');
    const petNameInput = document.getElementById('petNameInput');
    const chainList = document.getElementById('auditChainList');
    const chainStatusPill = document.getElementById('chainStatusPill');

    function renderChain() {
      if (!chainList) return;
      chainList.innerHTML = auditor.getChain().map(b => `
        <div class="audit-block-card">
          <div class="block-header">
            <span class="block-index">#${b.index}</span>
            <span class="block-action">${b.action}</span>
            <span class="block-time">${new Date(b.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="block-payload">${JSON.stringify(b.payload)}</div>
          <div class="block-hash">Hash: ${b.hash.substring(0, 16)}...</div>
        </div>
      `).join('');
    }

    if (recordBtn && eventTypeSelect && petNameInput) {
      recordBtn.addEventListener('click', () => {
        const act = eventTypeSelect.value;
        const pet = petNameInput.value.trim() || 'Buddy';
        auditor.recordEvent(act, { pet, agentId: 'haven_intake_node' });
        petNameInput.value = '';
        renderChain();
      });
    }

    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        const status = auditor.verifyChainIntegrity();
        if (chainStatusPill) {
          chainStatusPill.textContent = status.isValid ? 'VERIFIED' : 'TAMPERED';
          chainStatusPill.className = `status-pill ${status.isValid ? 'status-pass' : 'status-fail'}`;
        }
      });
    }

    renderChain();
  });
}
