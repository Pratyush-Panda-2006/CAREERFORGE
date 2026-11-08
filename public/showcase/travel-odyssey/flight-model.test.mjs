import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlightTime, planFlights, duration } from './flight-model.js';
const first = { from: 'DEL', to: 'DXB', departure: '2026-12-01T08:00+05:30', arrival: '2026-12-01T10:30+04:00' };
const second = { from: 'DXB', to: 'LHR', departure: '2026-12-01T11:30+04:00', arrival: '2026-12-01T16:00Z' };
test('offset-aware flight and layover totals conserve journey time', () => {
  const result = planFlights([first, second]);
  assert.equal(result.legs[0].minutes, 240); assert.equal(result.connections[0].minutes, 60);
  assert.equal(result.total, 810); assert.equal(result.flightMinutes + result.layoverMinutes, result.total);
  assert.equal(result.connections[0].risk, 'Tight connection'); assert.equal(duration(result.total), '13h 30m');
});
test('strict calendar and explicit offset validation rejects ambiguous/normalized dates', () => {
  for (const value of ['2026-02-30T10:00Z', '2026-13-01T10:00Z', '2026-12-01T24:00Z', '2026-12-01T10:60Z', '2026-12-01T10:00', '2026-12-01T10:00+14:30', '2026-12-01T10:00+04:99']) assert.throws(() => parseFlightTime(value));
  assert.equal(parseFlightTime('2028-02-29T10:00+05:30'), Date.parse('2028-02-29T04:30Z'));
});
test('connection boundaries distinguish 89, 90, 359 and 360 minutes', () => {
  const a = { from: 'AAA', to: 'BBB', departure: '2026-12-01T00:00Z', arrival: '2026-12-01T01:00Z' };
  for (const [time, expected] of [['02:29', 'Tight connection'], ['02:30', 'Standard connection'], ['06:59', 'Standard connection'], ['07:00', 'Long layover']]) {
    assert.equal(planFlights([a, { from: 'BBB', to: 'CCC', departure: `2026-12-01T${time}Z`, arrival: '2026-12-01T12:00Z' }]).connections[0].risk, expected);
  }
});
test('overnight local connection and date-line flight use calendar and absolute times separately', () => {
  const result = planFlights([{ from: 'HND', to: 'LAX', departure: '2026-12-01T17:00+09:00', arrival: '2026-12-01T10:00-08:00' },
    { from: 'LAX', to: 'JFK', departure: '2026-12-02T01:00-08:00', arrival: '2026-12-02T09:00-05:00' }]);
  assert.equal(result.legs[0].minutes, 600); assert.equal(result.connections[0].minutes, 900); assert.equal(result.connections[0].overnight, true);
});
test('chronology, disconnected airports and nonflight airport pairs are rejected', () => {
  assert.throws(() => planFlights([first, { ...second, from: 'AUH' }]), /airports must match/);
  assert.throws(() => planFlights([first, { ...second, departure: '2026-12-01T10:00+04:00' }]), /before arrival/);
  assert.throws(() => planFlights([{ ...first, from: 'DXB' }]), /distinct/);
  assert.throws(() => planFlights([{ ...first, from: '<b>' }]), /airport/);
  assert.throws(() => planFlights([{ ...first, arrival: first.departure }]), /arrival/);
});
test('leg limits and unrealistic flight/journey durations fail explicitly', () => {
  assert.throws(() => planFlights([])); assert.throws(() => planFlights(Array(9).fill(first)));
  assert.throws(() => planFlights([{ ...first, arrival: '2026-12-04T10:30+04:00' }]), /48 hours/);
  assert.throws(() => planFlights([first, { ...second, departure: '2026-12-20T11:30+04:00', arrival: '2026-12-20T16:00Z' }]), /14 days/);
});
test('single leg works and input records remain unchanged', () => {
  const row = { ...first, from: ' del ' }; const result = planFlights([row]);
  assert.equal(result.legs[0].from, 'DEL'); assert.equal(result.layoverMinutes, 0); assert.equal(row.from, ' del ');
});
