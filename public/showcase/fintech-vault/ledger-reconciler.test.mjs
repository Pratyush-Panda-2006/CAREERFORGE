import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultLedgerReconciler } from './ledger-reconciler.js';

describe('FintechVaultLedgerReconciler', () => {
  it('instantiates with empty ledger accounts and initial block hash', () => {
    const reconciler = new FintechVaultLedgerReconciler();
    assert.equal(reconciler.name, 'FintechVaultLedgerReconciler');
    assert.equal(reconciler.journalEntries.length, 0);
    assert.equal(reconciler.isBalanced(), true);
  });

  it('rejects invalid inputs such as negative amounts or identical accounts', () => {
    const reconciler = new FintechVaultLedgerReconciler();
    assert.throws(() => reconciler.postEntry('', 'Cash', 100), /Invalid debit account/);
    assert.throws(() => reconciler.postEntry('Cash', '', 100), /Invalid credit account/);
    assert.throws(() => reconciler.postEntry('Cash', 'Cash', 100), /Debit and credit accounts must be distinct/);
    assert.throws(() => reconciler.postEntry('Cash', 'Bank', -50), /positive number/);
    assert.throws(() => reconciler.postEntry('Cash', 'Bank', 0), /positive number/);
  });

  it('records valid transactions and maintains strict double-entry balance', () => {
    const reconciler = new FintechVaultLedgerReconciler();
    reconciler.postEntry('Cash Reserves', 'Equity Capital', 100000, 'Initial Capital Deposit');
    reconciler.postEntry('Equipment Assets', 'Cash Reserves', 25000, 'Hardware Procurement');
    reconciler.postEntry('Operational Expenses', 'Cash Reserves', 5000, 'Vendor Payment');

    assert.equal(reconciler.journalEntries.length, 3);
    assert.equal(reconciler.isBalanced(), true);

    const trial = reconciler.getTrialBalance();
    assert.equal(trial.isBalanced, true);
    assert.equal(trial.totalDebits, 100000);
    assert.equal(trial.totalCredits, 100000);
  });

  it('generates sequential cryptographic block hash chain', () => {
    const reconciler = new FintechVaultLedgerReconciler();
    const entry1 = reconciler.postEntry('Account A', 'Account B', 100);
    const entry2 = reconciler.postEntry('Account B', 'Account C', 200);

    assert.ok(typeof entry1.hash === 'string' && entry1.hash.length === 16);
    assert.ok(typeof entry2.hash === 'string' && entry2.hash.length === 16);
    assert.notEqual(entry1.hash, entry2.hash);
  });

  it('identifies statistical Z-score fraud outliers accurately', () => {
    const reconciler = new FintechVaultLedgerReconciler();
    // Normal baseline transactions around $100-$300
    for (let i = 0; i < 20; i++) {
      reconciler.postEntry('Expense Account', 'Cash Pool', 150 + (i % 5) * 20);
    }

    // Insert an extreme anomaly of $1,000,000
    reconciler.postEntry('Suspicious Off-shore', 'Cash Pool', 1000000, 'Anomalous Transfer');

    const anomalies = reconciler.detectAnomalies(2.0);
    assert.equal(anomalies.length, 1);
    assert.equal(anomalies[0].amount, 1000000);
    assert.ok(anomalies[0].zScore > 2.0);
  });

  it('produces a comprehensive reconciliation audit statement', () => {
    const reconciler = new FintechVaultLedgerReconciler();
    reconciler.postEntry('Vault Assets', 'User Deposits', 5000);
    const report = reconciler.generateAuditReport();

    assert.equal(report.entryCount, 1);
    assert.equal(report.isReconciled, true);
    assert.equal(report.totalVolume, 5000);
    assert.ok(report.finalBlockHash.length > 0);
  });
});
