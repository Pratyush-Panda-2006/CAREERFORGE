/**
 * Smart IoT Nexus - Simulated Bi-directional WebSocket & RPC Streaming Hub
 * Issue #1118 - NSoC '26 Level 3 Feature
 */

export class SmartIotNexusSocketEmulator {
  constructor(options = {}) {
    this.status = 'connected'; // 'connected' | 'reconnecting' | 'disconnected'
    this.latencyMs = options.initialLatencyMs || 18;
    this.heartbeatCount = 0;
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.droppedPackets = 0;
    this.subscribers = new Map();
    this.messageLog = [];
    this.maxLogSize = options.maxLogSize || 50;
    this.listeners = new Set();
  }

  subscribe(channel, handler) {
    if (!channel || typeof handler !== 'function') return () => {};
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel).add(handler);

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

  publish(channel, payload = {}) {
    const packet = {
      id: `pkt-iot-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      channel,
      payload,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };

    if (this.status !== 'connected') {
      this.droppedPackets++;
      this._emit({ event: 'packet_dropped', packet });
      return null;
    }

    this.packetsSent++;
    const handlers = this.subscribers.get(channel);
    if (handlers && handlers.size > 0) {
      for (const fn of handlers) {
        try {
          fn(packet);
          this.packetsReceived++;
        } catch (e) {
          console.error(`IoT Socket handler error on ${channel}:`, e);
        }
      }
    }

    this.messageLog.unshift(packet);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.pop();
    }

    this._emit({ event: 'packet_sent', packet });
    return packet;
  }

  simulateHeartbeat() {
    this.heartbeatCount++;
    this.status = 'connected';
    this.latencyMs = Math.floor(12 + Math.random() * 15);

    const ping = {
      type: 'ping',
      sequence: this.heartbeatCount,
      latency: this.latencyMs,
      timestamp: Date.now()
    };

    this._emit({ event: 'heartbeat', ping });
    return ping;
  }

  async simulateDropout(durationMs = 1200) {
    this.status = 'disconnected';
    this._emit({ event: 'status_changed', status: this.status });

    await new Promise(resolve => setTimeout(resolve, Math.max(10, durationMs / 2)));
    this.status = 'reconnecting';
    this._emit({ event: 'status_changed', status: this.status });

    await new Promise(resolve => setTimeout(resolve, Math.max(10, durationMs / 2)));
    this.status = 'connected';
    this.latencyMs = 19;
    this._emit({ event: 'status_changed', status: this.status });

    return { reconnected: true, durationMs };
  }

  getStatus() {
    return {
      status: this.status,
      latencyMs: this.latencyMs,
      heartbeatCount: this.heartbeatCount,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      droppedPackets: this.droppedPackets,
      channelsCount: this.subscribers.size
    };
  }

  getMessageLog() {
    return [...this.messageLog];
  }

  onStateChange(fn) {
    if (typeof fn === 'function') {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    return () => {};
  }

  _emit(data) {
    for (const fn of this.listeners) {
      try {
        fn(data);
      } catch (err) {
        console.error('Socket state listener error:', err);
      }
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const socket = new SmartIotNexusSocketEmulator();

    const statusPill = document.getElementById('connectionStatusPill');
    const latencyVal = document.getElementById('latencyVal');
    const packetsSentVal = document.getElementById('packetsSentVal');
    const droppedVal = document.getElementById('droppedPacketsVal');
    const logContainer = document.getElementById('socketPacketLog');

    function updateUI() {
      const stat = socket.getStatus();
      if (statusPill) {
        statusPill.textContent = stat.status.toUpperCase();
        statusPill.className = `status-pill status-${stat.status}`;
      }
      if (latencyVal) latencyVal.textContent = `${stat.latencyMs} ms`;
      if (packetsSentVal) packetsSentVal.textContent = String(stat.packetsSent);
      if (droppedVal) droppedVal.textContent = String(stat.droppedPackets);
    }

    function renderLog() {
      if (!logContainer) return;
      logContainer.replaceChildren();

      const msgs = socket.getMessageLog();
      if (msgs.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-log';
        empty.textContent = 'IoT Telemetry stream idle. Click below to publish sensor packets.';
        logContainer.appendChild(empty);
        return;
      }

      msgs.forEach(pkt => {
        const row = document.createElement('div');
        row.className = 'packet-row';

        const chanSpan = document.createElement('span');
        chanSpan.className = 'packet-channel';
        chanSpan.textContent = `[${pkt.channel}]`;

        const bodySpan = document.createElement('span');
        bodySpan.className = 'packet-body';
        bodySpan.textContent = JSON.stringify(pkt.payload);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'packet-time';
        timeSpan.textContent = pkt.timeFormatted;

        row.appendChild(chanSpan);
        row.appendChild(bodySpan);
        row.appendChild(timeSpan);
        logContainer.appendChild(row);
      });
    }

    socket.onStateChange(() => {
      updateUI();
      renderLog();
    });

    // Default IoT topic subscriptions
    socket.subscribe('sensors:temperature', () => {});
    socket.subscribe('devices:actuator', () => {});
    socket.subscribe('gateway:telemetry', () => {});

    // Periodic heartbeat ping
    setInterval(() => {
      socket.simulateHeartbeat();
      updateUI();
    }, 4000);

    document.getElementById('publishSensorPingBtn')?.addEventListener('click', () => {
      socket.publish('sensors:temperature', { sensor_id: 'temp-node-7', celsius: 24.8, humidity_pct: 58 });
    });

    document.getElementById('publishActuatorBtn')?.addEventListener('click', () => {
      socket.publish('devices:actuator', { relay_id: 'valve-b2', state: 'OPEN', pressure_psi: 120.4 });
    });

    document.getElementById('simulateDropoutBtn')?.addEventListener('click', () => {
      socket.simulateDropout(1500);
    });

    updateUI();
    renderLog();
  });
}
