/**
 * Aerospace Orbiter - Client-Side LZW Telemetry Data Compression Engine
 * Compresses orbital telemetry, Keplerian vectors, and attitude quaternions
 * using dictionary-based LZW encoding with UTF-8 byte stream fidelity and Unicode resilience.
 */

export class AerospaceOrbiterCompressionEngine {
  constructor() {
    this.name = 'AerospaceOrbiterCompressionEngine';
  }

  /**
   * Compresses an input string into an array of LZW integer codes via UTF-8 byte stream.
   * @param {string} input - Uncompressed telemetry text or payload JSON
   * @returns {number[]} Array of 16-bit integer dictionary codes
   */
  compressLZW(input) {
    if (input === null || input === undefined) {
      return [];
    }
    const text = String(input);
    if (text.length === 0) {
      return [];
    }

    const bytes = new TextEncoder().encode(text);
    const dict = new Map();
    for (let i = 0; i < 256; i++) {
      dict.set(String.fromCharCode(i), i);
    }

    let phrase = '';
    const output = [];
    let codeIndex = 256;

    for (let i = 0; i < bytes.length; i++) {
      const char = String.fromCharCode(bytes[i]);
      const combined = phrase + char;
      if (dict.has(combined)) {
        phrase = combined;
      } else {
        output.push(dict.get(phrase));
        dict.set(combined, codeIndex++);
        phrase = char;
      }
    }

    if (phrase !== '') {
      output.push(dict.get(phrase));
    }

    return output;
  }

  /**
   * Decompresses an array of LZW integer codes back into the original string.
   * @param {number[]} codes - Array of LZW dictionary integer codes
   * @returns {string} Reconstructed original string
   */
  decompressLZW(codes) {
    if (!Array.isArray(codes) || codes.length === 0) {
      return '';
    }

    const dict = new Map();
    for (let i = 0; i < 256; i++) {
      dict.set(i, String.fromCharCode(i));
    }

    let phrase = dict.get(codes[0]);
    let outputChars = phrase;
    let codeIndex = 256;

    for (let i = 1; i < codes.length; i++) {
      const code = codes[i];
      let entry = '';

      if (dict.has(code)) {
        entry = dict.get(code);
      } else if (code === codeIndex) {
        entry = phrase + phrase.charAt(0);
      } else {
        throw new Error(`Corrupted LZW code stream at index ${i}: code ${code}`);
      }

      outputChars += entry;
      dict.set(codeIndex++, phrase + entry.charAt(0));
      phrase = entry;
    }

    const byteArr = new Uint8Array(outputChars.length);
    for (let i = 0; i < outputChars.length; i++) {
      byteArr[i] = outputChars.charCodeAt(i);
    }
    return new TextDecoder().decode(byteArr);
  }

  /**
   * Computes payload compression ratio, bandwidth savings percentage, and footprint.
   * @param {string} originalText - Original uncompressed payload
   * @param {number[]} compressedCodes - LZW compressed code array
   * @returns {Object} Metric statistics object
   */
  computeSavingsRatio(originalText, compressedCodes) {
    const rawByteLength = typeof originalText === 'string' ? new TextEncoder().encode(originalText).length : 0;
    // Each LZW code is stored as 16-bit (2 bytes) integer token
    const compressedByteLength = Array.isArray(compressedCodes) ? compressedCodes.length * 2 : 0;

    const ratio = rawByteLength > 0 ? compressedByteLength / rawByteLength : 1;
    const savingsPercent = rawByteLength > 0 ? Math.max(0, (1 - ratio) * 100) : 0;

    return {
      rawByteLength,
      compressedByteLength,
      ratio: parseFloat(ratio.toFixed(3)),
      savingsPercent: parseFloat(savingsPercent.toFixed(1))
    };
  }

  /**
   * Estimates downlink transmission latency over RF communication channels.
   * @param {number} byteLength - Payload size in bytes
   * @param {number} baudRateBps - Channel data rate in bits per second (default: 32000 bps for DSN)
   * @returns {number} Estimated latency in milliseconds
   */
  estimateTransmissionLatency(byteLength, baudRateBps = 32000) {
    if (typeof byteLength !== 'number' || byteLength <= 0 || typeof baudRateBps !== 'number' || baudRateBps <= 0) {
      return 0;
    }
    const bits = byteLength * 8;
    const seconds = bits / baudRateBps;
    return parseFloat((seconds * 1000).toFixed(1));
  }
}

