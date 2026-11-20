/**
 * Quantum Forge - Client-Side LZW Data Compression & Circuit Shrinkage Engine
 * Compresses OpenQASM 3.0 circuits, quantum gate matrices, and statevector telemetry
 * using LZW algorithm with UTF-8 byte stream fidelity and Unicode resilience.
 */

export class QuantumForgeCompressionEngine {
  constructor() {
    this.name = 'QuantumForgeCompressionEngine';
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

// Browser DOM initializer for interactive Quantum compression workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new QuantumForgeCompressionEngine();

    const inputArea = document.getElementById('quantum-input');
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

    const SAMPLE_QASM = `OPENQASM 3.0;
include "stdgates.inc";
qubit[8] q;
bit[8] c;
h q[0];
cx q[0], q[1];
cx q[1], q[2];
cx q[2], q[3];
rz(pi / 4) q[3];
cx q[3], q[4];
cx q[4], q[5];
cx q[5], q[6];
cx q[6], q[7];
c = measure q;`;

    if (loadSampleBtn && inputArea) {
      loadSampleBtn.addEventListener('click', () => {
        inputArea.value = SAMPLE_QASM;
      });
    }

    if (clearBtn && inputArea) {
      clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        currentCodes = [];
        if (bytecodeView) bytecodeView.textContent = 'Waiting for quantum circuit input...';
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
        a.download = 'quantum_circuit.lzw.bin';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
}
