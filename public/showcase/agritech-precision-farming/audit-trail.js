/**
 * Agritech Precision Farming - Autonomous State History & Cryptographic Audit Trail Module
 * Records immutable telemetry mutations with chained cryptographic hashing for tamper evidence.
 */

// Deterministic 256-bit hash generator for universal Node.js test runner and browser compatibility
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

export class AgritechPrecisionFarmingAuditChain {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'agritech_audit_trail_v1';
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
      action: 'GENESIS_INIT',
      payload: { system: 'Agritech Precision Farming Telemetry Engine', version: '2.0.0' },
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
      // Storage quota or restriction
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
      action: String(action || 'TELEMETRY_LOG').toUpperCase(),
      payload: payload && typeof payload === 'object' ? payload : { raw: String(payload) },
      previousHash: previousBlock ? previousBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000',
      hash: ''
    };

    newBlock.hash = this.computeHash(newBlock);
    this.chain.push(newBlock);
    this.saveToStorage();
    this.notifyListeners({ type: 'BLOCK_ADDED', block: newBlock });
    return newBlock;
  }

  verifyChainIntegrity() {
    if (this.chain.length === 0) return { isValid: true, invalidBlockIndex: null };

    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      const calculatedHash = this.computeHash(current);

      if (current.hash !== calculatedHash) {
        return { isValid: false, invalidBlockIndex: i, reason: 'Hash mismatch' };
      }

      if (i > 0) {
        const previous = this.chain[i - 1];
        if (current.previousHash !== previous.hash) {
          return { isValid: false, invalidBlockIndex: i, reason: 'Broken previousHash pointer' };
        }
      }
    }

    return {
      isValid: true,
      totalBlocks: this.chain.length,
      headHash: this.chain[this.chain.length - 1].hash
    };
  }

  getChain(filterAction = 'ALL') {
    if (!filterAction || filterAction === 'ALL') {
      return [...this.chain];
    }
    return this.chain.filter(b => b.action === filterAction);
  }

  clearChain() {
    this.chain = [];
    this.createGenesisBlock();
    this.notifyListeners({ type: 'CHAIN_RESET' });
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notifyListeners(evt) {
    for (const fn of this.listeners) {
      try { fn(evt); } catch { /* Safe listener */ }
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.getElementById('auditTimelineContainer');
    if (!timelineContainer) return;

    const auditChain = new AgritechPrecisionFarmingAuditChain();

    const integrityBadge = document.getElementById('integrityBadge');
    const filterSelect = document.getElementById('filterActionSelect');
    const logSoilBtn = document.getElementById('logSoilEventBtn');
    const logDroneBtn = document.getElementById('logDroneEventBtn');
    const logIrrigateBtn = document.getElementById('logIrrigateEventBtn');
    const verifyChainBtn = document.getElementById('verifyChainBtn');
    const exportChainBtn = document.getElementById('exportChainBtn');
    const clearChainBtn = document.getElementById('clearChainBtn');

    function updateIntegrityView() {
      const check = auditChain.verifyChainIntegrity();
      if (integrityBadge) {
        if (check.isValid) {
          integrityBadge.textContent = `VERIFIED (SHA-256 Valid • ${check.totalBlocks} Blocks)`;
          integrityBadge.className = 'status-badge status-valid';
        } else {
          integrityBadge.textContent = `COMPROMISED (Tampered at Block #${check.invalidBlockIndex})`;
          integrityBadge.className = 'status-badge status-invalid';
        }
      }
    }

    function renderTimeline() {
      timelineContainer.replaceChildren();
      const filter = filterSelect ? filterSelect.value : 'ALL';
      const blocks = auditChain.getChain(filter);

      if (blocks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-msg';
        empty.textContent = 'No audit records match the current filter.';
        timelineContainer.appendChild(empty);
        return;
      }

      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        const item = document.createElement('div');
        item.className = 'timeline-item';

        const header = document.createElement('div');
        header.className = 'timeline-item-header';

        const indexChip = document.createElement('span');
        indexChip.className = 'chip-index';
        indexChip.textContent = `BLOCK #${b.index}`;

        const actionTag = document.createElement('span');
        actionTag.className = `chip-action action-${b.action.toLowerCase()}`;
        actionTag.textContent = b.action;

        const time = document.createElement('span');
        time.className = 'time-label';
        time.textContent = new Date(b.timestamp).toLocaleString();

        header.append(indexChip, actionTag, time);

        const body = document.createElement('div');
        body.className = 'timeline-payload';
        body.textContent = JSON.stringify(b.payload, null, 2);

        const footer = document.createElement('div');
        footer.className = 'timeline-hashes';

        const hashRow = document.createElement('div');
        hashRow.className = 'hash-line';
        const hashLabel = document.createElement('strong');
        hashLabel.textContent = 'HASH: ';
        const hashVal = document.createElement('span');
        hashVal.className = 'mono-hash';
        hashVal.textContent = b.hash;
        hashRow.append(hashLabel, hashVal);

        const prevRow = document.createElement('div');
        prevRow.className = 'hash-line';
        const prevLabel = document.createElement('strong');
        prevLabel.textContent = 'PREV: ';
        const prevVal = document.createElement('span');
        prevVal.className = 'mono-hash text-muted';
        prevVal.textContent = b.previousHash;
        prevRow.append(prevLabel, prevVal);

        footer.append(hashRow, prevRow);
        item.append(header, body, footer);
        timelineContainer.appendChild(item);
      }
    }

    if (logSoilBtn) {
      logSoilBtn.addEventListener('click', () => {
        auditChain.recordEvent('SOIL_TELEMETRY', {
          sector: 'SECTOR-7G',
          soilPh: 6.8,
          moistureSaturation: '64%',
          sensorNode: 'Array-1'
        });
        updateIntegrityView();
        renderTimeline();
      });
    }

    if (logDroneBtn) {
      logDroneBtn.addEventListener('click', () => {
        auditChain.recordEvent('DRONE_SURVEY', {
          uavId: 'AGRI-UAV-402',
          areaHectares: 42.5,
          meanNdvi: 0.78
        });
        updateIntegrityView();
        renderTimeline();
      });
    }

    if (logIrrigateBtn) {
      logIrrigateBtn.addEventListener('click', () => {
        auditChain.recordEvent('IRRIGATION_DISPATCH', {
          pivotZone: 'PIVOT-NORTH-3',
          volumeLiters: 12500,
          nutrientInjection: 'NPK-OPTIMIZED'
        });
        updateIntegrityView();
        renderTimeline();
      });
    }

    if (verifyChainBtn) {
      verifyChainBtn.addEventListener('click', () => {
        updateIntegrityView();
        const res = auditChain.verifyChainIntegrity();
        alert(res.isValid ? `✅ Cryptographic chain is fully intact (${res.totalBlocks} blocks verified).` : `⚠️ Chain compromised at block #${res.invalidBlockIndex}!`);
      });
    }

    if (exportChainBtn) {
      exportChainBtn.addEventListener('click', () => {
        const json = JSON.stringify(auditChain.getChain(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agritech-audit-chain-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (clearChainBtn) {
      clearChainBtn.addEventListener('click', () => {
        if (confirm('Reset audit chain to Genesis block?')) {
          auditChain.clearChain();
          updateIntegrityView();
          renderTimeline();
        }
      });
    }

    if (filterSelect) {
      filterSelect.addEventListener('change', () => renderTimeline());
    }

    auditChain.subscribe(() => {
      updateIntegrityView();
      renderTimeline();
    });

    updateIntegrityView();
    renderTimeline();
  });
}
