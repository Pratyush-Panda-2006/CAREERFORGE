import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSpatialAudioGain } from './script.js';

test('Spatial audio gain drops to zero at max distance', () => {
  const gain = calculateSpatialAudioGain({ x: 0, y: 0 }, { x: 50, y: 0 }, 50);
  assert.equal(gain, 0);
});