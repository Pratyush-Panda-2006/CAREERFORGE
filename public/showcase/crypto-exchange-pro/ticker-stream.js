// In-memory transport simulation: no socket, endpoint, account or real market data.
export const reconnectDelay = attempt => Math.min(16000, 1000 * 2 ** Math.min(attempt, 4));
export function nextPrice(price, volatility, random = Math.random) {
  const u = Math.max(Number.EPSILON, random());
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  return Math.max(0.01, price * Math.exp(-0.5 * volatility ** 2 + volatility * z));
}

export class TickerStream {
  constructor(pairs, { random = Math.random, schedule = (fn, ms) => setTimeout(fn, ms), cancel = timer => clearTimeout(timer) } = {}) {
    this.random = random; this.schedule = schedule; this.cancel = cancel;
    this.markets = Object.fromEntries(Object.entries(pairs).map(([key, p]) => [key, { price: p.base, volatility: p.vol, trades: [] }]));
    this.listeners = new Map(); this.timers = new Set(); this.generation = 0;
    this.sequence = 0; this.received = 0; this.dropped = 0; this.recovered = 0;
    this.state = 'stopped'; this.attempt = 0; this.failures = 0; this.dropNext = false;
  }
  on(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    return () => this.listeners.get(type).delete(listener);
  }
  emit(type, value) { this.listeners.get(type)?.forEach(listener => listener(value)); }
  later(fn, delay) {
    const generation = this.generation;
    const timer = this.schedule(() => {
      this.timers.delete(timer);
      if (generation === this.generation) fn();
    }, delay);
    this.timers.add(timer);
  }
  clear() { this.generation++; this.timers.forEach(timer => this.cancel(timer)); this.timers.clear(); }
  setState(state, delay = 0) {
    this.state = state;
    this.emit('status', { state, delay, attempt: this.attempt, dropped: this.dropped, recovered: this.recovered });
  }
  start() {
    if (['connected', 'connecting', 'reconnecting'].includes(this.state)) return;
    this.clear(); this.attempt = 0; this.connect();
  }
  connect() {
    this.setState('connecting');
    this.later(() => {
      if (this.failures > 0) { this.failures--; this.retry(); return; }
      this.attempt = 0; this.setState('connected');
      this.deliver(0, true); this.pump();
    }, 120);
  }
  retry() {
    const delay = reconnectDelay(this.attempt++);
    this.setState('reconnecting', delay);
    this.later(() => this.connect(), delay);
  }
  outage() {
    if (this.state !== 'connected') return;
    this.clear(); this.failures = 2; this.attempt = 0;
    this.setState('disconnected'); this.retry();
  }
  stop() { this.clear(); this.setState('stopped'); }
  pump() {
    this.later(() => {
      if (this.state !== 'connected') return;
      this.sequence++;
      for (const market of Object.values(this.markets)) {
        market.price = nextPrice(market.price, market.volatility, this.random);
        const spread = market.price * 0.00012;
        market.bid = market.price - spread; market.ask = market.price + spread;
        market.trades.unshift({ id: this.sequence, price: market.price, side: this.random() < 0.5 ? 'buy' : 'sell', quantity: 0.01 + this.random() * 2 });
        market.trades.length = Math.min(market.trades.length, 30);
      }
      const latency = 15 + Math.floor(this.random() * 106);
      if (this.dropNext || this.random() < 0.03) {
        this.dropNext = false; this.dropped++; this.emit('drop', this.sequence);
      } else this.later(() => this.deliver(latency), latency);
      this.pump();
    }, 1000);
  }
  deliver(latency, snapshot = false) {
    if (this.state !== 'connected' || (!snapshot && this.sequence <= this.received)) return;
    const gap = Math.max(0, this.sequence - this.received - (snapshot ? 0 : 1));
    this.recovered += gap; this.received = this.sequence;
    // Full snapshots restore book/tape state after a sequence gap, without replaying fills.
    this.emit('packet', { sequence: this.sequence, latency, snapshot: snapshot || gap > 0,
      dropped: this.dropped, recovered: this.recovered, markets: structuredClone(this.markets) });
  }
}
