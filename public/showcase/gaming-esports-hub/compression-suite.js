const MAX_BYTES = 256 * 1024;
const HEADER_BYTES = 12;
const MAGIC = 0x4c5a5731; // LZW1: UTF-8, unsigned 16-bit big-endian codes, frozen full dictionary.
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function encodeText(text) {
  if (typeof text !== 'string') throw new TypeError('Enter text to compress.');
  if (text.length > MAX_BYTES) throw new RangeError('Text must fit within 256 KiB of UTF-8.');
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = text.charCodeAt(++i);
      if (!(low >= 0xdc00 && low <= 0xdfff)) throw new TypeError('Text contains an unpaired Unicode surrogate.');
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError('Text contains an unpaired Unicode surrogate.');
    }
  }
  const bytes = encoder.encode(text);
  if (bytes.length > MAX_BYTES) throw new RangeError('Text must fit within 256 KiB of UTF-8.');
  return bytes;
}

export class GamingEsportsHubCompressionEngine {
  #last = null;

  compressLZW(text) {
    const bytes = encodeText(text);
    const dictionary = new Map(Array.from({ length: 256 }, (_, i) => [String.fromCharCode(i), i]));
    const codes = [];
    let word = '';
    let next = 256;
    for (const byte of bytes) {
      const char = String.fromCharCode(byte);
      const joined = word + char;
      if (dictionary.has(joined)) word = joined;
      else {
        codes.push(dictionary.get(word));
        if (next < 65536) dictionary.set(joined, next++);
        word = char;
      }
    }
    if (word) codes.push(dictionary.get(word));
    this.#last = { originalBytes: bytes.length, codes: codes.slice() };
    return codes;
  }

