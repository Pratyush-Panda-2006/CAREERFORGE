/**
 * LegalSmartContractsCompressionEngine
 * High-efficiency dictionary-based LZW payload compressor and EVM calldata bandwidth analyzer
 * for smart contract ABIs, legal clause payloads, and arbitrated escrow state synchronization.
 */
export class LegalSmartContractsCompressionEngine {
  constructor() {
    this.history = [];
    this.listeners = [];
  }

  /**
   * Compresses input text using dictionary-based LZW algorithm.
   * @param {string} uncompressed - Input string to compress
   * @returns {number[]} Array of integer code points
   */
  compressLZW(uncompressed) {
    if (uncompressed === null || uncompressed === undefined) {
      throw new Error('Input must be a valid string');
    }
    const text = String(uncompressed);
    if (text.length === 0) {
      return [];
    }

    const dict = new Map();
    for (let i = 0; i < 256; i++) {
      dict.set(String.fromCharCode(i), i);
    }

    let dictSize = 256;
    let w = '';
    const result = [];

    for (let i = 0; i < text.length; i++) {
      const c = text.charAt(i);
      const wc = w + c;
      if (dict.has(wc)) {
        w = wc;
      } else {
        result.push(dict.get(w));
        dict.set(wc, dictSize++);
        w = c;
      }
    }

    if (w !== '') {
      result.push(dict.get(w));
    }

    return result;
  }

  /**
   * Decompresses an array of LZW integer code points back to original string.
   * @param {number[]} compressed - Array of integer code points
   * @returns {string} Decompressed string
   */
  decompressLZW(compressed) {
    if (!Array.isArray(compressed)) {
      throw new Error('Compressed payload must be an array of numbers');
    }
    if (compressed.length === 0) {
      return '';
    }

    const dict = new Map();
    for (let i = 0; i < 256; i++) {
      dict.set(i, String.fromCharCode(i));
    }

    let dictSize = 256;
    let w = String.fromCharCode(compressed[0]);
    let result = w;

    for (let i = 1; i < compressed.length; i++) {
      const k = compressed[i];
      let entry = '';

      if (dict.has(k)) {
        entry = dict.get(k);
      } else if (k === dictSize) {
        entry = w + w.charAt(0);
      } else {
        throw new Error(`Corrupted LZW stream: invalid code ${k}`);
      }

      result += entry;
      dict.set(dictSize++, w + entry.charAt(0));
      w = entry;
    }

    return result;
  }

