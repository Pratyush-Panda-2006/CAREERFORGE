export class AutomotiveHypercarTokenBucketRateLimiter {
  constructor(capacity = 10, refillRate = 2, clock = () => Date.now()) {
    if (capacity <= 0 || refillRate < 0) {
      throw new RangeError('Capacity must be > 0 and refillRate >= 0');
    }
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.clock = clock;
    this.tokens = capacity;
    this.lastRefill = this.clock();
  }

  refill() {
    const now = this.clock();
    const elapsedSeconds = Math.max(0, (now - this.lastRefill) / 1000);
    const addedTokens = elapsedSeconds * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
    this.lastRefill = now;
    return this.tokens;
  }

  tryConsume(tokens = 1) {
    if (tokens <= 0) return false;
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  getAvailableTokens() {
    this.refill();
    return Math.floor(this.tokens * 100) / 100;
  }
}

function mount() {
  const root = document.querySelector('[data-rate-limiter-lab]');
  if (!root) return;

  const limiter = new AutomotiveHypercarTokenBucketRateLimiter(12, 3);
  const get = id => root.querySelector(`#${id}`);

  let totalRequests = 0;
  let acceptedRequests = 0;
  let throttledRequests = 0;

  function updateDisplay() {
    const available = limiter.getAvailableTokens();
    const pct = Math.max(0, Math.min(100, (available / limiter.capacity) * 100));

    const fillMeter = get('bucket-fill');
    if (fillMeter) {
      fillMeter.style.height = `${pct}%`;
    }

    const availableDisplay = get('available-tokens');
    if (availableDisplay) {
      availableDisplay.textContent = available.toFixed(1);
    }

    const maxDisplay = get('max-capacity');
    if (maxDisplay) {
      maxDisplay.textContent = String(limiter.capacity);
    }

    const statsElem = get('stats-display');
    if (statsElem) {
      const dropRate = totalRequests > 0 ? ((throttledRequests / totalRequests) * 100).toFixed(1) : '0.0';
      statsElem.textContent = `CAN Packets: ${totalRequests} | Processed: ${acceptedRequests} | Throttled: ${throttledRequests} (${dropRate}%)`;
    }
  }

  function logEvent(count, accepted) {
    const logList = get('event-log');
    if (!logList) return;

    const row = document.createElement('div');
    row.className = `log-entry ${accepted ? 'log-accepted' : 'log-throttled'}`;

    const time = new Date().toLocaleTimeString();
    row.textContent = `[${time}] ECU Telemetry Packet (${count} slot${count > 1 ? 's' : ''}) -> ${accepted ? 'TRANSMITTED (CAN 0x2A)' : 'THROTTLED (Queue Saturated)'}`;

    logList.prepend(row);
    while (logList.children.length > 30) {
      logList.removeChild(logList.lastChild);
    }
  }

  function handleRequest(count) {
    totalRequests += count;
    const allowed = limiter.tryConsume(count);
    if (allowed) {
      acceptedRequests += count;
    } else {
      throttledRequests += count;
    }
    logEvent(count, allowed);
    updateDisplay();
  }

  get('send-1-btn')?.addEventListener('click', () => handleRequest(1));
  get('burst-3-btn')?.addEventListener('click', () => handleRequest(3));
  get('flood-8-btn')?.addEventListener('click', () => handleRequest(8));

  get('reset-btn')?.addEventListener('click', () => {
    limiter.tokens = limiter.capacity;
    limiter.lastRefill = Date.now();
    totalRequests = 0;
    acceptedRequests = 0;
    throttledRequests = 0;
    const logList = get('event-log');
    if (logList) logList.replaceChildren();
    updateDisplay();
  });

  setInterval(updateDisplay, 250);
  updateDisplay();
}

if (typeof document !== 'undefined') mount();
