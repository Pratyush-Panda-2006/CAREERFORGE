// Paper trading only. Prices use integer cents; sizes use integer millionths.
// No wallet, network, leverage, account balances or real execution is involved.
const LOT = 1_000_000;
const PRICE = 100;

function units(value, scale, name) {
  const result = Math.round(value * scale);
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > (scale === PRICE ? 1_000_000_000 : 1_000_000)
      || !Number.isSafeInteger(result) || result < 1
      || Math.abs(result / scale - value) > 1e-9) {
    throw new Error(`${name} must be positive, finite, and use at most ${scale === PRICE ? 2 : 6} decimal places.`);
  }
  return result;
}

export class MatchingEngine {
  constructor() {
    this.book = [];
    this.orders = [];
    this.trades = [];
    this.sequence = 0;
    this.refreshNumber = 0;
  }

  levels(side) {
    const totals = new Map();
    for (const order of this.book.filter(order => order.side === side)) {
      totals.set(order.price, (totals.get(order.price) || 0) + order.remaining);
    }
    return [...totals].sort((a, b) => side === 'buy' ? b[0] - a[0] : a[0] - b[0])
      .map(([price, size]) => ({ price: price / PRICE, size: size / LOT }));
  }

  submit({ side, type, quantity, price, tolerance = 0.5 }) {
    if (!['buy', 'sell'].includes(side) || !['market', 'limit'].includes(type)) throw new Error('Choose a valid side and order type.');
    const remaining = units(quantity, LOT, 'Quantity');
    const limit = type === 'limit' ? units(price, PRICE, 'Limit price') : null;
    if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 50) throw new Error('Tolerance must be between 0 and 50%.');
    if (this.orders.filter(order => order.remaining > 0 && order.status === 'open').length >= 50) throw new Error('Cancel an open order before adding more (50 maximum).');
    const order = { id: `P${++this.sequence}`, sequence: this.sequence, side, type, price: limit,
      quantity: remaining, remaining, filled: 0, notional: 0n, status: 'open', source: 'paper', reference: null, stopReason: '' };
    this.match(order, tolerance);
    if (order.remaining && type === 'limit') this.book.push(order);
    else if (order.remaining) { order.status = 'cancelled'; order.stopReason ||= 'Insufficient liquidity'; }
    this.orders.push(order);
    // Keep open orders plus only the most recent closed orders.
    this.orders = this.orders.filter((item, index, all) => item.status === 'open' || index >= all.length - 100);
    return this.summary(order);
  }

  match(incoming, tolerance = null) {
    const makers = this.book.filter(order => order.side !== incoming.side && order.remaining > 0)
      .sort((a, b) => (incoming.side === 'buy' ? a.price - b.price : b.price - a.price) || a.sequence - b.sequence);
    incoming.reference = makers[0]?.price ?? null;
    for (const maker of makers) {
      if (!incoming.remaining) break;
      if (incoming.price !== null && (incoming.side === 'buy' ? maker.price > incoming.price : maker.price < incoming.price)) break;
      const adverse = incoming.side === 'buy' ? maker.price - incoming.reference : incoming.reference - maker.price;
      // A market order never executes a level beyond its worst-price tolerance.
      // Limit orders are protected by their explicit limit, including future fills.
      if (incoming.type === 'market' && tolerance !== null && adverse / incoming.reference * 100 > tolerance + 1e-9) {
        incoming.stopReason = 'Slippage tolerance reached';
        break;
      }
      const size = Math.min(incoming.remaining, maker.remaining);
      incoming.remaining -= size;
      maker.remaining -= size;
      for (const order of [incoming, maker]) {
        order.filled += size;
        order.notional += BigInt(size) * BigInt(maker.price);
        if (!order.remaining) order.status = 'filled';
      }
      this.trades.unshift({ id: `${incoming.id}-${maker.id}-${this.refreshNumber}`, price: maker.price / PRICE,
        quantity: size / LOT, side: incoming.side, maker: maker.id, taker: incoming.id, time: Date.now() });
      this.trades.length = Math.min(this.trades.length, 30);
    }
    this.book = this.book.filter(order => order.remaining > 0);
  }

  refresh({ bids, asks }) {
    // Validate the entire snapshot before touching any state.
    const parse = rows => rows.map(row => ({ price: units(row.price, PRICE, 'Price'), size: units(row.size, LOT, 'Size') }));
    const buy = parse(bids), sell = parse(asks);
    if (buy.length && sell.length && Math.max(...buy.map(row => row.price)) >= Math.min(...sell.map(row => row.price))) throw new Error('Liquidity snapshot must have a positive spread.');
    this.refreshNumber++;
    this.book = this.book.filter(order => order.source === 'paper');
    for (const [side, rows] of [['sell', sell.sort((a, b) => a.price - b.price)], ['buy', buy.sort((a, b) => b.price - a.price)]]) {
      for (const row of rows) {
        const order = { id: `Q${++this.sequence}`, sequence: this.sequence, side, type: 'limit', price: row.price,
          quantity: row.size, remaining: row.size, filled: 0, notional: 0n, status: 'open', source: 'quote' };
        this.match(order);
        if (order.remaining) this.book.push(order);
      }
    }
  }

  cancel(id) {
    const order = this.orders.find(order => order.id === id && order.status === 'open');
    if (!order) return false;
    order.status = 'cancelled';
    order.stopReason = 'Cancelled by visitor';
    this.book = this.book.filter(item => item !== order);
    return true;
  }

  summary(order) {
    const average = order.filled ? Number(order.notional) / order.filled / PRICE : null;
    const reference = order.reference === null ? null : order.reference / PRICE;
    return { id: order.id, side: order.side, type: order.type, price: order.price === null ? null : order.price / PRICE,
      quantity: order.quantity / LOT, filled: order.filled / LOT, remaining: order.remaining / LOT,
      status: order.status, average, stopReason: order.stopReason,
      slippage: average !== null && reference ? (order.side === 'buy' ? average - reference : reference - average) / reference * 100 : null };
  }
}
