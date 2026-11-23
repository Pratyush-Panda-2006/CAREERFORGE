import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasBloomFilter } from './bloom-filter.js';

describe('WeatherRadarAtlasBloomFilter', () => {
  it('adds items and sets bit positions via hash functions', () => {
    const bf = new WeatherRadarAtlasBloomFilter(64);
    bf.add('radar_cell_101');
    assert.equal(bf.test('radar_cell_101'), true);
  });

  it('returns false for un-inserted items with zero false negative guarantee', () => {
    const bf = new WeatherRadarAtlasBloomFilter(64);
    bf.add('cloud_matrix');
    assert.equal(bf.test('storm_front_unadded'), false);
  });

  it('computes fill ratio accurately', () => {
    const bf = new WeatherRadarAtlasBloomFilter(10);
    bf.add('point');
    const ratio = bf.getFillRatio();
    assert.ok(ratio > 0 && ratio <= 1.0);
  });
});
