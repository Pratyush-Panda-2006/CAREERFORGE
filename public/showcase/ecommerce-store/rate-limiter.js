/**
 * EcommerceStore Token Bucket Rate Limiter
 *
 * Implements the Token Bucket algorithm with:
 * - Adjustable capacity (max tokens in bucket)
 * - Refill rate (tokens per second)
 * - Burst capacity (up to capacity tokens can be consumed at once)
 * - Concurrency throttling (max simultaneous requests)
 * - Queue prioritization with FIFO ordering
 * - Time-based token replenishment
 * - Metrics tracking (accepted, throttled, completed, cancelled)
 */
export class EcommerceStoreTokenBucketRateLimiter {
  constructor({
    capacity = 10,
    refillPerSecond = 2,
    maxConcurrent = 3,
    maxQueue = 100,
    clock = () => performance.now(),
  } = {}) {
    // Validate inputs
    if (!Number.isFinite(capacity) || capacity <= 0 || capacity > 1000)
      throw new RangeError('Capacity must be greater than 0 and at most 1000.');
    if (!Number.isFinite(refillPerSecond) || refillPerSecond <= 0 || refillPerSecond > 1000)
      throw new RangeError('Refill per second must be greater than 0 and at most 1000.');
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 20)
      throw new RangeError('Concurrency must be 1–20.');
    if (!Number.isInteger(maxQueue) || maxQueue < 1 || maxQueue > 100)
      throw new RangeError('Queue limit must be 1–100.');
    if (typeof clock !== 'function') throw new TypeError('Clock must be a function.');

    Object.assign(this, { capacity, refillPerSecond, maxConcurrent, maxQueue, clock });

    this.lastTime = clock();
    this.tokens = capacity; // Start with full bucket
    this.queue = [];       // Pending request queue
    this.active = [];      // Currently executing requests
    this.sequence = 0;     // Tie-breaker for priority ordering
    this.metrics = {
      accepted: 0,
      completed: 0,
      throttled: 0,
      cancelled: 0,
      active: 0,
    };

    // UI / rendering callbacks (optional; set by the showcase)
    this.onUpdate = null; // called with { tokens, metrics, bucketFillPct }
  }

  /** Replenish tokens based on elapsed time. */
  refill() {
    const time = this.clock();
    const now = Math.max(time, this.lastTime);
    const elapsedSec = (now - this.lastTime) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSecond);
    this.lastTime = now;

    // Notify UI of update if a callback is registered
    if (this.onUpdate) {
      const bucketFillPct = Math.round((this.tokens / this.capacity) * 100);
      this.onUpdate({ tokens: this.tokens, metrics: { ...this.metrics }, bucketFillPct });
    }

    return this.tokens;
  }

  /** Attempt to consume tokens. Returns true if allowed, false if throttled. */
  tryConsume(tokens = 1) {
    if (!Number.isFinite(tokens) || tokens <= 0 || tokens > this.capacity)
      throw new RangeError('Token cost must be positive and no larger than capacity.');

    this.refill();

    if (this.tokens < tokens) {
      this.metrics.throttled++;
      return false;
    }

    this.tokens -= tokens;
    this.metrics.accepted++;
    return true;
  }

  /** Get the current number of available (refilled) tokens. */
  getAvailableTokens() {
    return this.refill();
  }

  /** Enqueue a request with optional priority and duration. Returns true if accepted. */
  enqueue({ id, tokens = 1, priority = 0, durationMs = 800 } = {}) {
    if (typeof id !== 'string' || !id.trim() || id.length > 64)
      throw new TypeError('Request ID must contain 1–64 characters.');

    this.refill();

    if (this.tokens < tokens) {
      this.metrics.throttled++;
      return false;
    }

    if (this.queue.length >= this.maxQueue) {
      this.metrics.throttled++;
      return false;
    }

    // Store with ordering sequence; higher priority = lower order number (sorted later in tick)
    this.queue.push({
      id,
      tokens,
      priority,
      durationMs,
      order: this.sequence++, // lower order = processed first within same priority
    });

    // Resort queue: priority descending, then order ascending (FIFO within same priority)
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority; // higher priority first
      return a.order - b.order; // FIFO within same priority
    });

    return true;
  }

  /** Advance one tick: refill tokens, complete expired jobs, start new jobs from queue. */
  tick() {
    this.refill();

    const now = this.lastTime;

    // Mark completed jobs (those whose end time has been reached)
    const completed = this.active.filter(job => job.endsAt <= now);
    this.active = this.active.filter(job => job.endsAt > now);
    this.metrics.completed += completed.length;
    this.metrics.active -= completed.length;

    // Try to start new jobs from the queue, up to maxConcurrent
    const started = [];
    while (this.queue.length && this.active.length < this.maxConcurrent) {
      const next = this.queue[0];
      if (this.tokens < next.tokens) break; // not enough tokens for next job

      this.tokens -= next.tokens;
      this.queue.shift();
      const job = { ...next, startedAt: now, endsAt: now + next.durationMs };
      this.active.push(job);
      started.push({ ...job });
      this.metrics.accepted++;
      this.metrics.active++;
    }

    // Notify UI after tick
    if (this.onUpdate) {
      const bucketFillPct = this.capacity > 0 ? Math.round((this.tokens / this.capacity) * 100) : 0;
      this.onUpdate({ tokens: this.tokens, metrics: { ...this.metrics }, bucketFillPct });
    }

    return { started, completed: completed.map(job => ({ ...job })) };
  }

  /** Cancel a pending or active request by ID. Returns true if cancelled. */
  cancel(id) {
    // Cancel from queue
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].id === id) {
        this.queue.splice(i, 1);
        this.metrics.cancelled++;
        return true;
      }
    }

    // Cancel from active (mark as completed early)
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i].id === id) {
        this.active[i].endedEarly = true;
        this.metrics.completed++;
        this.metrics.cancelled++;
        this.active.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  /** Get current state summary. */
  getState() {
    return {
      tokens: this.refill(),
      capacity: this.capacity,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue,
      metrics: { ...this.metrics },
      queueLength: this.queue.length,
      activeCount: this.active.length,
    };
  }
}