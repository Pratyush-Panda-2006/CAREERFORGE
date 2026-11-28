import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CryptoExchangeProCronParser } from './cron-parser.js';

const parser = new CryptoExchangeProCronParser();
const stamp = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()].join('-');
const next = (cron, count, from) => parser.getNextExecutionDates(cron, count, from).map(stamp);

test('expands lists, ranges, steps and names', () => {
  const cron = parser.parseExpression('*/20 9-11 1,15 jan-mar mon,7');
  assert.deepEqual(cron.minute, [0, 20, 40]);
  assert.deepEqual(cron.hour, [9, 10, 11]);
  assert.deepEqual(cron.dayOfMonth, [1, 15]);
  assert.deepEqual(cron.month, [1, 2, 3]);
  assert.deepEqual(cron.dayOfWeek, [0, 1]);
});

test('rejects malformed expressions', () => {
  const bad = ['* * * *', '60 * * * *', '* 24 * * *', '5-1 * * * *', '*/0 * * * *', '1/2/3 * * * *', '- * * * *', '1, * * * *', 'a * * * *'];
  for (const expression of bad) {
    assert.throws(() => parser.parseExpression(expression), Error, expression);
  }
});

test('next runs are strictly after the start time', () => {
  assert.deepEqual(next('0 12 * * *', 2, new Date(2026, 0, 1, 12, 0)), ['2026-1-2-12-0', '2026-1-3-12-0']);
});

test('restricted day of month and weekday are combined with OR', () => {
  // 1 June 2026 is a Monday.
  assert.deepEqual(next('0 0 3 6 mon', 3, new Date(2026, 4, 31)), ['2026-6-1-0-0', '2026-6-3-0-0', '2026-6-8-0-0']);
});

test('finds leap days and gives up on impossible dates', () => {
  assert.deepEqual(next('0 0 29 2 *', 1, new Date(2026, 0, 1)), ['2028-2-29-0-0']);
  assert.deepEqual(next('0 0 30 2 *', 1, new Date(2026, 0, 1)), []);
});

test('describes schedules in English', () => {
  assert.equal(parser.toHumanReadable('* * * * *'), 'Every minute');
  assert.equal(parser.toHumanReadable('30 6 1 * *'), 'At 06:30, on day 1 of the month');
  assert.equal(parser.toHumanReadable('0 0 * jan sat,sun'), 'At 00:00, on Sunday and Saturday, in January');
  assert.equal(parser.toHumanReadable('0 9 1 * mon'), 'At 09:00, on day 1 of the month or on Monday');
});
