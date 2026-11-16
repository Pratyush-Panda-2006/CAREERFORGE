// Run with: node --test public/showcase/fintech-vault/debt.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scriptSrc = fs.readFileSync(new URL('./script.js', import.meta.url), 'utf8');
const start = scriptSrc.indexOf('/* BEGIN Debt payoff simulation engine */');
const end = scriptSrc.indexOf('/* END Debt payoff simulation engine */');
assert.ok(start > -1 && end > start, 'Debt payoff simulation engine not found in script.js');

const context = {};
vm.createContext(context);
vm.runInContext(
  `${scriptSrc.slice(start, end)}\nthis.simulate = simulateDebtPayoff;`,
  context
);
const simulate = context.simulate;
const VmDate = vm.runInContext('Date', context);
const startDate = new VmDate('2026-01-15T12:00:00Z');

test('Snowball targets the smallest balance while Avalanche targets the highest APR', () => {
  const accounts = [
    { name: 'Small loan', balance: 500, apr: 5, minimumPayment: 50 },
    { name: 'High APR card', balance: 1200, apr: 24, minimumPayment: 70 }
  ];

  const snowball = simulate(accounts, 200, 'snowball', startDate);
  const avalanche = simulate(accounts, 200, 'avalanche', startDate);

  assert.equal(snowball.debtPayoffMonths[0].name, 'Small loan');
  assert.equal(avalanche.debtPayoffMonths[1].name, 'High APR card');
  assert.equal(snowball.paidOff, true);
  assert.equal(avalanche.paidOff, true);
  assert.ok(avalanche.totalInterestCents < snowball.totalInterestCents);
  assert.equal(snowball.monthlyBudgetCents, avalanche.monthlyBudgetCents);
});

test('zero-interest debt pays off on the expected month and calendar date', () => {
  const result = simulate(
    [{ name: 'Interest-free', balance: 100, apr: 0, minimumPayment: 25 }],
    0,
    'avalanche',
    startDate
  );

  assert.equal(result.months, 4);
  assert.equal(result.totalInterestCents, 0);
  assert.equal(result.debtFreeDate.getFullYear(), 2026);
  assert.equal(result.debtFreeDate.getMonth(), 4);
});

test('reports when minimum payments fail to reduce the balance', () => {
  const result = simulate(
    [{ name: 'Unamortizing debt', balance: 100, apr: 1000, minimumPayment: 10 }],
    0,
    'snowball',
    startDate
  );

  assert.equal(result.paidOff, false);
  assert.equal(result.reason, 'payments-do-not-reduce-balance');
  assert.equal(result.months, 1);
});

test('records a snowball payoff before stopping for another debt that keeps growing', () => {
  const result = simulate(
    [
      { name: 'Small balance', balance: 100, apr: 0, minimumPayment: 5 },
      { name: 'High APR balance', balance: 1000, apr: 1000, minimumPayment: 10 }
    ],
    100,
    'snowball',
    startDate
  );

  assert.equal(result.debtPayoffMonths[0].payoffMonth, 1);
  assert.equal(result.reason, 'payments-do-not-reduce-balance');
  assert.equal(result.months, 2);
});

test('rejects invalid account values rather than returning a misleading projection', () => {
  assert.throws(
    () => simulate([{ balance: 0, apr: 4, minimumPayment: 20 }], 10, 'snowball', startDate),
    (error) => error.name === 'RangeError'
  );
});
