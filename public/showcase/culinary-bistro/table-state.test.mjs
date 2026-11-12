import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TABLES, HOLD_MS, SeatingPlan, seatingInterval, validatePartySize, STORAGE_KEY } from './table-state.js';

const now = new Date('2030-06-15T12:00').getTime();
const context = (changes = {}) => ({ date: '2030-06-15', time: '19:00', party: 2, ...changes });
const clean = () => new SeatingPlan({ demo: false, storage: null });

test('all 12 map tables expose a valid zone, capacity and booking area', () => {
  assert.equal(new Set(TABLES.map(table => table.id)).size, 12);
  assert.equal(new Set(TABLES.map(table => table.zone)).size, 4);
  assert.deepEqual(TABLES.map(t => t.id), ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']);
  TABLES.forEach(table => {
    assert.ok([2, 4, 6, 8].includes(table.capacity) && table.area);
    assert.ok(table.minParty >= 1 && table.minParty <= table.capacity);
  });
});

test('whole-party capacity is checked before a hold is created', () => {
  const plan = clean();
  assert.equal(plan.availability('T1', context({ party: 4 }), null, now), 'too-small');
  assert.throws(() => plan.hold('T1', context({ party: 4 }), now));
  assert.equal(plan.holds.size, 0);
  assert.equal(plan.hold('T3', context({ party: 8 }), now).tableId, 'T3');
});

test('validatePartySize checks minimum and maximum seating limits', () => {
  assert.deepEqual(validatePartySize('T1', 2), { valid: true });
  assert.deepEqual(validatePartySize('T1', 4), { valid: false, reason: 'Party exceeds maximum capacity of 2' });
  assert.deepEqual(validatePartySize('T1', 0), { valid: false, reason: 'Choose a party of 1 to 8 guests.' });
  assert.deepEqual(validatePartySize('T3', 8), { valid: true });
  assert.deepEqual(validatePartySize('unknown', 2), { valid: false, reason: 'Unknown table.' });
});

test('a hold blocks a competing visitor but remains available to its owner', () => {
  const plan = clean(); const hold = plan.hold('T1', context(), now);
  assert.equal(plan.availability('T1', context(), null, now), 'held');
  assert.equal(plan.availability('T1', context(), hold.id, now), 'available');
  assert.throws(() => plan.hold('T1', context(), now));
});

test('failed replacement keeps the original hold; successful replacement releases it', () => {
  const plan = clean(); const hold = plan.hold('T1', context(), now);
  plan.hold('T2', context(), now);
  assert.throws(() => plan.hold('T2', context(), now, hold.id));
  assert.equal(plan.valid(hold.id, context(), now), true);
  const next = plan.hold('T4', context(), now, hold.id);
  assert.equal(plan.valid(hold.id, context(), now), false);
  assert.equal(plan.valid(next.id, context(), now), true);
});

test('hold expiry boundary is exact and an expired token cannot confirm', () => {
  const plan = clean(); const hold = plan.hold('T1', context(), now);
  assert.equal(plan.valid(hold.id, context(), now + HOLD_MS - 1), true);
  assert.equal(plan.valid(hold.id, context(), now + HOLD_MS), false);
  assert.throws(() => plan.confirm(hold.id, context(), now + HOLD_MS));
  assert.equal(plan.bookings.length, 0);
});

test('holds also expire at seating time, even within the five-minute window', () => {
  const near = new Date('2030-06-15T18:59').getTime();
  const plan = clean(); const hold = plan.hold('T1', context(), near);
  assert.equal(hold.expires, new Date('2030-06-15T19:00').getTime());
  assert.equal(plan.valid(hold.id, context(), hold.expires), false);
});

test('confirmation consumes the token, reserves exactly two hours and rejects replay', () => {
  const plan = clean(); const hold = plan.hold('T1', context(), now);
  const booking = plan.confirm(hold.id, context(), now + 1000);
  assert.equal(booking.end - booking.start, 7_200_000);
  assert.equal(plan.holds.size, 0);
  assert.equal(plan.availability('T1', context(), null, now), 'reserved');
  assert.throws(() => plan.confirm(hold.id, context(), now + 2000));
  assert.equal(plan.bookings.length, 1);
});

test('overlaps are rejected while exactly adjacent seatings are available', () => {
  const plan = clean(); const hold = plan.hold('T1', context(), now);
  plan.confirm(hold.id, context(), now);
  assert.equal(plan.availability('T1', context({ time: '20:59' }), null, now), 'reserved');
  assert.equal(plan.availability('T1', context({ time: '21:00' }), null, now), 'available');
  assert.equal(plan.availability('T1', context({ time: '17:00' }), null, now), 'available');
  assert.equal(plan.availability('T1', context({ time: '17:01' }), null, now), 'reserved');
});

test('collision detection accurately identifies overlapping windows across multiple time slots', () => {
  const plan = clean();
  const hold1 = plan.hold('T7', context({ time: '18:00', party: 2 }), now);
  plan.confirm(hold1.id, context({ time: '18:00', party: 2 }), now);

  const start18 = new Date('2030-06-15T18:00').getTime();
  const start19 = new Date('2030-06-15T19:00').getTime();
  const start20 = new Date('2030-06-15T20:00').getTime();
  const twoHours = 2 * 60 * 60 * 1000;

  assert.equal(plan.isCollision('T7', { start: start19, end: start19 + twoHours }), true);
  assert.equal(plan.isCollision('T7', { start: start20, end: start20 + twoHours }), false);
  assert.equal(plan.isCollision('T8', { start: start18, end: start18 + twoHours }), false);
});

test('localStorage persistence saves confirmed reservations and restores them across instances', () => {
  const store = new Map();
  const mockStorage = {
    getItem: key => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: key => store.delete(key)
  };

  const plan1 = new SeatingPlan({ demo: false, storage: mockStorage });
  const hold = plan1.hold('T12', context({ party: 4 }), now);
  plan1.confirm(hold.id, context({ party: 4 }), now);

  assert.ok(store.has(STORAGE_KEY));
  const savedData = JSON.parse(store.get(STORAGE_KEY));
  assert.equal(savedData.length, 1);
  assert.equal(savedData[0].tableId, 'T12');

  // Create new plan instance using same mockStorage
  const plan2 = new SeatingPlan({ demo: false, storage: mockStorage });
  assert.equal(plan2.bookings.length, 1);
  assert.equal(plan2.availability('T12', context({ party: 4 }), null, now), 'reserved');
});

test('getAvailableTables returns all non-colliding capacity-matching tables for a time slot', () => {
  const plan = clean();
  const allAvailable = plan.getAvailableTables(context({ party: 2 }), now);
  assert.equal(allAvailable.length, 12);

  const largePartyTables = plan.getAvailableTables(context({ party: 8 }), now);
  assert.deepEqual(largePartyTables.map(t => t.id), ['T3', 'T12']);
});

test('changed date, time or party invalidates a token without committing it', () => {
  const plan = clean(); const hold = plan.hold('T1', context(), now);
  for (const changes of [{ date: '2030-06-16' }, { time: '19:30' }, { party: 1 }]) {
    assert.equal(plan.valid(hold.id, context(changes), now), false);
    assert.throws(() => plan.confirm(hold.id, context(changes), now));
  }
  assert.equal(plan.bookings.length, 0);
  assert.equal(plan.valid(hold.id, context(), now), true);
});

test('release is idempotent, and a reserved table cannot be released through a hold token', () => {
  const plan = clean(); const hold = plan.hold('T1', context(), now);
  assert.equal(plan.release(hold.id), true);
  assert.equal(plan.release(hold.id), false);
  const next = plan.hold('T1', context(), now); plan.confirm(next.id, context(), now);
  assert.equal(plan.release(next.id), false);
  assert.equal(plan.bookings.length, 1);
});

test('sample reservations are deterministic per date and distinguish current occupancy', () => {
  const plan = new SeatingPlan({ storage: null });
  assert.equal(plan.availability('T2', context(), null, now), 'reserved');
  assert.equal(plan.availability('T2', context({ time: '20:00' }), null, now), 'available');
  const current = new Date('2030-06-15T18:30').getTime();
  assert.equal(plan.availability('T2', context(), null, current), 'occupied');
});

test('confirmed reservations remain date-specific and overlap across midnight correctly', () => {
  const plan = clean(); const late = context({ time: '23:00' });
  plan.confirm(plan.hold('T1', late, now).id, late, now);
  assert.equal(plan.availability('T1', context({ date: '2030-06-16', time: '00:30' }), null, now), 'reserved');
  assert.equal(plan.availability('T1', context({ date: '2030-06-16', time: '01:00' }), null, now), 'available');
});

test('invalid dates, times and party sizes reject before changing the model', () => {
  const plan = clean();
  for (const changes of [{ date: '' }, { date: '2030-02-30' }, { time: '' }, { time: '25:00' },
    { date: '2020-01-01' }, { party: 0 }, { party: 9 }, { party: 2.5 }, { party: NaN }]) {
    assert.throws(() => plan.hold('T1', context(changes), now));
  }
  assert.throws(() => plan.hold('unknown', context(), now));
  assert.equal(plan.holds.size, 0); assert.equal(plan.bookings.length, 0);
  assert.equal(seatingInterval(context(), now).party, 2);
});