  decompressLZW(codes) {
    if (!(Array.isArray(codes) || codes instanceof Uint16Array)) throw new TypeError('Codes must be an array of unsigned 16-bit integers.');
    if (codes.length > MAX_BYTES) throw new RangeError('Too many codes.');
    for (const code of codes) if (!Number.isInteger(code) || code < 0 || code > 65535) throw new TypeError('Invalid 16-bit code.');
    if (!codes.length) return '';
    if (codes[0] > 255) throw new TypeError('The first code must be a byte.');
    const dictionary = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i));
    let previous = dictionary[codes[0]];
    const chunks = [previous];
    let size = previous.length;
    let next = 256;
    for (let i = 1; i < codes.length; i++) {
      const code = codes[i];
      const entry = dictionary[code] ?? (code === next && next < 65536 ? previous + previous[0] : undefined);
      if (entry === undefined) throw new TypeError('Code references a dictionary entry that does not exist.');
      size += entry.length;
      if (size > MAX_BYTES) throw new RangeError('Decoded text exceeds 256 KiB.');
      chunks.push(entry);
      if (next < 65536) dictionary[next++] = previous + entry[0];
      previous = entry;
    }
    const binary = chunks.join('');
    try { return decoder.decode(Uint8Array.from(binary, char => char.charCodeAt(0))); }
    catch { throw new TypeError('Codes do not decode to valid UTF-8.'); }
  }

  computeSavingsRatio() {
    if (!this.#last?.originalBytes) return 0;
    return 1 - (HEADER_BYTES + this.#last.codes.length * 2) / this.#last.originalBytes;
  }

  getMetrics(mbps = 1) {
    if (!this.#last) throw new Error('Analyze text first.');
    if (typeof mbps !== 'number' || !Number.isFinite(mbps) || mbps < 0.01 || mbps > 10000) throw new RangeError('Bandwidth must be between 0.01 and 10,000 Mbps.');
    const originalBytes = this.#last.originalBytes;
    const packedBytes = HEADER_BYTES + this.#last.codes.length * 2;
    return { originalBytes, packedBytes, codeCount: this.#last.codes.length, savingsRatio: this.computeSavingsRatio(), originalMs: originalBytes * 8 / (mbps * 1000), packedMs: packedBytes * 8 / (mbps * 1000) };
  }

  exportBinary() {
    if (!this.#last) throw new Error('Analyze text first.');
    const bytes = new Uint8Array(HEADER_BYTES + this.#last.codes.length * 2);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, MAGIC);
    view.setUint32(4, this.#last.originalBytes);
    view.setUint32(8, this.#last.codes.length);
    this.#last.codes.forEach((code, i) => view.setUint16(HEADER_BYTES + i * 2, code));
    return bytes;
  }

  decodeBinary(payload) {
    if (!(payload instanceof Uint8Array)) throw new TypeError('Binary payload must be a Uint8Array.');
    if (payload.byteLength < HEADER_BYTES || payload.byteLength > HEADER_BYTES + MAX_BYTES * 2) throw new RangeError('Invalid binary payload length.');
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    if (view.getUint32(0) !== MAGIC) throw new TypeError('Unrecognized LZW1 header.');
    const originalBytes = view.getUint32(4);
    const count = view.getUint32(8);
    if (originalBytes > MAX_BYTES || count > MAX_BYTES || payload.length !== HEADER_BYTES + count * 2) throw new RangeError('Invalid binary payload bounds.');
    const codes = Array.from({ length: count }, (_, i) => view.getUint16(HEADER_BYTES + i * 2));
    const text = this.decompressLZW(codes);
    if (encoder.encode(text).length !== originalBytes) throw new TypeError('Decoded byte length does not match the header.');
    return text;
  }
}

if (typeof document !== 'undefined') {
  const engine = new GamingEsportsHubCompressionEngine();
  const byId = id => document.getElementById(id);
  const input = byId('source');
  const download = byId('download');
  const message = byId('message');
  const sample = Array.from({ length: 18 }, (_, i) => JSON.stringify({ tick: i + 1, session: 'Vortex fictional training replay', event: 'player.position', player: 'Joueur étoile 🎮', x: i * 2, y: i, example: true })).join('\n');
  let current = false;
  const report = (text, error = false) => { message.textContent = text; message.classList.toggle('error', error); };
  const countInput = () => { byId('input-size').textContent = `${encoder.encode(input.value).length.toLocaleString()} UTF-8 bytes`; };
  function estimates() {
    const m = engine.getMetrics(byId('bandwidth').valueAsNumber);
    byId('raw-time').textContent = `${m.originalMs.toFixed(3)} ms`;
    byId('packed-time').textContent = `${m.packedMs.toFixed(3)} ms`;
    return m;
  }
  function analyze(event) {
    event?.preventDefault();
    try {
      // Validate the independent link model before replacing the last successful analysis.
      const speed = byId('bandwidth').valueAsNumber;
      if (!Number.isFinite(speed) || speed < 0.01 || speed > 10000) throw new RangeError('Bandwidth must be between 0.01 and 10,000 Mbps.');
      engine.compressLZW(input.value);
      const binary = engine.exportBinary();
      const decoded = engine.decodeBinary(binary);
      if (decoded !== input.value) throw new Error('Round-trip verification failed.');
      const m = estimates();
      byId('raw-bytes').textContent = m.originalBytes.toLocaleString();
      byId('packed-bytes').textContent = m.packedBytes.toLocaleString();
      byId('code-count').textContent = `${m.codeCount.toLocaleString()} × 2-byte codes + 12-byte header`;
      const percent = m.savingsRatio * 100;
      byId('savings').textContent = `${percent.toFixed(1)}%`;
      byId('savings-label').textContent = !m.originalBytes ? 'Empty input · header only' : percent < 0 ? 'Payload expanded' : 'Bytes saved';
      byId('saving-fill').style.width = `${Math.max(0, Math.min(100, percent))}%`;
      byId('result').classList.toggle('expanded', percent < 0);
      const lines = [];
      for (let i = 0; i < Math.min(binary.length, 256); i += 16) lines.push(`${i.toString(16).padStart(4, '0')}  ${Array.from(binary.slice(i, i + 16), b => b.toString(16).padStart(2, '0')).join(' ')}`);
      byId('hex').textContent = lines.join('\n');
      byId('hex').scrollTop = 0;
      byId('hex').scrollLeft = 0;
      byId('preview-note').textContent = `First ${Math.min(binary.length, 256)} of ${binary.length.toLocaleString()} packed bytes · hexadecimal`;
      byId('decoded').textContent = Array.from(decoded).slice(0, 4000).join('');
      byId('verification').textContent = 'Lossless round trip verified';
      byId('result').classList.remove('pulse');
      void byId('result').offsetWidth;
      byId('result').classList.add('pulse');
      current = true;
      download.disabled = false;
      report('Analysis complete. Packed size includes the header; transfer times are estimates.');
    } catch (error) {
      current = false;
      download.disabled = true;
      report(error.message, true);
    }
  }
  byId('analyzer').addEventListener('submit', analyze);
  input.addEventListener('input', () => { countInput(); current = false; download.disabled = true; byId('verification').textContent = 'Input changed · analyze again'; report('Previous results remain below. Analyze the edited text to refresh them.'); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) analyze(event); });
  byId('bandwidth').addEventListener('input', () => {
    if (!current) return;
    try { estimates(); report('Transfer estimate updated; the compressed bytes are unchanged.'); }
    catch (error) { report(error.message, true); }
  });
  byId('example').addEventListener('click', () => { input.value = sample; input.scrollTop = 0; countInput(); analyze(); });
  byId('clear').addEventListener('click', () => { input.value = ''; countInput(); analyze(); input.focus(); });
  download.addEventListener('click', () => {
    if (!current) return;
    let url;
    const link = document.createElement('a');
    try {
      url = URL.createObjectURL(new Blob([engine.exportBinary()], { type: 'application/octet-stream' }));
      link.href = url;
      link.download = 'gaming-esports-hub-payload.lzw16';
      document.body.append(link);
      link.click();
      report('Binary download started. It contains the exact verified LZW1 payload.');
    } catch { report('Download could not start. Your analysis is retained; try downloading again.', true); }
    finally { link.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  });
  input.value = sample;
  countInput();
  analyze();
}
