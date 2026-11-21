/**
 * Travel Odyssey - Expedition Manifest Data Compression & Shrinkage Engine
 * Implements client-side LZW encoding/decoding, calculates compression ratios,
 * and models payload transfer latency for expedition itineraries and telemetry.
 */

export class TravelOdysseyCompressionEngine {
  constructor() {
    this.name = 'TravelOdysseyCompressionEngine';
  }

  /**
   * Compresses input string into an array of LZW integer codes via UTF-8 byte stream.
   * @param {string} input - Raw text payload
   * @returns {number[]} Array of 16-bit dictionary codes
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
   * @param {number[]} codes - Array of 16-bit dictionary codes
   * @returns {string} Restored original text
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
   * @param {string} originalText - Original uncompressed text
   * @param {number[]} compressedCodes - LZW output codes
   * @returns {{ rawByteLength: number, compressedByteLength: number, ratio: number, savingsPercent: number }}
   */
  computeSavingsRatio(originalText, compressedCodes) {
    const rawByteLength = typeof originalText === 'string' ? new TextEncoder().encode(originalText).length : 0;
    const compressedByteLength = Array.isArray(compressedCodes) ? compressedCodes.length * 2 : 0;

    const ratio = rawByteLength > 0 ? (compressedByteLength / rawByteLength) : 1;
    const savingsPercent = rawByteLength > 0 ? Math.max(0, ((1 - ratio) * 100)) : 0;

    return {
      rawByteLength,
      compressedByteLength,
      ratio: parseFloat(ratio.toFixed(3)),
      savingsPercent: parseFloat(savingsPercent.toFixed(1))
    };
  }
}

// Browser DOM initializer for interactive Travel Odyssey compression workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new TravelOdysseyCompressionEngine();

    const inputArea = document.getElementById('travel-input');
    const compressBtn = document.getElementById('compress-btn');
    const decompressBtn = document.getElementById('decompress-btn');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const rawBytesElem = document.getElementById('raw-bytes');
    const compBytesElem = document.getElementById('compressed-bytes');
    const savingsElem = document.getElementById('savings-percent');
    const ratioElem = document.getElementById('compression-ratio');
    const bytecodeView = document.getElementById('bytecode-display');
    const decompressedView = document.getElementById('decompressed-display');
    const statusElem = document.getElementById('engine-status');

    let currentCodes = [];

    const SAMPLE_EXPEDITION_MANIFEST = JSON.stringify({
      expeditionId: "EXP-2026-NORDIC-AURORA",
      vesselName: "S.S. Aurora Borealis",
      destination: "Svalbard Arctic Archipelago (78.2232° N, 15.6267° E)",
      departurePort: "Tromsø Harbor, Norway",
      waypoints: [
        { name: "Bear Island Staging", coordinates: "74.4500° N, 19.0000° E", elevationMeters: 14 },
        { name: "Longyearbyen Basecamp", coordinates: "78.2232° N, 15.6267° E", elevationMeters: 45 },
        { name: "Ny-Ålesund Research Point", coordinates: "78.9235° N, 11.9099° E", elevationMeters: 8 }
      ],
      provisions: { rationsDays: 45, emergencyBeaconFreqMhz: 406.037, satelliteUplink: "Iridium-NEXT" },
      crewManifestCount: 18,
      status: "ALL_SYSTEMS_GO"
    }, null, 2);

    if (loadSampleBtn && inputArea) {
      loadSampleBtn.addEventListener('click', () => {
        inputArea.value = SAMPLE_EXPEDITION_MANIFEST;
      });
    }

    if (clearBtn && inputArea) {
      clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        currentCodes = [];
        if (bytecodeView) bytecodeView.textContent = 'Waiting for expedition manifest payload input...';
        if (decompressedView) {
          decompressedView.style.display = 'none';
          decompressedView.textContent = '';
        }
        if (rawBytesElem) rawBytesElem.textContent = '0 B';
        if (compBytesElem) compBytesElem.textContent = '0 B';
        if (savingsElem) savingsElem.textContent = '0.0%';
        if (ratioElem) ratioElem.textContent = '1.000x';
        if (statusElem) statusElem.textContent = 'Engine Status: Cleared';
      });
    }

    if (compressBtn && inputArea) {
      compressBtn.addEventListener('click', () => {
        const text = inputArea.value;
        if (!text) return;

        currentCodes = engine.compressLZW(text);
        const stats = engine.computeSavingsRatio(text, currentCodes);

        if (rawBytesElem) rawBytesElem.textContent = `${stats.rawByteLength} B`;
        if (compBytesElem) compBytesElem.textContent = `${stats.compressedByteLength} B`;
        if (savingsElem) savingsElem.textContent = `${stats.savingsPercent}%`;
        if (ratioElem) ratioElem.textContent = `${stats.ratio}x`;

        if (bytecodeView) {
          bytecodeView.textContent = currentCodes.map((c) => '0x' + c.toString(16).padStart(4, '0')).join(' ');
        }
        if (statusElem) {
          statusElem.textContent = `Encoded ${stats.rawByteLength} bytes into ${currentCodes.length} tokens (${stats.savingsPercent}% reduction)`;
        }
      });
    }

    if (decompressBtn && decompressedView) {
      decompressBtn.addEventListener('click', () => {
        if (!currentCodes.length) return;
        const decoded = engine.decompressLZW(currentCodes);
        decompressedView.style.display = 'block';
        decompressedView.textContent = `[Integrity Verified: ${decoded === inputArea.value ? '100% Lossless' : 'Checksum Mismatch'}]\n\n` + decoded;
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
        a.download = 'travel_expedition_manifest.lzw.bin';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
}
