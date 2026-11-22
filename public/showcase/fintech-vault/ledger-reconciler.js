/**
 * Fintech Vault - Dynamic Double-Entry General Ledger Reconciliation & Fraud Anomaly Detection Engine
 * Enforces fundamental accounting invariants, transaction hash chaining, and statistical Z-score outlier detection.
 */

export class FintechVaultLedgerReconciler {
  constructor() {
    this.name = 'FintechVaultLedgerReconciler';
    this.accounts = new Map(); // accountName -> balance
    this.journalEntries = [];
    this.previousBlockHash = '00000000000000000000000000000000';
  }

  /**
   * Deterministic FNV-1a / Murmur-inspired 32-bit hex hash for client-side audit chaining.
   * @param {string} str - String to hash
   * @returns {string} 8-character hex hash
   */
  hashString(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  }

  /**
   * Posts a balanced double-entry transaction to the general ledger.
   * @param {string} debitAccount - Account receiving debit
   * @param {string} creditAccount - Account receiving credit
   * @param {number} amount - Positive numerical amount
   * @param {string} memo - Transaction description
   * @param {string} timestamp - ISO timestamp string (optional)
   * @returns {Object} Created journal entry
   */
  postEntry(debitAccount, creditAccount, amount, memo = '', timestamp = null) {
    if (!debitAccount || typeof debitAccount !== 'string' || !debitAccount.trim()) {
      throw new Error('Invalid debit account specified');
    }
    if (!creditAccount || typeof creditAccount !== 'string' || !creditAccount.trim()) {
      throw new Error('Invalid credit account specified');
    }
    if (debitAccount.trim() === creditAccount.trim()) {
      throw new Error('Debit and credit accounts must be distinct');
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Transaction amount must be a positive number');
    }

    const dAcc = debitAccount.trim();
    const cAcc = creditAccount.trim();
    const ts = timestamp || new Date().toISOString();

    // Update balances
    const currentDebit = this.accounts.get(dAcc) || 0;
    const currentCredit = this.accounts.get(cAcc) || 0;
    this.accounts.set(dAcc, parseFloat((currentDebit + parsedAmount).toFixed(2)));
    this.accounts.set(cAcc, parseFloat((currentCredit - parsedAmount).toFixed(2)));

    // Chained hash linking
    const entryData = `${this.previousBlockHash}|${this.journalEntries.length + 1}|${dAcc}|${cAcc}|${parsedAmount.toFixed(2)}|${ts}`;
    const entryHash = this.hashString(entryData);
    this.previousBlockHash = entryHash;

    const entry = {
      id: this.journalEntries.length + 1,
      debitAccount: dAcc,
      creditAccount: cAcc,
      amount: parseFloat(parsedAmount.toFixed(2)),
      memo: String(memo || '').trim(),
      timestamp: ts,
      hash: entryHash
    };

    this.journalEntries.push(entry);
    return entry;
  }

  /**
   * Verifies that the fundamental accounting equation is preserved.
   * Net balance sum across all accounts must equal zero within precision tolerance.
   * @returns {boolean} True if balanced
   */
  isBalanced() {
    let netSum = 0;
    for (const balance of this.accounts.values()) {
      netSum += balance;
    }
    return Math.abs(netSum) < 0.0001;
  }

  /**
   * Generates a Trial Balance summary listing all accounts with debit/credit breakdown.
   * @returns {Object} Trial balance dataset
   */
  getTrialBalance() {
    const list = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const [account, net] of this.accounts.entries()) {
      const isDebit = net >= 0;
      const debitVal = isDebit ? net : 0;
      const creditVal = !isDebit ? Math.abs(net) : 0;
      totalDebits += debitVal;
      totalCredits += creditVal;

      list.push({
        account,
        debit: parseFloat(debitVal.toFixed(2)),
        credit: parseFloat(creditVal.toFixed(2))
      });
    }

