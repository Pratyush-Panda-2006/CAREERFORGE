export class FestivalHubTokenBucketRateLimiter {
  constructor({ capacity = 10, refillPerSecond = 2, maxConcurrent = 3, maxQueue = 100, clock = () => performance.now() } = {}) {
    for (const [name, value, max] of [['capacity', capacity, 1000], ['refillPerSecond', refillPerSecond, 1000]]) {
      if (!Number.isFinite(value) || value <= 0 || value > max) throw new RangeError(`${name} must be greater than 0 and at most ${max}.`);
    }
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 20) throw new RangeError('Concurrency must be 1–20.');
    if (!Number.isInteger(maxQueue) || maxQueue < 1 || maxQueue > 100) throw new RangeError('Queue limit must be 1–100.');
    if (typeof clock !== 'function') throw new TypeError('Clock must be a function.');
    Object.assign(this, { capacity, refillPerSecond, maxConcurrent, maxQueue, clock });
    this.lastTime = clock();
    this.tokens = capacity;
    this.queue = [];
    this.active = [];
    this.sequence = 0;
    this.metrics = { accepted: 0, completed: 0, throttled: 0, cancelled: 0 };
  }

  refill() {
    const time = this.clock();
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
    if (this.queue.length >= this.maxQueue) { this.metrics.throttled++; return false; }
    this.queue.push({ id, tokens, priority, durationMs, order: this.sequence++ });
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
}
