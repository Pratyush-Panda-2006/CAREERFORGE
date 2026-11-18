import test from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceFilterEngine, SAMPLE_NEUROTECH_DATA } from './search-filter.js';

test('NeurotechInterfaceFilterEngine - case-insensitive keyword search', () => {
  const engine = new NeurotechInterfaceFilterEngine(SAMPLE_NEUROTECH_DATA);
  const motor = engine.filterByKeyword('motor');
  assert.equal(motor.length, 1);
  assert.equal(motor[0].channel, 'C3');

  const upperQuery = engine.filterByKeyword('OCCIPITAL');
  assert.equal(upperQuery.length, 1);
  assert.equal(upperQuery[0].name, 'Ch 3 - Occipital Vision O1');
});

test('NeurotechInterfaceFilterEngine - compound tag filtering', () => {
  const engine = new NeurotechInterfaceFilterEngine(SAMPLE_NEUROTECH_DATA);
  engine.toggleTag('active');
  let activeChannels = engine.getFilteredAndSorted();
  assert.equal(activeChannels.length, 4);

  engine.toggleTag('high-snr');
  let activeAndHighSnr = engine.getFilteredAndSorted();
  assert.equal(activeAndHighSnr.length, 1);
  assert.equal(activeAndHighSnr[0].channel, 'C3');

  // Untoggle
  engine.toggleTag('high-snr');
  assert.equal(engine.getFilteredAndSorted().length, 4);
});

test('NeurotechInterfaceFilterEngine - multi-column ascending/descending sorting precision', () => {
  const engine = new NeurotechInterfaceFilterEngine(SAMPLE_NEUROTECH_DATA);

  // SNR ascending
  engine.sort('snrDb', 'asc');
  let sortedSnrAsc = engine.getFilteredAndSorted();
  assert.equal(sortedSnrAsc[0].snrDb, 9.8);
  assert.equal(sortedSnrAsc[sortedSnrAsc.length - 1].snrDb, 28.5);

  // SNR descending
  engine.sort('snrDb', 'desc');
  let sortedSnrDesc = engine.getFilteredAndSorted();
  assert.equal(sortedSnrDesc[0].snrDb, 28.5);
  assert.equal(sortedSnrDesc[sortedSnrDesc.length - 1].snrDb, 9.8);

  // Region alphabetical
  engine.sort('region', 'asc');
  let sortedRegionAsc = engine.getFilteredAndSorted();
  assert.equal(sortedRegionAsc[0].region, 'Motor Cortex');
});

test('NeurotechInterfaceFilterEngine - combined search, tag, and sort', () => {
  const engine = new NeurotechInterfaceFilterEngine(SAMPLE_NEUROTECH_DATA);
  engine.filterByKeyword('Ch');
  engine.toggleTag('active');
  engine.sort('snrDb', 'desc');

  const results = engine.getFilteredAndSorted();
  assert.ok(results.length > 0);
  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i].snrDb >= results[i + 1].snrDb);
  }
});

test('NeurotechInterfaceFilterEngine - reset filters restores complete dataset', () => {
  const engine = new NeurotechInterfaceFilterEngine(SAMPLE_NEUROTECH_DATA);
  engine.filterByKeyword('nonexistent-electrode');
  assert.equal(engine.getFilteredAndSorted().length, 0);

  engine.resetFilters();
  assert.equal(engine.getFilteredAndSorted().length, SAMPLE_NEUROTECH_DATA.length);
});
