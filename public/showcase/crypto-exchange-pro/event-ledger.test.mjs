import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CryptoExchangeProEventLedger,
  sha256,
  canonicalStringify,
  round8,
  normalizeEventType
} from './event-ledger.js';

test('sha256 - produces correct standard cryptographic digests', () => {
  // Known NIST test vectors
  assert.equal(
    sha256(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  assert.equal(
    sha256('hello'),
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  );
});

test('canonicalStringify - deterministic object serialization with sorted keys', () => {
  const objA = { z: 1, a: 2, m: { y: 10, b: 20 } };
  const objB = { a: 2, m: { b: 20, y: 10 }, z: 1 };
  assert.equal(canonicalStringify(objA), canonicalStringify(objB));
});

test('round8 - prevents floating-point precision drift', () => {
  assert.equal(round8(0.1 + 0.2), 0.3);
  assert.equal(round8(1.000000004), 1);
  assert.equal(round8(1.000000006), 1.00000001);
});

test('normalizeEventType - normalizes common event type aliases', () => {
  assert.equal(normalizeEventType('deposit'), 'BALANCE_DEPOSIT');
  assert.equal(normalizeEventType('BALANCE_WITHDRAWAL'), 'BALANCE_WITHDRAWAL');
  assert.equal(normalizeEventType('order_placement'), 'ORDER_PLACED');
  assert.equal(normalizeEventType('order_fill'), 'ORDER_FILLED');
  assert.equal(normalizeEventType('cancel_order'), 'ORDER_CANCELLED');
});

test('CryptoExchangeProEventLedger - instantiation and pristine initial state', () => {
  const ledger = new CryptoExchangeProEventLedger();
  assert.equal(ledger.events.length, 0);
  assert.equal(ledger.snapshots.length, 0);

  const state = ledger.getState();
  assert.deepEqual(state.balances, {});
  assert.deepEqual(state.lockedBalances, {});
  assert.deepEqual(state.orders, {});
  assert.deepEqual(state.trades, []);
  assert.equal(state.eventCount, 0);

  const integrity = ledger.verifyCryptographicIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(integrity.checkedCount, 0);
});

test('CryptoExchangeProEventLedger - appendEvent with BALANCE_DEPOSIT updates balances and total deposits', () => {
  const ledger = new CryptoExchangeProEventLedger();
  const ev1 = ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 10000 }
  });

  assert.equal(ev1.index, 0);
  assert.equal(ev1.sequenceNumber, 0);
  assert.equal(ev1.previousHash, ledger.genesisHash);
  assert.equal(typeof ev1.hash, 'string');
  assert.equal(ev1.hash.length, 64);

  const aliceUsdt = ledger.getBalance('alice', 'USDT');
  assert.equal(aliceUsdt.available, 10000);
  assert.equal(aliceUsdt.locked, 0);
  assert.equal(aliceUsdt.total, 10000);
  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 10000);
  assert.equal(ledger.getState().totalDeposits['USDT'], 10000);
});

test('CryptoExchangeProEventLedger - appendEvent throws on invalid deposit payloads', () => {
  const ledger = new CryptoExchangeProEventLedger();
  assert.throws(() => {
    ledger.appendEvent({
      type: 'BALANCE_DEPOSIT',
      payload: { userId: 'alice', asset: 'USDT', amount: -50 }
    });
  }, /Invalid deposit payload/);
  assert.equal(ledger.events.length, 0);
});

test('CryptoExchangeProEventLedger - appendEvent with BALANCE_WITHDRAWAL validates and deducts balances', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 5000 }
  });

  // Valid withdrawal
  const evWithdraw = ledger.appendEvent({
    type: 'BALANCE_WITHDRAWAL',
    timestamp: 2000,
    payload: { userId: 'alice', asset: 'USDT', amount: 1500, fee: 10 }
  });

  assert.equal(evWithdraw.index, 1);
  assert.equal(evWithdraw.previousHash, ledger.events[0].hash);
  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 3490);
  assert.equal(ledger.getState().totalWithdrawals['USDT'], 1500);

  // Insufficient balance withdrawal must throw and not commit to chain
  assert.throws(() => {
    ledger.appendEvent({
      type: 'BALANCE_WITHDRAWAL',
      timestamp: 3000,
      payload: { userId: 'alice', asset: 'USDT', amount: 10000 }
    });
  }, /Insufficient available balance/);

  assert.equal(ledger.events.length, 2);
});

