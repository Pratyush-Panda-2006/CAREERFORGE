import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterFilterEngine } from './filter-engine.js';

test('AerospaceOrbiterFilterEngine - initial execute returns full default dataset sorted by altitudeKm desc', () => {
  const engine = new AerospaceOrbiterFilterEngine();
  const results = engine.execute();

  assert.equal(results.length, 8);
  assert.equal(results[0].name, 'James Webb Space Telescope (JWST)'); // 1,500,000 km
  assert.equal(results[results.length - 1].name, 'Mars Reconnaissance Orbiter (MRO)'); // 250 km
});

test('AerospaceOrbiterFilterEngine - filterByKeyword matches spacecraft name, NORAD ID, and orbitType case-insensitively', () => {
  const engine = new AerospaceOrbiterFilterEngine();

  // Search by NORAD ID
  engine.filterByKeyword('25544');
  const issResults = engine.execute();
  assert.equal(issResults.length, 1);
  assert.equal(issResults[0].name, 'International Space Station (ISS)');

  // Search by orbitType
  engine.filterByKeyword('leo');
  const leoResults = engine.execute();
  assert.ok(leoResults.length >= 4);

  // Search by partial name
  engine.filterByKeyword('hubble');
  assert.equal(engine.execute().length, 1);
  assert.equal(engine.execute()[0].name, 'Hubble Space Telescope');
});

test('AerospaceOrbiterFilterEngine - toggleTag and compound tag filtering works accurately', () => {
  const engine = new AerospaceOrbiterFilterEngine();

  // Filter by tag 'crewed'
  engine.toggleTag('crewed');
  const crewed = engine.execute();
  assert.equal(crewed.length, 3); // ISS, Artemis Orion, Tiangong

  // Compound filter with 'scientific' (AND)
  engine.toggleTag('scientific');
  const compound = engine.execute();
  assert.equal(compound.length, 2); // ISS, Tiangong

  // Toggle off
  engine.toggleTag('crewed');
  assert.ok(engine.execute().length >= 2);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.execute().length, 8);
});

test('AerospaceOrbiterFilterEngine - multi-attribute sorting orders numeric and string fields correctly', () => {
  const engine = new AerospaceOrbiterFilterEngine();

  // Sort by velocityKmS desc (fastest orbital craft)
  engine.sort('velocityKmS', 'desc');
  const fastest = engine.execute();
  assert.equal(fastest[0].name, 'Tiangong Space Station'); // 7.68 km/s

  // Sort by velocityKmS asc
  engine.sort('velocityKmS', 'asc');
  const slowest = engine.execute();
  assert.equal(slowest[0].name, 'James Webb Space Telescope (JWST)'); // 0.22 km/s

  // Sort by name asc
  engine.sort('name', 'asc');
  const sortedName = engine.execute();
  assert.equal(sortedName[0].name, 'Artemis Orion Spacecraft');
});

test('AerospaceOrbiterFilterEngine - range filters correctly bound numeric altitudeKm and massKg', () => {
  const engine = new AerospaceOrbiterFilterEngine();

  // Altitude between 300km and 600km (LEO cluster)
  engine.setRangeFilter('altitudeKm', 300, 600);
  const leoBand = engine.execute();
  assert.ok(leoBand.length >= 4);
  for (const item of leoBand) {
    assert.ok(item.altitudeKm >= 300 && item.altitudeKm <= 600);
  }
});

test('AerospaceOrbiterFilterEngine - getAvailableTags and subscribe notifications', () => {
  const engine = new AerospaceOrbiterFilterEngine();
  const tags = engine.getAvailableTags();

  assert.ok(tags.includes('leo'));
  assert.ok(tags.includes('deep-space'));
  assert.ok(tags.includes('crewed'));

  let notified = false;
  const unsubscribe = engine.subscribe((results) => {
    notified = true;
    assert.ok(Array.isArray(results));
  });

  engine.filterByKeyword('Artemis');
  assert.equal(notified, true);
  unsubscribe();
});
