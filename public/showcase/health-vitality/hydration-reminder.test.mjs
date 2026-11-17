import test from 'node:test';
import assert from 'node:assert/strict';
import { nextReminderAt } from './hydration-reminder.js';

test('reminders schedule the selected interval from the current wall clock', () => {
  const now = Date.UTC(2026, 10, 16, 12);
  assert.equal(nextReminderAt(now, 30), now + 30 * 60_000);
  assert.equal(nextReminderAt(now, 60), now + 60 * 60_000);
  assert.equal(nextReminderAt(now, 90), now + 90 * 60_000);
});

test('invalid stored interval cannot schedule an unexpected alarm', () => {
  assert.throws(() => nextReminderAt(Date.now(), 0), RangeError);
  assert.throws(() => nextReminderAt(Date.now(), 99999), RangeError);
});
