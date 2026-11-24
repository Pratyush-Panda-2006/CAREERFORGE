import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingCronParser } from './cron-parser.js';

test('AgritechPrecisionFarmingCronParser - parseExpression validates 5 parts and parses wildcard/step expressions', () => {
  const parser = new AgritechPrecisionFarmingCronParser();
  const parsed = parser.parseExpression('*/15 0-2 * * 1-5');

  assert.deepEqual(parsed.minutes, [0, 15, 30, 45]);
  assert.deepEqual(parsed.hours, [0, 1, 2]);
  assert.equal(parsed.daysOfMonth.length, 31);
  assert.equal(parsed.months.length, 12);
  assert.deepEqual(parsed.daysOfWeek, [1, 2, 3, 4, 5]);
});

test('AgritechPrecisionFarmingCronParser - parseExpression throws on invalid part counts or ranges', () => {
  const parser = new AgritechPrecisionFarmingCronParser();
  assert.throws(() => parser.parseExpression('0 6 * *'), /Expected exactly 5 cron fields/);
  assert.throws(() => parser.parseExpression('65 * * * *'), /Value 65 out of range/);
  assert.throws(() => parser.parseExpression(12345), TypeError);
});

test('AgritechPrecisionFarmingCronParser - toHumanReadable produces plain English translations', () => {
  const parser = new AgritechPrecisionFarmingCronParser();
  assert.equal(parser.toHumanReadable('* * * * *'), 'Every minute of every day');
  assert.equal(parser.toHumanReadable('0 * * * *'), 'Every hour, at minute 0');
  assert.equal(parser.toHumanReadable('*/15 * * * *'), 'Every 15 minutes');
  assert.equal(parser.toHumanReadable('0 6 * * *'), 'At 06:00 every day');
});

test('AgritechPrecisionFarmingCronParser - getNextExecutionDates accurately forecasts upcoming runs', () => {
  const parser = new AgritechPrecisionFarmingCronParser();
  const from = new Date(2026, 0, 1, 12, 0, 0); // local time 12:00
  // Next hourly runs at minute 0
  const runs = parser.getNextExecutionDates('0 * * * *', 3, from);

  assert.equal(runs.length, 3);
  assert.equal(runs[0].getMinutes(), 0);
  assert.equal(runs[0].getHours(), 13);
  assert.equal(runs[1].getHours(), 14);
  assert.equal(runs[2].getHours(), 15);
});
