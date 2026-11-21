/**
 * Fintech Vault - Bi-Directional WebSocket & RPC Streaming Hub Emulator
 * Simulates high-throughput ledger settlement feeds, multi-sig signer updates,
 * pub/sub channel multiplexing, heartbeat keep-alive, and fault-tolerant reconnection.
 */

export class FintechVaultSocketEmulator {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'wss://stream.fintechvault.io/v1/ledger';
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 4000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.baseBackoffMs = options.baseBackoffMs || 1000;

    this.state = 'DISCONNECTED'; // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'
    this.subscribers = new Map(); // channel -> Set<Function>
    this.messageLog = [];

    this.metrics = {
      packetsSent: 0,
      packetsReceived: 0,
      packetsDropped: 0,
      heartbeatsCompleted: 0,
      lastLatencyMs: 12,
      reconnectCount: 0,
      connectedAt: null
    };

    this.heartbeatTimer = null;
    this.reconnectAttempts = 0;
  }

  connect(url = this.endpoint) {
    this.endpoint = url;
    this.state = 'CONNECTING';

    // Simulate instant TCP/TLS handshake in mock environment
    this.state = 'CONNECTED';
    this.metrics.connectedAt = Date.now();
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    return true;
  }

  disconnect() {
    this.stopHeartbeat();
    this.state = 'DISCONNECTED';
    return true;
  }

  subscribe(channel, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Channel subscription handler must be an executable function.');
    }
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel).add(handler);

    // Return unsubscription lambda
    return () => {
      const channelSet = this.subscribers.get(channel);
      if (channelSet) {
        channelSet.delete(handler);
        if (channelSet.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  publish(channel, payload) {
    if (this.state !== 'CONNECTED') {
      this.metrics.packetsDropped += 1;
      return false;
    }

    this.metrics.packetsSent += 1;
    const packet = {
      id: 'pkt_' + Math.random().toString(36).slice(2, 9),
      channel,
      payload,
      timestamp: Date.now()
    };

    this.messageLog.unshift(packet);
    if (this.messageLog.length > 100) {
      this.messageLog.pop();
    }

    const handlers = this.subscribers.get(channel);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(packet);
          this.metrics.packetsReceived += 1;
        } catch {
          this.metrics.packetsDropped += 1;
        }
      });
    }

    return true;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    if (this.heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.simulateHeartbeat();
      }, this.heartbeatIntervalMs);
    }
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  simulateHeartbeat() {
    if (this.state !== 'CONNECTED') return false;
    this.metrics.heartbeatsCompleted += 1;
    this.metrics.lastLatencyMs = Math.floor(8 + Math.random() * 14);
    return true;
  }

  simulateDropout(durationMs = 2000) {
    if (this.state !== 'CONNECTED') return false;
    this.stopHeartbeat();
    this.state = 'RECONNECTING';
    this.metrics.reconnectCount += 1;

    setTimeout(() => {
      this.state = 'CONNECTED';
      this.startHeartbeat();
    }, durationMs);

    return true;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = {
      packetsSent: 0,
      packetsReceived: 0,
      packetsDropped: 0,
      heartbeatsCompleted: 0,
      lastLatencyMs: 12,
      reconnectCount: 0,
      connectedAt: this.state === 'CONNECTED' ? Date.now() : null
    };
  }
}
