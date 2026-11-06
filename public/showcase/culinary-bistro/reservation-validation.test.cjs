const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

// Execute the actual pure date helpers without starting the unrelated UI.
const source = readFileSync(join(__dirname, 'script.js'), 'utf8');
const start = source.indexOf('function formatDateIso(');
const end = source.indexOf('function formatDisplayDate(', start);
assert.ok(start >= 0 && end > start, 'date helpers must remain available');
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
const future = (date, time, now = new Date(2026, 10, 6, 19, 30)) => context.isFutureReservation(date, time, now);

test('allows a later seating today or a future date', () => {
  assert.equal(future('2026-11-06', '20:00'), true);
  assert.equal(future('2026-11-07', '17:30'), true);
});
test('rejects past dates, past seatings and the exact current minute', () => {
  assert.equal(future('2026-11-05', '22:00'), false);
  assert.equal(future('2026-11-06', '18:30'), false);
  assert.equal(future('2026-11-06', '19:30'), false);
});
test('rejects missing or malformed dates and times', () => {
  for (const [date, time] of [['', '19:30'], ['2026-11-07', ''], ['not-a-date', '19:30'], ['2026-11-07', '25:00']]) {
    assert.equal(future(date, time), false);
  }
});
test('does not silently roll an impossible calendar date into another month', () => {
  assert.equal(future('2027-02-29', '19:30'), false);
  assert.equal(future('2026-11-31', '19:30'), false);
  assert.equal(future('2028-02-29', '19:30'), true);
});
test('rejects a formerly valid selection after its seating time passes', () => {
  assert.equal(future('2026-11-06', '20:00', new Date(2026, 10, 6, 19, 59)), true);
  assert.equal(future('2026-11-06', '20:00', new Date(2026, 10, 6, 20, 1)), false);
});
