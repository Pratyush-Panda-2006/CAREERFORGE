/**
 * Podcast Audio Stream - Client-Side LZW Data Compression & Feed Shrinkage Engine
 * Compresses podcast RSS show notes, ID3 chapters, and speech transcripts using LZW dictionary encoding
 * with UTF-8 byte stream fidelity and Unicode resilience.
 */

export class PodcastAudioStreamCompressionEngine {
  constructor() {
    this.name = 'PodcastAudioStreamCompressionEngine';
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
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return '';
    }

    const dict = new Map();
    for (let i = 0; i < 256; i++) {
      dict.set(i, String.fromCharCode(i));
    }

    let codeIndex = 256;
    let oldCode = codes[0];
    if (!dict.has(oldCode)) {
      throw new Error(`Invalid initial code in LZW stream: ${oldCode}`);
    }

    let phrase = dict.get(oldCode);
    const decodedChars = [phrase];

    for (let i = 1; i < codes.length; i++) {
      const code = codes[i];
      let entry = '';

      if (dict.has(code)) {
        entry = dict.get(code);
      } else if (code === codeIndex) {
        entry = phrase + phrase.charAt(0);
      } else {
        throw new Error(`Corrupted LZW stream: invalid dictionary reference ${code}`);
      }

      decodedChars.push(entry);
      dict.set(codeIndex++, phrase + entry.charAt(0));
      phrase = entry;
    }

    const byteStr = decodedChars.join('');
    const rawBytes = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) {
      rawBytes[i] = byteStr.charCodeAt(i);
    }

    return new TextDecoder().decode(rawBytes);
  }

  /**
   * Computes payload footprint shrinkage metrics between raw string and LZW codes.
   * @param {string} rawText - Uncompressed text
   * @param {number[]} compressedCodes - LZW output tokens
   * @returns {{ rawBytes: number, compressedBytes: number, savingsPercent: number, compressionRatio: number }}
   */
  computeSavingsRatio(rawText, compressedCodes) {
    const rawBytes = rawText ? new TextEncoder().encode(String(rawText)).length : 0;
    // Each LZW code is stored as 2 bytes (16-bit integer)
    const compressedBytes = compressedCodes && Array.isArray(compressedCodes) ? compressedCodes.length * 2 : 0;

    if (rawBytes === 0) {
      return {
        rawBytes: 0,
        compressedBytes: 0,
        savingsPercent: 0,
        compressionRatio: 1
      };
    }

    const savingsPercent = Math.max(0, parseFloat((((rawBytes - compressedBytes) / rawBytes) * 100).toFixed(2)));
    const compressionRatio = compressedBytes > 0 ? parseFloat((rawBytes / compressedBytes).toFixed(3)) : 1;

    return {
      rawBytes,
      compressedBytes,
      savingsPercent,
      compressionRatio
    };
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new PodcastAudioStreamCompressionEngine();
    const inputArea = document.getElementById('podcast-input');
    const compressBtn = document.getElementById('compress-btn');
    const clearBtn = document.getElementById('clear-btn');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const decompressBtn = document.getElementById('decompress-btn');
    const downloadBtn = document.getElementById('download-btn');
    const bytecodeDisplay = document.getElementById('bytecode-display');
    const decompressedDisplay = document.getElementById('decompressed-display');

    const rawBytesEl = document.getElementById('raw-bytes');
    const compressedBytesEl = document.getElementById('compressed-bytes');
    const savingsPercentEl = document.getElementById('savings-percent');
    const compressionRatioEl = document.getElementById('compression-ratio');

    let currentCodes = [];

    const sampleEpisodeXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Tech Horizons Weekly Podcast</title>
    <item>
      <title>Episode 104: Future of Decentralized Media & AI Voice Synthesis</title>
      <description>Exploring next-gen audio compression, dynamic bitrate transcoding, and automated neural voice dubbing.</description>
      <itunes:duration>00:45:12</itunes:duration>
      <chapters>
        <chapter start="00:00:00" title="Intro & Weekly Rundown" />
        <chapter start="00:08:30" title="Neural Codecs & DSP Acceleration" />
        <chapter start="00:22:15" title="Decentralized Audio Distribution Networks" />
        <chapter start="00:38:00" title="Audience Q&amp;A and Wrap-up" />
      </chapters>
    </item>
  </channel>
</rss>`;

    function updateMetrics(rawText, codes) {
      const metrics = engine.computeSavingsRatio(rawText, codes);
      if (rawBytesEl) rawBytesEl.textContent = `${metrics.rawBytes.toLocaleString()} B`;
      if (compressedBytesEl) compressedBytesEl.textContent = `${metrics.compressedBytes.toLocaleString()} B`;
      if (savingsPercentEl) savingsPercentEl.textContent = `${metrics.savingsPercent}%`;
      if (compressionRatioEl) compressionRatioEl.textContent = `${metrics.compressionRatio}x`;
    }

    function runCompression() {
      const text = inputArea ? inputArea.value : '';
      if (!text || text.trim() === '') {
        currentCodes = [];
        if (bytecodeDisplay) bytecodeDisplay.textContent = 'Waiting for podcast metadata payload input...';
        updateMetrics('', []);
        return;
      }

      currentCodes = engine.compressLZW(text);
      updateMetrics(text, currentCodes);

      if (bytecodeDisplay) {
        bytecodeDisplay.textContent = currentCodes.map((c) => `0x${c.toString(16).padStart(4, '0').toUpperCase()}`).join(' ');
      }
      if (decompressedDisplay) {
        decompressedDisplay.style.display = 'none';
      }
    }

    if (compressBtn) compressBtn.addEventListener('click', runCompression);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (inputArea) inputArea.value = '';
        currentCodes = [];
        if (bytecodeDisplay) bytecodeDisplay.textContent = 'Waiting for podcast metadata payload input...';
        if (decompressedDisplay) decompressedDisplay.style.display = 'none';
        updateMetrics('', []);
      });
    }

    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        if (inputArea) {
          inputArea.value = sampleEpisodeXml;
          runCompression();
        }
      });
    }

    if (decompressBtn) {
      decompressBtn.addEventListener('click', () => {
        if (currentCodes.length === 0) return;
        const restored = engine.decompressLZW(currentCodes);
        if (decompressedDisplay) {
          decompressedDisplay.style.display = 'block';
          decompressedDisplay.textContent = `[Restored Payload Match: ${restored === (inputArea ? inputArea.value : '') ? 'PERFECT' : 'MISMATCH'}]\n\n${restored}`;
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (currentCodes.length === 0) return;
        const u16 = new Uint16Array(currentCodes);
        const blob = new Blob([u16.buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'podcast-feed-payload.lzw';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
}
