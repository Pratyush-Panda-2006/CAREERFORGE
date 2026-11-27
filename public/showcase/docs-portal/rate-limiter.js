// ---------------------------------------------------------------------------
// DocsPortal Token Bucket Rate Limiter Class
// ---------------------------------------------------------------------------

/**
 * Token Bucket rate limiter with leaky bucket concurrency throttling.
 *
 * Algorithm:
 *   - Tokens refill at a constant rate (refillPerSecond) up to capacity.
 *   - tryConsume(tokens) deducts tokens if enough are available.
 *   - refill() replenishes tokens based on elapsed time.
 *   - getAvailableTokens() returns current token count after refill.
 *   - enqueue()/tick() manage concurrent request slots and a FIFO queue.
 *
 * Invariants:
 *   0 <= this.tokens <= this.capacity
 *   this.active.length <= this.maxConcurrent
 *   this.queue.length <= this.maxQueue
 */
export class DocsPortalTokenBucketRateLimiter {
  /**
   * @param {Object} opts
   * @param {number} [opts.capacity=10]           Maximum tokens stored (1–1000)
   * @param {number} [opts.refillPerSecond=2]    Tokens added per second (0.1–1000)
   * @param {number} [opts.maxConcurrent=3]      Max simultaneous executions (1–20)
   * @param {number} [opts.maxQueue=100]         Max queued requests (1–100)
   * @param {function} [opts.clock=performance.now] Monotonic clock (ms)
   */
  constructor({
    capacity = 10,
    refillPerSecond = 2,
    maxConcurrent = 3,
    maxQueue = 100,
    clock = () => performance.now(),
  } = {}) {
    // Validate capacity
    if (typeof capacity !== 'number') {
      throw new TypeError('Capacity must be a number.');
    }
    if (capacity <= 0 || capacity > 1000) {
      throw new RangeError('Capacity must be greater than 0 and at most 1000.');
    }

    // Validate refill rate
    if (typeof refillPerSecond !== 'number') {
      throw new TypeError('Refill per second must be a number.');
    }
    if (refillPerSecond <= 0 || refillPerSecond > 1000) {
      throw new RangeError('Refill per second must be greater than 0 and at most 1000.');
    }

    // Validate maxConcurrent
    if (
      !Number.isInteger(maxConcurrent) ||
      maxConcurrent < 1 ||
      maxConcurrent > 20
    ) {
      throw new RangeError('Concurrency must be an integer between 1 and 20.');
    }

    // Validate maxQueue
    if (
      !Number.isInteger(maxQueue) ||
      maxQueue < 1 ||
      maxQueue > 100
    ) {
      throw new RangeError('Queue limit must be an integer between 1 and 100.');
    }

    // Validate clock
    if (typeof clock !== 'function') {
      throw new TypeError('Clock must be a function.');
    }

    Object.assign(this, {
      capacity,
      refillPerSecond,
      maxConcurrent,
      maxQueue,
      clock,
    });

    this.lastTime = this.clock();
    this.tokens = this.capacity; // start full
    this.queue = [];
    this.active = [];
    this.sequence = 0;
    this.metrics = {
      accepted: 0,
      completed: 0,
      throttled: 0,
      cancelled: 0,
    };
  }

  /** Monotonic clock accessor. */
  get clock() {
    return this._clock;
  }
  set clock(val) {
    if (typeof val !== 'function') {
      throw new TypeError('Clock must be a function.');
    }
    this._clock = val;
  }

  /** Refill tokens based on elapsed time. */
  refill() {
    const now = this.clock();
    const delta = now - this.lastTime;
    if (delta > 0) {
      this.tokens = Math.min(
        this.capacity,
        this.tokens + (delta / 1000) * this.refillPerSecond
      );
      this.lastTime = now;
    }
    return this.tokens;
  }

