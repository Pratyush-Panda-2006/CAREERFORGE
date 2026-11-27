/**
 * Developer Portfolio - Resilient WebSocket Connection Manager
 * Implements ping/pong heartbeats, automated exponential backoff with jitter
 * on disconnect, queued offline messages, and connection state recovery.
 */

export class DeveloperPortfolioResilientSocket {
  constructor(url = 'wss://live.developer-portfolio.io/stream', options = {}) {
    this.url = url;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.jitter = options.jitter ?? true;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5000;

    this.status = 'DISCONNECTED';
    this.reconnectAttempts = 0;
    this.queue = [];
    this.sentMessages = [];
    this.reconnectTimer = null;
    this.connectTimer = null;
    this.connectGeneration = 0;
    this.heartbeatTimer = null;
    this.onStateChange = null;
    this.lastHeartbeatAck = false;
    this.heartbeatsCompleted = 0;
    this.lastBackoffMs = 0;
    this.nextRetryAt = null;
    this.connectionStartTime = null;
    this.connectionTimeline = [];
    this.#addTimelineEvent('init', 'Socket instance created');
  }

  #addTimelineEvent(type, description) {
    this.connectionTimeline.push({
      timestamp: Date.now(),
      type,
      description,
    });
    if (this.connectionTimeline.length > 50) {
      this.connectionTimeline.shift();
    }
    this.#notifyStateChange();
  }

  #notifyStateChange() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.status, this.#getStatusMetadata());
    }
  }

  #getStatusMetadata() {
    return {
      status: this.status,
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxAttempts,
      queueSize: this.queue.length,
      sentCount: this.sentMessages.length,
      nextRetryInMs: this.status === 'RECONNECTING' && this.nextRetryAt !== null
        ? Math.max(0, this.nextRetryAt - Date.now())
        : 0,
      heartbeatsCompleted: this.heartbeatsCompleted,
      timeline: this.connectionTimeline.slice(-10),
    };
  }

  #setStatus(newStatus) {
    this.status = newStatus;
    this.#notifyStateChange();
  }

  // === Core Methods ===

  /**
   * Exponential backoff: base * 2^attempt, clamped to maxBackoffMs.
   * Optional jitter spreads retries between 0.5x and 1.5x of the capped value.
   */
  calculateBackoff(attempt) {
    if (typeof attempt !== 'number' || !Number.isFinite(attempt) || attempt < 0) {
      throw new RangeError('Attempt must be a non-negative number');
    }
    const exponential = this.baseBackoffMs * Math.pow(2, attempt);
    const capped = Math.min(this.maxBackoffMs, exponential);
    if (this.jitter) {
      const jitterFactor = 0.5 + Math.random(); // 0.5 .. 1.5
      return Math.round(Math.min(this.maxBackoffMs, capped * jitterFactor));
    }
    return Math.round(capped);
  }

  connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.connectGeneration += 1;
    const generation = this.connectGeneration;

    this.status = 'CONNECTING';
    this.connectionStartTime = Date.now();
    this.#addTimelineEvent('connect', 'Attempting WebSocket connection');

    return new Promise((resolve) => {
      // Simulate connection establishment. The generation + status guard makes
      // this safe if disconnect()/simulateDrop() happens before the timer fires.
      const timer = setTimeout(() => {
        if (this.connectTimer === timer) {
          this.connectTimer = null;
        }
        if (generation !== this.connectGeneration || this.status !== 'CONNECTING') {
          resolve(false);
          return;
        }
        this.status = 'CONNECTED';
        this.reconnectAttempts = 0;
        this.lastBackoffMs = 0;
        this.nextRetryAt = null;
        this.#addTimelineEvent('connected', 'WebSocket connection established');
        this.#startHeartbeat();
        this.flushQueue();
        resolve(true);
      }, 50);
      this.connectTimer = timer;
    });
  }

  // === Heartbeat Management ===

  #startHeartbeat() {
    this.#stopHeartbeat();
    if (this.heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => this.#sendPing(), this.heartbeatIntervalMs);
      this.heartbeatTimer.unref?.();
    }
  }

  #stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  #sendPing() {
    if (this.status !== 'CONNECTED') return;
    this.lastHeartbeatAck = false;

    // Simulate the server's pong acknowledgment.
    const pongTimer = setTimeout(() => {
      if (this.status !== 'CONNECTED') return;
      this.lastHeartbeatAck = true;
      this.heartbeatsCompleted += 1;
      this.#notifyStateChange();
    }, 50);
    pongTimer.unref?.();

    // If no pong arrived within half an interval, treat the link as dead.
    const timeoutTimer = setTimeout(
      () => this.#checkHeartbeatTimeout(),
      Math.max(100, this.heartbeatIntervalMs / 2)
    );
    timeoutTimer.unref?.();
  }

  #checkHeartbeatTimeout() {
    if (!this.lastHeartbeatAck && this.status === 'CONNECTED') {
      this.#addTimelineEvent('heartbeat_timeout', 'Heartbeat pong not received');
      this.simulateDrop();
    }
  }

  // === Simulation & Control ===

  /**
   * Simulates an unexpected connection drop. Repeated calls model consecutive
   * failed reconnect attempts until maxAttempts is exhausted.
   */
  simulateDrop() {
    if (this.status !== 'CONNECTED' && this.status !== 'CONNECTING' && this.status !== 'RECONNECTING') {
      return;
    }

    if (this.reconnectAttempts >= this.maxAttempts) {
      this.nextRetryAt = null;
      this.#setStatus('FAILED');
      this.#addTimelineEvent('failed', 'Max reconnection attempts exceeded');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Compute the next delay and bump the attempt counter before notifying
    // listeners so the countdown and metadata are consistent on first render.
    const delay = this.calculateBackoff(this.reconnectAttempts);
    this.lastBackoffMs = delay;
    this.reconnectAttempts += 1;
    const waitMs = Math.max(delay, 50);
    this.nextRetryAt = Date.now() + waitMs;

    this.#setStatus('RECONNECTING');
    this.#addTimelineEvent(
      'reconnect_attempt',
      `Attempt ${this.reconnectAttempts}/${this.maxAttempts} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.nextRetryAt = null;
      if (this.status !== 'RECONNECTING') return;
      if (this.reconnectAttempts <= this.maxAttempts) {
        this.connect();
      } else {
        this.#setStatus('FAILED');
        this.#addTimelineEvent('failed', 'Max reconnection attempts exceeded');
      }
    }, waitMs);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.#stopHeartbeat();
    this.reconnectAttempts = 0;
    this.lastBackoffMs = 0;
    this.nextRetryAt = null;
    this.#setStatus('DISCONNECTED');
    this.#addTimelineEvent('disconnect', 'Manual disconnection');
  }

  send(message) {
    if (message === undefined || message === null) {
      throw new TypeError('Message cannot be null or undefined');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    if (this.status === 'CONNECTED') {
      this.sentMessages.push({
        payload,
        timestamp: Date.now(),
        status: 'DELIVERED',
        deliveredAt: Date.now(),
      });
      this.#addTimelineEvent('deliver', `Delivered: ${this.#preview(payload)}`);
      return true;
    }

    this.queue.push({
      payload,
      timestamp: Date.now(),
      status: 'QUEUED',
    });
    this.#addTimelineEvent('queue', `Queued: ${this.#preview(payload)}`);
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
    if (flushed.length > 0) {
      this.#addTimelineEvent('queue_flush', `Flushed ${flushed.length} queued message(s)`);
    }
    return flushed;
  }

  #preview(payload) {
    return payload.length > 30 ? `${payload.slice(0, 30)}...` : payload;
  }

  // === Getters ===

  getStatus() {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.queue.length,
      sentMessages: this.sentMessages.length,
      maxAttempts: this.maxAttempts,
      baseBackoffMs: this.baseBackoffMs,
      maxBackoffMs: this.maxBackoffMs,
      jitter: this.jitter,
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      heartbeatsCompleted: this.heartbeatsCompleted,
      timeline: this.connectionTimeline.slice(),
    };
  }
}

