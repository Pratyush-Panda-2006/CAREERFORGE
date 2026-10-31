/**
 * ApexVault - transaction ledger logic (search, category, date range, sort).
 * Sample data only: these are illustrative demo transactions, not real accounts.
 */
var Ledger = (function () {
  var CATEGORIES = ['Investments', 'Transfers', 'Subscriptions', 'Dividends'];

  // amount > 0 is a deposit (money in), amount < 0 is a withdrawal (money out)
  var TRANSACTIONS = [
    { id: 1, date: '2026-10-27', merchant: 'Apex Prime USDC Vault', category: 'Investments', amount: -5000 },
    { id: 2, date: '2026-10-25', merchant: 'Apex Prime USDC Vault', category: 'Dividends', amount: 212.4 },
    { id: 3, date: '2026-10-22', merchant: 'Northwind Brokerage', category: 'Transfers', amount: 3000 },
    { id: 4, date: '2026-10-20', merchant: 'Ledgerly Pro', category: 'Subscriptions', amount: -14.99 },
    { id: 5, date: '2026-10-15', merchant: 'BTC Capital Protection Vault', category: 'Investments', amount: -2500 },
    { id: 6, date: '2026-10-12', merchant: 'Harbor Index Fund', category: 'Dividends', amount: 86.15 },
    { id: 7, date: '2026-10-08', merchant: 'Payroll Deposit', category: 'Transfers', amount: 4200 },
    { id: 8, date: '2026-10-03', merchant: 'StreamBox', category: 'Subscriptions', amount: -11.5 },
    { id: 9, date: '2026-09-28', merchant: 'Harbor Index Fund', category: 'Investments', amount: -1200 },
    { id: 10, date: '2026-09-21', merchant: 'Savings Account Transfer', category: 'Transfers', amount: -750 },
    { id: 11, date: '2026-09-18', merchant: 'Ledgerly Pro', category: 'Subscriptions', amount: -14.99 },
    { id: 12, date: '2026-09-10', merchant: 'Apex Prime USDC Vault', category: 'Dividends', amount: 198.72 }
  ];

  function normalize(s) {
    return String(s == null ? '' : s).trim().toLowerCase();
  }

  /**
   * filters: { query, category ('' or 'All' = any), from, to (YYYY-MM-DD, inclusive) }
   * Returns a new filtered array.
   */
  function filter(list, filters) {
    var f = filters || {};
    var q = normalize(f.query);
    var cat = f.category && f.category !== 'All' ? f.category : '';
    return list.filter(function (t) {
      if (q && normalize(t.merchant).indexOf(q) === -1) return false;
      if (cat && t.category !== cat) return false;
      if (f.from && t.date < f.from) return false;
      if (f.to && t.date > f.to) return false;
      return true;
    });
  }

  /** key: 'date' | 'amount'; dir: 'asc' | 'desc'. Ties fall back to id for a stable order. */
  function sort(list, key, dir) {
    var k = key === 'amount' ? 'amount' : 'date';
    var sign = dir === 'asc' ? 1 : -1;
    return list.slice().sort(function (a, b) {
      if (a[k] < b[k]) return -1 * sign;
      if (a[k] > b[k]) return 1 * sign;
      return a.id - b.id;
    });
  }

  function money(n) {
    return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatAmount(n) {
    return (n >= 0 ? '+' : '-') + money(n);
  }

  function summarize(list) {
    var inn = 0;
    var out = 0;
    list.forEach(function (t) {
      if (t.amount >= 0) inn += t.amount;
      else out += -t.amount;
    });
    return { count: list.length, moneyIn: Math.round(inn * 100) / 100, moneyOut: Math.round(out * 100) / 100 };
  }

  return { CATEGORIES: CATEGORIES, TRANSACTIONS: TRANSACTIONS, filter: filter, sort: sort, money: money, formatAmount: formatAmount, summarize: summarize };
})();

(function () {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var body = document.getElementById('ledgerBody');
    if (!body) return;
    var search = document.getElementById('ledgerSearch');
    var from = document.getElementById('ledgerFrom');
    var to = document.getElementById('ledgerTo');
    var pills = document.getElementById('ledgerPills');
    var status = document.getElementById('ledgerStatus');
    var empty = document.getElementById('ledgerEmpty');
    var rangeError = document.getElementById('ledgerRangeError');
    var clear = document.getElementById('ledgerClear');
    var wrap = document.getElementById('ledgerTableWrap');
    var sortBtns = document.querySelectorAll('[data-sort]');
    var state = { category: 'All', key: 'date', dir: 'desc' };

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function setPressed(active) {
      pills.querySelectorAll('[data-cat]').forEach(function (p) {
        p.setAttribute('aria-pressed', p.getAttribute('data-cat') === active ? 'true' : 'false');
      });
    }

    ['All'].concat(Ledger.CATEGORIES).forEach(function (c) {
      var b = el('button', 'ledger-pill', c);
      b.type = 'button';
      b.setAttribute('data-cat', c);
      pills.appendChild(b);
    });
    setPressed('All');

    function render() {
      var invalid = !!(from.value && to.value && from.value > to.value);
      rangeError.hidden = !invalid;
      from.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      to.setAttribute('aria-invalid', invalid ? 'true' : 'false');

      var rows = invalid ? [] : Ledger.sort(
        Ledger.filter(Ledger.TRANSACTIONS, { query: search.value, category: state.category, from: from.value, to: to.value }),
        state.key, state.dir);

      body.textContent = '';
      rows.forEach(function (t) {
        var tr = document.createElement('tr');
        tr.appendChild(el('td', 'ledger-date', t.date));
        tr.appendChild(el('td', null, t.merchant));
        var tdCat = document.createElement('td');
        tdCat.appendChild(el('span', 'ledger-badge', t.category));
        tr.appendChild(tdCat);
        tr.appendChild(el('td', 'ledger-amount ' + (t.amount >= 0 ? 'ledger-in' : 'ledger-out'), Ledger.formatAmount(t.amount)));
        body.appendChild(tr);
      });

      var s = Ledger.summarize(rows);
      empty.hidden = rows.length > 0 || invalid;
      wrap.hidden = rows.length === 0;
      status.textContent = invalid ? 'Fix the date range to see transactions.' :
        s.count + (s.count === 1 ? ' transaction' : ' transactions') + ' shown. Money in ' + Ledger.money(s.moneyIn) +
        ', money out ' + Ledger.money(s.moneyOut) + '.';

      sortBtns.forEach(function (btn) {
        var active = btn.getAttribute('data-sort') === state.key;
        btn.parentNode.setAttribute('aria-sort', active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none');
        btn.querySelector('.sort-arrow').textContent = active ? (state.dir === 'asc' ? '▲' : '▼') : '';
      });
    }

    pills.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      state.category = b.getAttribute('data-cat');
      setPressed(state.category);
      render();
    });
    sortBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-sort');
        if (state.key === k) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        else { state.key = k; state.dir = 'desc'; }
        render();
      });
    });
    [search, from, to].forEach(function (i) { i.addEventListener('input', render); });
    clear.addEventListener('click', function () {
      search.value = ''; from.value = ''; to.value = ''; state.category = 'All';
      setPressed('All');
      render();
    });
    render();
  });
})();
