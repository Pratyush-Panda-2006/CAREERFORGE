/**
 * Festival Hub - Bi-Directional WebSocket & RPC Streaming Emulator
 * Simulates low-latency real-time telemetry, stage lighting RPC commands,
 * pub/sub channel multiplexing, heartbeat keep-alive, and fault-tolerant reconnection.
 */

export class FestivalHubSocketEmulator {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'wss://stream.festivalhub.live/v1/telemetry';
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 5000;
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
      lastLatencyMs: 18,
      reconnectCount: 0,
      connectedAt: null
    };

    this.heartbeatTimer = null;
    this.reconnectAttempts = 0;
  }

  connect(url = this.endpoint) {
    this.endpoint = url;
    this.state = 'CONNECTING';

    // Simulate instant handshake in mock environment
    this.state = 'CONNECTED';
    this.metrics.connectedAt = Date.now();
    this.reconnectAttempts = 0;
    this.startHeartbeat();

    this.emitSystemEvent('connected', { endpoint: this.endpoint, timestamp: Date.now() });
    return true;
  }

  disconnect() {
    this.stopHeartbeat();
    this.state = 'DISCONNECTED';
    this.emitSystemEvent('disconnected', { timestamp: Date.now() });
    return true;
  }

  subscribe(channel, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Channel subscription handler must be a function');
    }
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel).add(handler);

    // Return unsubscribe teardown function
    return () => {
      const set = this.subscribers.get(channel);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  publish(channel, payload) {
    const packet = {
      id: `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      channel,
      payload,
      timestamp: Date.now()
    };

    if (this.state !== 'CONNECTED') {
      this.metrics.packetsDropped++;
      return { success: false, reason: 'Socket not connected', packet };
    }

    this.metrics.packetsSent++;
    this.messageLog.unshift(packet);
    if (this.messageLog.length > 50) this.messageLog.pop();

    const handlers = this.subscribers.get(channel);
    if (handlers) {
      handlers.forEach(fn => {
        try {
          fn(packet);
          this.metrics.packetsReceived++;
        } catch (err) {
          console.error(`Error in subscriber handler for channel "${channel}":`, err);
        }
      });
    }

    return { success: true, packet };
  }

  simulateHeartbeat() {
    if (this.state !== 'CONNECTED') return null;
    const pingStart = Date.now();
    const simulatedLatency = Math.floor(12 + Math.random() * 18); // 12ms - 30ms

    this.metrics.heartbeatsCompleted++;
    this.metrics.lastLatencyMs = simulatedLatency;

    const pongPacket = {
      type: 'heartbeat_pong',
      latencyMs: simulatedLatency,
      timestamp: pingStart + simulatedLatency
    };

    this.emitSystemEvent('heartbeat', pongPacket);
    return pongPacket;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.simulateHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  simulateDropout(durationMs = 2500) {
    this.stopHeartbeat();
    this.state = 'RECONNECTING';
    this.metrics.reconnectCount++;

    this.emitSystemEvent('dropout', { durationMs, timestamp: Date.now() });

    return new Promise(resolve => {
      setTimeout(() => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          this.state = 'CONNECTED';
          this.startHeartbeat();
          this.emitSystemEvent('reconnected', { attempts: this.reconnectAttempts, timestamp: Date.now() });
          resolve({ success: true, reconnected: true, attempts: this.reconnectAttempts });
        } else {
          this.state = 'DISCONNECTED';
          resolve({ success: false, reconnected: false, error: 'Max reconnection attempts exceeded' });
        }
      }, durationMs);
    });
  }

  emitSystemEvent(event, data) {
    const sysHandlers = this.subscribers.get(`__system:${event}`);
    if (sysHandlers) {
      sysHandlers.forEach(fn => fn(data));
    }
  }

  getMetrics() {
    return {
      state: this.state,
      endpoint: this.endpoint,
      activeChannels: Array.from(this.subscribers.keys()).filter(k => !k.startsWith('__system:')),
      packetsSent: this.metrics.packetsSent,
      packetsReceived: this.metrics.packetsReceived,
      packetsDropped: this.metrics.packetsDropped,
      heartbeatsCompleted: this.metrics.heartbeatsCompleted,
      lastLatencyMs: this.metrics.lastLatencyMs,
      reconnectCount: this.metrics.reconnectCount
    };
  }
}