    return {
      accounts: list.sort((a, b) => a.account.localeCompare(b.account)),
      totalDebits: parseFloat(totalDebits.toFixed(2)),
      totalCredits: parseFloat(totalCredits.toFixed(2)),
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.0001
    };
  }

  /**
   * Detects fraudulent or anomalous transaction spikes using statistical Z-Score analysis.
   * @param {number} thresholdZScore - Z-score threshold (default: 2.0 standard deviations)
   * @returns {Object[]} Array of flagged anomalous transactions with calculated Z-scores
   */
  detectAnomalies(thresholdZScore = 2.0) {
    if (this.journalEntries.length < 3) {
      return [];
    }

    const amounts = this.journalEntries.map((e) => e.amount);
    const mean = amounts.reduce((sum, v) => sum + v, 0) / amounts.length;
    const variance = amounts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return [];
    }

    const anomalies = [];
    for (const entry of this.journalEntries) {
      const zScore = (entry.amount - mean) / stdDev;
      if (Math.abs(zScore) >= thresholdZScore) {
        anomalies.push({
          ...entry,
          zScore: parseFloat(zScore.toFixed(2)),
          mean: parseFloat(mean.toFixed(2)),
          stdDev: parseFloat(stdDev.toFixed(2))
        });
      }
    }

    return anomalies;
  }

  /**
   * Produces a comprehensive audit and reconciliation report.
   * @returns {Object} Audit report metadata
   */
  generateAuditReport() {
    const trial = this.getTrialBalance();
    const anomalies = this.detectAnomalies(2.0);
    const totalVolume = this.journalEntries.reduce((acc, e) => acc + e.amount, 0);

    return {
      generatedAt: new Date().toISOString(),
      entryCount: this.journalEntries.length,
      accountCount: this.accounts.size,
      totalVolume: parseFloat(totalVolume.toFixed(2)),
      isReconciled: trial.isBalanced,
      totalDebits: trial.totalDebits,
      totalCredits: trial.totalCredits,
      anomalyCount: anomalies.length,
      anomalies,
      finalBlockHash: this.previousBlockHash
    };
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const reconciler = new FintechVaultLedgerReconciler();

    const debitAccInput = document.getElementById('debit-account');
    const creditAccInput = document.getElementById('credit-account');
    const amountInput = document.getElementById('entry-amount');
    const memoInput = document.getElementById('entry-memo');
    const postBtn = document.getElementById('post-entry-btn');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const exportBtn = document.getElementById('export-audit-btn');

    const totalDebitsElem = document.getElementById('total-debits');
    const totalCreditsElem = document.getElementById('total-credits');
    const balanceStatusElem = document.getElementById('balance-status');
    const anomalyCountElem = document.getElementById('anomaly-count');
    const ledgerTableBody = document.getElementById('ledger-table-body');
    const entriesList = document.getElementById('entries-list');
    const alertBanner = document.getElementById('anomaly-banner');

    function renderUI() {
      const trial = reconciler.getTrialBalance();
      const anomalies = reconciler.detectAnomalies(2.0);

      if (totalDebitsElem) totalDebitsElem.textContent = `$${trial.totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      if (totalCreditsElem) totalCreditsElem.textContent = `$${trial.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      if (anomalyCountElem) anomalyCountElem.textContent = String(anomalies.length);

      if (balanceStatusElem) {
        if (trial.isBalanced) {
          balanceStatusElem.textContent = 'RECONCILED (ZERO-SUM BALANCED)';
          balanceStatusElem.className = 'status-badge status-balanced';
        } else {
          balanceStatusElem.textContent = 'UNBALANCED (DISCREPANCY DETECTED)';
          balanceStatusElem.className = 'status-badge status-unbalanced';
        }
      }

      if (ledgerTableBody) {
        ledgerTableBody.innerHTML = trial.accounts
          .map(
            (acc) => `<tr>
            <td class="acc-name">${acc.account}</td>
            <td class="num debit">${acc.debit > 0 ? `$${acc.debit.toFixed(2)}` : '—'}</td>
            <td class="num credit">${acc.credit > 0 ? `$${acc.credit.toFixed(2)}` : '—'}</td>
          </tr>`
          )
          .join('');
      }

      if (entriesList) {
        entriesList.innerHTML = reconciler.journalEntries
          .slice(-10)
          .reverse()
          .map(
            (e) => `<div class="entry-card">
            <div class="entry-header">
              <span class="entry-id">#${e.id}</span>
              <span class="entry-amount">$${e.amount.toFixed(2)}</span>
            </div>
            <div class="entry-meta">
              <span><strong>Dr:</strong> ${e.debitAccount}</span>
              <span><strong>Cr:</strong> ${e.creditAccount}</span>
            </div>
            <div class="entry-hash">${e.memo ? `"${e.memo}" • ` : ''}Hash: ${e.hash.substring(0, 12)}...</div>
          </div>`
          )
          .join('');
      }

      if (alertBanner) {
        if (anomalies.length > 0) {
          alertBanner.style.display = 'block';
          alertBanner.innerHTML = `<strong>⚠️ Fraud Anomaly Alert:</strong> Detected ${anomalies.length} transaction(s) exceeding 2.0σ threshold: ` +
            anomalies.map((a) => `#${a.id} ($${a.amount.toFixed(2)}, Z=${a.zScore})`).join(', ');
        } else {
          alertBanner.style.display = 'none';
        }
      }
    }

    if (postBtn) {
      postBtn.addEventListener('click', () => {
        try {
          const dAcc = debitAccInput?.value || '';
          const cAcc = creditAccInput?.value || '';
          const amt = parseFloat(amountInput?.value || '0');
          const memo = memoInput?.value || '';

          reconciler.postEntry(dAcc, cAcc, amt, memo);
          if (amountInput) amountInput.value = '';
          if (memoInput) memoInput.value = '';
          renderUI();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        reconciler.postEntry('Cash Reserves', 'Treasury Note', 50000, 'Q4 Liquidity Inflow');
        reconciler.postEntry('Operating Expense', 'Cash Reserves', 12000, 'Cloud Infrastructure Hosting');
        reconciler.postEntry('Accounts Receivable', 'Revenue Account', 35000, 'Enterprise License Contract');
        reconciler.postEntry('Cash Reserves', 'Accounts Receivable', 35000, 'Client Wire Settlement');
        reconciler.postEntry('Crypto Liquidity Pool', 'Cash Reserves', 25000, 'DEX Market Making Injection');
        // Intentional statistical anomaly for verification
        reconciler.postEntry('Collateral Reserve', 'Emergency Credit', 950000, 'High-Value Outlier Allocation');
        renderUI();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const report = reconciler.generateAuditReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fintech_vault_audit_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    renderUI();
  });
}