  /**
   * Computes payload shrinkage ratio, percentage savings, and calldata gas savings.
   * @param {string} text - Raw input string
   * @param {number[]} codes - Compressed LZW codes
   * @returns {object} Savings metrics
   */
  computeSavingsRatio(text = '', codes = []) {
    const rawString = String(text || '');
    const originalBytes = new TextEncoder().encode(rawString).length;

    // In a 16-bit variable width/fixed width LZW output stream, each code is 2 bytes
    const compressedBytes = codes.length * 2;

    const ratio = originalBytes === 0 ? 1 : Math.round((compressedBytes / originalBytes) * 100) / 100;
    const savingsPercentage = originalBytes === 0 ? 0 : Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100));

    // Non-zero calldata gas cost on EVM: ~16 gas/byte
    const rawCalldataGas = originalBytes * 16;
    const compressedCalldataGas = compressedBytes * 16;
    const gasSaved = Math.max(0, rawCalldataGas - compressedCalldataGas);

    // Simulated network propagation latency at 2 MB/s peer-to-peer gossip
    const transferSpeedBytesPerSec = 2 * 1024 * 1024;
    const rawLatencyMs = (originalBytes / transferSpeedBytesPerSec) * 1000;
    const compressedLatencyMs = (compressedBytes / transferSpeedBytesPerSec) * 1000;
    const latencyReductionMs = Math.round((rawLatencyMs - compressedLatencyMs) * 100) / 100;

    return {
      originalBytes,
      compressedBytes,
      ratio,
      savingsPercentage,
      gasSaved,
      latencyReductionMs
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify(data) {
    this.listeners.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error('Compression engine listener error:', e);
      }
    });
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const root = document.createElement('div');
    root.className = 'compress-workbench-root';

    // Header
    const header = document.createElement('header');
    header.className = 'compress-header';
    const title = document.createElement('h2');
    title.textContent = 'Legal Smart Contracts — LZW Calldata Compression Suite';
    const subtitle = document.createElement('p');
    subtitle.textContent =
      'Client-side dictionary encoding, contract payload shrinkage analyzer, and EVM calldata gas optimization preview.';
    header.append(title, subtitle);

    // Preset Telemetry Buttons
    const presetRow = document.createElement('div');
    presetRow.className = 'compress-presets';
    const presetLabel = document.createElement('span');
    presetLabel.textContent = 'Contract Payload Presets:';
    presetRow.append(presetLabel);

    const presets = [
      {
        name: 'Solidity ABI & Clause Manifest',
        data: 'CONTRACT:EscrowSettlement;CLAUSE_ID:104;DISPUTE_TIMEOUT:86400;ARBITRATOR:0x71C...392;STATE:ACTIVE;CONTRACT:EscrowSettlement;CLAUSE_ID:104;DISPUTE_TIMEOUT:86400;ARBITRATOR:0x71C...392;STATE:ACTIVE;'
      },
      {
        name: 'Ricardian Legal Agreement',
        data: 'PARTY_A:Alice_Corp;PARTY_B:Bob_LLC;COLLATERAL_WEI:5000000000000000000;JURISDICTION:DE;TERMS:CONFIDENTIAL_ESCROW_RELEASE_UPON_ORACLE_CONSENSUS;PARTY_A:Alice_Corp;PARTY_B:Bob_LLC;COLLATERAL_WEI:5000000000000000000;'
      },
      {
        name: 'Arbitrated Escrow Event Stream',
        data: 'EVENT:DEPOSIT_CONFIRMED:NONCE_1082;EVENT:EVIDENCE_SUBMITTED:NONCE_1083;EVENT:ORACLE_QUORUM_REACHED:NONCE_1084;EVENT:FUNDS_DISBURSED:NONCE_1085;EVENT:DEPOSIT_CONFIRMED:NONCE_1082;EVENT:EVIDENCE_SUBMITTED:NONCE_1083;'
      }
    ];

    // Inputs & Bytecode Grid
    const mainGrid = document.createElement('div');
    mainGrid.className = 'compress-main-grid';

    // Raw input column
    const rawCol = document.createElement('div');
    rawCol.className = 'compress-col';
    const rawTitle = document.createElement('h3');
    rawTitle.textContent = 'Raw Legal Contract Payload (Text)';
    const rawTextarea = document.createElement('textarea');
    rawTextarea.className = 'compress-textarea';
    rawTextarea.value = presets[0].data;
    const rawStats = document.createElement('div');
    rawStats.className = 'compress-col-stat';
    rawCol.append(rawTitle, rawTextarea, rawStats);

    // Compressed output column
    const compCol = document.createElement('div');
    compCol.className = 'compress-col';
    const compTitle = document.createElement('h3');
    compTitle.textContent = 'Compressed LZW Bytecode Array';
    const compTextarea = document.createElement('textarea');
    compTextarea.className = 'compress-textarea compress-byte-view';
    compTextarea.readOnly = true;
    const compStats = document.createElement('div');
    compStats.className = 'compress-col-stat';
    compCol.append(compTitle, compTextarea, compStats);

    // Metrics Dashboard
    const metricsDashboard = document.createElement('div');
    metricsDashboard.className = 'compress-dashboard';

    const cardRatio = document.createElement('div');
    cardRatio.className = 'compress-card';
    const cardRatioVal = document.createElement('div');
    cardRatioVal.className = 'compress-card-val';
    const cardRatioLbl = document.createElement('div');
    cardRatioLbl.className = 'compress-card-lbl';
    cardRatioLbl.textContent = 'Compression Ratio';
    cardRatio.append(cardRatioVal, cardRatioLbl);

    const cardSavings = document.createElement('div');
    cardSavings.className = 'compress-card';
    const cardSavingsVal = document.createElement('div');
    cardSavingsVal.className = 'compress-card-val highlight';
    const cardSavingsLbl = document.createElement('div');
    cardSavingsLbl.className = 'compress-card-lbl';
    cardSavingsLbl.textContent = 'Payload Savings';
    cardSavings.append(cardSavingsVal, cardSavingsLbl);

    const cardGas = document.createElement('div');
    cardGas.className = 'compress-card';
    const cardGasVal = document.createElement('div');
    cardGasVal.className = 'compress-card-val';
    const cardGasLbl = document.createElement('div');
    cardGasLbl.className = 'compress-card-lbl';
    cardGasLbl.textContent = 'Estimated EVM Gas Saved';
    cardGas.append(cardGasVal, cardGasLbl);

    const cardLatency = document.createElement('div');
    cardLatency.className = 'compress-card';
    const cardLatencyVal = document.createElement('div');
    cardLatencyVal.className = 'compress-card-val';
    const cardLatencyLbl = document.createElement('div');
    cardLatencyLbl.className = 'compress-card-lbl';
    cardLatencyLbl.textContent = 'Gossip Latency Reduction';
    cardLatency.append(cardLatencyVal, cardLatencyLbl);

    metricsDashboard.append(cardRatio, cardSavings, cardGas, cardLatency);

    // Action Controls
    const actionRow = document.createElement('div');
    actionRow.className = 'compress-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'compress-btn compress-btn-primary';
    downloadBtn.textContent = 'Download Compressed Binary';

    const verifyBtn = document.createElement('button');
    verifyBtn.className = 'compress-btn';
    verifyBtn.textContent = 'Verify Roundtrip Decompression';

    const statusBanner = document.createElement('div');
    statusBanner.className = 'compress-status';

    actionRow.append(downloadBtn, verifyBtn);

    const updateAll = () => {
      const text = rawTextarea.value;
      const codes = this.compressLZW(text);
      compTextarea.value = JSON.stringify(codes);

      const metrics = this.computeSavingsRatio(text, codes);
      rawStats.textContent = `Original Size: ${metrics.originalBytes} bytes`;
      compStats.textContent = `Compressed: ${metrics.compressedBytes} bytes (${codes.length} tokens)`;

      cardRatioVal.textContent = `${metrics.ratio}x`;
      cardSavingsVal.textContent = `${metrics.savingsPercentage}%`;
      cardGasVal.textContent = `${metrics.gasSaved.toLocaleString()} gas`;
      cardLatencyVal.textContent = `${metrics.latencyReductionMs} ms`;

      this.notify({ text, codes, metrics });
    };

    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = 'compress-preset-btn';
      btn.textContent = p.name;
      btn.addEventListener('click', () => {
        rawTextarea.value = p.data;
        updateAll();
        statusBanner.textContent = `Loaded preset: ${p.name}`;
      });
      presetRow.append(btn);
    });

    rawTextarea.addEventListener('input', updateAll);

    verifyBtn.addEventListener('click', () => {
      try {
        const text = rawTextarea.value;
        const codes = this.compressLZW(text);
        const decompressed = this.decompressLZW(codes);
        if (decompressed === text) {
          statusBanner.textContent = `Roundtrip verification SUCCESS: Lossless parity confirmed across ${text.length} characters!`;
          statusBanner.style.color = '#38ef7d';
        } else {
          statusBanner.textContent = 'Roundtrip verification FAILED: Mismatched output.';
          statusBanner.style.color = '#ff4d4d';
        }
      } catch (err) {
        statusBanner.textContent = `Roundtrip error: ${err.message}`;
        statusBanner.style.color = '#ff4d4d';
      }
    });

    downloadBtn.addEventListener('click', () => {
      try {
        const text = rawTextarea.value;
        const codes = this.compressLZW(text);
        const buffer = new Uint16Array(codes);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'smart-contract-payload.lzw.bin';
        a.click();
        URL.revokeObjectURL(url);
        statusBanner.textContent = `Downloaded binary payload (${buffer.byteLength} bytes).`;
        statusBanner.style.color = '#4facfe';
      } catch (err) {
        statusBanner.textContent = `Export failed: ${err.message}`;
        statusBanner.style.color = '#ff4d4d';
      }
    });

    mainGrid.append(rawCol, compCol);
    root.append(header, presetRow, mainGrid, metricsDashboard, actionRow, statusBanner);
    container.append(root);

    updateAll();
  }
}
