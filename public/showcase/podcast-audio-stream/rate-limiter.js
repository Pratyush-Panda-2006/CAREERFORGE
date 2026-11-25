export class PodcastAudioStreamTokenBucketRateLimiter {
  constructor({ capacity = 10, refillPerSecond = 2, maxConcurrent = 3, maxQueue = 100, clock = () => performance.now() } = {}) {
    for (const [name, value, max] of [['capacity', capacity, 1000], ['refillPerSecond', refillPerSecond, 1000]]) {
      if (!Number.isFinite(value) || value <= 0 || value > max) throw new RangeError(`${name} must be greater than 0 and at most ${max}.`);
    }
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 20) throw new RangeError('Concurrency must be 1–20.');
    if (!Number.isInteger(maxQueue) || maxQueue < 1 || maxQueue > 100) throw new RangeError('Queue limit must be 1–100.');
    if (typeof clock !== 'function') throw new TypeError('Clock must be a function.');
    Object.assign(this, { capacity, refillPerSecond, maxConcurrent, maxQueue, clock });
    this.lastTime = clock();
    if (!Number.isFinite(this.lastTime)) throw new TypeError('Clock must return finite milliseconds.');
    this.tokens = capacity;
    this.queue = [];
    this.active = [];
    this.sequence = 0;
    this.metrics = { accepted: 0, completed: 0, throttled: 0, cancelled: 0 };
  }

  refill() {
    const time = this.clock();
    if (!Number.isFinite(time)) throw new TypeError('Clock must return finite milliseconds.');
    const now = Math.max(time, this.lastTime);
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.lastTime) * this.refillPerSecond / 1000);
    this.lastTime = now;
    return this.tokens;
  }

  tryConsume(tokens = 1) {
    if (!Number.isFinite(tokens) || tokens <= 0 || tokens > this.capacity) throw new RangeError('Token cost must be positive and no larger than capacity.');
    this.refill();
    if (this.tokens < tokens) return false;
    this.tokens -= tokens;
    return true;
  }

  getAvailableTokens() {
    return this.refill();
  }

  enqueue({ id, tokens = 1, priority = 0, durationMs = 800 } = {}) {
    if (typeof id !== 'string' || !id.trim() || id.length > 64) throw new TypeError('Request ID must contain 1–64 characters.');
    if (!Number.isFinite(tokens) || tokens <= 0 || tokens > this.capacity) throw new RangeError('Token cost must be positive and no larger than capacity.');
    if (!Number.isInteger(priority) || priority < 0 || priority > 9) throw new RangeError('Priority must be an integer from 0 to 9.');
    if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 60000) throw new RangeError('Duration must be 0–60000 ms.');
    if ([...this.queue, ...this.active].some(job => job.id === id)) throw new Error('Request ID is already queued or running.');
    if (this.queue.length >= this.maxQueue) { this.metrics.throttled++; return false; }
    this.queue.push({ id, tokens, priority, durationMs, order: this.sequence++ });
    this.queue.sort((a, b) => b.priority - a.priority || a.order - b.order);
    return true;
  }

  tick() {
    this.refill();
    const now = this.lastTime;
    const completed = this.active.filter(job => job.endsAt <= now);
    this.active = this.active.filter(job => job.endsAt > now);
    this.metrics.completed += completed.length;
    const started = [];
    while (this.queue.length && this.active.length < this.maxConcurrent) {
      const next = this.queue[0];
      if (this.tokens < next.tokens) break;
      this.tokens -= next.tokens;
      this.queue.shift();
      const job = { ...next, startedAt: now, endsAt: now + next.durationMs };
      this.active.push(job);
      started.push({ ...job });
      this.metrics.accepted++;
    }
    return { started, completed: completed.map(job => ({ ...job })) };
  }

  cancel(id) {
    const index = this.queue.findIndex(job => job.id === id);
    if (index < 0) return false;
    this.queue.splice(index, 1);
    this.metrics.cancelled++;
    return true;
  }

  snapshot() {
    return {
      tokens: this.refill(),
      capacity: this.capacity,
      queue: [...this.queue],
      active: [...this.active],
      metrics: { ...this.metrics }
    };
  }
}

function mount() {
  const root = document.querySelector('[data-rate-limiter-lab]');
  if (!root) return;

  const limiter = new PodcastAudioStreamTokenBucketRateLimiter({
    capacity: 10,
    refillPerSecond: 2,
    maxConcurrent: 3
  });

  const get = id => root.querySelector(`#${id}`);

  function render() {
    const snap = limiter.snapshot();
    const meter = get('bucket-meter');
    const amount = get('bucket-amount');
    if (meter) {
      meter.max = snap.capacity;
      meter.value = snap.tokens;
    }
    if (amount) {
      amount.textContent = `${snap.tokens.toFixed(1)} / ${snap.capacity} tokens`;
    }

    const acceptedVal = get('metric-accepted');
    if (acceptedVal) acceptedVal.textContent = snap.metrics.accepted;
    const throttledVal = get('metric-throttled');
    if (throttledVal) throttledVal.textContent = snap.metrics.throttled;
  }

  get('consume-1-btn')?.addEventListener('click', () => {
    limiter.tryConsume(1);
    render();
  });

  get('flood-btn')?.addEventListener('click', () => {
    for (let i = 0; i < 5; i++) {
      limiter.tryConsume(1);
    }
    render();
  });

  setInterval(render, 300);
  render();
}

if (typeof document !== 'undefined') mount();