// Browser DOM controller for interactive Aerospace telemetry compression workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AerospaceOrbiterCompressionEngine();

    const inputArea = document.getElementById('telemetry-input');
    const compressBtn = document.getElementById('compress-btn');
    const decompressBtn = document.getElementById('decompress-btn');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const rawBytesElem = document.getElementById('raw-bytes');
    const compBytesElem = document.getElementById('compressed-bytes');
    const savingsElem = document.getElementById('savings-percent');
    const ratioElem = document.getElementById('compression-ratio');
    const latencyElem = document.getElementById('downlink-latency');
    const baudSelect = document.getElementById('baud-select');
    const bytecodeView = document.getElementById('bytecode-display');
    const decompressedView = document.getElementById('decompressed-display');
    const statusElem = document.getElementById('engine-status');

    let currentCodes = [];

    const SAMPLE_ORBITAL_TELEMETRY = JSON.stringify({
      mission: 'ORBITER-ALPHA-7',
      epoch: '2026-11-21T00:00:00.000Z',
      orbit: {
        semiMajorAxisKm: 6878.14,
        eccentricity: 0.00124,
        inclinationDeg: 51.642,
        raanDeg: 124.582,
        argPeriapsisDeg: 87.215,
        trueAnomalyDeg: 241.908
      },
      attitude: {
        quaternion: [0.7071, 0.0, 0.7071, 0.0],
        angularVelocityRadS: [0.0001, -0.0002, 0.00005],
        pointingMode: 'NADIR_POINTING'
      },
      subsystems: {
        busVoltageV: 28.4,
        solarArrayCurrentA: 18.2,
        batteryStateOfChargePct: 96.8,
        reactionWheelRpm: [2400, -1850, 3100, 120],
        propellantRemainingKg: 42.15,
        deltaVAvailableMS: 312.8
      },
      downlinkPacketSeq: 1048576,
      telemetryChecksum: '0x9E2B'
    }, null, 2);

    if (loadSampleBtn && inputArea) {
      loadSampleBtn.addEventListener('click', () => {
        inputArea.value = SAMPLE_ORBITAL_TELEMETRY;
      });
    }

    if (clearBtn && inputArea) {
      clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        currentCodes = [];
        if (bytecodeView) bytecodeView.textContent = 'Waiting for orbital telemetry input...';
        if (decompressedView) {
          decompressedView.style.display = 'none';
          decompressedView.textContent = '';
        }
        if (rawBytesElem) rawBytesElem.textContent = '0 B';
        if (compBytesElem) compBytesElem.textContent = '0 B';
        if (savingsElem) savingsElem.textContent = '0.0%';
        if (ratioElem) ratioElem.textContent = '1.000x';
        if (latencyElem) latencyElem.textContent = '0.0 ms';
        if (statusElem) statusElem.textContent = 'Engine Status: Ready • Base Dictionary Loaded (256 symbols)';
      });
    }

    function updateMetrics() {
      const text = inputArea?.value || '';
      if (!text || currentCodes.length === 0) return;

      const stats = engine.computeSavingsRatio(text, currentCodes);
      const baudRate = parseInt(baudSelect?.value || '32000', 10);
      const latencyMs = engine.estimateTransmissionLatency(stats.compressedByteLength, baudRate);

      if (rawBytesElem) rawBytesElem.textContent = `${stats.rawByteLength} B`;
      if (compBytesElem) compBytesElem.textContent = `${stats.compressedByteLength} B`;
      if (savingsElem) savingsElem.textContent = `${stats.savingsPercent}%`;
      if (ratioElem) ratioElem.textContent = `${stats.ratio}x`;
      if (latencyElem) latencyElem.textContent = `${latencyMs} ms`;

      if (statusElem) {
        statusElem.textContent = `Encoded ${stats.rawByteLength} bytes into ${currentCodes.length} tokens (${stats.savingsPercent}% shrinkage, ~${latencyMs}ms downlink)`;
      }
    }

    if (compressBtn && inputArea) {
      compressBtn.addEventListener('click', () => {
        const text = inputArea.value;
        if (!text) return;

        currentCodes = engine.compressLZW(text);
        updateMetrics();

        if (bytecodeView) {
          bytecodeView.textContent = currentCodes.map((c) => '0x' + c.toString(16).padStart(4, '0')).join(' ');
        }
      });
    }

    if (baudSelect) {
      baudSelect.addEventListener('change', () => {
        updateMetrics();
      });
    }

    if (decompressBtn && decompressedView) {
      decompressBtn.addEventListener('click', () => {
        if (!currentCodes.length) return;
        const decoded = engine.decompressLZW(currentCodes);
        decompressedView.style.display = 'block';
        decompressedView.textContent = `[Fidelity Verification: ${decoded === inputArea.value ? '100% Lossless Match' : 'Checksum Mismatch'}]\n\n` + decoded;
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (!currentCodes.length) return;
        const u16 = new Uint16Array(currentCodes);
        const blob = new Blob([u16.buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orbital_telemetry.lzw.bin';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
}
