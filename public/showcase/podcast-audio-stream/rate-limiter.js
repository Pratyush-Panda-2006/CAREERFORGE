const defaultClock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const LOG_LABELS = Object.freeze({
  accepted: 'ACCEPTED',
  throttled: 'THROTTLED',
  queued: 'QUEUED',
  started: 'STARTED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  info: 'INFO'
});

function assertNumberInRange(value, name, min, max, { integer = false, exclusiveMin = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
  const belowMin = exclusiveMin ? value <= min : value < min;
  if (belowMin || value > max || (integer && !Number.isInteger(value))) {
    const relation = exclusiveMin ? 'greater than' : 'at least';
    throw new RangeError(`${name} must be ${relation} ${min} and at most ${max}${integer ? ' (integer)' : ''}.`);
  }
}

/**
 * Token bucket rate limiter with a bounded, priority-aware admission queue and
 * a concurrency throttler. All time calculations use a monotonic millisecond
 * clock, which is injectable for deterministic tests.
 */
export class PodcastAudioStreamTokenBucketRateLimiter {
  constructor({ capacity = 10, refillPerSecond = 2, maxConcurrent = 3, maxQueue = 100, clock = defaultClock } = {}) {
    assertNumberInRange(capacity, 'capacity', 0, 1000, { exclusiveMin: true });
    assertNumberInRange(refillPerSecond, 'refillPerSecond', 0, 1000, { exclusiveMin: true });
    assertNumberInRange(maxConcurrent, 'maxConcurrent', 1, 20, { integer: true });
    assertNumberInRange(maxQueue, 'maxQueue', 1, 100, { integer: true });
    if (typeof clock !== 'function') throw new TypeError('clock must be a function.');

    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.maxConcurrent = maxConcurrent;
    this.maxQueue = maxQueue;
    this.clock = clock;
    this.lastTime = this.#readClock();
    this.tokens = capacity;
    this.queue = [];
    this.active = [];
    this.sequence = 0;
    this.metrics = { accepted: 0, completed: 0, throttled: 0, cancelled: 0 };
  }

  #readClock() {
    const value = this.clock();
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError('clock must return a finite millisecond value.');
    }
    return value;
  }

  /**
   * Adds tokens for the elapsed monotonic time and returns the new balance.
   * Time moving backwards never subtracts tokens.
   */
  refill() {
    const now = this.#readClock();
    if (now > this.lastTime) {
      const elapsedMs = now - this.lastTime;
      this.tokens = Math.min(this.capacity, this.tokens + (elapsedMs * this.refillPerSecond) / 1000);
      this.lastTime = now;
    }
    return this.tokens;
  }

  /**
   * Attempts to spend tokens immediately. Returns false without spending when
   * the bucket cannot cover the requested cost.
   */
  tryConsume(tokens = 1) {
    assertNumberInRange(tokens, 'tokens', 0, this.capacity, { exclusiveMin: true });
    this.refill();
    if (this.tokens < tokens) {
      this.metrics.throttled += 1;
      return false;
    }
    this.tokens = Math.max(0, this.tokens - tokens);
    return true;
  }

  /** Refills first so callers always see the current available balance. */
  getAvailableTokens() {
    return this.refill();
  }

  /**
   * Adds a request to the bounded priority queue. Higher priorities start
   * first; requests with equal priority are served in FIFO order.
   */
  enqueue({ id, tokens = 1, priority = 0, durationMs = 800 } = {}) {
    if (typeof id !== 'string') throw new TypeError('id must be a string.');
    const requestId = id.trim();
    if (requestId.length < 1 || requestId.length > 64) {
      throw new RangeError('id must contain 1–64 non-whitespace characters.');
    }
    assertNumberInRange(tokens, 'tokens', 0, this.capacity, { exclusiveMin: true });
    assertNumberInRange(priority, 'priority', 0, 9, { integer: true });
    assertNumberInRange(durationMs, 'durationMs', 0, 60000);

    const duplicate = this.queue.some((job) => job.id === requestId) || this.active.some((job) => job.id === requestId);
    if (duplicate) throw new Error(`Request "${requestId}" is already queued or running.`);

    if (this.queue.length >= this.maxQueue) {
      this.metrics.throttled += 1;
      return false;
    }

    this.queue.push({ id: requestId, tokens, priority, durationMs, order: this.sequence++ });
    this.queue.sort((a, b) => b.priority - a.priority || a.order - b.order);
    return true;
  }

  /**
   * Advances the engine: completes finished work, then starts as many queued
   * requests as the concurrency limit and token balance allow.
   */
  tick() {
    this.refill();
    const now = this.lastTime;

    const completed = [];
    this.active = this.active.filter((job) => {
      if (job.endsAt <= now) {
        completed.push({ ...job });
        return false;
      }
      return true;
    });
    this.metrics.completed += completed.length;

    const started = [];
    while (this.queue.length > 0 && this.active.length < this.maxConcurrent) {
      const next = this.queue[0];
      if (this.tokens < next.tokens) break;
      this.tokens = Math.max(0, this.tokens - next.tokens);
      this.queue.shift();
      const job = { ...next, startedAt: now, endsAt: now + next.durationMs };
      this.active.push(job);
      started.push({ ...job });
      this.metrics.accepted += 1;
    }

    return { started, completed };
  }

  /** Removes a queued (not running) request. */
  cancel(id) {
    if (typeof id !== 'string') return false;
    const requestId = id.trim();
    const index = this.queue.findIndex((job) => job.id === requestId);
    if (index < 0) return false;
    this.queue.splice(index, 1);
    this.metrics.cancelled += 1;
    return true;
  }

  /** Clears queued and active work and restores the bucket to capacity. */
  reset() {
    this.lastTime = this.#readClock();
    this.tokens = this.capacity;
    this.queue = [];
    this.active = [];
    this.sequence = 0;
    this.metrics = { accepted: 0, completed: 0, throttled: 0, cancelled: 0 };
  }

  /** Immutable view of the engine, suitable for rendering or assertions. */
  snapshot() {
    return {
      tokens: this.refill(),
      capacity: this.capacity,
      queue: this.queue.map((job) => ({ ...job })),
      active: this.active.map((job) => ({ ...job })),
      metrics: { ...this.metrics }
    };
  }
}