test('CryptoExchangeProEventLedger - appendEvent with ORDER_PLACED locks required assets deterministically', () => {
  const ledger = new CryptoExchangeProEventLedger();
  // Alice deposits USDT, Bob deposits BTC
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 20000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 2000,
    payload: { userId: 'bob', asset: 'BTC', amount: 2.0 }
  });

  // Alice places BUY order: 0.2 BTC @ 60000 USDT/BTC -> requires 12000 USDT locked
  const buyOrderEv = ledger.appendEvent({
    type: 'ORDER_PLACED',
    timestamp: 3000,
    payload: {
      orderId: 'ord_buy_1',
      userId: 'alice',
      pair: 'BTC/USDT',
      side: 'BUY',
      price: 60000,
      amount: 0.2
    }
  });

  assert.equal(buyOrderEv.index, 2);
  const aliceUsdt = ledger.getBalance('alice', 'USDT');
  assert.equal(aliceUsdt.available, 8000);
  assert.equal(aliceUsdt.locked, 12000);
  assert.equal(aliceUsdt.total, 20000);

  const orderRecord = ledger.getOrder('ord_buy_1');
  assert.equal(orderRecord.status, 'OPEN');
  assert.equal(orderRecord.remainingAmount, 0.2);

  // Bob places SELL order: 0.5 BTC @ 61000 USDT/BTC -> requires 0.5 BTC locked
  ledger.appendEvent({
    type: 'ORDER_PLACED',
    timestamp: 4000,
    payload: {
      orderId: 'ord_sell_1',
      userId: 'bob',
      pair: 'BTC/USDT',
      side: 'SELL',
      price: 61000,
      amount: 0.5
    }
  });

  const bobBtc = ledger.getBalance('bob', 'BTC');
  assert.equal(bobBtc.available, 1.5);
  assert.equal(bobBtc.locked, 0.5);
  assert.equal(bobBtc.total, 2.0);

  // Attempting to place order with insufficient balance throws
  assert.throws(() => {
    ledger.appendEvent({
      type: 'ORDER_PLACED',
      timestamp: 5000,
      payload: {
        orderId: 'ord_too_big',
        userId: 'alice',
        pair: 'BTC/USDT',
        side: 'BUY',
        price: 60000,
        amount: 1.0 // requires 60000 USDT, only 8000 available
      }
    });
  }, /Insufficient USDT balance/);
});

test('CryptoExchangeProEventLedger - appendEvent with ORDER_FILLED executes trade and settles assets', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 50000 }
  });

  ledger.appendEvent({
    type: 'ORDER_PLACED',
    timestamp: 2000,
    payload: {
      orderId: 'ord_alice_1',
      userId: 'alice',
      pair: 'BTC/USDT',
      side: 'BUY',
      price: 50000,
      amount: 0.5
    }
  });

  // Partial fill: 0.2 BTC filled at 49000 (with price improvement!)
  ledger.appendEvent({
    type: 'ORDER_FILLED',
    timestamp: 3000,
    payload: {
      orderId: 'ord_alice_1',
      fillId: 'fill_1',
      filledAmount: 0.2,
      price: 49000,
      fee: 0,
      feeAsset: 'USDT'
    }
  });

  let order = ledger.getOrder('ord_alice_1');
  assert.equal(order.status, 'PARTIALLY_FILLED');
  assert.equal(order.filledAmount, 0.2);
  assert.equal(order.remainingAmount, 0.3);

  // Alice received 0.2 BTC
  assert.equal(ledger.getAvailableBalance('alice', 'BTC'), 0.2);
  // Reserved quote was 0.2 * 50000 = 10000; cost was 0.2 * 49000 = 9800 -> 200 USDT refunded to available!
  // Remaining locked: 0.3 * 50000 = 15000 USDT
  // Available USDT was 25000 + 200 = 25200 USDT
  assert.equal(ledger.getLockedBalance('alice', 'USDT'), 15000);
  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 25200);

  // Complete the fill: remaining 0.3 BTC at 50000
  ledger.appendEvent({
    type: 'ORDER_FILLED',
    timestamp: 4000,
    payload: {
      orderId: 'ord_alice_1',
      fillId: 'fill_2',
      filledAmount: 0.3,
      price: 50000
    }
  });

  order = ledger.getOrder('ord_alice_1');
  assert.equal(order.status, 'FILLED');
  assert.equal(order.remainingAmount, 0);
  assert.equal(ledger.getLockedBalance('alice', 'USDT'), 0);
  assert.equal(ledger.getAvailableBalance('alice', 'BTC'), 0.5);

  const trades = ledger.getTrades('BTC/USDT');
  assert.equal(trades.length, 2);
  assert.equal(trades[0].amount, 0.2);
  assert.equal(trades[1].amount, 0.3);
});

