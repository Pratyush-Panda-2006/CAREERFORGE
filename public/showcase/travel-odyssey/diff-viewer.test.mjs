import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyDiffInspector } from './diff-viewer.js';

test('TravelOdysseyDiffInspector - computes diff on identical text', () => {
  const inspector = new TravelOdysseyDiffInspector();
  const text = 'flight: SQ22\nseat: 12A\nstatus: on-time';
  const result = inspector.computeDiff(text, text);

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.unchanged, 3);
  assert.equal(result.metrics.changePercentage, 0);
  assert.equal(result.lines.length, 3);
});

test('TravelOdysseyDiffInspector - computes additions and deletions accurately', () => {
  const inspector = new TravelOdysseyDiffInspector();
  const oldText = 'destination: Paris\ndays: 5';
  const newText = 'destination: Paris & Nice\ndays: 7\ntrain: TGV';

  const result = inspector.computeDiff(oldText, newText);

  assert.ok(result.metrics.additions >= 1);
  assert.ok(result.metrics.deletions >= 1);
  assert.ok(result.metrics.changePercentage > 0);
});

test('TravelOdysseyDiffInspector - handles empty strings gracefully', () => {
  const inspector = new TravelOdysseyDiffInspector();
  const result = inspector.computeDiff('', '');

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.changePercentage, 0);
});

test('TravelOdysseyDiffInspector - loads built-in travel presets', () => {
  const inspector = new TravelOdysseyDiffInspector();
  const keys = inspector.getPresetKeys();

  assert.ok(keys.includes('itineraryEvolution'));
  assert.ok(keys.includes('visaPolicyChange'));
  assert.ok(keys.includes('flightReschedule'));

  const itinerary = inspector.getPreset('itineraryEvolution');
  assert.ok(itinerary.left.includes('Tokyo Metro'));
  assert.ok(itinerary.right.includes('Shinkansen'));
});
