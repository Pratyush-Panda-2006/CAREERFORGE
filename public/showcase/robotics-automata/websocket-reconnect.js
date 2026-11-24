export class RoboticsAutomataResilientSocket {
  constructor(url = 'wss://telemetry.local/feed', options = {}) {
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

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.#setStatus('DISCONNECTED');
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
      this.connect();
    }, Math.min(delay, 200));
  }

  send(message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    if (this.status === 'CONNECTED') {
      this.sentMessages.push({ payload, timestamp: Date.now() });
      return true;
    } else {
      this.queue.push({ payload, timestamp: Date.now() });
      return false;
    }
  }

  flushQueue() {
    const flushed = [];
    while (this.queue.length > 0) {
      const msg = this.queue.shift();
      this.sentMessages.push(msg);
      flushed.push(msg);
    }
    return flushed;
  }
}

function mount() {
  const toggleBtn = document.getElementById('toggle-conn'); if (!toggleBtn) return;
  const socket = new RoboticsAutomataResilientSocket();
  const get = id => document.getElementById(id);

  socket.onStateChange = (st, details) => {
    get('status-pill').textContent = st;
    get('status-pill').className = `pill status-${st.toLowerCase()}`;
    get('attempts').textContent = details.attempts;
    get('queue-count').textContent = details.queueSize;
    get('backoff-delay').textContent = `${socket.calculateBackoff(details.attempts)} ms`;
  };

  toggleBtn.addEventListener('click', () => {
    if (socket.status === 'CONNECTED') {
      socket.disconnect();
      toggleBtn.textContent = 'Connect';
    } else {
      socket.connect().then(() => { toggleBtn.textContent = 'Disconnect'; });
    }
  });

  get('drop-conn').addEventListener('click', () => {
    socket.simulateDrop();
  });

  get('send-msg').addEventListener('click', () => {
    const txt = get('msg-input').value;
    if (txt) {
      socket.send(txt);
      get('sent-log').replaceChildren(...socket.sentMessages.slice(-10).map(m => {
        const li = document.createElement('li');
        li.textContent = `Sent: ${m.payload} (${new Date(m.timestamp).toLocaleTimeString()})`;
        return li;
      }));
      get('queue-count').textContent = socket.queue.length;
    }
  });
}
if (typeof document !== 'undefined') mount();
