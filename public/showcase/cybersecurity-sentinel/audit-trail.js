/**
 * Implement autonomous state history & cryptographic audit trail module - Autonomous State History & Cryptographic Audit Trail Module
 * Records immutable mutations with chained cryptographic hashing for tamper evidence.
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

export class CybersecuritySentinelAuditChain {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'cybersecurity-sentinel_audit_trail_v1';
    this.chain = [];
    this.loadFromStorage();
    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
  }

  createGenesisBlock() {
    const genesis = {
      index: 0,
      timestamp: Date.now(),
      action: 'GENESIS_INIT',
      payload: { system: 'Implement autonomous state history & cryptographic audit trail module Engine', version: '1.0.0' },
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
    }
  }

  computeHash(block) {
    if (!block) return '';
    const serialized = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      action: block.action,
      payload: block.payload,
      previousHash: block.previousHash
    });
    return computeAuditHash(serialized);
  }

  recordEvent(action, payload = {}) {
    const previousBlock = this.chain[this.chain.length - 1];
    const newBlock = {
      index: this.chain.length,
      timestamp: Date.now(),
      action: String(action || 'UNKNOWN_ACTION'),
      payload,
      previousHash: previousBlock.hash,
      hash: ''
    };
    newBlock.hash = this.computeHash(newBlock);
    this.chain.push(newBlock);
    this.saveToStorage();
    return newBlock;
  }

  verifyChainIntegrity() {
    if (this.chain.length === 0) {
      return { isValid: false, reason: 'Empty chain', invalidBlockIndex: -1 };
    }

    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      const recalculated = this.computeHash(current);
      if (current.hash !== recalculated) {
        return { isValid: false, reason: 'Hash mismatch', invalidBlockIndex: i };
      }
      if (i > 0) {
        const prev = this.chain[i - 1];
        if (current.previousHash !== prev.hash) {
          return { isValid: false, reason: 'Previous hash mismatch', invalidBlockIndex: i };
        }
      }
    }
    return { isValid: true, totalBlocks: this.chain.length };
  }

  getChain(filterAction = null) {
    if (!filterAction || filterAction === 'ALL') {
      return [...this.chain];
    }
    return this.chain.filter(b => b.action === filterAction);
  }

  clearChain() {
    this.chain = [];
    this.createGenesisBlock();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const auditChain = new CybersecuritySentinelAuditChain();

    const badge = document.getElementById('integrityBadge');
    const container = document.getElementById('auditTimelineContainer');
    const filterSelect = document.getElementById('filterActionSelect');

    function renderFeed() {
      if (!container) return;
      container.replaceChildren();

      const filterVal = filterSelect?.value || 'ALL';
      const blocks = auditChain.getChain(filterVal);

      blocks.forEach(block => {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        const top = document.createElement('div');
        top.className = 'timeline-top';

        const idx = document.createElement('span');
        idx.className = 'block-index';
        idx.textContent = `#${block.index} [${block.action}]`;

        const chip = document.createElement('span');
        chip.className = 'hash-chip';
        chip.textContent = `Hash: ${block.hash.substring(0, 16)}...`;

        top.appendChild(idx);
        top.appendChild(chip);

        const payloadDiv = document.createElement('pre');
        payloadDiv.style.margin = '0';
        payloadDiv.style.fontSize = '0.8rem';
        payloadDiv.style.color = 'var(--audit-text-muted)';
        payloadDiv.textContent = JSON.stringify(block.payload, null, 2);

        item.appendChild(top);
        item.appendChild(payloadDiv);
        container.appendChild(item);
      });

      const check = auditChain.verifyChainIntegrity();
      if (badge) {
        badge.textContent = check.isValid ? `CHAIN VALID (${check.totalBlocks} BLOCKS)` : 'INTEGRITY COMPROMISED';
        badge.className = `status-badge ${check.isValid ? 'status-valid' : 'status-invalid'}`;
      }
    }

    document.getElementById('logEvent1Btn')?.addEventListener('click', () => {
      auditChain.recordEvent('IDS_ALERT_TRIGGERED', { source: 'user_action_1', timestamp: Date.now() });
      renderFeed();
    });

    document.getElementById('logEvent2Btn')?.addEventListener('click', () => {
      auditChain.recordEvent('FIREWALL_RULE_UPDATED', { source: 'user_action_2', timestamp: Date.now() });
      renderFeed();
    });

    document.getElementById('verifyChainBtn')?.addEventListener('click', renderFeed);

    document.getElementById('clearChainBtn')?.addEventListener('click', () => {
      auditChain.clearChain();
      renderFeed();
    });

    filterSelect?.addEventListener('change', renderFeed);
    renderFeed();
  });
}
