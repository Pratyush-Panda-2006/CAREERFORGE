import test from 'node:test';
import assert from 'node:assert/strict';
import { nextWeeklyFixture, formatCountdown, buildFixtureIcs } from './fixture-calendar.js';

test('the next weekly fixture is always in the future across weekday and year boundaries', () => {
  assert.equal(nextWeeklyFixture(new Date('2026-11-16T16:00:00Z'), 1, '21:00').toISOString(), '2026-11-16T21:00:00.000Z');
  assert.equal(nextWeeklyFixture(new Date('2026-11-16T21:00:00Z'), 1, '21:00').toISOString(), '2026-11-23T21:00:00.000Z');
  assert.equal(nextWeeklyFixture(new Date('2026-12-31T12:00:00Z'), 1, '21:00').toISOString(), '2027-01-04T21:00:00.000Z');
});

test('countdown includes days, hours, minutes and seconds', () => {
  assert.equal(formatCountdown(90061000), '1d 01h 01m 01s');
  assert.equal(formatCountdown(0), '00h 00m 00s');
});

test('calendar export contains a valid UTC event and escaped title', () => {
  const ics = buildFixtureIcs({
    id: 'upper-final', title: 'Neon Riders, Apex; Titans',
    start: new Date('2026-11-16T21:00:00Z'), generatedAt: new Date('2026-11-16T16:00:00Z'),
  });
  assert.match(ics, /DTSTART:20261116T210000Z\r\n/);
  assert.match(ics, /DTEND:20261116T230000Z\r\n/);
  assert.match(ics, /SUMMARY:Vortex showcase: Neon Riders\\, Apex\\; Titans\r\n/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});
