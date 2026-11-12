import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/developer-portfolio/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    window: {},
    console,
    Math,
    Date,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return context;
}

test('getIntensityLevel correctly maps contribution counts to 4 green intensity levels', () => {
  const ctx = loadContext();
  const getIntensityLevel = ctx.getIntensityLevel;
  assert.equal(typeof getIntensityLevel, 'function');

  // Level 0: 0 or negative
  assert.equal(getIntensityLevel(0), 0);
  assert.equal(getIntensityLevel(-5), 0);
  assert.equal(getIntensityLevel(null), 0);
  assert.equal(getIntensityLevel(undefined), 0);

  // Level 1: 1 - 3
  assert.equal(getIntensityLevel(1), 1);
  assert.equal(getIntensityLevel(2), 1);
  assert.equal(getIntensityLevel(3), 1);

  // Level 2: 4 - 6
  assert.equal(getIntensityLevel(4), 2);
  assert.equal(getIntensityLevel(5), 2);
  assert.equal(getIntensityLevel(6), 2);

  // Level 3: 7 - 9
  assert.equal(getIntensityLevel(7), 3);
  assert.equal(getIntensityLevel(8), 3);
  assert.equal(getIntensityLevel(9), 3);

  // Level 4: 10+
  assert.equal(getIntensityLevel(10), 4);
  assert.equal(getIntensityLevel(18), 4);
  assert.equal(getIntensityLevel(42), 4);
});

test('generateYearActivity generates complete 52-53 week activity calendar with metrics', () => {
  const ctx = loadContext();
  const generateYearActivity = ctx.generateYearActivity;
  assert.equal(typeof generateYearActivity, 'function');

  const data2026 = generateYearActivity(2026);

  assert.equal(data2026.year, 2026);
  assert.ok(data2026.weeks.length === 52 || data2026.weeks.length === 53, 'Should span 52 or 53 weeks');
  assert.ok(data2026.totalContributions > 500, 'Should have realistic total contributions');
  assert.ok(data2026.longestStreak > 0, 'Longest streak should be positive');
  assert.ok(data2026.busiestCount >= 10, 'Busiest day should have high commit count');
  assert.ok(data2026.busiestDateFormatted.includes('2026'), 'Busiest date formatted should include year');

  // Verify all weeks have exactly 7 days (Sunday - Saturday)
  for (let w = 0; w < data2026.weeks.length; w++) {
    const week = data2026.weeks[w];
    assert.equal(week.length, 7, `Week ${w} must contain 7 days`);
    for (let d = 0; d < 7; d++) {
      assert.equal(week[d].dayOfWeek, d, `Day index ${d} must match dayOfWeek`);
    }
  }

  // Verify sum of valid days equals totalContributions
  let calculatedTotal = 0;
  let calculatedLongest = 0;
  let tempStreak = 0;

  data2026.weeks.forEach(week => {
    week.forEach(day => {
      if (day.isCurrentYear) {
        calculatedTotal += day.count;
        if (day.count > 0) {
          tempStreak++;
          if (tempStreak > calculatedLongest) calculatedLongest = tempStreak;
        } else {
          tempStreak = 0;
        }
      }
    });
  });

  assert.equal(calculatedTotal, data2026.totalContributions);
  assert.equal(calculatedLongest, data2026.longestStreak);
});

test('generateYearActivity produces deterministic results across multiple years', () => {
  const ctx = loadContext();
  const generateYearActivity = ctx.generateYearActivity;

  const run1 = generateYearActivity(2025);
  const run2 = generateYearActivity(2025);

  assert.equal(run1.totalContributions, run2.totalContributions);
  assert.equal(run1.longestStreak, run2.longestStreak);
  assert.equal(run1.busiestCount, run2.busiestCount);
  assert.equal(run1.busiestDateFormatted, run2.busiestDateFormatted);

  const data2024 = generateYearActivity(2024);
  assert.equal(data2024.year, 2024);
  assert.ok(data2024.totalContributions > 500);
});
