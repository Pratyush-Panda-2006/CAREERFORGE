/**
 * Crypto Exchange Pro - Event Sourcing Ledger & Temporal State Replay Engine
 * High-performance deterministic financial ledger with SHA-256 cryptographic chaining,
 * point-in-time state replay, snapshotting, and audit verification.
 */

/**
 * Standard pure JavaScript synchronous SHA-256 implementation (FIPS 180-4).
 * Runs seamlessly with zero dependencies in Node.js, modern browsers, and Web Workers.
 *
 * @param {string} input - UTF-8 or ASCII string
 * @returns {string} 64-character lowercase hex digest
 */
export function sha256(input) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];

  // Encode UTF-8 safely
  const ascii = unescape(encodeURIComponent(String(input)));
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isPrime = (candidate) => {
    for (let factor = 2, max = Math.sqrt(candidate); factor <= max; factor++) {
      if (candidate % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let padded = ascii + '\x80';
  while ((padded[lengthProperty] % 64) - 56) padded += '\x00';

  for (i = 0; i < padded[lengthProperty]; i++) {
    j = padded.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 =
        hash[7] +
        s1 +
        ch +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = s0 + maj;

      hash = [(temp1 + temp2) | 0].concat(hash.slice(0, 7));
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Deterministic JSON stringifier with sorted keys.
 * Ensures consistent canonical serialization across platforms.
 *
 * @param {*} obj
 * @returns {string}
 */
export function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
}

/**
 * Standard 8-decimal Satoshi-precision floating-point rounder.
 * Prevents IEEE 754 precision drift in accounting balance calculations.
 *
 * @param {number} val
 * @returns {number}
 */
export function round8(val) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 1e8) / 1e8;
}

/**
 * Canonical event type normalization.
 *
 * @param {string} rawType
 * @returns {string}
 */
export function normalizeEventType(rawType) {
  if (!rawType || typeof rawType !== 'string') return 'UNKNOWN';
  const upper = rawType.toUpperCase().trim();
  if (upper.includes('DEPOSIT')) return 'BALANCE_DEPOSIT';
  if (upper.includes('WITHDRAW')) return 'BALANCE_WITHDRAWAL';
  if (upper.includes('FILL')) return 'ORDER_FILLED';
  if (upper.includes('CANCEL')) return 'ORDER_CANCELLED';
  if (upper.includes('PLACE') || upper.includes('ORDER')) return 'ORDER_PLACED';
  return upper;
}

/**
 * Event Sourcing Ledger & Temporal State Replay Engine for Crypto Exchange Pro.
 */
export class CryptoExchangeProEventLedger {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.storageKey] - Optional localStorage key for browser persistence
   * @param {string} [options.genesisHash] - 64-char hex genesis hash (defaults to 64 zeros)
   * @param {Array<Object>} [options.events] - Initial event log to restore
   */
  constructor(options = {}) {
    this.options = { ...options };
    this.storageKey = options.storageKey || null;
    this.genesisHash =
      options.genesisHash || '0000000000000000000000000000000000000000000000000000000000000000';
    this.events = [];
    this.snapshots = [];
    this.subscribers = new Set();
    this.state = this.createInitialState();

    if (Array.isArray(options.events) && options.events.length > 0) {
      this.loadEvents(options.events);
    } else if (this.storageKey && typeof localStorage !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Constructs a pristine financial ledger state.
   *
   * @returns {Object}
   */
  createInitialState() {
    return {
      balances: {},       // [userId][asset]: available balance (number)
      lockedBalances: {}, // [userId][asset]: locked in open orders (number)
      orders: {},         // [orderId]: order entity
      trades: [],         // executed trade executions
      totalDeposits: {},  // [asset]: aggregated deposits
      totalWithdrawals: {}, // [asset]: aggregated withdrawals
      totalVolume: {},    // [pair]: aggregated quote volume
      eventCount: 0,
      lastEventTimestamp: 0
    };
  }

  /**
   * Deep clones any JavaScript state structure safely.
   *
   * @param {*} obj
   * @returns {*}
   */
  cloneState(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(obj);
      }
    } catch {
      // Fallback below
    }
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Computes the cryptographic hash of an event using SHA-256.
   * H(index, timestamp, type, previousHash, canonicalPayload)
   *
   * @param {Object} event
   * @returns {string} 64-character hex hash
   */
  calculateEventHash(event) {
    const payloadStr = canonicalStringify(event.payload || {});
    const canonicalMessage = `${event.index}|${event.timestamp}|${event.type}|${event.previousHash}|${payloadStr}`;
    return sha256(canonicalMessage);
  }

  /**
   * Computes a deterministic checksum of any state object.
   *
   * @param {Object} state
   * @returns {string} 64-character hex checksum
   */
  calculateStateChecksum(state) {
    return sha256(canonicalStringify(state));
  }

  /**
   * Deterministically applies a single event transition to a target state object.
   * Modifies the targetState in place.
   *
   * @param {Object} targetState
   * @param {Object} event
   */
  applyEventToState(targetState, event) {
    const type = normalizeEventType(event.type);
    const payload = event.payload || {};
    const timestamp = event.timestamp || Date.now();

    switch (type) {
      case 'BALANCE_DEPOSIT': {
        const userId = payload.userId || 'default';
        const asset = (payload.asset || 'USDT').toUpperCase();
        const amount = Number(payload.amount);

        if (!asset || isNaN(amount) || amount <= 0) {
          throw new Error(`Invalid deposit payload: asset and positive amount required`);
        }

        targetState.balances[userId] = targetState.balances[userId] || {};
        targetState.lockedBalances[userId] = targetState.lockedBalances[userId] || {};

        targetState.balances[userId][asset] = round8((targetState.balances[userId][asset] || 0) + amount);
        targetState.totalDeposits[asset] = round8((targetState.totalDeposits[asset] || 0) + amount);
        break;
      }

      case 'BALANCE_WITHDRAWAL': {
        const userId = payload.userId || 'default';
        const asset = (payload.asset || 'USDT').toUpperCase();
        const amount = Number(payload.amount);
        const fee = Number(payload.fee || 0);

        if (!asset || isNaN(amount) || amount <= 0) {
          throw new Error(`Invalid withdrawal payload: asset and positive amount required`);
        }

        targetState.balances[userId] = targetState.balances[userId] || {};
        targetState.lockedBalances[userId] = targetState.lockedBalances[userId] || {};

        const currentAvail = targetState.balances[userId][asset] || 0;
        const totalDeduction = round8(amount + fee);

        if (currentAvail < totalDeduction) {
          throw new Error(
            `Insufficient available balance for withdrawal: available ${currentAvail} ${asset}, required ${totalDeduction}`
          );
        }

        targetState.balances[userId][asset] = round8(currentAvail - totalDeduction);
        targetState.totalWithdrawals[asset] = round8((targetState.totalWithdrawals[asset] || 0) + amount);
        break;
      }

      case 'ORDER_PLACED': {
        const orderId =
          payload.orderId ||
          (event.id ? `ord_${event.id}` : `ord_${event.index !== undefined ? event.index : Date.now()}`);
        const userId = payload.userId || 'default';
        const pair = (payload.pair || 'BTC/USDT').toUpperCase();
        const side = (payload.side || 'BUY').toUpperCase();
        const price = Number(payload.price);
        const amount = Number(payload.amount);

        if (isNaN(price) || price <= 0 || isNaN(amount) || amount <= 0) {
          throw new Error(`Invalid order placement: price > 0 and amount > 0 required`);
        }

        const [baseAsset, quoteAsset] = pair.includes('/') ? pair.split('/') : [pair, 'USDT'];
        targetState.balances[userId] = targetState.balances[userId] || {};
        targetState.lockedBalances[userId] = targetState.lockedBalances[userId] || {};

        if (side === 'BUY') {
          const requiredQuote = round8(amount * price);
          const availQuote = targetState.balances[userId][quoteAsset] || 0;
          if (availQuote < requiredQuote) {
            throw new Error(
              `Insufficient ${quoteAsset} balance to place BUY order: available ${availQuote}, required ${requiredQuote}`
            );
          }
          targetState.balances[userId][quoteAsset] = round8(availQuote - requiredQuote);
          targetState.lockedBalances[userId][quoteAsset] = round8(
            (targetState.lockedBalances[userId][quoteAsset] || 0) + requiredQuote
          );
        } else if (side === 'SELL') {
          const availBase = targetState.balances[userId][baseAsset] || 0;
          if (availBase < amount) {
            throw new Error(
              `Insufficient ${baseAsset} balance to place SELL order: available ${availBase}, required ${amount}`
            );
          }
          targetState.balances[userId][baseAsset] = round8(availBase - amount);
          targetState.lockedBalances[userId][baseAsset] = round8(
            (targetState.lockedBalances[userId][baseAsset] || 0) + amount
          );
        } else {
          throw new Error(`Unsupported order side: ${side}`);
        }

        targetState.orders[orderId] = {
          orderId,
          userId,
          pair: `${baseAsset}/${quoteAsset}`,
          side,
          price,
          amount,
          filledAmount: 0,
          remainingAmount: amount,
          status: 'OPEN',
          createdAt: timestamp,
          updatedAt: timestamp
        };
        break;
      }

      case 'ORDER_FILLED': {
        const orderId = payload.orderId;
        const fillId =
          payload.fillId ||
          (event.id ? `fill_${event.id}` : `fill_${targetState.trades.length + 1}_${event.timestamp || 0}`);
        let order = orderId ? targetState.orders[orderId] : null;

        // Support direct fill event if full transaction details provided
        if (!order && payload.pair && payload.side && payload.amount && payload.price) {
          const userId = payload.userId || 'default';
          const pair = payload.pair.toUpperCase();
          const side = payload.side.toUpperCase();
          const [baseAsset, quoteAsset] = pair.includes('/') ? pair.split('/') : [pair, 'USDT'];
          const execQty = Number(payload.filledAmount || payload.amount);
          const execPrice = Number(payload.price);
          const cost = round8(execQty * execPrice);
          const fee = Number(payload.fee || 0);

          targetState.balances[userId] = targetState.balances[userId] || {};
          targetState.lockedBalances[userId] = targetState.lockedBalances[userId] || {};

          if (side === 'BUY') {
            targetState.balances[userId][quoteAsset] = round8((targetState.balances[userId][quoteAsset] || 0) - cost);
            targetState.balances[userId][baseAsset] = round8((targetState.balances[userId][baseAsset] || 0) + execQty - fee);
          } else {
            targetState.balances[userId][baseAsset] = round8((targetState.balances[userId][baseAsset] || 0) - execQty);
            targetState.balances[userId][quoteAsset] = round8((targetState.balances[userId][quoteAsset] || 0) + cost - fee);
          }

          targetState.trades.push({
            tradeId: fillId,
            orderId: orderId || `direct_${timestamp}`,
            userId,
            pair,
            side,
            price: execPrice,
            amount: execQty,
            cost,
            fee,
            feeAsset: payload.feeAsset || (side === 'BUY' ? baseAsset : quoteAsset),
            timestamp
          });
          targetState.totalVolume[pair] = round8((targetState.totalVolume[pair] || 0) + cost);
          break;
        }

        if (!order) {
          throw new Error(`Order ${orderId} does not exist in state to fill`);
        }

        const [baseAsset, quoteAsset] = order.pair.split('/');
        const userId = order.userId;
        const execQty = round8(Number(payload.filledAmount || payload.amount || order.remainingAmount));
        const execPrice = Number(payload.price || payload.fillPrice || order.price);
        const fee = Number(payload.fee || 0);
        const feeAsset = (payload.feeAsset || (order.side === 'BUY' ? baseAsset : quoteAsset)).toUpperCase();

        if (execQty <= 0) {
          throw new Error(`Fill quantity must be greater than zero`);
        }
        if (execQty > round8(order.remainingAmount + 0.00000001)) {
          throw new Error(
            `Fill quantity ${execQty} exceeds remaining order amount ${order.remainingAmount}`
          );
        }

        targetState.balances[userId] = targetState.balances[userId] || {};
        targetState.lockedBalances[userId] = targetState.lockedBalances[userId] || {};

        if (order.side === 'BUY') {
          const reservedQuote = round8(execQty * order.price);
          const actualQuote = round8(execQty * execPrice);
          const priceImprovement = round8(reservedQuote - actualQuote);

          targetState.lockedBalances[userId][quoteAsset] = round8(
            Math.max(0, (targetState.lockedBalances[userId][quoteAsset] || 0) - reservedQuote)
          );
          if (priceImprovement > 0) {
            targetState.balances[userId][quoteAsset] = round8(
              (targetState.balances[userId][quoteAsset] || 0) + priceImprovement
            );
          }
          const netBase = round8(execQty - (feeAsset === baseAsset ? fee : 0));
          targetState.balances[userId][baseAsset] = round8(
            (targetState.balances[userId][baseAsset] || 0) + netBase
          );
        } else if (order.side === 'SELL') {
          targetState.lockedBalances[userId][baseAsset] = round8(
            Math.max(0, (targetState.lockedBalances[userId][baseAsset] || 0) - execQty)
          );
          const grossQuote = round8(execQty * execPrice);
          const netQuote = round8(grossQuote - (feeAsset === quoteAsset ? fee : 0));
          targetState.balances[userId][quoteAsset] = round8(
            (targetState.balances[userId][quoteAsset] || 0) + netQuote
          );
        }

        order.filledAmount = round8(order.filledAmount + execQty);
        order.remainingAmount = round8(Math.max(0, order.amount - order.filledAmount));
        order.status = order.remainingAmount <= 0.00000001 ? 'FILLED' : 'PARTIALLY_FILLED';
        order.updatedAt = timestamp;

        const tradeCost = round8(execQty * execPrice);
        targetState.trades.push({
          tradeId: fillId,
          orderId,
          userId,
          pair: order.pair,
          side: order.side,
          price: execPrice,
          amount: execQty,
          cost: tradeCost,
          fee,
          feeAsset,
          timestamp
        });

        targetState.totalVolume[order.pair] = round8((targetState.totalVolume[order.pair] || 0) + tradeCost);
        break;
      }

      case 'ORDER_CANCELLED': {
        const orderId = payload.orderId;
        const order = targetState.orders[orderId];
        if (order && (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED')) {
          const [baseAsset, quoteAsset] = order.pair.split('/');
          const userId = order.userId;

          if (order.side === 'BUY') {
            const lockedQuote = round8(order.remainingAmount * order.price);
            targetState.lockedBalances[userId][quoteAsset] = round8(
              Math.max(0, (targetState.lockedBalances[userId][quoteAsset] || 0) - lockedQuote)
            );
            targetState.balances[userId][quoteAsset] = round8(
              (targetState.balances[userId][quoteAsset] || 0) + lockedQuote
            );
          } else if (order.side === 'SELL') {
            const lockedBase = order.remainingAmount;
            targetState.lockedBalances[userId][baseAsset] = round8(
              Math.max(0, (targetState.lockedBalances[userId][baseAsset] || 0) - lockedBase)
            );
            targetState.balances[userId][baseAsset] = round8(
              (targetState.balances[userId][baseAsset] || 0) + lockedBase
            );
          }

          order.status = 'CANCELLED';
          order.remainingAmount = 0;
          order.updatedAt = timestamp;
        }
        break;
      }

      default:
        // Ignore unhandled custom events or extend
        break;
    }
  }

  /**
   * Appends an event to the ledger, verifies hash chaining, and mutates current state.
   *
   * @param {Object} rawEvent
   * @returns {Object} Final committed event record with cryptographic hash
   */
  appendEvent(rawEvent) {
    if (!rawEvent || typeof rawEvent !== 'object') {
      throw new Error('Event must be a valid non-null object');
    }

    const type = normalizeEventType(rawEvent.type);
    const timestamp = typeof rawEvent.timestamp === 'number' ? rawEvent.timestamp : Date.now();
    const index = this.events.length;
    const previousHash = index === 0 ? this.genesisHash : this.events[index - 1].hash;
    const id = rawEvent.id || `evt_${index}_${timestamp}`;

    // Extract payload from either rawEvent.payload or top-level properties
    const payload = {
      ...(rawEvent.payload || {}),
      ...(rawEvent.userId !== undefined ? { userId: rawEvent.userId } : {}),
      ...(rawEvent.asset !== undefined ? { asset: rawEvent.asset } : {}),
      ...(rawEvent.amount !== undefined ? { amount: rawEvent.amount } : {}),
      ...(rawEvent.price !== undefined ? { price: rawEvent.price } : {}),
      ...(rawEvent.side !== undefined ? { side: rawEvent.side } : {}),
      ...(rawEvent.orderId !== undefined ? { orderId: rawEvent.orderId } : {}),
      ...(rawEvent.pair !== undefined ? { pair: rawEvent.pair } : {}),
      ...(rawEvent.filledAmount !== undefined ? { filledAmount: rawEvent.filledAmount } : {}),
      ...(rawEvent.fee !== undefined ? { fee: rawEvent.fee } : {}),
      ...(rawEvent.feeAsset !== undefined ? { feeAsset: rawEvent.feeAsset } : {})
    };

    const eventRecord = {
      id,
      index,
      sequenceNumber: index,
      type,
      timestamp,
      payload,
      previousHash,
      hash: ''
    };

    eventRecord.hash = this.calculateEventHash(eventRecord);

    // Apply state change defensively - if invalid, throws and leaves chain untainted
    this.applyEventToState(this.state, eventRecord);
    this.state.eventCount = index + 1;
    this.state.lastEventTimestamp = timestamp;

    this.events.push(eventRecord);
    this.persistToStorage();
    this.notifySubscribers('EVENT_APPENDED', eventRecord);

    return eventRecord;
  }

  /**
   * Replays historical events up to a specified timestamp.
   * Leverages nearest snapshot to accelerate temporal calculation if available.
   *
   * @param {number} [untilTimestamp=Infinity]
   * @returns {Object} Historical state calculated at point-in-time
   */
  replayEvents(untilTimestamp = Infinity) {
    const targetTime = typeof untilTimestamp === 'number' ? untilTimestamp : Infinity;

    let currentState = this.createInitialState();
    let startIndex = 0;

    // Snapshot acceleration: look for latest snapshot <= targetTime
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      const snap = this.snapshots[i];
      if (snap.timestamp <= targetTime && snap.sequenceNumber >= 0) {
        currentState = this.cloneState(snap.state);
        startIndex = snap.sequenceNumber + 1;
        break;
      }
    }

    const replayedState = this.cloneState(currentState);

    for (let i = startIndex; i < this.events.length; i++) {
      const ev = this.events[i];
      if (ev.timestamp > targetTime) {
        break;
      }
      this.applyEventToState(replayedState, ev);
      replayedState.eventCount = i + 1;
      replayedState.lastEventTimestamp = ev.timestamp;
    }

    return replayedState;
  }

  /**
   * Retrieves deterministic historical state at a given timestamp.
   *
   * @param {number} timestamp
   * @returns {Object}
   */
  getHistoricalStateAt(timestamp) {
    return this.replayEvents(timestamp);
  }

  /**
   * Captures an immutable snapshot of the current state.
   *
   * @returns {Object} Snapshot record
   */
  snapshotState() {
    const seq = this.events.length - 1;
    const lastHash = this.events.length > 0 ? this.events[seq].hash : this.genesisHash;
    const snapTimestamp = this.events.length > 0 ? this.events[seq].timestamp : Date.now();

    const snapshot = {
      id: `snap_${this.snapshots.length + 1}_${Date.now()}`,
      sequenceNumber: seq,
      timestamp: snapTimestamp,
      lastEventHash: lastHash,
      state: this.cloneState(this.state),
      checksum: this.calculateStateChecksum(this.state)
    };

    this.snapshots.push(snapshot);
    this.notifySubscribers('SNAPSHOT_CREATED', snapshot);
    return snapshot;
  }

  /**
   * Fully re-evaluates all ledger events from index 0.
   * Reconstructs state from scratch, verifies chain integrity, and updates internal state.
   *
   * @returns {Object} Reconstruct summary
   */
  reconstructLedger() {
    const integrity = this.verifyCryptographicIntegrity();
    const freshState = this.createInitialState();
    const corruptedEvents = [];

    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      try {
        this.applyEventToState(freshState, ev);
        freshState.eventCount = i + 1;
        freshState.lastEventTimestamp = ev.timestamp;
      } catch (err) {
        corruptedEvents.push({ index: i, id: ev.id, reason: err.message });
      }
    }

    this.state = freshState;
    const result = {
      success: integrity.isValid && corruptedEvents.length === 0,
      isValid: integrity.isValid,
      totalEvents: this.events.length,
      reconstructedState: this.cloneState(this.state),
      corruptedEvents
    };

    this.notifySubscribers('LEDGER_RECONSTRUCTED', result);
    return result;
  }

  /**
   * Cryptographically verifies the tamper-evident chain of all events.
   *
   * @returns {Object} Verification result
   */
  verifyCryptographicIntegrity() {
    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      const expectedPrevHash = i === 0 ? this.genesisHash : this.events[i - 1].hash;

      if (ev.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalEvents: this.events.length,
          checkedCount: i,
          failedEventIndex: i,
          error: `Previous hash mismatch at block #${i}: expected ${expectedPrevHash}, found ${ev.previousHash}`
        };
      }

      const calculatedHash = this.calculateEventHash(ev);
      if (ev.hash !== calculatedHash) {
        return {
          isValid: false,
          totalEvents: this.events.length,
          checkedCount: i,
          failedEventIndex: i,
          error: `Hash mismatch at block #${i}: expected ${calculatedHash}, found ${ev.hash}`
        };
      }
    }

    return {
      isValid: true,
      totalEvents: this.events.length,
      checkedCount: this.events.length,
      failedEventIndex: null,
      error: null
    };
  }

  /**
   * Exports an audit package of the entire ledger.
   *
   * @param {'json'|'csv'|'object'} [format='json']
   * @returns {string|Object}
   */
  exportAuditTrail(format = 'json') {
    const integrity = this.verifyCryptographicIntegrity();
    const trail = {
      metadata: {
        system: 'CryptoExchangeProEventLedger',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        totalEvents: this.events.length,
        genesisHash: this.genesisHash,
        latestHash: this.events.length > 0 ? this.events[this.events.length - 1].hash : this.genesisHash,
        integrityValid: integrity.isValid,
        totalSnapshots: this.snapshots.length,
        stateChecksum: this.calculateStateChecksum(this.state)
      },
      events: this.events.map((e) => ({
        index: e.index,
        id: e.id,
        type: e.type,
        timestamp: e.timestamp,
        previousHash: e.previousHash,
        hash: e.hash,
        payload: e.payload
      })),
      currentState: this.cloneState(this.state)
    };

    if (format === 'csv') {
      const headers = ['index', 'id', 'type', 'timestamp', 'previousHash', 'hash', 'payload'];
      const rows = trail.events.map((e) =>
        [
          e.index,
          `"${e.id}"`,
          `"${e.type}"`,
          e.timestamp,
          `"${e.previousHash}"`,
          `"${e.hash}"`,
          `"${JSON.stringify(e.payload).replace(/"/g, '""')}"`
        ].join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }

    if (format === 'object') {
      return trail;
    }

    return JSON.stringify(trail, null, 2);
  }

  // --- Convenience & Diagnostic Helpers ---

  /**
   * Retrieves balance breakdown for a user and optional asset.
   *
   * @param {string} [userId='default']
   * @param {string} [asset=null]
   * @returns {Object|number}
   */
  getBalance(userId = 'default', asset = null) {
    if (asset) {
      const upperAsset = asset.toUpperCase();
      const available = round8(this.state.balances[userId]?.[upperAsset] || 0);
      const locked = round8(this.state.lockedBalances[userId]?.[upperAsset] || 0);
      const total = round8(available + locked);
      return {
        available,
        locked,
        total,
        asset: upperAsset,
        userId,
        valueOf() {
          return this.total;
        }
      };
    }

    const result = {};
    const allAssets = new Set([
      ...Object.keys(this.state.balances[userId] || {}),
      ...Object.keys(this.state.lockedBalances[userId] || {})
    ]);

    for (const a of allAssets) {
      const available = round8(this.state.balances[userId]?.[a] || 0);
      const locked = round8(this.state.lockedBalances[userId]?.[a] || 0);
      result[a] = {
        available,
        locked,
        total: round8(available + locked),
        valueOf() {
          return this.total;
        }
      };
    }
    return result;
  }

  getAvailableBalance(userId = 'default', asset = 'USDT') {
    return round8(this.state.balances[userId]?.[asset.toUpperCase()] || 0);
  }

  getLockedBalance(userId = 'default', asset = 'USDT') {
    return round8(this.state.lockedBalances[userId]?.[asset.toUpperCase()] || 0);
  }

  getTotalBalance(userId = 'default', asset = 'USDT') {
    return round8(
      (this.state.balances[userId]?.[asset.toUpperCase()] || 0) +
        (this.state.lockedBalances[userId]?.[asset.toUpperCase()] || 0)
    );
  }

  getOrder(orderId) {
    return this.state.orders[orderId] ? this.cloneState(this.state.orders[orderId]) : null;
  }

  getOpenOrders(userId = null) {
    const orders = Object.values(this.state.orders).filter(
      (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
    );
    if (userId) {
      return orders.filter((o) => o.userId === userId).map((o) => this.cloneState(o));
    }
    return orders.map((o) => this.cloneState(o));
  }

  getTrades(pair = null) {
    if (pair) {
      const upperPair = pair.toUpperCase();
      return this.state.trades.filter((t) => t.pair === upperPair).map((t) => this.cloneState(t));
    }
    return this.state.trades.map((t) => this.cloneState(t));
  }

  getEvents() {
    return this.events.map((e) => this.cloneState(e));
  }

  getState() {
    return this.cloneState(this.state);
  }

  /**
   * Tamper with an event payload to demonstrate cryptographic tamper detection.
   *
   * @param {number} index
   * @param {Object} mutatedPayload
   */
  tamperEvent(index, mutatedPayload) {
    if (index >= 0 && index < this.events.length) {
      this.events[index].payload = { ...this.events[index].payload, ...mutatedPayload };
      this.notifySubscribers('CHAIN_TAMPERED', { index, mutatedPayload });
    }
  }

  /**
   * Resets ledger to pristine empty state.
   */
  clear() {
    this.events = [];
    this.snapshots = [];
    this.state = this.createInitialState();
    if (this.storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {}
    }
    this.notifySubscribers('LEDGER_CLEARED', null);
  }

  /**
   * Loads an array of existing event records.
   *
   * @param {Array<Object>} events
   */
  loadEvents(events) {
    this.clear();
    for (const ev of events) {
      this.appendEvent(ev);
    }
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.subscribers.add(listener);
      return () => this.subscribers.delete(listener);
    }
    return () => {};
  }

  notifySubscribers(type, data) {
    for (const listener of this.subscribers) {
      try {
        listener({ type, data, ledger: this });
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    }
  }

  persistToStorage() {
    if (this.storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.events));
      } catch {}
    }
  }

  loadFromStorage() {
    if (this.storageKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.loadEvents(parsed);
          }
        }
      } catch {}
    }
  }
}