  /**
   * Attempt to consume tokens from the bucket.
   *
   * @param {number} [tokens=1] Number of tokens to consume (must be > 0 and <= capacity)
   * @returns {boolean} `true` if tokens were consumed, `false` if insufficient
   * @throws {RangeError} If tokens is not finite, <= 0, or > capacity
   */
  tryConsume(tokens = 1) {
    if (
      !Number.isFinite(tokens) ||
      tokens <= 0 ||
      tokens > this.capacity
    ) {
      throw new RangeError(
        `Token cost must be positive and no larger than capacity.`
      );
    }

    this.refill();

    if (this.tokens < tokens) {
      return false;
    }

    this.tokens -= tokens;
    return true;
  }

  /** Return current available tokens after refill. */
  getAvailableTokens() {
    return this.refill();
  }

  /** Enqueue a pending request for later processing. */
  enqueue({ id, tokens = 1, priority = 0, durationMs = 800 } = {}) {
    if (
      typeof id !== 'string' ||
      !id.trim() ||
      id.length > 64
    ) {
      throw new TypeError('Request ID must contain 1–64 characters.');
    }

    if (this.queue.length >= this.maxQueue) {
      this.metrics.throttled++;
      return false;
    }

    this.queue.push({
      id,
      tokens,
      priority,
      durationMs,
      order: this.sequence++,
    });

    return true;
  }

  /**
   * Advance the internal clock and process the queue.
   * Should be called periodically (e.g., via requestAnimationFrame or setTimeout).
   *
   * @returns {{ started: Array, completed: Array }} Records of started and completed jobs
   */
  tick() {
    this.refill();

    const now = this.lastTime;

    // Remove completed jobs
    const completed = this.active.filter((job) => job.endsAt <= now);
    this.active = this.active.filter((job) => job.endsAt > now);
    this.metrics.completed += completed.length;

    // Start new jobs from the queue up to maxConcurrent
    const started = [];
    while (this.queue.length && this.active.length < this.maxConcurrent) {
      const next = this.queue[0];

      if (this.tokens < next.tokens) {
        // Not enough tokens for the next request; stop processing queue
        break;
      }

      // Deduct tokens and move job from queue to active
      this.tokens -= next.tokens;
      this.queue.shift();

      const job = {
        ...next,
        startedAt: now,
        endsAt: now + next.durationMs,
      };

      this.active.push(job);
      started.push({ ...job });
      this.metrics.accepted++;
    }

    return { started, completed: completed.map((job) => ({ ...job })) };
  }
}

// ---------------------------------------------------------------------------
// UI Bootstrap (auto-mount when DOM is ready)
// ---------------------------------------------------------------------------

/**
 * Mount the rate limiter UI controls to the document.
 * Connects the HTML elements in rate-limiter.html to the rate limiter engine.
 */
