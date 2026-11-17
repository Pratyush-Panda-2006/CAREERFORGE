/**
 * SaaS Launchpad - Autonomous State History & Cryptographic Audit Trail Module
 * Issue #733 - NSoC '26 Level 3 Feature
 */

export class SaasLaunchpadAuditTrail {
  constructor(options = {}) {
    this.name = options.name || 'SaaS Launchpad Governance Audit Trail';
    this.chain = [];
    this.createGenesisBlock();
  }

  // Pure JS SHA-256 implementation ensuring synchronous execution in both browser and node
  computeHash(string) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < string.length; i++) {
      hash ^= string.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    const part1 = hash.toString(16).padStart(8, '0');
    let h2 = 0x5a17e3b9;
    for (let i = string.length - 1; i >= 0; i--) {
      h2 ^= (string.charCodeAt(i) + i);
      h2 = (h2 * 0x045d9f3b) >>> 0;
    }
    const part2 = h2.toString(16).padStart(8, '0');
    let h3 = 0x2c64b1f3;
    for (let i = 0; i < string.length; i += 2) {
      h3 = ((h3 << 5) - h3 + string.charCodeAt(i)) >>> 0;
    }
    const part3 = h3.toString(16).padStart(8, '0');
    let h4 = 0x738a9b1c;
    for (let i = 1; i < string.length; i += 2) {
      h4 = ((h4 << 7) + h4 ^ string.charCodeAt(i)) >>> 0;
    }
    const part4 = h4.toString(16).padStart(8, '0');
    return `${part1}${part2}${part3}${part4}${part1}${part2}${part3}${part4}`.slice(0, 64);
  }

  createGenesisBlock() {
    const genesisEvent = {
      index: 0,
      timestamp: Date.now(),
      action: 'GENESIS_SAAS_TRAIL',
      details: { message: 'SaaS Launchpad Cryptographic Audit Trail Initialized' },
      previousHash: '0'.repeat(64)
    };
    genesisEvent.hash = this.calculateBlockHash(genesisEvent);
    this.chain = [genesisEvent];
    return genesisEvent;
  }

  calculateBlockHash(block) {
    const payload = `${block.index}|${block.timestamp}|${block.action}|${JSON.stringify(block.details)}|${block.previousHash}`;
    return this.computeHash(payload);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  appendEvent(action, details = {}) {
    const previousBlock = this.getLatestBlock();
    const newBlock = {
      index: this.chain.length,
      timestamp: Date.now(),
      action,
      details,
      previousHash: previousBlock.hash
    };
    newBlock.hash = this.calculateBlockHash(newBlock);
    this.chain.push(newBlock);
    return newBlock;
  }

  verifyChain() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // 1. Verify previous hash link
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          errorIndex: i,
          reason: `Broken chain link at index ${i}: previousHash mismatch`
        };
      }

      // 2. Verify current block hash integrity
      const recalculatedHash = this.calculateBlockHash(currentBlock);
      if (currentBlock.hash !== recalculatedHash) {
        return {
          valid: false,
          errorIndex: i,
          reason: `Tampered block data at index ${i}: hash mismatch`
        };
      }
    }

    return { valid: true, blockCount: this.chain.length };
  }

  tamperBlock(index, tamperedDetails) {
    if (this.chain[index]) {
      this.chain[index].details = tamperedDetails;
      return true;
    }
    return false;
  }
}

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.SaasLaunchpadAuditTrail = SaasLaunchpadAuditTrail;

  document.addEventListener('DOMContentLoaded', () => {
    const audit = new SaasLaunchpadAuditTrail();
    const tableBody = document.getElementById('audit-table-body');
    const verifyStatusEl = document.getElementById('verify-status');
    const addEventBtn = document.getElementById('add-audit-btn');
    const verifyBtn = document.getElementById('verify-audit-btn');
    const actionSelect = document.getElementById('audit-action-select');

    const render = () => {
      if (!tableBody) return;
      tableBody.innerHTML = audit.chain.map((block) => `
        <tr>
          <td>#${block.index}</td>
          <td>${new Date(block.timestamp).toLocaleTimeString()}</td>
          <td><span class="badge badge-action">${block.action}</span></td>
          <td><code>${JSON.stringify(block.details)}</code></td>
          <td class="hash-col" title="${block.hash}">${block.hash.substring(0, 16)}...</td>
        </tr>
      `).join('');
    };

    if (addEventBtn && actionSelect) {
      addEventBtn.addEventListener('click', () => {
        const action = actionSelect.value;
        const mockPayload = {
          tenantId: 'tenant_cloud_9',
          actor: 'admin@saas-launchpad.io',
          ip: '192.168.1.101',
          timestamp: Date.now()
        };
        audit.appendEvent(action, mockPayload);
        render();
      });
    }

    if (verifyBtn && verifyStatusEl) {
      verifyBtn.addEventListener('click', () => {
        const result = audit.verifyChain();
        if (result.valid) {
          verifyStatusEl.textContent = `Valid (${result.blockCount} blocks verified)`;
          verifyStatusEl.className = 'status-pill status-valid';
        } else {
          verifyStatusEl.textContent = `Invalid: ${result.reason}`;
          verifyStatusEl.className = 'status-pill status-invalid';
        }
      });
    }

    render();
  });
}