test('CryptoExchangeProEventLedger - ORDER_CANCELLED unlocks reserved balance', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 10000 }
  });

  ledger.appendEvent({
    type: 'ORDER_PLACED',
    timestamp: 2000,
    payload: {
      orderId: 'ord_cancel_me',
      userId: 'alice',
      pair: 'BTC/USDT',
      side: 'BUY',
      price: 50000,
      amount: 0.1
    }
  });

  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 5000);
  assert.equal(ledger.getLockedBalance('alice', 'USDT'), 5000);

  ledger.appendEvent({
    type: 'ORDER_CANCELLED',
    timestamp: 3000,
    payload: { orderId: 'ord_cancel_me' }
  });

  const order = ledger.getOrder('ord_cancel_me');
  assert.equal(order.status, 'CANCELLED');
  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 10000);
  assert.equal(ledger.getLockedBalance('alice', 'USDT'), 0);
});

test('CryptoExchangeProEventLedger - replayEvents and getHistoricalStateAt accurately reconstruct temporal states', () => {
  const ledger = new CryptoExchangeProEventLedger();

  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 1000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 2000,
    payload: { userId: 'alice', asset: 'USDT', amount: 2000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_WITHDRAWAL',
    timestamp: 3000,
    payload: { userId: 'alice', asset: 'USDT', amount: 500 }
  });

  // State at t = 500 (before any events)
  const state0 = ledger.replayEvents(500);
  assert.equal(state0.balances['alice']?.['USDT'] || 0, 0);

  // State at t = 1500 (after 1st deposit)
  const state1 = ledger.getHistoricalStateAt(1500);
  assert.equal(state1.balances['alice']['USDT'], 1000);

  // State at t = 2500 (after 2nd deposit)
  const state2 = ledger.getHistoricalStateAt(2500);
  assert.equal(state2.balances['alice']['USDT'], 3000);

  // State at t = 3500 (after withdrawal)
  const state3 = ledger.getHistoricalStateAt(3500);
  assert.equal(state3.balances['alice']['USDT'], 2500);
});

test('CryptoExchangeProEventLedger - snapshotState accelerates replay and preserves exact state', () => {
  const ledger = new CryptoExchangeProEventLedger();

  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 10000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 2000,
    payload: { userId: 'bob', asset: 'BTC', amount: 5 }
  });

  const snap = ledger.snapshotState();
  assert.equal(snap.sequenceNumber, 1);
  assert.equal(typeof snap.checksum, 'string');
  assert.equal(snap.checksum.length, 64);
  assert.equal(ledger.snapshots.length, 1);

  // Add more events after snapshot
  ledger.appendEvent({
    type: 'BALANCE_WITHDRAWAL',
    timestamp: 3000,
    payload: { userId: 'alice', asset: 'USDT', amount: 2000 }
  });

  // Replay to point after snapshot
  const replayed = ledger.replayEvents(3500);
  assert.equal(replayed.balances['alice']['USDT'], 8000);
  assert.equal(replayed.balances['bob']['BTC'], 5);
});

test('CryptoExchangeProEventLedger - reconstructLedger re-evaluates event stream from genesis', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 5000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_WITHDRAWAL',
    timestamp: 2000,
    payload: { userId: 'alice', asset: 'USDT', amount: 1000 }
  });

  // Reconstruct ledger
  const result = ledger.reconstructLedger();
  assert.equal(result.success, true);
  assert.equal(result.isValid, true);
  assert.equal(result.totalEvents, 2);
  assert.equal(result.corruptedEvents.length, 0);
  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 4000);
});

test('CryptoExchangeProEventLedger - verifyCryptographicIntegrity validates intact hash chain', () => {
  const ledger = new CryptoExchangeProEventLedger();
  for (let i = 0; i < 5; i++) {
    ledger.appendEvent({
      type: 'BALANCE_DEPOSIT',
      timestamp: 1000 + i * 100,
      payload: { userId: `trader_${i}`, asset: 'USDT', amount: 100 * (i + 1) }
    });
  }

  const integrity = ledger.verifyCryptographicIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(integrity.totalEvents, 5);
  assert.equal(integrity.checkedCount, 5);
  assert.equal(integrity.failedEventIndex, null);
  assert.equal(integrity.error, null);
});

