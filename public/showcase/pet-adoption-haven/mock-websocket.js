const titles = { disconnected: 'Disconnected', connected: 'Connected', reconnecting: 'Reconnecting' };

export class PetAdoptionHavenSocketEmulator {
  constructor({
    clock = () => Date.now(),
    heartbeatInterval = 1000,
    heartbeatTimeout = 1800,
    firstBackoff = 350,
    maximumBackoff = 1400,
    roundTrip = 120,
  } = {}) {
    this.clock = clock;
    this.heartbeatInterval = heartbeatInterval;
    this.heartbeatTimeout = heartbeatTimeout;
    this.firstBackoff = firstBackoff;
    this.maximumBackoff = maximumBackoff;
    this.roundTrip = roundTrip;
    this.subscriptions = new Map();
    this.state = 'disconnected';
    this.offlineUntil = 0;
    this.attempts = 0;
    this.sent = 0;
    this.dropped = 0;
    this.latency = null;
    this.requests = 0;
    this.received = { intake: 0, foster: 0 };
  }

  connect() {
    this.state = 'connected';
    this.nextPing = this.clock() + this.heartbeatInterval;
    this.replyDue = null;
    this.missedAt = null;
    this.backoff = this.firstBackoff;
  }

  disconnect() {
    this.state = 'disconnected';
    this.offlineUntil = 0;
    this.replyDue = null;
    this.missedAt = null;
    this.latency = null;
  }

  subscribe(channel, handler) {
    if (!this.subscriptions.has(channel)) this.subscriptions.set(channel, new Set());
    const handlers = this.subscriptions.get(channel);
    handlers.add(handler);
    return () => {
      if (handlers.delete(handler) && handlers.size === 0) this.subscriptions.delete(channel);
    };
  }

  publish(channel, payload) {
    this.sent += 1;
    if (this.state !== 'connected' || this.clock() < this.offlineUntil) {
      this.dropped += 1;
      return false;
    }
    if (Object.hasOwn(this.received, channel)) this.received[channel] += 1;
    for (const handler of [...(this.subscriptions.get(channel) ?? [])]) handler(payload);
    return true;
  }

  requestQueueSummary() {
    const id = ++this.requests;
    if (!this.publish('queue.request', { id })) return null;
    const summary = { id, ...this.received };
    this.publish('queue.reply', summary);
    return summary;
  }

  simulateDropout(durationMs) {
    if (this.state === 'disconnected' || !Number.isFinite(durationMs) || durationMs <= 0) return false;
    const now = this.clock();
    this.offlineUntil = Math.max(this.offlineUntil, now + durationMs);
    if (this.replyDue !== null) {
      this.missedAt ??= this.replyDue - this.roundTrip;
      this.replyDue = null;
    }
    return true;
  }

  simulateHeartbeat() {
    const now = this.clock();
    if (this.state === 'disconnected') return;
    if (this.state === 'reconnecting') {
      if (now < this.retryAt) return;
      this.attempts += 1;
      if (now >= this.offlineUntil) {
        this.connect();
      } else {
        this.backoff = Math.min(this.backoff * 2, this.maximumBackoff);
        this.retryAt = now + this.backoff;
      }
      return;
    }

    if (this.replyDue !== null && now >= this.replyDue) {
      this.latency = this.roundTrip;
      this.replyDue = null;
      this.missedAt = null;
    }
    if (this.missedAt !== null && now - this.missedAt >= this.heartbeatTimeout) {
      this.state = 'reconnecting';
      this.latency = null;
      this.retryAt = now + this.backoff;
      return;
    }
    if (this.replyDue !== null || now < this.nextPing) return;
    this.nextPing = now + this.heartbeatInterval;
    if (now < this.offlineUntil) this.missedAt ??= now;
    else this.replyDue = now + this.roundTrip;
  }
}

if (typeof document !== 'undefined') {
  const element = id => document.getElementById(id);
  const socket = new PetAdoptionHavenSocketEmulator();
  const connection = element('connection-state');
  const activity = element('activity');
  const statusButton = element('connect');
  const dropButton = element('drop');
  const requestButton = element('request');
  const sampleUpdates = [
    ['intake', 'Intake received for Juniper.'],
    ['foster', 'Foster availability updated for Willow.'],
    ['intake', 'Adoption interview scheduled for Milo.'],
    ['foster', 'Foster handoff confirmed for Nori.'],
  ];
  let updateIndex = 0;
  let nextUpdate = 0;
  let shownState = socket.state;

  function addEvent(text) {
    const line = document.createElement('li');
    line.textContent = text;
    activity.prepend(line);
    if (activity.children.length > 16) activity.lastElementChild.remove();
  }

  function render() {
    if (shownState !== socket.state) {
      shownState = socket.state;
      connection.dataset.state = shownState;
      connection.textContent = titles[shownState];
      statusButton.textContent = shownState === 'disconnected' ? 'Connect' : 'Disconnect';
      addEvent(titles[shownState]);
    }
    dropButton.disabled = socket.state !== 'connected';
    requestButton.disabled = socket.state !== 'connected';
    element('latency').textContent = socket.latency === null ? '—' : socket.latency + ' ms';
    element('loss').textContent = (socket.sent ? socket.dropped * 100 / socket.sent : 0).toFixed(1) + '%';
    element('dropped').textContent = socket.dropped;
    element('attempts').textContent = socket.attempts;
  }

  for (const channel of ['intake', 'foster']) {
    const checkbox = element(channel);
    const handler = message => addEvent(message);
    let unsubscribe = socket.subscribe(channel, handler);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) unsubscribe = socket.subscribe(channel, handler);
      else unsubscribe();
    });
  }

  socket.subscribe('queue.reply', ({ id, intake, foster }) => {
    addEvent(`Queue reply ${id} · ${intake} intake and ${foster} foster updates received.`);
  });
  statusButton.addEventListener('click', () => {
    if (socket.state === 'disconnected') socket.connect();
    else socket.disconnect();
    nextUpdate = Date.now() + 250;
    render();
  });
  dropButton.addEventListener('click', () => {
    if (socket.simulateDropout(6000)) addEvent('Simulated connection drop started.');
  });
  requestButton.addEventListener('click', () => {
    if (!socket.requestQueueSummary()) addEvent('Queue request dropped. Try again after reconnecting.');
    render();
  });

  setInterval(() => {
    if (socket.state === 'disconnected') return;
    socket.simulateHeartbeat();
    const now = Date.now();
    if (now >= nextUpdate) {
      const [channel, message] = sampleUpdates[updateIndex++ % sampleUpdates.length];
      if (!socket.publish(channel, message)) addEvent('Dropped a sample ' + channel + ' update.');
      nextUpdate = now + 850;
    }
    render();
  }, 100);
}
