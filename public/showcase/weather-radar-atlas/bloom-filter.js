/**
 * ATLAS-METEO — Probabilistic Bloom Filter & Membership Query Engine
 * Weather Radar Atlas: maps string hashes onto a fixed-size bit array,
 * computes theoretical false-positive rates, and highlights hash collisions.
 */

const encoder = new TextEncoder();

export const BLOOM_DEFAULT_BIT_SIZE = 256;
export const BLOOM_DEFAULT_HASH_COUNT = 4;
export const BLOOM_BIT_SIZE_MIN = 64;
export const BLOOM_BIT_SIZE_MAX = 4096;
export const BLOOM_HASH_COUNT_MIN = 1;
export const BLOOM_HASH_COUNT_MAX = 8;
export const BLOOM_MAX_INSERTIONS = 10000;
export const BLOOM_MAX_UTF8_BYTES = 256;

export class WeatherRadarAtlasBloomFilter {
  #bits;
  #insertions = 0;

  constructor(bitSize = BLOOM_DEFAULT_BIT_SIZE, hashCount = BLOOM_DEFAULT_HASH_COUNT) {
    if (!Number.isInteger(bitSize) || bitSize < BLOOM_BIT_SIZE_MIN || bitSize > BLOOM_BIT_SIZE_MAX || (bitSize & (bitSize - 1))) {
      throw new RangeError(`Use a power-of-two bit size from ${BLOOM_BIT_SIZE_MIN} to ${BLOOM_BIT_SIZE_MAX}.`);
    }
    if (!Number.isInteger(hashCount) || hashCount < BLOOM_HASH_COUNT_MIN || hashCount > BLOOM_HASH_COUNT_MAX) {
      throw new RangeError(`Use ${BLOOM_HASH_COUNT_MIN} to ${BLOOM_HASH_COUNT_MAX} hashes.`);
    }
    this.bitSize = bitSize;
    this.hashCount = hashCount;
    Object.defineProperties(this, {
      bitSize: { writable: false, configurable: false },
      hashCount: { writable: false, configurable: false },
    });
    this.#bits = new Uint8Array(bitSize / 8);
  }

  positions(item) {
    if (typeof item !== 'string' || item.length === 0) throw new TypeError('Enter a non-empty string.');
    const bytes = encoder.encode(item);
    if (bytes.length > BLOOM_MAX_UTF8_BYTES) throw new RangeError(`Use at most ${BLOOM_MAX_UTF8_BYTES} UTF-8 bytes.`);

    let first = 2166136261;
    let second = 3339675911;
    for (const byte of bytes) {
      first = Math.imul(first ^ byte, 16777619) >>> 0;
      second = Math.imul(second ^ byte, 2246822507) >>> 0;
    }

    const mix = (value) => {
      value ^= value >>> 16;
      value = Math.imul(value, 2246822507);
      value ^= value >>> 13;
      value = Math.imul(value, 3266489909);
      return (value ^ (value >>> 16)) >>> 0;
    };

    first = mix(first);
    second = mix(second);
    // An odd step visits distinct positions in a power-of-two bit array.
    second = (second | 1) >>> 0;

    return Array.from({ length: this.hashCount }, (_, i) => (first + i * second) & (this.bitSize - 1));
  }

  insert(item) {
    const positions = this.positions(item);
    if (this.#insertions >= BLOOM_MAX_INSERTIONS) throw new RangeError(`Reset after ${BLOOM_MAX_INSERTIONS} insertions.`);

    const collisions = positions.filter((bit) => this.#bits[bit >> 3] & (1 << (bit & 7)));
    for (const bit of positions) this.#bits[bit >> 3] |= 1 << (bit & 7);
    this.#insertions++;
    return { positions, collisions };
  }

  contains(item) {
    return this.positions(item).every((bit) => this.#bits[bit >> 3] & (1 << (bit & 7)));
  }

  calculateFalsePositiveRate() {
    return (1 - Math.exp(-this.hashCount * this.#insertions / this.bitSize)) ** this.hashCount;
  }

  snapshot() {
    const bits = Array.from({ length: this.bitSize }, (_, bit) => Number(Boolean(this.#bits[bit >> 3] & (1 << (bit & 7)))));
    return {
      bitSize: this.bitSize,
      hashCount: this.hashCount,
      insertions: this.#insertions,
      bits,
      setBits: bits.reduce((sum, bit) => sum + bit, 0),
    };
  }
}

function mount() {
  const root = document.querySelector('[data-bloom-lab]');
  if (!root) return;
  const get = (id) => root.querySelector(`#${id}`);

  let filter = new WeatherRadarAtlasBloomFilter();
  // Separate demo oracle explains false positives; the filter stores bits only.
  const inserted = new Set();

  function status(message, error = false) {
    get('status').setAttribute('role', error ? 'alert' : 'status');
    get('status').textContent = message;
  }

  function render(positions = [], collisions = []) {
    const snapshot = filter.snapshot();
    get('insertions').textContent = String(snapshot.insertions);
    get('set-bits').textContent = `${snapshot.setBits} / ${snapshot.bitSize}`;
    get('probability').textContent = `${(filter.calculateFalsePositiveRate() * 100).toFixed(2)}%`;
    get('positions').textContent = positions.length ? positions.join(', ') : 'None selected';
    get('collisions').textContent = String(collisions.length);

    const cells = snapshot.bits.map((value, bit) => {
      const cell = document.createElement('span');
      cell.textContent = String(value);
      cell.dataset.bit = String(bit);
      cell.className = [
        value ? 'set' : '',
        positions.includes(bit) ? 'selected' : '',
        collisions.includes(bit) ? 'collision' : '',
      ].join(' ');
      cell.title = `Bit ${bit}: ${value}`;
      return cell;
    });

    get('grid').replaceChildren(...cells);
    get('grid').setAttribute('aria-label', `${snapshot.setBits} of ${snapshot.bitSize} bits set. Selected positions: ${positions.join(', ') || 'none'}.`);
  }

  get('insert-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const item = get('item').value;
      const result = filter.insert(item);
      inserted.add(item);
      render(result.positions, result.collisions);
      status(`Inserted ${JSON.stringify(item)}. ${result.collisions.length} addressed positions were already set.`);
    } catch (error) {
      status(`${error.message} The filter is unchanged.`, true);
    }
  });

  get('probe-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const item = get('probe').value;
      const present = filter.contains(item);
      render(filter.positions(item));
      get('verdict').textContent = !present
        ? 'Definitely absent'
        : inserted.has(item)
          ? 'Possibly present - also in the demo insertion list'
          : 'False positive - possibly present, but absent from the demo insertion list';
      status('Probe complete. Probing never changes the filter.');
    } catch (error) {
      status(`${error.message} The last result and filter are retained.`, true);
    }
  });

  get('sample').addEventListener('click', () => {
    try {
      let result;
      for (let i = 0; i < 32; i++) {
        const item = `storm-cell-${i}`;
        result = filter.insert(item);
        inserted.add(item);
      }
      render(result.positions, result.collisions);
      status('Inserted storm-cell-0 through storm-cell-31.');
    } catch (error) {
      status(error.message, true);
      render();
    }
  });

  get('reset').addEventListener('click', () => {
    filter = new WeatherRadarAtlasBloomFilter();
    inserted.clear();
    get('verdict').textContent = 'No probe yet';
    render();
    status('Filter and demo insertion list reset.');
  });

  render();
}

if (typeof document !== 'undefined') mount();
