/**
 * RoboticsAutomataCompressionEngine
 * High-efficiency dictionary-based LZW payload compressor and bandwidth telemetry analyzer
 * for edge robotics sensor streams, telemetry frames, and autonomous fleet sync.
 */
export class RoboticsAutomataCompressionEngine {
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
   * Computes payload shrinkage ratio, percentage savings, and simulated network transmission savings.
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

    // Simulated 4G edge bandwidth ~ 100 KB/s
    const transferSpeedBytesPerSec = 100 * 1024;
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
    title.textContent = 'Robotics Automata — LZW Data Compression & Payload Analyzer';
    const subtitle = document.createElement('p');
    subtitle.textContent =
      'Client-side dictionary encoding, telemetry payload shrinkage analyzer, and binary transmission preview.';
    header.append(title, subtitle);

    // Preset Telemetry Buttons
    const presetRow = document.createElement('div');
    presetRow.className = 'compress-presets';
    const presetLabel = document.createElement('span');
    presetLabel.textContent = 'Sample Sensor Streams:';
    presetRow.append(presetLabel);

    const presets = [
      {
        name: 'LiDAR Cloud Telemetry',
        data: 'LIDAR_SCAN:0.45,0.45,0.45,0.46,0.45;FRAME:001;STATUS:CLEAR;LIDAR_SCAN:0.45,0.45,0.45,0.46,0.45;FRAME:002;STATUS:CLEAR;LIDAR_SCAN:0.45,0.45,0.45,0.46,0.45;FRAME:003;STATUS:CLEAR;'
      },
      {
        name: 'IMU Gyro Stream',
        data: 'AXIS_X:0.002,AXIS_Y:-0.001,AXIS_Z:9.806;TEMP:24.5C;AXIS_X:0.002,AXIS_Y:-0.001,AXIS_Z:9.806;TEMP:24.5C;AXIS_X:0.002,AXIS_Y:-0.001,AXIS_Z:9.806;TEMP:24.5C;'
      },
      {
        name: 'Repetitive Mission Waypoints',
        data: 'NAV_WAYPOINT_LAT_37.7749_LON_-122.4194_ALT_15M;NAV_WAYPOINT_LAT_37.7749_LON_-122.4194_ALT_15M;NAV_WAYPOINT_LAT_37.7749_LON_-122.4194_ALT_15M;'
      }
    ];

    // Inputs & Bytecode Grid
    const mainGrid = document.createElement('div');
    mainGrid.className = 'compress-main-grid';

    // Raw input column
    const rawCol = document.createElement('div');
    rawCol.className = 'compress-col';
    const rawTitle = document.createElement('h3');
    rawTitle.textContent = 'Original Payload (Text)';
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

    const cardLatency = document.createElement('div');
    cardLatency.className = 'compress-card';
    const cardLatencyVal = document.createElement('div');
    cardLatencyVal.className = 'compress-card-val';
    const cardLatencyLbl = document.createElement('div');
    cardLatencyLbl.className = 'compress-card-lbl';
    cardLatencyLbl.textContent = 'Latency Reduction';
    cardLatency.append(cardLatencyVal, cardLatencyLbl);

    metricsDashboard.append(cardRatio, cardSavings, cardLatency);

    // Action Controls
    const actionRow = document.createElement('div');
    actionRow.className = 'compress-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'compress-btn compress-btn-primary';
    downloadBtn.textContent = 'Download Binary Payload (.bin)';

    const decompressTestBtn = document.createElement('button');
    decompressTestBtn.className = 'compress-btn compress-btn-secondary';
    decompressTestBtn.textContent = 'Verify Lossless Roundtrip';

    const verifyNotice = document.createElement('span');
    verifyNotice.className = 'compress-notice';

    actionRow.append(downloadBtn, decompressTestBtn, verifyNotice);

    let currentCodes = [];

    const handleUpdate = () => {
      const rawText = rawTextarea.value;
      currentCodes = this.compressLZW(rawText);
      compTextarea.value = JSON.stringify(currentCodes);

      const metrics = this.computeSavingsRatio(rawText, currentCodes);
      rawStats.textContent = `Raw Size: ${metrics.originalBytes} Bytes`;
      compStats.textContent = `Packed Size: ${metrics.compressedBytes} Bytes (${currentCodes.length} codes)`;

      cardRatioVal.textContent = `${metrics.ratio}x`;
      cardSavingsVal.textContent = `${metrics.savingsPercentage}%`;
      cardLatencyVal.textContent = `${metrics.latencyReductionMs} ms`;
      verifyNotice.textContent = '';
    };

    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = 'compress-preset-btn';
      btn.textContent = p.name;
      btn.addEventListener('click', () => {
        rawTextarea.value = p.data;
        handleUpdate();
      });
      presetRow.append(btn);
    });

    rawTextarea.addEventListener('input', handleUpdate);

    downloadBtn.addEventListener('click', () => {
      if (currentCodes.length === 0) return;
      const buffer = new Uint16Array(currentCodes);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'robotics_telemetry.bin';
      a.click();
      URL.revokeObjectURL(url);
    });

    decompressTestBtn.addEventListener('click', () => {
      try {
        const roundtrip = this.decompressLZW(currentCodes);
        if (roundtrip === rawTextarea.value) {
          verifyNotice.textContent = '✓ 100% Lossless Roundtrip Match';
          verifyNotice.style.color = '#34d399';
        } else {
          verifyNotice.textContent = '✗ Mismatch detected in roundtrip';
          verifyNotice.style.color = '#f87171';
        }
      } catch (err) {
        verifyNotice.textContent = `Error: ${err.message}`;
        verifyNotice.style.color = '#f87171';
      }
    });

    mainGrid.append(rawCol, compCol);
    root.append(header, presetRow, mainGrid, metricsDashboard, actionRow);
    container.append(root);

    handleUpdate();
    return root;
  }
}