function formatElapsed(ms) {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function mount() {
  const root = document.querySelector('[data-rate-limiter-lab]');
  if (!root) return;

  const byId = (id) => root.querySelector(`#${id}`);
  const config = Object.freeze({ capacity: 10, refillPerSecond: 2, maxConcurrent: 3, maxQueue: 20 });
  const startedAt = defaultClock();
  const logList = byId('event-log');
  const queueList = byId('queue-list');
  const slotsRoot = byId('active-slots');
  const slotViews = [];

  let limiter = new PodcastAudioStreamTokenBucketRateLimiter(config);
  let requestSequence = 0;

  function log(kind, message) {
    if (!logList) return;
    const entry = document.createElement('li');
    entry.className = `log-entry log-${kind}`;

    const time = document.createElement('time');
    time.className = 'log-time';
    time.textContent = formatElapsed(defaultClock() - startedAt);

    const badge = document.createElement('span');
    badge.className = `badge badge-${kind}`;
    badge.textContent = LOG_LABELS[kind] ?? kind.toUpperCase();

    const text = document.createElement('span');
    text.className = 'log-message';
    text.textContent = message;

    entry.append(time, badge, text);
    logList.prepend(entry);
    while (logList.children.length > 60) logList.lastElementChild.remove();
  }

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = String(value);
  }

  function buildSlots() {
    if (!slotsRoot) return;
    for (let index = 0; index < config.maxConcurrent; index += 1) {
      const slot = document.createElement('div');
      slot.className = 'slot';

      const number = document.createElement('span');
      number.className = 'slot-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const body = document.createElement('div');
      body.className = 'slot-body';

      const id = document.createElement('span');
      id.className = 'slot-id';
      id.textContent = 'Idle';

      const meta = document.createElement('span');
      meta.className = 'slot-meta';
      meta.textContent = 'slot available';

      const bar = document.createElement('div');
      bar.className = 'slot-bar';
      const fill = document.createElement('span');
      bar.append(fill);

      body.append(id, meta, bar);
      slot.append(number, body);
      slotsRoot.append(slot);
      slotViews.push({ root: slot, id, meta, fill });
    }
  }

  function renderSlots(snapshot, now) {
    slotViews.forEach((view, index) => {
      const job = snapshot.active[index];
      if (!job) {
        view.root.classList.remove('is-active');
        view.id.textContent = 'Idle';
        view.meta.textContent = 'slot available';
        view.fill.style.width = '0%';
        return;
      }

      view.root.classList.add('is-active');
      view.id.textContent = job.id;
      const remaining = Math.max(0, job.endsAt - now);
      const progress = job.durationMs > 0
        ? Math.min(100, Math.max(0, ((job.durationMs - remaining) / job.durationMs) * 100))
        : 100;
      const tokenLabel = job.tokens === 1 ? 'token' : 'tokens';
      view.meta.textContent = `${remaining > 0 ? `${(remaining / 1000).toFixed(1)}s left` : 'finishing'} · ${job.tokens} ${tokenLabel}`;
      view.fill.style.width = `${progress}%`;
    });
  }

  function renderQueue(snapshot) {
    if (!queueList) return;
    queueList.replaceChildren();

    if (snapshot.queue.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'queue-empty';
      empty.textContent = 'Queue is empty. New requests start as soon as a token and a slot are free.';
      queueList.append(empty);
      return;
    }

    for (const job of snapshot.queue) {
      const item = document.createElement('li');
      item.className = 'queue-item';

      const priority = document.createElement('span');
      const priorityTier = job.priority >= 6 ? 'high' : job.priority >= 3 ? 'mid' : 'low';
      priority.className = `priority priority-${priorityTier}`;
      priority.textContent = `P${job.priority}`;

      const id = document.createElement('span');
      id.className = 'queue-id';
      id.textContent = job.id;

      const meta = document.createElement('span');
      meta.className = 'queue-meta';
      meta.textContent = `${job.tokens} token${job.tokens === 1 ? '' : 's'} · ${job.durationMs} ms`;

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'queue-cancel';
      cancel.dataset.requestId = job.id;
      cancel.textContent = 'Cancel';
      cancel.setAttribute('aria-label', `Cancel queued request ${job.id}`);

      item.append(priority, id, meta, cancel);
      queueList.append(item);
    }
  }

  function render() {
    const snapshot = limiter.snapshot();
    const now = limiter.lastTime;
    const percent = snapshot.capacity > 0 ? (snapshot.tokens / snapshot.capacity) * 100 : 0;

    const bucketVisual = byId('bucket-visual');
    if (bucketVisual) {
      bucketVisual.style.setProperty('--fill', percent.toFixed(2));
      bucketVisual.dataset.level = percent <= 15 ? 'low' : percent <= 45 ? 'mid' : 'high';
    }

    setText('bucket-amount', snapshot.tokens.toFixed(1));
    setText('bucket-capacity', snapshot.capacity);
    setText('bucket-percent', `${Math.round(percent)}%`);

    const meter = byId('bucket-meter');
    if (meter) {
      meter.max = snapshot.capacity;
      meter.value = Math.max(0, Math.min(snapshot.capacity, snapshot.tokens));
      meter.textContent = `${snapshot.tokens.toFixed(1)} of ${snapshot.capacity} tokens`;
    }

    setText('metric-accepted', snapshot.metrics.accepted);
    setText('metric-throttled', snapshot.metrics.throttled);
    setText('metric-active', snapshot.active.length);
    setText('metric-queued', snapshot.queue.length);
    setText('queue-count', `${snapshot.queue.length} waiting`);

    renderSlots(snapshot, now);
    renderQueue(snapshot);
  }

  function enqueueBurst(count, priority, durationMs, label) {
    const slug = label.toLowerCase().replace(/\s+/g, '-');
    let queued = 0;
    let rejected = 0;

    for (let index = 0; index < count; index += 1) {
      const id = `${slug}-${String(++requestSequence).padStart(3, '0')}`;
      if (limiter.enqueue({ id, tokens: 1, priority, durationMs })) {
        queued += 1;
        log('queued', `${id} queued · priority ${priority} · 1 token`);
      } else {
        rejected += 1;
        log('throttled', `${id} rejected · queue full (${limiter.maxQueue})`);
      }
    }

    log('info', `${label}: ${queued} queued, ${rejected} throttled`);
    render();
  }

  byId('consume-1-btn')?.addEventListener('click', () => {
    if (limiter.tryConsume(1)) {
      log('accepted', 'Direct request admitted · 1 token consumed');
    } else {
      log('throttled', `Direct request rejected · only ${limiter.getAvailableTokens().toFixed(2)} token(s) available`);
    }
    render();
  });

  byId('flood-btn')?.addEventListener('click', () => {
    enqueueBurst(5, 6, 900, 'Listener surge');
  });

  byId('burst-btn')?.addEventListener('click', () => {
    enqueueBurst(20, 1, 1200, 'Burst flood');
  });

  byId('reset-btn')?.addEventListener('click', () => {
    limiter.reset();
    requestSequence = 0;
    if (logList) logList.replaceChildren();
    log('info', 'Engine reset · bucket refilled to capacity, queue and metrics cleared');
    render();
  });

  byId('enqueue-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const priority = Number(byId('request-priority')?.value ?? 0);
    const tokens = Number(byId('request-cost')?.value ?? 1);
    const durationMs = Number(byId('request-duration')?.value ?? 900);
    const id = `request-${String(++requestSequence).padStart(3, '0')}`;

    try {
      if (limiter.enqueue({ id, tokens, priority, durationMs })) {
        log('queued', `${id} queued · priority ${priority} · ${tokens} token${tokens === 1 ? '' : 's'} · ${durationMs} ms`);
      } else {
        log('throttled', `${id} rejected · queue full (${limiter.maxQueue})`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log('throttled', `${id} rejected · ${message}`);
    }
    render();
  });

  queueList?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-request-id]');
    if (!button) return;
    const id = button.dataset.requestId;
    if (id && limiter.cancel(id)) {
      log('cancelled', `${id} removed from the priority queue`);
      render();
    }
  });

  buildSlots();
  log('info', `Engine ready · ${config.capacity} token burst · ${config.refillPerSecond} tokens/sec · ${config.maxConcurrent} concurrent slots`);
  render();

  setInterval(() => {
    const { started, completed } = limiter.tick();
    for (const job of completed) {
      log('completed', `${job.id} completed · concurrency slot released`);
    }
    for (const job of started) {
      log('started', `${job.id} started · priority ${job.priority} · ${job.tokens} token${job.tokens === 1 ? '' : 's'}`);
    }
    render();
  }, 250);
}

if (typeof document !== 'undefined') {
  mount();
}
