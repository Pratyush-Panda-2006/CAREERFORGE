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

// Browser DOM initializer for interactive Podcast Audio Stream compression workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new PodcastAudioStreamCompressionEngine();

    const inputArea = document.getElementById('podcast-input');
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

    const SAMPLE_PODCAST_FEED = JSON.stringify({
      podcastSeries: "The Synthesized Mind: Audio & Machine Intelligence",
      episodeNumber: 88,
      episodeTitle: "Conversations with Autonomous Code Agents",
      host: "Jordan Brooks & Dr. Maya Lin",
      publishedAt: "2026-11-21T14:30:00.000Z",
      chapters: [
        { startTime: "00:00:00", title: "Intro & Cold Open", url: "https://podcast.fm/ep88#intro" },
        { startTime: "00:04:15", title: "Deep Dive: Procedural Audio in the Browser", url: "https://podcast.fm/ep88#audio" },
        { startTime: "00:24:50", title: "Finite State Machine Workflows", url: "https://podcast.fm/ep88#fsm" },
        { startTime: "00:48:10", title: "Q&A with Global Listeners & Outro", url: "https://podcast.fm/ep88#outro" }
      ],
      rssAudioEnclosure: {
        url: "https://cdn.podcast.fm/episodes/ep88-master-stereo-320k.mp3",
        byteLength: 98452140,
        type: "audio/mpeg"
      },
      durationSeconds: 3240
    }, null, 2);

    if (loadSampleBtn && inputArea) {
      loadSampleBtn.addEventListener('click', () => {
        inputArea.value = SAMPLE_PODCAST_FEED;
      });
    }

    if (clearBtn && inputArea) {
      clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        currentCodes = [];
        if (bytecodeView) bytecodeView.textContent = 'Waiting for podcast metadata payload input...';
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
        a.download = 'podcast_episode_feed.lzw.bin';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
}