test('CryptoExchangeProEventLedger - verifyCryptographicIntegrity detects tampered payload and flags failed index', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 1000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 2000,
    payload: { userId: 'bob', asset: 'USDT', amount: 2000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 3000,
    payload: { userId: 'carol', asset: 'USDT', amount: 3000 }
  });

  // Tamper with Bob's payload
  ledger.tamperEvent(1, { amount: 999999 });

  const integrity = ledger.verifyCryptographicIntegrity();
  assert.equal(integrity.isValid, false);
  assert.equal(integrity.failedEventIndex, 1);
  assert.match(integrity.error, /Hash mismatch at block #1/);
});

test('CryptoExchangeProEventLedger - verifyCryptographicIntegrity detects broken previousHash link', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 1000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 2000,
    payload: { userId: 'bob', asset: 'USDT', amount: 2000 }
  });

  // Mutate previousHash of block 1
  ledger.events[1].previousHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  const integrity = ledger.verifyCryptographicIntegrity();
  assert.equal(integrity.isValid, false);
  assert.equal(integrity.failedEventIndex, 1);
  assert.match(integrity.error, /Previous hash mismatch at block #1/);
});

test('CryptoExchangeProEventLedger - exportAuditTrail exports valid JSON, CSV, and object structures', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 5000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_WITHDRAWAL',
    timestamp: 2000,
    payload: { userId: 'alice', asset: 'USDT', amount: 500 }
  });

  // JSON export
  const jsonOutput = ledger.exportAuditTrail('json');
  assert.equal(typeof jsonOutput, 'string');
  const parsedJson = JSON.parse(jsonOutput);
  assert.equal(parsedJson.metadata.totalEvents, 2);
  assert.equal(parsedJson.metadata.integrityValid, true);
  assert.equal(parsedJson.events.length, 2);

  // CSV export
  const csvOutput = ledger.exportAuditTrail('csv');
  assert.equal(typeof csvOutput, 'string');
  assert.match(csvOutput, /index,id,type,timestamp,previousHash,hash,payload/);
  assert.match(csvOutput, /BALANCE_DEPOSIT/);
  assert.match(csvOutput, /BALANCE_WITHDRAWAL/);

  // Object export
  const objOutput = ledger.exportAuditTrail('object');
  assert.equal(typeof objOutput, 'object');
  assert.equal(objOutput.events.length, 2);
});

test('CryptoExchangeProEventLedger - deterministic state calculation across independent instances', () => {
  const ledgerA = new CryptoExchangeProEventLedger();
  const ledgerB = new CryptoExchangeProEventLedger();

  const sharedEventList = [
    { type: 'BALANCE_DEPOSIT', timestamp: 1000, payload: { userId: 'alice', asset: 'USDT', amount: 100000 } },
    { type: 'BALANCE_DEPOSIT', timestamp: 1100, payload: { userId: 'bob', asset: 'BTC', amount: 5 } },
    { type: 'ORDER_PLACED', timestamp: 1200, payload: { orderId: 'ord_1', userId: 'alice', pair: 'BTC/USDT', side: 'BUY', price: 60000, amount: 1 } },
    { type: 'ORDER_FILLED', timestamp: 1300, payload: { orderId: 'ord_1', filledAmount: 1, price: 60000 } },
    { type: 'BALANCE_WITHDRAWAL', timestamp: 1400, payload: { userId: 'alice', asset: 'BTC', amount: 0.5 } }
  ];

  for (const ev of sharedEventList) {
    ledgerA.appendEvent(ev);
    ledgerB.appendEvent(ev);
  }

  const checksumA = ledgerA.calculateStateChecksum(ledgerA.getState());
  const checksumB = ledgerB.calculateStateChecksum(ledgerB.getState());
  assert.equal(checksumA, checksumB);
  assert.deepEqual(ledgerA.getState(), ledgerB.getState());
});

test('CryptoExchangeProEventLedger - SELL order placement and execution', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'bob', asset: 'BTC', amount: 2.0 }
  });

  // Bob places SELL order: 1.0 BTC @ 60000 USDT
  ledger.appendEvent({
    type: 'ORDER_PLACED',
    timestamp: 2000,
    payload: {
      orderId: 'ord_bob_sell_1',
      userId: 'bob',
      pair: 'BTC/USDT',
      side: 'SELL',
      price: 60000,
      amount: 1.0
    }
  });

  assert.equal(ledger.getAvailableBalance('bob', 'BTC'), 1.0);
  assert.equal(ledger.getLockedBalance('bob', 'BTC'), 1.0);

  // Fill Bob's sell order: 1.0 BTC filled at 60000 USDT with 10 USDT fee
  ledger.appendEvent({
    type: 'ORDER_FILLED',
    timestamp: 3000,
    payload: {
      orderId: 'ord_bob_sell_1',
      filledAmount: 1.0,
      price: 60000,
      fee: 10,
      feeAsset: 'USDT'
    }
  });

  assert.equal(ledger.getLockedBalance('bob', 'BTC'), 0);
  assert.equal(ledger.getAvailableBalance('bob', 'BTC'), 1.0);
  assert.equal(ledger.getAvailableBalance('bob', 'USDT'), 59990);
  assert.equal(ledger.getOrder('ord_bob_sell_1').status, 'FILLED');
});

