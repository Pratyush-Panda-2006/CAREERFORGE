import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingFilterEngine, SAMPLE_AGRITECH_DATA } from './search-filter.js';

test('AgritechPrecisionFarmingFilterEngine - case-insensitive keyword search', () => {
  const engine = new AgritechPrecisionFarmingFilterEngine(SAMPLE_AGRITECH_DATA);
  const apples = engine.filterByKeyword('apples');
  assert.equal(apples.length, 1);
  assert.equal(apples[0].crop, 'Apples');

  const upperQuery = engine.filterByKeyword('HYDROPONIC');
  assert.equal(upperQuery.length, 1);
  assert.equal(upperQuery[0].name, 'Zone Beta - Hydroponic Greens');
});

test('AgritechPrecisionFarmingFilterEngine - compound tag filtering', () => {
  const engine = new AgritechPrecisionFarmingFilterEngine(SAMPLE_AGRITECH_DATA);
  engine.toggleTag('field');
  let fieldItems = engine.getFilteredAndSorted();
  assert.equal(fieldItems.length, 3); // Gamma, Delta, Zeta

  engine.toggleTag('critical');
  let fieldAndCritical = engine.getFilteredAndSorted();
  assert.equal(fieldAndCritical.length, 1);
  assert.equal(fieldAndCritical[0].name, 'Zone Zeta - Automated Irrigation Hub');

  // Untoggle tag
  engine.toggleTag('critical');
  assert.equal(engine.getFilteredAndSorted().length, 3);
});

test('AgritechPrecisionFarmingFilterEngine - multi-column ascending/descending sorting precision', () => {
  const engine = new AgritechPrecisionFarmingFilterEngine(SAMPLE_AGRITECH_DATA);

  // Numeric ascending sort by moisture
  engine.sort('moisture', 'asc');
  let sortedMoistureAsc = engine.getFilteredAndSorted();
  assert.equal(sortedMoistureAsc[0].moisture, 18);
  assert.equal(sortedMoistureAsc[sortedMoistureAsc.length - 1].moisture, 78);

  // Numeric descending sort by moisture
  engine.sort('moisture', 'desc');
  let sortedMoistureDesc = engine.getFilteredAndSorted();
  assert.equal(sortedMoistureDesc[0].moisture, 78);
  assert.equal(sortedMoistureDesc[sortedMoistureDesc.length - 1].moisture, 18);

  // Alphabetical sort by crop
  engine.sort('crop', 'asc');
  let sortedCropAsc = engine.getFilteredAndSorted();
  assert.equal(sortedCropAsc[0].crop, 'Apples');
  assert.equal(sortedCropAsc[sortedCropAsc.length - 1].crop, 'Wheat');
});

test('AgritechPrecisionFarmingFilterEngine - combined search, tag, and sort', () => {
  const engine = new AgritechPrecisionFarmingFilterEngine(SAMPLE_AGRITECH_DATA);
  engine.filterByKeyword('zone');
  engine.toggleTag('active');
  engine.sort('ph', 'desc');

  const results = engine.getFilteredAndSorted();
  assert.ok(results.length > 0);
  for (let i = 0; i < results.length - 1; i++) {
    assert.ok(results[i].ph >= results[i + 1].ph);
  }
});

test('AgritechPrecisionFarmingFilterEngine - reset filters restores complete dataset', () => {
  const engine = new AgritechPrecisionFarmingFilterEngine(SAMPLE_AGRITECH_DATA);
  engine.filterByKeyword('nonexistent-seed');
  assert.equal(engine.getFilteredAndSorted().length, 0);

  engine.resetFilters();
  assert.equal(engine.getFilteredAndSorted().length, SAMPLE_AGRITECH_DATA.length);
});
