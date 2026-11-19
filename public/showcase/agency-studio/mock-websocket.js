/**
 * Agency Studio - Simulated Bi-Directional WebSocket & RPC Streaming Hub
 */

export class AgencyStudioSocketEmulator {
  constructor(options = {}) {
    this.status = 'connected';
    this.channels = new Map();
    this.history = [];
    this.maxHistory = options.maxHistory || 100;
    this.latencyMs = options.latencyMs || 15;
    this.listeners = new Set();
  }

  subscribe(channel, handler) {
    const ch = String(channel || 'general');
    if (!this.channels.has(ch)) {
      this.channels.set(ch, new Set());
    }
    this.channels.get(ch).add(handler);

    return () => {
      const set = this.channels.get(ch);
      if (set) {
        set.delete(handler);
        if (set.size === 0) this.channels.delete(ch);
      }
    };
  }

  publish(channel, payload = {}) {
    if (this.status !== 'connected') {
      return 0;
    }

    const ch = String(channel || 'general');
    const packet = {
      id: `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: ch,
      payload,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };

    this.history.unshift(packet);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    let delivered = 0;
    const subscribers = this.channels.get(ch);
    if (subscribers) {
      for (const handler of subscribers) {
        try {
          handler(packet);
          delivered++;
        } catch (e) {
          console.error('Socket handler error:', e);
        }
      }
    }

    this._notifyListeners({ type: 'packet', packet, delivered });
    return delivered;
  }

  simulateHeartbeat() {
    return this.publish('system.heartbeat', {
      status: this.status,
      ping: this.latencyMs,
      serverTime: new Date().toISOString()
    });
  }

  async simulateDropout(durationMs = 2000) {
    this.status = 'disconnected';
    this._notifyListeners({ type: 'status', status: this.status });

    await new Promise(resolve => setTimeout(resolve, Math.max(100, durationMs * 0.5)));

    this.status = 'reconnecting';
    this._notifyListeners({ type: 'status', status: this.status });

    await new Promise(resolve => setTimeout(resolve, Math.max(100, durationMs * 0.5)));

    this.status = 'connected';
    this._notifyListeners({ type: 'status', status: this.status });
    return true;
  }

  getStatus() {
    return this.status;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }

  onStateChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _notifyListeners(evt) {
    for (const fn of this.listeners) {
      try {
        fn(evt);
      } catch {}
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const socket = new AgencyStudioSocketEmulator();

    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const feed = document.getElementById('packetFeed');

    function updateStatusUI(status) {
      if (statusDot) {
        statusDot.className = `status-dot ${status}`;
      }
      if (statusText) {
        statusText.textContent = status === 'connected' ? 'Connected (127.0.0.1:ws)'
          : status === 'reconnecting' ? 'Reconnecting (attempting RPC handshake)...'
          : 'Disconnected (socket closed)';
      }
    }

    function appendPacket(pkt) {
      if (!feed) return;
      const el = document.createElement('div');
      el.className = 'packet-item';

      const left = document.createElement('span');
      left.className = 'packet-channel';
      left.textContent = `[${pkt.channel}] ${JSON.stringify(pkt.payload)}`;

      const right = document.createElement('span');
      right.className = 'packet-time';
      right.textContent = pkt.timeFormatted;

      el.appendChild(left);
      el.appendChild(right);
      feed.prepend(el);
    }

    socket.onStateChange(evt => {
      if (evt.type === 'status') {
        updateStatusUI(evt.status);
      } else if (evt.type === 'packet') {
        appendPacket(evt.packet);
      }
    });

    // Subscribe to default channels
    socket.subscribe('campaign.launched', () => {});
    socket.subscribe('creative.approved', () => {});
    socket.subscribe('system.heartbeat', () => {});

    document.getElementById('sendPacketBtn')?.addEventListener('click', () => {
      socket.publish('campaign.launched', { value: Math.round(Math.random() * 100), domain: 'Campaign Broadcast Hub' });
    });

    document.getElementById('simulateHeartbeatBtn')?.addEventListener('click', () => {
      socket.simulateHeartbeat();
    });

    document.getElementById('simulateDropoutBtn')?.addEventListener('click', () => {
      socket.simulateDropout(2000);
    });

    document.getElementById('clearStreamBtn')?.addEventListener('click', () => {
      socket.clearHistory();
      if (feed) feed.replaceChildren();
    });

    // Initial packet
    socket.publish('campaign.launched', { event: 'HANDSHAKE_ESTABLISHED' });
  });
}
