import test from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixCronParser } from './cron-parser.js';

test('DefiYieldMatrixCronParser - parses wildcards, steps and ranges', () => {
  const parser = new DefiYieldMatrixCronParser();
  const parsed = parser.parseExpression('*/15 0-2 * * 1-5');

  assert.deepEqual(parsed.minutes, [0, 15, 30, 45]);
  assert.deepEqual(parsed.hours, [0, 1, 2]);
  assert.equal(parsed.daysOfMonth.length, 31);
  assert.equal(parsed.months.length, 12);
  assert.deepEqual(parsed.daysOfWeek, [1, 2, 3, 4, 5]);
  assert.equal(parsed.original, '*/15 0-2 * * 1-5');
});

test('DefiYieldMatrixCronParser - supports lists, stepped starts, names and Sunday 7', () => {
  const parser = new DefiYieldMatrixCronParser();

  assert.deepEqual(parser.parseExpression('5/20 * * * *').minutes, [5, 25, 45]);
  assert.deepEqual(parser.parseExpression('0 0 * * 0,7').daysOfWeek, [0]);
  assert.deepEqual(parser.parseExpression('0 0 * JAN,MAR *').months, [1, 3]);
  assert.deepEqual(parser.parseExpression('0 0 * * MON-FRI').daysOfWeek, [1, 2, 3, 4, 5]);
  assert.deepEqual(parser.parseExpression('0 0 * * 5-7').daysOfWeek, [0, 5, 6]);
});

test('DefiYieldMatrixCronParser - rejects malformed expressions', () => {
  const parser = new DefiYieldMatrixCronParser();

  assert.throws(() => parser.parseExpression('0 6 * *'), /Expected exactly 5 cron fields/);
  assert.throws(() => parser.parseExpression('65 * * * *'), /Value 65 out of range/);
  assert.throws(() => parser.parseExpression('0 24 * * *'), /Value 24 out of range/);
  assert.throws(() => parser.parseExpression('0 0 * * 8'), /Value 8 out of range/);
  assert.throws(() => parser.parseExpression('*/0 * * * *'), /Invalid step/);
  assert.throws(() => parser.parseExpression(12345), TypeError);
});

test('DefiYieldMatrixCronParser - generates natural-language explanations', () => {
  const parser = new DefiYieldMatrixCronParser();

  assert.equal(parser.toHumanReadable('* * * * *'), 'Every minute of every day');
  assert.equal(parser.toHumanReadable('0 * * * *'), 'Every hour, at minute 0');
  assert.equal(parser.toHumanReadable('*/15 * * * *'), 'Every 15 minutes');
  assert.equal(parser.toHumanReadable('0 6 * * *'), 'At 06:00 every day');
  assert.equal(parser.toHumanReadable('0 9 * * 1-5'), 'At 09:00 on weekdays');
  assert.equal(parser.toHumanReadable('30 8 * * 1,4'), 'At 08:30 on Mondays and Thursdays');
  assert.equal(parser.toHumanReadable('0 0 1 * *'), 'At 00:00 on the 1st of every month');
  assert.equal(parser.toHumanReadable('0 0 1 1 *'), 'At 00:00 on the 1st of January');
});

test('DefiYieldMatrixCronParser - forecasts upcoming execution dates', () => {
  const parser = new DefiYieldMatrixCronParser();
  const from = new Date(2026, 0, 1, 12, 0, 0);

  const hourly = parser.getNextExecutionDates('0 * * * *', 3, from);
  assert.equal(hourly.length, 3);
  assert.deepEqual(hourly.map(date => date.getHours()), [13, 14, 15]);
  assert.deepEqual(hourly.map(date => date.getMinutes()), [0, 0, 0]);

  const weekday = parser.getNextExecutionDates('0 6 * * 1-5', 3, from);
  assert.deepEqual(weekday.map(date => date.getDay()), [5, 1, 2]);
  assert.deepEqual(weekday.map(date => date.getHours()), [6, 6, 6]);
});

test('DefiYieldMatrixCronParser - uses cron OR semantics for day and weekday', () => {
  const parser = new DefiYieldMatrixCronParser();
  const from = new Date(2026, 0, 1, 12, 0, 0);
  const runs = parser.getNextExecutionDates('0 0 13 * 5', 3, from);

  assert.deepEqual(runs.map(date => date.getDate()), [2, 9, 13]);
});

test('DefiYieldMatrixCronParser - handles defaults, zero count and impossible schedules', () => {
  const parser = new DefiYieldMatrixCronParser();
  const from = new Date(2026, 0, 1, 12, 0, 0);

  assert.equal(parser.getNextExecutionDates('0 6 * * *', 5, from).length, 5);
  assert.deepEqual(parser.getNextExecutionDates('0 6 * * *', 0, from), []);
  assert.deepEqual(parser.getNextExecutionDates('0 0 31 2 *', 3, from), []);
});