export function mountRateLimiterUI({ limiter } = {}) {
  if (typeof limiter === 'undefined') {
    // Create a default limiter if none provided
    limiter = new DocsPortalTokenBucketRateLimiter();
  }

  // Grab DOM elements
  const capacityInput = document.getElementById('capacityInput');
  const refillRateInput = document.getElementById('refillRateInput');
  const maxConcurrentInput = document.getElementById('maxConcurrentInput');
  const maxQueueInput = document.getElementById('maxQueueInput');

  const capacityValDisplay = document.getElementById('capacityValDisplay');
  const refillRateDisplay = document.getElementById('refillRateDisplay');
  const maxConcurrentValDisplay = document.getElementById('maxConcurrentValDisplay');
  const maxQueueValDisplay = document.getElementById('maxQueueValDisplay');

  const bucketLiquid = document.getElementById('bucketLiquid');
  const currentTokensDisplay = document.getElementById('currentTokensDisplay');
  const capacityDisplay = document.getElementById('capacityDisplay');
  const bucketStatusTag = document.getElementById('bucketStatusTag');
  const logStream = document.getElementById('logStream');

  const btnSingle = document.getElementById('btnSingle');
  const btnBatch = document.getElementById('btnBatch');
  const btnBurst = document.getElementById('btnBurst');

  const btnSteady = document.getElementById('btnSteady');
  const btnBurstTest = document.getElementById('btnBurstTest');
  const btnReset = document.getElementById('btnReset');

  let animationFrameId = null;
  let isRunningSteady = false;

  /** Append a log entry */
  function appendLog(message, type = 'system') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    logStream.appendChild(entry);
    logStream.scrollTop = logStream.scrollHeight;
  }

  /** Update the visual bucket fill */
  function updateBucketVisual() {
    const fillRatio = limiter.getAvailableTokens() / Math.max(1, limiter.capacity);
    const percentage = Math.max(0, Math.min(1, fillRatio)) * 100;

    // Update liquid path dash offset for animation
    // Full bucket: offset 0, empty: offset 283
    const dashOffset = (283 * (1 - fillRatio));
    bucketLiquid.style.strokeDashoffset = dashOffset;

    // Update text displays
    currentTokensDisplay.textContent = Math.round(limiter.tokens);
    capacityDisplay.textContent = limiter.capacity;

    // Update status tag
    if (limiter.tokens > 0) {
      bucketStatusTag.textContent = 'HEALTHY';
      bucketStatusTag.className = 'bucket-status-tag bucket-status-accepted';
      bucketStatusTag.classList.add('bucket-status-healthy');
    } else {
      bucketStatusTag.textContent = 'EXHAUSTED';
      bucketStatusTag.className = 'bucket-status-tag bucket-status-throttled';
      bucketStatusTag.classList.add('bucket-status-exhausted');
    }

    // Update timeline
    const rate = limiter.refill() * 10; // approximate requests per 100ms
    const timelineFill = document.getElementById('timelineFill');
    const timelineValue = document.getElementById('timelineValue');
    timelineFill.style.width = `${Math.max(0, Math.min(100, rate * 2))}%`;
    timelineValue.textContent = `${Math.round(rate)} req/s`;
  }

  /** Send a single request */
  function sendSingle() {
    const success = limiter.tryConsume(1);
    const status = success ? 'accepted' : 'throttled';
    appendLog(`Request (1 tok): ${status}`, status);
    updateBucketVisual();

    if (!success) {
      bucketStatusTag.classList.remove('bucket-status-healthy');
      bucketStatusTag.classList.add('bucket-status-throttled');
    }
  }

  /** Send a batch of requests */
  function sendBatch() {
    const success = limiter.tryConsume(3);
    const status = success ? 'accepted' : 'throttled';
    appendLog(`Batch request (3 tok): ${status}`, status);
    updateBucketVisual();

    if (!success) {
      bucketStatusTag.classList.remove('bucket-status-healthy');
      bucketStatusTag.classList.add('bucket-status-throttled');
    }
  }

  /** Send a burst of requests */
  function sendBurst() {
    const success = limiter.tryConsume(8);
    const status = success ? 'accepted' : 'throttled';
    appendLog(`Burst request (8 tok): ${status}`, status);
    updateBucketVisual();

    if (!success) {
      bucketStatusTag.classList.remove('bucket-status-healthy');
      bucketStatusTag.classList.add('bucket-status-throttled');
    }
  }

  /** Steady stream scenario */
  function startSteady() {
    if (isRunningSteady) return;
    isRunningSteady = true;

    let count = 0;
    const intervalId = setInterval(() => {
      if (!isRunningSteady) {
        clearInterval(intervalId);
        return;
      }
      const success = limiter.tryConsume(1);
      const status = success ? 'accepted' : 'throttled';
      appendLog(`Steady stream #${++count}: ${status}`, status);
      updateBucketVisual();

      if (!success && count > 5) {
        // Stop after a few throttled to avoid flooding UI
        clearInterval(intervalId);
        isRunningSteady = false;
        appendLog('Steady stream stopped: bucket exhausted.', 'throttled');
      }
    }, 100);

    // Auto-stop after 5 seconds
    setTimeout(() => {
      isRunningSteady = false;
      clearInterval(intervalId);
      appendLog('Steady stream auto-stopped.', 'system');
    }, 5000);
  }

  /** Burst test - send 20 rapid requests */
  function runBurstTest() {
    appendLog('Running burst test: 20 rapid requests...', 'system');
    let sent = 0;
    let accepted = 0;
    let throttled = 0;

    const check = () => {
      if (sent >= 20) {
        const total = accepted + throttled;
        appendLog(
          `Burst test complete: ${accepted} accepted, ${throttled} throttled (of ${sent} attempted)`,
          'system'
        );
        updateBucketVisual();
        return;
      }

      const success = limiter.tryConsume(1);
      sent++;

      if (success) {
        accepted++;
        appendLog(`Burst #${sent}: accepted`, 'accepted');
      } else {
        throttled++;
        appendLog(`Burst #${sent}: throttled`, 'throttled');
      }

      updateBucketVisual();
      setTimeout(check, 20); // 50ms between attempts
    };

    setTimeout(() => {
      appendLog('Burst test forced stop after 500ms', 'system');
      updateBucketVisual();
    }, 500);

    check();
  }

  /** Reset bucket to full */
  function resetBucket() {
    // Reset tokens to capacity by setting lastTime to now
    limiter.tokens = limiter.capacity;
    limiter.lastTime = limiter.clock();
    appendLog('Bucket reset to full capacity.', 'system');
    updateBucketVisual();
  }

  // -- Event Listeners --

  // Capacity control
  capacityInput.addEventListener('input', () => {
    const value = Math.max(1, Math.min(1000, Number(capacityInput.value) || 10));
    capacityInput.value = value;
    limiter.capacity = value;
    limiter.tokens = Math.min(limiter.tokens, value);
    capacityValDisplay.textContent = `${value} tokens`;
    updateBucketVisual();
    appendLog(`Capacity set to ${value} tokens.`, 'system');
  });

  // Refill rate control
  refillRateInput.addEventListener('input', () => {
    const value = Math.max(0.1, Math.min(100, Number(refillRateInput.value) || 2));
    refillRateInput.value = value;
    limiter.refillPerSecond = value;
    refillRateDisplay.textContent = `${value} tokens/sec`;
    appendLog(`Refill rate set to ${value} tokens/sec.`, 'system');
    updateBucketVisual();
  });

  // Max concurrent control
  maxConcurrentInput.addEventListener('input', () => {
    const value = Math.max(1, Math.min(20, Number(maxConcurrentInput.value) || 3));
    maxConcurrentInput.value = value;
    limiter.maxConcurrent = value;
    maxConcurrentValDisplay.textContent = value;
    appendLog(`Max concurrent set to ${value}.`, 'system');
  });

  // Max queue control
  maxQueueInput.addEventListener('input', () => {
    const value = Math.max(1, Math.min(500, Number(maxQueueInput.value) || 100));
    maxQueueInput.value = value;
    limiter.maxQueue = value;
    maxQueueValDisplay.textContent = value;
    appendLog(`Max queue set to ${value}.`, 'system');
  });

  // Request trigger buttons
  btnSingle.addEventListener('click', sendSingle);
  btnBatch.addEventListener('click', sendBatch);
  btnBurst.addEventListener('click', sendBurst);

  // Traffic scenario buttons
  btnSteady.addEventListener('click', startSteady);
  btnBurstTest.addEventListener('click', runBurstTest);
  btnReset.addEventListener('click', resetBucket);

  // Initialize visual
  updateBucketVisual();

  // Periodic tick to refill tokens
  function tickLoop() {
    limiter.tick();
    updateBucketVisual();
    animationFrameId = requestAnimationFrame(tickLoop);
  }

  // Start the tick loop when UI mounts
  animationFrameId = requestAnimationFrame(tickLoop);

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  return {
    limiter,
    updateBucketVisual,
    appendLog,
    sendSingle,
    sendBatch,
    sendBurst,
    startSteady,
    runBurstTest,
    resetBucket,
  };
}

// ---------------------------------------------------------------------------
// Auto-mount when DOM is ready
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const mounted = mountRateLimiterUI();
    window.__rateLimiterUI = mounted;
  });
}