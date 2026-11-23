/**
 * Weather Radar Atlas - Probabilistic Bloom Filter & Membership Query Visualizer
 */

export class WeatherRadarAtlasBloomFilter {
  constructor(size = 64) {
    this.size = size;
    this.bitArray = new Array(this.size).fill(0);
  }

  hash1(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % this.size;
    }
    return Math.abs(hash);
  }

  hash2(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 17 + str.charCodeAt(i)) % this.size;
    }
    return Math.abs(hash);
  }

  add(item) {
    const h1 = this.hash1(item);
    const h2 = this.hash2(item);
    this.bitArray[h1] = 1;
    this.bitArray[h2] = 1;
  }

  test(item) {
    const h1 = this.hash1(item);
    const h2 = this.hash2(item);
    return this.bitArray[h1] === 1 && this.bitArray[h2] === 1;
  }

  getFillRatio() {
    const ones = this.bitArray.filter(b => b === 1).length;
    return Number((ones / this.size).toFixed(3));
  }
}
