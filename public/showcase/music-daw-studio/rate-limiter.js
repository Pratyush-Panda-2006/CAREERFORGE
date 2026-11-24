export class MusicDawStudioTokenBucketRateLimiter {
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
      available: this.getAvailableTokens(),
      capacity: this.capacity,
      queue: this.queue.map(job => ({ ...job })),
      active: this.active.map(job => ({ ...job })),
      metrics: { ...this.metrics }
    };
  }
}

function mount() {
  const form = document.querySelector('#limiter-config');
  if (!form) return;
  const get = id => document.getElementById(id);
  let engine = new MusicDawStudioTokenBucketRateLimiter();
  let nextId = 1;
  const events = [];

  function log(message, kind = 'info') {
    events.unshift({ message, kind });
    events.length = Math.min(events.length, 100);
  }

  function render() {
    const s = engine.snapshot();
    const pct = Math.round((s.available / s.capacity) * 100);
    const amount = get('bucket-amount');
    if (amount) amount.textContent = `${s.available.toFixed(1)} / ${s.capacity} tokens (${pct}%)`;

    const meter = get('bucket-meter');
    if (meter) {
      meter.max = s.capacity;
      meter.value = s.available;
    }

    const fill = get('reservoir-fill');
    if (fill) fill.style.height = `${pct}%`;

    const activeEl = get('active-count');
    if (activeEl) activeEl.textContent = `${s.active.length} / ${engine.maxConcurrent}`;

    const running = get('running');
    if (running) {
      running.textContent = s.active.length
        ? s.active.map(j => `[Voice #${j.id}] cost:${j.tokens} pr:${j.priority}`).join(' · ')
        : 'No audio voices rendering';
    }

    const queueEl = get('queue-count');
    if (queueEl) queueEl.textContent = `${s.queue.length} / ${engine.maxQueue}`;

    const qList = get('queue');
    if (qList) {
      qList.replaceChildren();
      for (const item of s.queue) {
        const li = document.createElement('li');
        li.textContent = `[Voice #${item.id}] Priority:${item.priority} Cost:${item.tokens}`;
        qList.appendChild(li);
      }
    }

    const m = s.metrics;
    if (get('accepted')) get('accepted').textContent = String(m.accepted);
    if (get('completed')) get('completed').textContent = String(m.completed);
    if (get('throttled')) get('throttled').textContent = String(m.throttled);
    if (get('cancelled')) get('cancelled').textContent = String(m.cancelled);

    const logList = get('event-log');
    if (logList) {
      logList.replaceChildren();
      for (const e of events) {
        const li = document.createElement('li');
        li.className = e.kind;
        li.textContent = e.message;
        logList.appendChild(li);
      }
    }
  }

  setInterval(() => {
    const res = engine.tick();
    for (const job of res.started) log(`Voice #${job.id} started rendering (cost ${job.tokens} tokens)`, 'accepted');
    for (const job of res.completed) log(`Voice #${job.id} finished audio synthesis`, 'completed');
    render();
  }, 100);

  get('send-one')?.addEventListener('click', () => {
    const cost = Number(get('cost')?.value || 1);
    const prio = Number(get('priority')?.value || 0);
    const ok = engine.enqueue({ id: `v-${nextId++}`, tokens: cost, priority: prio });
    if (!ok) log('Voice dispatch throttled (DSP queue full)', 'throttled');
    render();
  });

  get('send-flood')?.addEventListener('click', () => {
    for (let i = 0; i < 12; i++) {
      const ok = engine.enqueue({ id: `v-${nextId++}`, tokens: 1, priority: 5 });
      if (!ok) log('Voice dispatch throttled (DSP queue full)', 'throttled');
    }
    render();
  });

  get('fill-queue')?.addEventListener('click', () => {
    for (let i = 0; i < 120; i++) {
      const ok = engine.enqueue({ id: `v-${nextId++}`, tokens: 1, priority: 0 });
      if (!ok) log('Voice dispatch throttled (DSP queue full)', 'throttled');
    }
    render();
  });

  get('clear-queue')?.addEventListener('click', () => {
    const s = engine.snapshot();
    for (const job of s.queue) {
      engine.cancel(job.id);
      log(`Cancelled voice #${job.id}`, 'cancelled');
    }
    render();
  });

  render();
}

if (typeof document !== 'undefined') mount();
