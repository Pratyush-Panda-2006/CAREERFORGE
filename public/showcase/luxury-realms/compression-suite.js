/**
 * Luxury Realms - Client-Side LZW Data Compression & Portfolio Shrinkage Engine
 * Compresses luxury estate portfolio metadata, 3D architectural asset manifests, and escrow records
 * using LZW algorithm with UTF-8 byte stream fidelity and Unicode resilience.
 */

export class LuxuryRealmsCompressionEngine {
  constructor() {
    this.name = 'LuxuryRealmsCompressionEngine';
  }

  /**
   * Compresses input string into an array of LZW integer codes via UTF-8 byte stream.
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
   */
  computeSavingsRatio(originalText, compressedCodes) {
    const rawByteLength = typeof originalText === 'string' ? new TextEncoder().encode(originalText).length : 0;
    // Each LZW code is stored as 16-bit (2 bytes) integer
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

// Browser DOM initializer for interactive Luxury Realms compression workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new LuxuryRealmsCompressionEngine();

    const inputArea = document.getElementById('luxury-input');
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

    const SAMPLE_ESTATE = JSON.stringify({
      estateId: "LR-VILLA-AURELIA-007",
      title: "Villa Aurelia Cap d'Antibes Waterfront Sanctuary",
      location: "Boulevard de la Garoupe, 06160 Antibes, French Riviera",
      pricing: {
        currency: "EUR",
        listingPrice: 85000000,
        escrowDeposit: 8500000
      },
      specifications: {
        livingAreaSqM: 1450,
        groundsHectares: 2.8,
        privateHelipad: true,
        superyachtMooringBerthMeters: 45,
        spaPavilion: true
      },
      appraisalVerification: "Certified Prime Sovereign Asset Rating AAA+"
    }, null, 2);

    if (loadSampleBtn && inputArea) {
      loadSampleBtn.addEventListener('click', () => {
        inputArea.value = SAMPLE_ESTATE;
      });
    }

    if (clearBtn && inputArea) {
      clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        currentCodes = [];
        if (bytecodeView) bytecodeView.textContent = 'Waiting for estate data payload input...';
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
        decompressedView.textContent = `[Verified Match: ${decoded === inputArea.value ? '100% Lossless' : 'Mismatch'}]\n\n` + decoded;
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
        a.download = 'luxury_estate_portfolio.lzw.bin';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
}
