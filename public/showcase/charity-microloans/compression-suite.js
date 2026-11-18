/**
 * CharityMicroloansCompressionEngine
 * High-efficiency dictionary-based LZW payload compressor and rural banking bandwidth analyzer
 * for microfinance loan applications, borrower repayment ledgers, and low-bandwidth field sync.
 */
export class CharityMicroloansCompressionEngine {
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
   * Computes payload shrinkage ratio, percentage savings, and low-bandwidth edge mobile sync latency.
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

    // Simulated rural 2G/EDGE network speed: ~64 KB/s
    const transferSpeedBytesPerSec = 64 * 1024;
    const rawLatencyMs = (originalBytes / transferSpeedBytesPerSec) * 1000;
    const compressedLatencyMs = (compressedBytes / transferSpeedBytesPerSec) * 1000;
    const latencyReductionMs = Math.round((rawLatencyMs - compressedLatencyMs) * 100) / 100;

    return {
      originalBytes,
      compressedBytes,
      ratio,
      savingsPercentage,
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
        console.error('Charity compression engine listener error:', e);
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
    title.textContent = 'Charity Microloans — LZW Banking Telemetry Compression Suite';
    const subtitle = document.createElement('p');
    subtitle.textContent =
      'Client-side dictionary encoding, microfinance payload shrinkage analyzer, and rural low-bandwidth sync preview.';
    header.append(title, subtitle);

    // Preset Telemetry Buttons
    const presetRow = document.createElement('div');
    presetRow.className = 'compress-presets';
    const presetLabel = document.createElement('span');
    presetLabel.textContent = 'Microfinance Presets:';
    presetRow.append(presetLabel);

    const presets = [
      {
        name: 'Borrower Repayment Schedule & Ledger',
        data: 'LOAN_ID:ML-8812;BORROWER:Amina;AMOUNT_USD:350;INSTALLMENT:12;STATUS:ON_TIME;BALANCE:140;CURRENCY:KES;LOAN_ID:ML-8812;BORROWER:Amina;AMOUNT_USD:350;INSTALLMENT:12;STATUS:ON_TIME;BALANCE:140;CURRENCY:KES;'
      },
      {
        name: 'Peer Lending Portfolio Disbursal',
        data: 'LENDER_POOL:COOP_ALPHA;SECTOR:ORGANIC_FARMING;COMMUNITY_TRUST_SCORE:96;INTEREST_PCT:0.0;COLLATERAL_TYPE:PEER_GROUP;LENDER_POOL:COOP_ALPHA;SECTOR:ORGANIC_FARMING;COMMUNITY_TRUST_SCORE:96;INTEREST_PCT:0.0;'
      },
      {
        name: 'Field Officer Offline Sync Batch',
        data: 'OFFICER_ID:FO-09;VILLAGE:KIBERA_WEST;VERIFIED_AUDITS:18;COLLECTIONS_SUM:4200;GPS_LOCK:TRUE;OFFICER_ID:FO-09;VILLAGE:KIBERA_WEST;VERIFIED_AUDITS:18;COLLECTIONS_SUM:4200;GPS_LOCK:TRUE;'
      }
    ];

    // Inputs & Bytecode Grid
    const mainGrid = document.createElement('div');
    mainGrid.className = 'compress-main-grid';

    // Raw input column
    const rawCol = document.createElement('div');
    rawCol.className = 'compress-col';
    const rawTitle = document.createElement('h3');
    rawTitle.textContent = 'Raw Microloan Ledger (Text)';
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
    cardRatioLbl.textContent = 'Compression Ratio';
    cardRatio.append(cardRatioVal, cardRatioLbl);

    const cardSavings = document.createElement('div');
    cardSavings.className = 'compress-card';
    const cardSavingsVal = document.createElement('div');
    cardSavingsVal.className = 'compress-card-val highlight';
    const cardSavingsLbl = document.createElement('div');
    cardSavingsLbl.textContent = 'Bandwidth Savings';
    cardSavings.append(cardSavingsVal, cardSavingsLbl);

    const cardLatency = document.createElement('div');
    cardLatency.className = 'compress-card';
    const cardLatencyVal = document.createElement('div');
    cardLatencyVal.className = 'compress-card-val';
    const cardLatencyLbl = document.createElement('div');
    cardLatencyLbl.textContent = 'Rural 2G Latency Drop';
    cardLatency.append(cardLatencyVal, cardLatencyLbl);

    metricsDashboard.append(cardRatio, cardSavings, cardLatency);

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
        a.download = 'charity-microloan-ledger.lzw.bin';
        a.click();
        URL.revokeObjectURL(url);
        statusBanner.textContent = `Downloaded binary payload (${buffer.byteLength} bytes).`;
        statusBanner.style.color = '#10b981';
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
