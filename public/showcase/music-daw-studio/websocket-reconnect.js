export class MusicDawStudioResilientSocket {
  constructor(url = 'wss://daw-sync.musicstudio.local/session-stream', options = {}) {
    this.url = url;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.jitter = options.jitter ?? false;

    this.status = 'DISCONNECTED'; // DISCONNECTED | CONNECTING | CONNECTED | RECONNECTING | FAILED
    this.reconnectAttempts = 0;
    this.queue = [];
    this.sentMessages = [];
    this.reconnectTimer = null;
    this.onStateChange = null;
    this.onMessage = null;
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

    // Offline message queuing
    this.queue.push({ payload, timestamp: Date.now(), status: 'QUEUED' });
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.status, {
        attempts: this.reconnectAttempts,
        queueSize: this.queue.length
      });
    }
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
      this.sentMessages.push(item);
      flushed.push(item);
    }

    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.status, {
        attempts: this.reconnectAttempts,
        queueSize: this.queue.length
      });
    }

    return flushed;
  }
}

function mount() {
  const root = document.querySelector('[data-websocket-lab]');
  if (!root) return;

  const socket = new MusicDawStudioResilientSocket();
  const get = id => root.querySelector(`#${id}`);

  function updateStatus(status, meta) {
    const pill = get('connection-status-pill');
    if (pill) {
      pill.textContent = status;
      pill.className = `status-pill pill-${status.toLowerCase()}`;
    }

    const attempts = get('attempts-count');
    if (attempts) {
      attempts.textContent = `${meta.attempts} / ${socket.maxAttempts}`;
    }

    const queueEl = get('queue-count');
    if (queueEl) {
      queueEl.textContent = `${meta.queueSize} buffered`;
    }

    renderStream();
  }

  function renderStream() {
    const container = get('messages-stream');
    if (!container) return;

    container.replaceChildren();

    const all = [
      ...socket.sentMessages.map(m => ({ ...m, type: 'SENT' })),
      ...socket.queue.map(m => ({ ...m, type: 'QUEUED' }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    if (all.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '// No MIDI session events transmitted yet';
      empty.style.color = '#8b92b2';
      container.appendChild(empty);
      return;
    }

    for (const msg of all) {
      const row = document.createElement('div');
      row.className = `msg-item ${msg.status === 'DELIVERED' ? 'msg-delivered' : 'msg-queued'}`;
      const time = new Date(msg.timestamp).toLocaleTimeString();
      row.textContent = `[${time}] [${msg.status}] ${msg.payload}`;
      container.appendChild(row);
    }
  }

  socket.onStateChange = (status, meta) => updateStatus(status, meta);

  get('connect-btn')?.addEventListener('click', () => socket.connect());
  get('disconnect-btn')?.addEventListener('click', () => socket.disconnect());
  get('drop-btn')?.addEventListener('click', () => socket.simulateDrop());

  get('send-msg-btn')?.addEventListener('click', () => {
    const input = get('msg-input');
    const val = input?.value.trim();
    if (val) {
      socket.send(val);
      input.value = '';
      renderStream();
    }
  });

  // Pre-seed sample MIDI event
  socket.send(JSON.stringify({ event: 'tempoSync', bpm: 128, signature: '4/4' }));
  updateStatus(socket.status, { attempts: 0, queueSize: socket.queue.length });
}

if (typeof document !== 'undefined') mount();
