/**
 * ApexVault — debt payoff comparison using fixed monthly interest and payments.
 */
var DebtPlanner = (function () {
  function toCents(amount) {
    return Math.round(amount * 100);
  }

  function simulate(debts, extraPayment, method, startDate) {
    var accounts = debts.map(function (debt, index) {
      return {
        id: debt.id,
        name: debt.name,
        balance: toCents(debt.balance),
        apr: debt.apr,
        minimumPayment: toCents(debt.minimumPayment),
        interestPaid: 0,
        payoffMonth: null,
        originalIndex: index
      };
    });
    var monthlyBudget = accounts.reduce(function (total, account) {
      return total + account.minimumPayment;
    }, toCents(extraPayment));
    var months = [];
    var totalInterest = 0;
    var month = 0;

    while (accounts.some(function (account) { return account.balance > 0; }) && month < 1200) {
      month += 1;
      var monthInterest = 0;
      accounts.forEach(function (account) {
        if (account.balance <= 0) return;
        var interest = Math.round(account.balance * account.apr / 1200);
        account.balance += interest;
        account.interestPaid += interest;
        monthInterest += interest;
      });
      totalInterest += monthInterest;

      var remainingBudget = monthlyBudget;
      accounts.forEach(function (account) {
        if (account.balance <= 0) return;
        var payment = Math.min(account.balance, account.minimumPayment);
        account.balance -= payment;
        remainingBudget -= payment;
        if (account.balance === 0 && account.payoffMonth === null) account.payoffMonth = month;
      });

      var priority = accounts.filter(function (account) { return account.balance > 0; }).sort(function (a, b) {
        var comparison = method === 'snowball'
          ? a.balance - b.balance
          : b.apr - a.apr;
        return comparison || a.originalIndex - b.originalIndex;
      });
      priority.forEach(function (account) {
        if (remainingBudget <= 0) return;
        var payment = Math.min(account.balance, remainingBudget);
        account.balance -= payment;
        remainingBudget -= payment;
        if (account.balance === 0 && account.payoffMonth === null) account.payoffMonth = month;
      });

      months.push({
        month: month,
        balance: accounts.reduce(function (total, account) { return total + account.balance; }, 0)
      });
    }

    if (accounts.some(function (account) { return account.balance > 0; })) {
      throw new Error('The entered payments do not pay off every account within 100 years. Increase the extra monthly payment.');
    }

    var debtFreeDate = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1);
    return {
      method: method,
      months: month,
      debtFreeDate: debtFreeDate,
      totalInterest: totalInterest / 100,
      totalPaid: accounts.reduce(function (total, account) {
        return total + toCents(debts[account.originalIndex].balance);
      }, totalInterest) / 100,
      accounts: accounts.map(function (account) {
        return {
          id: account.id,
          name: account.name,
          interestPaid: account.interestPaid / 100,
          payoffMonth: account.payoffMonth
        };
      }),
      history: [{ month: 0, balance: debts.reduce(function (total, debt) { return total + toCents(debt.balance); }, 0) / 100 }]
        .concat(months.map(function (point) { return { month: point.month, balance: point.balance / 100 }; }))
    };
  }

  function compare(debts, extraPayment, startDate) {
    if (!Array.isArray(debts) || debts.length === 0) {
      throw new Error('Add at least one debt account to compare payoff strategies.');
    }
    if (debts.length > 8) throw new Error('You can compare up to eight debt accounts at a time.');
    if (!Number.isFinite(extraPayment) || extraPayment < 0) {
      throw new Error('Extra monthly payment must be zero or more.');
    }
    debts.forEach(function (debt, index) {
      if (!debt.name || !String(debt.name).trim()) throw new Error('Enter a name for debt account ' + (index + 1) + '.');
      if (!Number.isFinite(debt.balance) || debt.balance <= 0) throw new Error('Each balance must be greater than zero.');
      if (!Number.isFinite(debt.apr) || debt.apr < 0 || debt.apr > 100) throw new Error('APR must be between 0% and 100%.');
      if (!Number.isFinite(debt.minimumPayment) || debt.minimumPayment <= 0) {
        throw new Error('Each minimum payment must be greater than zero.');
      }
    });
    if (!debts.some(function (debt) { return debt.minimumPayment > 0; }) && extraPayment === 0) {
      throw new Error('Enter a monthly payment amount greater than zero.');
    }

    var date = startDate && typeof startDate.getFullYear === 'function' ? startDate : new Date();
    return {
      snowball: simulate(debts, extraPayment, 'snowball', date),
      avalanche: simulate(debts, extraPayment, 'avalanche', date)
    };
  }

  return { compare: compare };
})();
