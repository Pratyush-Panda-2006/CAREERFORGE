/**
 * Robotics Automata - Simulated Bi-Directional WebSocket & RPC Streaming Hub
 * Issue #1143 - NSoC '26 Level 3 Feature
 */

export class RoboticsAutomataSocketEmulator {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'wss://automata.carrierforge.io/v1/telemetry';
    this.status = 'CONNECTED'; // 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'
    this.channels = new Map();
    this.dropoutActive = false;
    this.lastHeartbeat = Date.now();
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 3000;
    this.packetLog = [];
    this.droppedPackets = 0;
    this.deliveredPackets = 0;
    this.reconnectAttempts = 0;
    this.listeners = new Set();
  }

  subscribe(channel, handler) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(handler);

    return () => {
      if (this.channels.has(channel)) {
        this.channels.get(channel).delete(handler);
        if (this.channels.get(channel).size === 0) {
          this.channels.delete(channel);
        }
      }
    };
  }

  publish(channel, payload = {}) {
    const packetId = `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const packet = {
      id: packetId,
      channel,
      payload,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };

    if (this.status !== 'CONNECTED' || this.dropoutActive) {
      this.droppedPackets++;
      const droppedRecord = { ...packet, status: 'DROPPED', reason: 'NETWORK_DROPOUT' };
      this._logPacket(droppedRecord);
      this._notify('packet_dropped', droppedRecord);
      return false;
    }

    this.deliveredPackets++;
    const deliveredRecord = { ...packet, status: 'DELIVERED' };
    this._logPacket(deliveredRecord);

    if (this.channels.has(channel)) {
      const handlers = this.channels.get(channel);
      for (const h of handlers) {
        try {
          h(payload, channel, packet);
        } catch {
          // Suppress handler errors
        }
      }
    }

    this._notify('packet_delivered', deliveredRecord);
    return true;
  }

  simulateHeartbeat() {
    this.lastHeartbeat = Date.now();
    const ack = {
      type: 'HEARTBEAT_ACK',
      timestamp: this.lastHeartbeat,
      status: this.status
    };
    this._logPacket({
      id: `hb_${Date.now()}`,
      channel: 'system:heartbeat',
      payload: ack,
      status: this.dropoutActive ? 'DROPPED' : 'ACKNOWLEDGED',
      timeFormatted: new Date().toLocaleTimeString()
    });
    this._notify('heartbeat', ack);
    return ack;
  }

  simulateDropout(durationMs = 2000) {
    this.dropoutActive = true;
    this.status = 'RECONNECTING';
    this.reconnectAttempts++;

    const dropoutEvent = {
      event: 'NETWORK_DROPOUT',
      durationMs,
      timestamp: Date.now(),
      attempt: this.reconnectAttempts
    };

    this._logPacket({
      id: `drop_${Date.now()}`,
      channel: 'system:connection',
      payload: dropoutEvent,
      status: 'RECONNECTING',
      timeFormatted: new Date().toLocaleTimeString()
    });
    this._notify('reconnecting', dropoutEvent);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.dropoutActive = false;
        this.status = 'CONNECTED';
        const restoredEvent = {
          event: 'CONNECTION_RESTORED',
          reconnectedAt: Date.now(),
          latencyMs: 18
        };
        this._logPacket({
          id: `rest_${Date.now()}`,
          channel: 'system:connection',
          payload: restoredEvent,
          status: 'CONNECTED',
          timeFormatted: new Date().toLocaleTimeString()
        });
        this._notify('connected', restoredEvent);
        resolve(restoredEvent);
      }, durationMs);
    });
  }

  disconnect() {
    this.status = 'DISCONNECTED';
    this.dropoutActive = true;
    const dcEvent = { event: 'CLIENT_DISCONNECT', timestamp: Date.now() };
    this._notify('disconnected', dcEvent);
    return dcEvent;
  }

  reconnect() {
    this.status = 'CONNECTED';
    this.dropoutActive = false;
    const rcEvent = { event: 'CLIENT_RECONNECTED', timestamp: Date.now() };
    this._notify('connected', rcEvent);
    return rcEvent;
  }

  getPacketDropRate() {
    const total = this.deliveredPackets + this.droppedPackets;
    if (total === 0) return 0;
    return Number(((this.droppedPackets / total) * 100).toFixed(1));
  }

  _logPacket(packet) {
    this.packetLog.unshift(packet);
    if (this.packetLog.length > 100) {
      this.packetLog.pop();
    }
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _notify(type, data) {
    for (const l of this.listeners) {
      try {
        l(type, data, {
          status: this.status,
          delivered: this.deliveredPackets,
          dropped: this.droppedPackets,
          dropRate: this.getPacketDropRate()
        });
      } catch {
        // Suppress listener error
      }
    }
  }

  getLog() {
    return [...this.packetLog];
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const emulator = new RoboticsAutomataSocketEmulator();

    const statusBadge = document.getElementById('connectionStatusBadge');
    const logContainer = document.getElementById('packetLogContainer');
    const dropRateEl = document.getElementById('dropRateVal');
    const deliveredEl = document.getElementById('deliveredCountVal');
    const droppedEl = document.getElementById('droppedCountVal');

    function renderUI() {
      if (statusBadge) {
        statusBadge.className = `status-pill status-${emulator.status.toLowerCase()}`;
        statusBadge.textContent = emulator.status;
      }

      if (dropRateEl) dropRateEl.textContent = `${emulator.getPacketDropRate()}%`;
      if (deliveredEl) deliveredEl.textContent = String(emulator.deliveredPackets);
      if (droppedEl) droppedEl.textContent = String(emulator.droppedPackets);

      if (logContainer) {
        logContainer.replaceChildren();
        emulator.getLog().forEach(pkt => {
          const row = document.createElement('div');
          row.className = `packet-entry status-${pkt.status.toLowerCase()}`;
          row.innerHTML = `
            <div class="pkt-header">
              <span class="pkt-channel">${pkt.channel}</span>
              <span class="pkt-status">${pkt.status}</span>
              <span class="pkt-time">${pkt.timeFormatted}</span>
            </div>
            <pre class="pkt-payload">${JSON.stringify(pkt.payload, null, 2)}</pre>
          `;
          logContainer.appendChild(row);
        });
      }
    }

    emulator.addListener(renderUI);

    document.getElementById('btnSimulateHeartbeat')?.addEventListener('click', () => {
      emulator.simulateHeartbeat();
    });

    document.getElementById('btnPublishJoint')?.addEventListener('click', () => {
      emulator.publish('robotics:joints:telemetry', {
        axis1_deg: parseFloat((Math.random() * 90).toFixed(1)),
        axis2_deg: parseFloat((Math.random() * 45).toFixed(1)),
        torque_nm: parseFloat((Math.random() * 20 + 5).toFixed(2))
      });
    });

    document.getElementById('btnSimulateDropout')?.addEventListener('click', () => {
      emulator.simulateDropout(3000);
    });

    document.getElementById('btnClearLog')?.addEventListener('click', () => {
      emulator.packetLog = [];
      renderUI();
    });

    renderUI();
  });
}
