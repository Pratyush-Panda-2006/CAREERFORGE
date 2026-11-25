export class DeveloperPortfolioResilientSocket {
  constructor(url = 'wss://live.developer-portfolio.io/stream', options = {}) {
    this.url = url;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.jitter = options.jitter ?? false;

    this.status = 'DISCONNECTED';
    this.reconnectAttempts = 0;
    this.queue = [];
    this.sentMessages = [];
    this.reconnectTimer = null;
    this.onStateChange = null;
  }

  calculateBackoff(attempt) {
    if (typeof attempt !== 'number' || attempt < 0) {
      throw new RangeError('Attempt must be a non-negative number');
    }
    const exponential = this.baseBackoffMs * Math.pow(2, attempt);
    const capped = Math.min(this.maxBackoffMs, exponential);
    if (this.jitter) {
      const jitterVal = Math.random() * 0.3 * capped;
      return Math.round(capped + jitterVal);
    }
    return Math.round(capped);
  }

  #setStatus(newStatus) {
    this.status = newStatus;
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.status, {
        attempts: this.reconnectAttempts,
        queueSize: this.queue.length
      });
    }
  }

  connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.#setStatus('CONNECTING');

    return new Promise((resolve) => {
      setTimeout(() => {
        this.#setStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.flushQueue();
        resolve(true);
      }, 50);
    });
  }

  simulateDrop() {
    if (this.status !== 'CONNECTED' && this.status !== 'CONNECTING') return;

    if (this.reconnectAttempts >= this.maxAttempts) {
      this.#setStatus('FAILED');
      return;
    }

    this.#setStatus('RECONNECTING');
    const delay = this.calculateBackoff(this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (this.reconnectAttempts <= this.maxAttempts) {
        this.connect();
      } else {
        this.#setStatus('FAILED');
      }
    }, Math.min(delay, 200));
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.#setStatus('DISCONNECTED');
  }

  send(message) {
    if (message === undefined || message === null) {
      throw new TypeError('Message cannot be null or undefined');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    if (this.status === 'CONNECTED') {
      this.sentMessages.push({ payload, timestamp: Date.now(), status: 'DELIVERED' });
      return true;
    }

    this.queue.push({ payload, timestamp: Date.now(), status: 'QUEUED' });
    return false;
  }

  flushQueue() {
    if (this.status !== 'CONNECTED') {
      return [];
    }

    const flushed = [];
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item.status = 'DELIVERED';
      item.deliveredAt = Date.now();
      this.sentMessages.push(item);
      flushed.push(item);
    }
    return flushed;
  }
}
