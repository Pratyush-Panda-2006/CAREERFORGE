const LIMIT = 262144;
const DICTIONARY_LIMIT = 65536;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function utf8(text) {
  if (typeof text !== "string") throw new TypeError("Enter text to compress.");
  const bytes = encoder.encode(text);
  if (bytes.length > LIMIT)
    throw new RangeError("Use at most 256 KiB of UTF-8 text.");
  if (decoder.decode(bytes) !== text)
    throw new TypeError("Text contains an unpaired Unicode surrogate.");
  return bytes;
}

function validCodes(codes) {
  if (
    (!Array.isArray(codes) && !(codes instanceof Uint16Array)) ||
    codes.length > LIMIT
  ) {
    throw new TypeError(
      "Use an array of at most 262,144 unsigned 16-bit codes.",
    );
  }
  for (const code of codes) {
    if (!Number.isInteger(code) || code < 0 || code >= DICTIONARY_LIMIT)
      throw new TypeError("Invalid LZW code.");
  }
}

export class AgritechPrecisionFarmingCompressionEngine {
  compressLZW(text) {
    const bytes = utf8(text);
    if (!bytes.length) return [];
    const dictionary = new Map(
      Array.from({ length: 256 }, (_, i) => [String.fromCharCode(i), i]),
    );
    let next = 256;
    let phrase = "";
    const codes = [];
    for (const byte of bytes) {
      const character = String.fromCharCode(byte);
      const candidate = phrase + character;
      if (dictionary.has(candidate)) phrase = candidate;
      else {
        codes.push(dictionary.get(phrase));
        if (next < DICTIONARY_LIMIT) dictionary.set(candidate, next++);
        phrase = character;
      }
    }
    codes.push(dictionary.get(phrase));
    return codes;
  }

  decompressLZW(codes) {
    validCodes(codes);
    if (!codes.length) return "";
    if (codes[0] >= 256)
      throw new TypeError("The first code must be a literal byte.");
    const dictionary = Array.from({ length: 256 }, (_, i) =>
      String.fromCharCode(i),
    );
    let next = 256;
    let previous = dictionary[codes[0]];
    let length = previous.length;
    const chunks = [previous];
    for (let i = 1; i < codes.length; i++) {
      const code = codes[i];
      const phrase =
        dictionary[code] ??
        (code === next && next < DICTIONARY_LIMIT
          ? previous + previous[0]
          : null);
      if (phrase === null)
        throw new TypeError("Code references an undefined dictionary entry.");
      length += phrase.length;
      if (length > LIMIT)
        throw new RangeError("Decoded output exceeds 256 KiB.");
      chunks.push(phrase);
      if (next < DICTIONARY_LIMIT) dictionary[next++] = previous + phrase[0];
      previous = phrase;
    }
    const bytes = Uint8Array.from(chunks.join(""), (char) =>
      char.charCodeAt(0),
    );
    return decoder.decode(bytes);
  }

  toBinary(text, codes = this.compressLZW(text)) {
    const bytes = utf8(text);
    if (this.decompressLZW(codes) !== text)
      throw new TypeError("Codes do not match the input text.");
    const binary = new Uint8Array(8 + codes.length * 2);
    binary.set([76, 90, 87, 49]); // LZW1: UTF-8 length followed by little-endian uint16 codes.
    const view = new DataView(binary.buffer);
    view.setUint32(4, bytes.length, true);
    codes.forEach((code, i) => view.setUint16(8 + i * 2, code, true));
    return binary;
  }

  computeSavingsRatio(text, codes = this.compressLZW(text)) {
    const originalBytes = utf8(text).length;
    const packedBytes = this.toBinary(text, codes).length;
    return originalBytes ? (originalBytes - packedBytes) / originalBytes : 0;
  }
}

if (typeof document !== "undefined") {
  const engine = new AgritechPrecisionFarmingCompressionEngine();
  const form = document.querySelector("#compression-form");
  const input = document.querySelector("#raw-text");
  const status = document.querySelector("#compression-status");
  const download = document.querySelector("#download-binary");
  let packed = null;
  let rawBytes = 0;
  const latency = () => {
    const mbps = Number(document.querySelector("#bandwidth").value);
    if (!(mbps > 0) || !Number.isFinite(mbps) || !packed) return;
    document.querySelector("#raw-time").textContent =
      `${((rawBytes * 8) / mbps / 1000).toFixed(3)} ms`;
    document.querySelector("#packed-time").textContent =
      `${((packed.length * 8) / mbps / 1000).toFixed(3)} ms`;
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      packed = null;
      download.disabled = true;
      const text = input.value;
      const start = performance.now();
      const codes = engine.compressLZW(text);
      packed = engine.toBinary(text, codes);
      rawBytes = utf8(text).length;
      const saved = engine.computeSavingsRatio(text, codes);
      document.querySelector("#raw-bytes").textContent =
        `${rawBytes.toLocaleString()} B`;
      document.querySelector("#packed-bytes").textContent =
        `${packed.length.toLocaleString()} B`;
      document.querySelector("#savings").textContent =
        rawBytes === 0
          ? "Empty input"
          : `${Math.abs(saved * 100).toFixed(1)}% ${saved >= 0 ? "smaller" : "larger"}`;
      document.querySelector("#savings-meter").value = Math.max(0, saved * 100);
      document.querySelector("#codes").value =
        codes
          .slice(0, 128)
          .map((code) => code.toString(16).padStart(4, "0"))
          .join(" ") || "(no codes)";
      document.querySelector("#code-count").textContent =
        `${codes.length.toLocaleString()} codes · first 128 shown`;
      status.textContent = `Lossless round trip verified. ${(performance.now() - start).toFixed(1)} ms local processing.`;
      download.disabled = false;
      latency();
    } catch (error) {
      packed = null;
      download.disabled = true;
      status.textContent = error.message;
    }
  });
  input.addEventListener("input", () => {
    packed = null;
    download.disabled = true;
    status.textContent = "Input changed. Analyze again before downloading.";
  });
  document.querySelector("#bandwidth").addEventListener("input", latency);
  download.addEventListener("click", () => {
    if (!packed) return;
    const url = URL.createObjectURL(
      new Blob([packed], { type: "application/octet-stream" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "farm-payload.lzw";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