// === Browser demo wiring (skipped when imported in Node for tests) ===

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const socket = new DeveloperPortfolioResilientSocket();
  const $ = (id) => document.getElementById(id);

  const statePill = $('statePill');
  const reconnectCount = $('reconnectCount');
  const queueCount = $('queueCount');
  const heartbeatCount = $('heartbeatCount');
  const connectBtn = $('connectBtn');
  const disconnectBtn = $('disconnectBtn');
  const dropoutBtn = $('dropoutBtn');
  const backoffTimer = $('backoffTimer');
  const backoffCount = $('backoffCount');
  const queueLog = $('queueLog');
  const queueBadge = $('queueBadge');
  const timelineLog = $('timelineLog');
  const messageInput = $('messageInput');
  const sendBtn = $('sendBtn');
  const messageLog = $('messageLog');

  let countdownTimer = null;
  let countdownAttempt = 0;
  let countdownEndsAt = 0;

  function stopCountdown() {
    if (countdownTimer !== null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdownAttempt = 0;
    countdownEndsAt = 0;
  }

  function startCountdown(ms, attempt) {
    // Ignore duplicate renders for the same retry attempt so unrelated
    // updates (e.g. sending a message) don't restart the countdown.
    if (countdownTimer !== null && countdownAttempt === attempt && countdownEndsAt > Date.now()) {
      return;
    }
    stopCountdown();
    if (!backoffTimer || !backoffCount) return;
    countdownAttempt = attempt;
    countdownEndsAt = Date.now() + Math.max(0, ms);
    backoffTimer.style.display = 'flex';
    backoffCount.textContent = String(Math.max(0, ms));
    if (ms <= 0) return;
    countdownTimer = setInterval(() => {
      const remaining = Math.max(0, countdownEndsAt - Date.now());
      backoffCount.textContent = String(remaining);
      if (remaining <= 0) {
        stopCountdown();
        backoffTimer.style.display = 'none';
        backoffCount.textContent = '0';
      }
    }, 100);
  }

  function renderTimeline(timeline) {
    if (!timelineLog) return;
    timelineLog.textContent = '';
    const events = timeline.slice().reverse();
    for (const event of events) {
      const row = document.createElement('div');
      row.className = 'event';

      const time = document.createElement('span');
      time.className = 'event-time';
      time.textContent = new Date(event.timestamp).toLocaleTimeString();

      const type = document.createElement('span');
      type.className = 'event-type';
      type.textContent = event.type;

      const desc = document.createElement('span');
      desc.className = 'event-desc';
      desc.textContent = event.description;

      row.append(time, type, desc);
      timelineLog.appendChild(row);
    }
  }

  function renderQueue() {
    if (!queueLog) return;
    queueLog.textContent = '';
    if (socket.queue.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-hint';
      empty.textContent = 'No queued messages.';
      queueLog.appendChild(empty);
      return;
    }
    for (const item of socket.queue) {
      const card = document.createElement('div');
      card.className = 'queue-item queued';
      const payload = document.createElement('span');
      payload.textContent = item.payload;
      const badge = document.createElement('span');
      badge.className = 'queue-item-state';
      badge.textContent = 'QUEUED';
      card.append(payload, badge);
      queueLog.appendChild(card);
    }
  }

  function renderMessageLog() {
    if (!messageLog) return;
    messageLog.textContent = '';
    if (socket.sentMessages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-hint';
      empty.textContent = 'No messages delivered yet.';
      messageLog.appendChild(empty);
      return;
    }
    for (const item of socket.sentMessages.slice().reverse()) {
      const card = document.createElement('div');
      card.className = 'message-card';

      const payload = document.createElement('div');
      payload.className = 'message-payload';
      payload.textContent = item.payload;

      const meta = document.createElement('div');
      meta.className = 'message-meta';
      meta.textContent = `${item.status} - ${new Date(item.deliveredAt || item.timestamp).toLocaleTimeString()}`;

      card.append(payload, meta);
      messageLog.appendChild(card);
    }
  }

  function render(status, meta) {
    const pillState = status.toLowerCase();
    if (statePill) {
      statePill.textContent = status;
      statePill.className = `state-pill ${pillState}`;
    }
    if (reconnectCount) reconnectCount.textContent = String(meta.attempts);
    if (queueCount) queueCount.textContent = String(meta.queueSize);
    if (queueBadge) queueBadge.textContent = String(meta.queueSize);
    if (heartbeatCount) heartbeatCount.textContent = String(meta.heartbeatsCompleted ?? 0);

    if (connectBtn) connectBtn.disabled = status === 'CONNECTED' || status === 'CONNECTING';
    if (disconnectBtn) disconnectBtn.disabled = status === 'DISCONNECTED';
    if (dropoutBtn) dropoutBtn.disabled = status !== 'CONNECTED' && status !== 'RECONNECTING';

    if (status === 'RECONNECTING' && meta.nextRetryInMs > 0) {
      startCountdown(meta.nextRetryInMs, meta.attempts);
    } else {
      stopCountdown();
      if (backoffTimer) backoffTimer.style.display = 'none';
    }

    renderQueue();
    renderMessageLog();
    renderTimeline(meta.timeline || []);
  }

  socket.onStateChange = render;

  connectBtn?.addEventListener('click', async () => {
    await socket.connect();
  });

  disconnectBtn?.addEventListener('click', () => {
    socket.disconnect();
  });

  dropoutBtn?.addEventListener('click', () => {
    socket.simulateDrop();
  });

  function refresh() {
    const snapshot = socket.getStatus();
    render(snapshot.status, {
      attempts: snapshot.reconnectAttempts,
      queueSize: snapshot.queueLength,
      nextRetryInMs: snapshot.status === 'RECONNECTING' && socket.nextRetryAt !== null
        ? Math.max(0, socket.nextRetryAt - Date.now())
        : 0,
      heartbeatsCompleted: snapshot.heartbeatsCompleted,
      timeline: snapshot.timeline.slice(-10),
    });
  }

  function submitMessage() {
    if (!messageInput) return;
    const value = messageInput.value.trim();
    if (!value) return;
    socket.send(value);
    messageInput.value = '';
    refresh();
  }

  sendBtn?.addEventListener('click', submitMessage);
  messageInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitMessage();
  });

  refresh();
}
