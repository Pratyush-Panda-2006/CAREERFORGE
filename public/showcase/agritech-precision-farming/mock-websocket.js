/**
 * Agritech Precision Farming - Bi-Directional WebSocket & RPC Streaming Hub Emulator
 */

export class AgritechPrecisionFarmingSocketEmulator {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'wss://stream.agritech-precision-farming.internal/v1/telemetry';
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 4000;
    this.state = 'DISCONNECTED';
    this.subscribers = new Map();
    this.messageLog = [];
    this.metrics = { packetsSent: 0, packetsReceived: 0, packetsDropped: 0, heartbeatsCompleted: 0, lastLatencyMs: 12 };
    this.heartbeatTimer = null;
  }

  connect(url = this.endpoint) {
    this.endpoint = url;
    this.state = 'CONNECTED';
    this.startHeartbeat();
    return true;
  }

  disconnect() {
    this.stopHeartbeat();
    this.state = 'DISCONNECTED';
    return true;
  }

  subscribe(channel, handler) {
    if (typeof handler !== 'function') throw new TypeError('Handler must be a function.');
    if (!this.subscribers.has(channel)) this.subscribers.set(channel, new Set());
    this.subscribers.get(channel).add(handler);
    return () => {
      const set = this.subscribers.get(channel);
      if (set) { set.delete(handler); if (set.size === 0) this.subscribers.delete(channel); }
    };
  }

  publish(channel, payload) {
    if (this.state !== 'CONNECTED') { this.metrics.packetsDropped += 1; return false; }
    this.metrics.packetsSent += 1;
    const packet = { id: 'pkt_' + Math.random().toString(36).slice(2, 9), channel, payload, timestamp: Date.now() };
    this.messageLog.unshift(packet);
    const handlers = this.subscribers.get(channel);
    if (handlers) {
      handlers.forEach(h => {
        try { h(packet); this.metrics.packetsReceived += 1; } catch { this.metrics.packetsDropped += 1; }
      });
    }
    return true;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    if (this.heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => this.simulateHeartbeat(), this.heartbeatIntervalMs);
    }
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  simulateHeartbeat() {
    if (this.state !== 'CONNECTED') return false;
    this.metrics.heartbeatsCompleted += 1;
    this.metrics.lastLatencyMs = Math.floor(8 + Math.random() * 12);
    return true;
  }

  simulateDropout(durationMs = 2000) {
    if (this.state !== 'CONNECTED') return false;
    this.stopHeartbeat();
    this.state = 'RECONNECTING';
    setTimeout(() => { this.state = 'CONNECTED'; this.startHeartbeat(); }, durationMs);
    return true;
  }

  getMetrics() { return { ...this.metrics }; }
}
