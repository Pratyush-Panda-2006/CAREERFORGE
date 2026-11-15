// Run with: node --test public/showcase/fintech-vault/debt-planner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./debt-planner.js', import.meta.url), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source + '\nthis.DebtPlanner = DebtPlanner;', context);
const { compare } = context.DebtPlanner;
const startDate = new Date(2026, 0, 15);

test('compares interest, payoff milestones, and debt-free dates for both strategies', () => {
  const debts = [
    { id: 1, name: 'High APR card', balance: 6000, apr: 25, minimumPayment: 150 },
    { id: 2, name: 'Small loan', balance: 2500, apr: 8, minimumPayment: 50 },
    { id: 3, name: 'Store card', balance: 4000, apr: 18, minimumPayment: 100 }
  ];

  const result = compare(debts, 400, startDate);

  assert.ok(result.avalanche.totalInterest < result.snowball.totalInterest);
  assert.equal(result.snowball.totalPaid, 12500 + result.snowball.totalInterest);
  assert.equal(result.avalanche.history[0].balance, 12500);
  assert.equal(result.avalanche.history.at(-1).balance, 0);
  assert.equal(result.avalanche.history.length, result.avalanche.months + 1);
  assert.ok(result.snowball.accounts.find((account) => account.name === 'Small loan').payoffMonth <
    result.avalanche.accounts.find((account) => account.name === 'Small loan').payoffMonth);
  assert.equal(result.snowball.debtFreeDate.getMonth(), (startDate.getMonth() + result.snowball.months) % 12);
});

test('rolls paid-off minimums into the remaining payment budget', () => {
  const result = compare([
    { id: 1, name: 'Small balance', balance: 100, apr: 0, minimumPayment: 100 },
    { id: 2, name: 'Large balance', balance: 1000, apr: 0, minimumPayment: 50 }
  ], 50, startDate);

  assert.equal(result.snowball.months, 6);
  assert.equal(result.snowball.totalInterest, 0);
  assert.equal(result.snowball.accounts.find((account) => account.name === 'Small balance').payoffMonth, 1);
  assert.equal(result.snowball.accounts.find((account) => account.name === 'Large balance').payoffMonth, 6);
});

test('rejects invalid account values and payment plans that cannot amortize', () => {
  assert.throws(() => compare([], 100, startDate), /at least one debt account/i);
  assert.throws(() => compare([{ name: 'Card', balance: 0, apr: 10, minimumPayment: 20 }], 100, startDate), /balance must be greater/i);
  assert.throws(() => compare([{ name: 'Card', balance: 1000, apr: 100, minimumPayment: 1 }], 0, startDate), /do not pay off/i);
});
