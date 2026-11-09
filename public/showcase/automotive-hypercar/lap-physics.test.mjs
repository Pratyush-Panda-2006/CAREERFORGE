import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIRCUITS, COMPOUNDS, simulateLap, sampleLap } from './lap-physics.js';

for (const track of Object.keys(CIRCUITS)) {
  for (const compound of Object.keys(COMPOUNDS)) {
    for (const condition of ['dry', 'wet']) {
      test(`${track}/${compound}/${condition}: finite telemetry, conserved distance and sector sum`, () => {
        const lap = simulateLap(track, compound, condition);
        assert.ok(lap.duration > 0 && Number.isFinite(lap.duration));
        const expected = CIRCUITS[track].segments.reduce((sum, segment) => sum + segment[0], 0);
        assert.ok(Math.abs(lap.distance - expected) < 1e-6);
        assert.ok(Math.abs(lap.sectors.reduce((sum, value) => sum + value, 0) - lap.duration) < 1e-6);
        assert.equal(lap.sectors.length, 3);
        lap.samples.forEach((sample, index) => {
          assert.ok(Number.isFinite(sample.time) && Number.isFinite(sample.speed));
          assert.ok(sample.speed >= 0 && sample.speed <= 115);
          assert.ok(sample.lateralG >= 0 && sample.lateralG <= COMPOUNDS[compound][condition] + 1e-8);
          assert.ok(sample.wear >= 0 && sample.wear <= 0.4);
          if (index) {
            const previous = lap.samples[index - 1];
            assert.ok(sample.time > previous.time && sample.distance > previous.distance);
            assert.ok(sample.wear >= previous.wear);
          }
        });
      });
    }
  }
  test(`${track}: soft dry tires beat medium, which beat wet tires on dry surface`, () => {
    const soft = simulateLap(track, 'soft').duration;
    const medium = simulateLap(track, 'medium').duration;
    const wet = simulateLap(track, 'wet').duration;
    assert.ok(soft < medium && medium < wet);
  });
  test(`${track}: wet tires beat slicks in wet conditions; worn tires lose performance`, () => {
    assert.ok(simulateLap(track, 'wet', 'wet').duration < simulateLap(track, 'soft', 'wet').duration);
    assert.ok(simulateLap(track, 'soft', 'dry', 40).duration > simulateLap(track, 'soft', 'dry', 0).duration);
  });
}

test('model and interpolation are deterministic and independent of rendering cadence', () => {
  const first = simulateLap('silverstone', 'medium');
  assert.deepEqual(first, simulateLap('silverstone', 'medium'));
  for (const hz of [30, 60, 120, 144, 240]) {
    let elapsed = 0;
    for (let frame = 0; frame < hz * 2; frame++) elapsed += 1 / hz * 60;
    const sample = sampleLap(first, elapsed);
    const reference = sampleLap(first, Math.min(120, first.duration));
    assert.ok(Math.abs(sample.distance - reference.distance) < 1e-6);
    assert.ok(Math.abs(sample.progress - reference.progress) < 1e-8);
  }
});
test('interpolation clamps start/end and locates exact recorded samples', () => {
  const lap = simulateLap('laguna', 'soft');
  assert.equal(sampleLap(lap, -10).distance, 0);
  assert.equal(sampleLap(lap, lap.duration + 10).progress, 1);
  assert.equal(sampleLap(lap, lap.duration).distance, lap.distance);
  const sample = lap.samples[30];
  assert.ok(Math.abs(sampleLap(lap, sample.time).speed - sample.speed) < 1e-9);
  assert.throws(() => sampleLap(lap, Infinity));
});
test('invalid configurations reject instead of producing partial or NaN results', () => {
  for (const args of [['missing', 'soft'], ['laguna', 'missing'], ['laguna', 'soft', 'snow'],
    ['laguna', 'soft', 'dry', -1], ['laguna', 'soft', 'dry', 51], ['laguna', 'soft', 'dry', NaN]]) {
    assert.throws(() => simulateLap(...args));
  }
});
test('backward braking anticipates corners rather than instantly clamping from top speed', () => {
  const lap = simulateLap('silverstone', 'soft');
  let brakingCells = 0;
  for (let index = 1; index < lap.samples.length; index++) {
    const a = lap.samples[index - 1], b = lap.samples[index];
    const acceleration = (b.speed ** 2 - a.speed ** 2) / (2 * (b.distance - a.distance));
    // Highest dry grip bounds both acceleration and braking throughout the lap.
    assert.ok(Math.abs(acceleration) <= COMPOUNDS.soft.dry * 9.81 + 1e-8);
    if (acceleration < -0.1) brakingCells++;
  }
  assert.ok(brakingCells > 5);
});
