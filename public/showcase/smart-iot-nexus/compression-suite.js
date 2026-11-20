/**
 * Smart IoT Nexus - Client-Side LZW Data Compression & Edge Sensor Payload Shrinkage Engine
 * Compresses MQTT sensor telemetry, Zigbee packet payloads, and micro-edge device bursts
 * using LZW algorithm with UTF-8 byte stream fidelity and Unicode resilience.
 */

export class SmartIotNexusCompressionEngine {
  constructor() {
    this.name = 'SmartIotNexusCompressionEngine';
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
   * Computes IoT payload compression ratio, edge transmission savings percentage, and transfer savings.
   */
  computeSavingsRatio(originalText, compressedCodes) {
    const rawByteLength = typeof originalText === 'string' ? new TextEncoder().encode(originalText).length : 0;
    // Each LZW code stored as 16-bit (2 bytes) integer
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

// Browser DOM initializer for interactive IoT compression workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new SmartIotNexusCompressionEngine();

    const textInput = document.getElementById('iot-input');
    const compressBtn = document.getElementById('compress-btn');
    const decompressBtn = document.getElementById('decompress-btn');
    const rawBytesElem = document.getElementById('raw-bytes');
    const compBytesElem = document.getElementById('compressed-bytes');
    const savingsElem = document.getElementById('savings-percent');
    const ratioElem = document.getElementById('compression-ratio');
    const bytecodeView = document.getElementById('bytecode-display');
    const decompressedView = document.getElementById('decompressed-display');

    let currentCodes = [];

    function runCompression() {
      const text = textInput ? textInput.value : '';
      currentCodes = engine.compressLZW(text);

      const stats = engine.computeSavingsRatio(text, currentCodes);

      if (rawBytesElem) rawBytesElem.textContent = `${stats.rawByteLength} B`;
      if (compBytesElem) compBytesElem.textContent = `${stats.compressedByteLength} B`;
      if (savingsElem) savingsElem.textContent = `${stats.savingsPercent}%`;
      if (ratioElem) ratioElem.textContent = `${stats.ratio}`;

      if (bytecodeView) {
        bytecodeView.textContent = currentCodes.length > 0 ? `[${currentCodes.join(', ')}]` : '(empty)';
      }
    }

    function runDecompression() {
      if (!currentCodes || currentCodes.length === 0) {
        if (decompressedView) decompressedView.textContent = '(No bytecode available to decompress)';
        return;
      }
      const restored = engine.decompressLZW(currentCodes);
      if (decompressedView) {
        decompressedView.textContent = restored;
      }
    }

    if (compressBtn) {
      compressBtn.addEventListener('click', runCompression);
    }

    if (decompressBtn) {
      decompressBtn.addEventListener('click', runDecompression);
    }

    if (textInput && textInput.value) {
      runCompression();
    }
  });
}