test('CryptoExchangeProEventLedger - partial fill followed by order cancellation', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 10000 }
  });

  // Alice places BUY order for 1.0 BTC @ 5000 USDT -> locks 5000 USDT
  ledger.appendEvent({
    type: 'ORDER_PLACED',
    timestamp: 2000,
    payload: {
      orderId: 'ord_alice_part',
      userId: 'alice',
      pair: 'BTC/USDT',
      side: 'BUY',
      price: 5000,
      amount: 1.0
    }
  });

  assert.equal(ledger.getLockedBalance('alice', 'USDT'), 5000);

  // Partial fill of 0.4 BTC
  ledger.appendEvent({
    type: 'ORDER_FILLED',
    timestamp: 3000,
    payload: {
      orderId: 'ord_alice_part',
      filledAmount: 0.4,
      price: 5000
    }
  });

  assert.equal(ledger.getLockedBalance('alice', 'USDT'), 3000);
  assert.equal(ledger.getAvailableBalance('alice', 'BTC'), 0.4);

  // Cancel remaining 0.6 BTC
  ledger.appendEvent({
    type: 'ORDER_CANCELLED',
    timestamp: 4000,
    payload: { orderId: 'ord_alice_part' }
  });

  assert.equal(ledger.getOrder('ord_alice_part').status, 'CANCELLED');
  assert.equal(ledger.getLockedBalance('alice', 'USDT'), 0);
  // Original 10000 - 2000 spent = 8000 available
  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 8000);
});

test('CryptoExchangeProEventLedger - loadEvents and clear methods restore and reset state cleanly', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 1000,
    payload: { userId: 'alice', asset: 'USDT', amount: 5000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    timestamp: 2000,
    payload: { userId: 'bob', asset: 'ETH', amount: 10 }
  });

  const exportedEvents = ledger.getEvents();
  assert.equal(exportedEvents.length, 2);

  ledger.clear();
  assert.equal(ledger.events.length, 0);
  assert.equal(ledger.getState().eventCount, 0);

  // Restore via loadEvents
  ledger.loadEvents(exportedEvents);
  assert.equal(ledger.events.length, 2);
  assert.equal(ledger.getAvailableBalance('alice', 'USDT'), 5000);
  assert.equal(ledger.getAvailableBalance('bob', 'ETH'), 10);
  assert.equal(ledger.verifyCryptographicIntegrity().isValid, true);
});

test('CryptoExchangeProEventLedger - getOpenOrders filters by user and status', () => {
  const ledger = new CryptoExchangeProEventLedger();
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    payload: { userId: 'alice', asset: 'USDT', amount: 50000 }
  });
  ledger.appendEvent({
    type: 'BALANCE_DEPOSIT',
    payload: { userId: 'bob', asset: 'BTC', amount: 5 }
  });

  ledger.appendEvent({
    type: 'ORDER_PLACED',
    payload: { orderId: 'ord_a1', userId: 'alice', pair: 'BTC/USDT', side: 'BUY', price: 60000, amount: 0.1 }
  });
  ledger.appendEvent({
    type: 'ORDER_PLACED',
    payload: { orderId: 'ord_b1', userId: 'bob', pair: 'BTC/USDT', side: 'SELL', price: 61000, amount: 0.2 }
  });

  const allOpen = ledger.getOpenOrders();
  assert.equal(allOpen.length, 2);

  const aliceOpen = ledger.getOpenOrders('alice');
  assert.equal(aliceOpen.length, 1);
  assert.equal(aliceOpen[0].orderId, 'ord_a1');

  // Fill Alice's order
  ledger.appendEvent({
    type: 'ORDER_FILLED',
    payload: { orderId: 'ord_a1', filledAmount: 0.1, price: 60000 }
  });

  assert.equal(ledger.getOpenOrders('alice').length, 0);
  assert.equal(ledger.getOpenOrders().length, 1);
});