// --- Browser Auto-Initialization for Interactive UI ---
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('eventLedgerApp');
    if (!rootElement) return;

    // Singleton or window instance
    const ledger = new CryptoExchangeProEventLedger({
      storageKey: 'crypto_exchange_pro_event_ledger_cache'
    });
    window.cryptoLedger = ledger;

    // Seed default transactions if empty
    if (ledger.events.length === 0) {
      const now = Date.now();
      ledger.appendEvent({
        type: 'BALANCE_DEPOSIT',
        timestamp: now - 30000,
        payload: { userId: 'alice', asset: 'USDT', amount: 50000, txHash: '0x3a9f01bc' }
      });
      ledger.appendEvent({
        type: 'BALANCE_DEPOSIT',
        timestamp: now - 25000,
        payload: { userId: 'bob', asset: 'BTC', amount: 2.5, txHash: '0x88f212ca' }
      });
      ledger.appendEvent({
        type: 'ORDER_PLACED',
        timestamp: now - 20000,
        payload: { orderId: 'ord_101', userId: 'alice', pair: 'BTC/USDT', side: 'BUY', price: 65000, amount: 0.5 }
      });
      ledger.appendEvent({
        type: 'ORDER_FILLED',
        timestamp: now - 15000,
        payload: { orderId: 'ord_101', filledAmount: 0.5, price: 65000, fee: 16.25, feeAsset: 'USDT' }
      });
      ledger.appendEvent({
        type: 'BALANCE_WITHDRAWAL',
        timestamp: now - 10000,
        payload: { userId: 'alice', asset: 'BTC', amount: 0.2, fee: 0.0005, recipient: '0x99aB...21F' }
      });
    }

    let activeReplayIndex = ledger.events.length;
    let isPlaying = false;
    let playbackInterval = null;

    // DOM Elements
    const integrityBanner = document.getElementById('integrityBanner');
    const integrityStatusText = document.getElementById('integrityStatusText');
    const latestHashDisplay = document.getElementById('latestHashDisplay');
    const eventCountBadge = document.getElementById('eventCountBadge');
    const timeScrubber = document.getElementById('timeScrubber');
    const scrubberTimeDisplay = document.getElementById('scrubberTimeDisplay');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stepBackBtn = document.getElementById('stepBackBtn');
    const stepForwardBtn = document.getElementById('stepForwardBtn');
    const resetToLiveBtn = document.getElementById('resetToLiveBtn');
    const eventStreamTableBody = document.getElementById('eventStreamTableBody');
    const balancesGrid = document.getElementById('balancesGrid');
    const openOrdersContainer = document.getElementById('openOrdersContainer');
    const tradeHistoryContainer = document.getElementById('tradeHistoryContainer');

    function updateIntegrityBanner() {
      const integrity = ledger.verifyCryptographicIntegrity();
      if (!integrityBanner) return;

      if (integrity.isValid) {
        integrityBanner.className = 'verification-banner status-valid';
        integrityStatusText.innerHTML = `&#10003; CRYPTOGRAPHIC INTEGRITY: <strong>VERIFIED</strong> (${integrity.totalEvents} blocks linked)`;
      } else {
        integrityBanner.className = 'verification-banner status-corrupt';
        integrityStatusText.innerHTML = `&#9888; TAMPER DETECTED: <strong>BLOCK #${integrity.failedEventIndex} COMPROMISED</strong> (${integrity.error})`;
      }

      const lastHash = ledger.events.length > 0 ? ledger.events[ledger.events.length - 1].hash : ledger.genesisHash;
      if (latestHashDisplay) {
        latestHashDisplay.textContent = lastHash;
      }
      if (eventCountBadge) {
        eventCountBadge.textContent = `${ledger.events.length} Events`;
      }
    }

    function renderView() {
      updateIntegrityBanner();

      const totalEvents = ledger.events.length;
      timeScrubber.max = totalEvents;
      timeScrubber.value = activeReplayIndex;

      let currentState;
      let timestampLabel = 'LIVE (Present State)';

      if (activeReplayIndex >= totalEvents) {
        currentState = ledger.getState();
        timestampLabel = 'LIVE (Present State)';
      } else {
        const targetEvent = ledger.events[activeReplayIndex - 1];
        const replayTime = targetEvent ? targetEvent.timestamp : 0;
        currentState = ledger.replayEvents(replayTime);
        timestampLabel = targetEvent
          ? `Event #${targetEvent.index + 1} (${new Date(targetEvent.timestamp).toLocaleTimeString()})`
          : 'Genesis State (Empty)';
      }

      if (scrubberTimeDisplay) {
        scrubberTimeDisplay.textContent = timestampLabel;
      }

      // Render Balances Summary Cards
      if (balancesGrid) {
        balancesGrid.innerHTML = '';
        const users = Object.keys({ ...currentState.balances, ...currentState.lockedBalances });
        if (users.length === 0) {
          balancesGrid.innerHTML = '<div class="empty-state">No balances recorded yet.</div>';
        } else {
          for (const u of users) {
            const userBalances = currentState.balances[u] || {};
            const userLocked = currentState.lockedBalances[u] || {};
            const allAssets = new Set([...Object.keys(userBalances), ...Object.keys(userLocked)]);

            for (const asset of allAssets) {
              const avail = userBalances[asset] || 0;
              const locked = userLocked[asset] || 0;
              const total = round8(avail + locked);

              const card = document.createElement('div');
              card.className = 'balance-card';
              card.innerHTML = `
                <div class="card-header">
                  <span class="user-badge">${u}</span>
                  <span class="asset-symbol">${asset}</span>
                </div>
                <div class="card-total">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</div>
                <div class="card-sub-breakdown">
                  <div class="sub-item"><span class="sub-label">Avail:</span> <span class="sub-val">${avail.toLocaleString()}</span></div>
                  <div class="sub-item"><span class="sub-label">Locked:</span> <span class="sub-val locked">${locked.toLocaleString()}</span></div>
                </div>
              `;
              balancesGrid.appendChild(card);
            }
          }
        }
      }

      // Render Event Stream Table
      if (eventStreamTableBody) {
        eventStreamTableBody.innerHTML = '';
        ledger.events.forEach((ev, idx) => {
          const row = document.createElement('tr');
          const isReplayed = idx < activeReplayIndex;
          row.className = isReplayed ? 'row-active' : 'row-dimmed';

          let badgeClass = 'badge-other';
          if (ev.type === 'BALANCE_DEPOSIT') badgeClass = 'badge-deposit';
          else if (ev.type === 'BALANCE_WITHDRAWAL') badgeClass = 'badge-withdrawal';
          else if (ev.type === 'ORDER_PLACED') badgeClass = 'badge-order';
          else if (ev.type === 'ORDER_FILLED') badgeClass = 'badge-fill';

          row.innerHTML = `
            <td>#${ev.index}</td>
            <td><span class="event-badge ${badgeClass}">${ev.type.replace('BALANCE_', '')}</span></td>
            <td><span class="timestamp-text">${new Date(ev.timestamp).toLocaleTimeString()}</span></td>
            <td class="payload-cell"><code>${JSON.stringify(ev.payload)}</code></td>
            <td><span class="mono-hash" title="${ev.previousHash}">${ev.previousHash.slice(0, 10)}...</span></td>
            <td><span class="mono-hash" title="${ev.hash}">${ev.hash.slice(0, 10)}...</span></td>
          `;
          eventStreamTableBody.appendChild(row);
        });
      }

      // Render Open Orders Table
      if (openOrdersContainer) {
        const openOrders = Object.values(currentState.orders).filter(
          (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
        );
        if (openOrders.length === 0) {
          openOrdersContainer.innerHTML = '<div class="empty-state">No active open orders at this state.</div>';
        } else {
          openOrdersContainer.innerHTML = `
            <table class="data-table">
              <thead><tr><th>ID</th><th>User</th><th>Pair</th><th>Side</th><th>Price</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${openOrders
                  .map(
                    (o) => `
                  <tr>
                    <td>${o.orderId}</td>
                    <td>${o.userId}</td>
                    <td>${o.pair}</td>
                    <td class="${o.side === 'BUY' ? 'side-buy' : 'side-sell'}">${o.side}</td>
                    <td>${o.price}</td>
                    <td>${o.remainingAmount} / ${o.amount}</td>
                    <td><span class="status-pill status-${o.status.toLowerCase()}">${o.status}</span></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `;
        }
      }

      // Render Executed Trades
      if (tradeHistoryContainer) {
        if (!currentState.trades || currentState.trades.length === 0) {
          tradeHistoryContainer.innerHTML = '<div class="empty-state">No trades executed at this state.</div>';
        } else {
          tradeHistoryContainer.innerHTML = `
            <table class="data-table">
              <thead><tr><th>Trade ID</th><th>User</th><th>Pair</th><th>Side</th><th>Price</th><th>Amount</th><th>Cost</th></tr></thead>
              <tbody>
                ${currentState.trades
                  .slice(-8)
                  .map(
                    (t) => `
                  <tr>
                    <td>${t.tradeId}</td>
                    <td>${t.userId}</td>
                    <td>${t.pair}</td>
                    <td class="${t.side === 'BUY' ? 'side-buy' : 'side-sell'}">${t.side}</td>
                    <td>${t.price}</td>
                    <td>${t.amount}</td>
                    <td>${t.cost}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `;
        }
      }
    }

    // Scrubber slider change
    timeScrubber?.addEventListener('input', (e) => {
      activeReplayIndex = parseInt(e.target.value, 10);
      renderView();
    });

    stepBackBtn?.addEventListener('click', () => {
      if (activeReplayIndex > 0) {
        activeReplayIndex--;
        renderView();
      }
    });

    stepForwardBtn?.addEventListener('click', () => {
      if (activeReplayIndex < ledger.events.length) {
        activeReplayIndex++;
        renderView();
      }
    });

    resetToLiveBtn?.addEventListener('click', () => {
      activeReplayIndex = ledger.events.length;
      renderView();
    });

    playPauseBtn?.addEventListener('click', () => {
      if (isPlaying) {
        clearInterval(playbackInterval);
        isPlaying = false;
        playPauseBtn.textContent = '▶ Play Replay';
      } else {
        if (activeReplayIndex >= ledger.events.length) {
          activeReplayIndex = 0;
        }
        isPlaying = true;
        playPauseBtn.textContent = '⏸ Pause';
        playbackInterval = setInterval(() => {
          if (activeReplayIndex < ledger.events.length) {
            activeReplayIndex++;
            renderView();
          } else {
            clearInterval(playbackInterval);
            isPlaying = false;
            playPauseBtn.textContent = '▶ Play Replay';
          }
        }, 800);
      }
    });

    // Transaction Injector
    const transactionForm = document.getElementById('transactionForm');
    const eventTypeSelect = document.getElementById('eventTypeSelect');
    const orderFieldsGroup = document.getElementById('orderFieldsGroup');
    const assetSelect = document.getElementById('assetSelect');

    eventTypeSelect?.addEventListener('change', (e) => {
      const isOrder = e.target.value.includes('ORDER');
      if (orderFieldsGroup) {
        orderFieldsGroup.style.display = isOrder ? 'grid' : 'none';
      }
      if (assetSelect) {
        assetSelect.value = isOrder ? 'BTC/USDT' : 'USDT';
      }
    });

    transactionForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const type = eventTypeSelect.value;
        const userId = document.getElementById('userIdInput').value || 'alice';
        const assetOrPair = document.getElementById('assetSelect').value;
        const amount = parseFloat(document.getElementById('amountInput').value);
        const price = parseFloat(document.getElementById('priceInput').value);
        const side = document.getElementById('sideSelect').value;

        if (type === 'BALANCE_DEPOSIT') {
          ledger.appendEvent({
            type,
            payload: { userId, asset: assetOrPair, amount, txHash: `0x${Math.random().toString(16).slice(2, 10)}` }
          });
        } else if (type === 'BALANCE_WITHDRAWAL') {
          ledger.appendEvent({
            type,
            payload: { userId, asset: assetOrPair, amount, fee: 0 }
          });
        } else if (type === 'ORDER_PLACED') {
          ledger.appendEvent({
            type,
            payload: {
              orderId: `ord_${Date.now()}`,
              userId,
              pair: assetOrPair,
              side,
              price,
              amount
            }
          });
        } else if (type === 'ORDER_FILLED') {
          // Fill first open order or direct fill
          const open = ledger.getOpenOrders();
          const target = open.find((o) => o.pair === assetOrPair) || open[0];
          ledger.appendEvent({
            type,
            payload: {
              orderId: target ? target.orderId : `ord_manual_${Date.now()}`,
              userId,
              pair: assetOrPair,
              side,
              price,
              amount,
              filledAmount: amount
            }
          });
        }

        activeReplayIndex = ledger.events.length;
        renderView();
      } catch (err) {
        alert(`Error executing transaction: ${err.message}`);
      }
    });

    // Control Buttons
    document.getElementById('verifyChainBtn')?.addEventListener('click', () => {
      updateIntegrityBanner();
      alert(ledger.verifyCryptographicIntegrity().isValid ? 'Chain verified: 100% Valid!' : 'Tamper detected!');
    });

    document.getElementById('tamperDemoBtn')?.addEventListener('click', () => {
      if (ledger.events.length > 1) {
        ledger.tamperEvent(1, { amount: 999999999 });
        renderView();
        alert('Tampered Event #1! Check cryptographic integrity banner.');
      } else {
        alert('Please append more events first.');
      }
    });

    document.getElementById('reconstructBtn')?.addEventListener('click', () => {
      const res = ledger.reconstructLedger();
      activeReplayIndex = ledger.events.length;
      renderView();
      alert(`Ledger reconstructed. Valid: ${res.isValid}, Events: ${res.totalEvents}`);
    });

    document.getElementById('snapshotBtn')?.addEventListener('click', () => {
      const snap = ledger.snapshotState();
      alert(`State snapshot created! Checksum: ${snap.checksum.slice(0, 16)}...`);
    });

    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(ledger.exportAuditTrail('json'));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `audit_trail_${Date.now()}.json`);
      dlAnchor.click();
    });

    document.getElementById('clearLedgerBtn')?.addEventListener('click', () => {
      if (confirm('Clear all events and reset ledger to genesis state?')) {
        ledger.clear();
        activeReplayIndex = 0;
        renderView();
      }
    });

    ledger.subscribe(() => renderView());
    renderView();
  });
}
