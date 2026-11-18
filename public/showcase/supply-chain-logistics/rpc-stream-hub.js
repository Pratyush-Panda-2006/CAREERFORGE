/**
 * Supply Chain Logistics - Simulated Bi-Directional WebSocket & RPC Streaming Hub
 * Issue #1139 - NSoC '26 Level 3 Feature
 */

export class SupplyChainLogisticsRpcStreamHub {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'wss://telemetry.supplychain.carrierforge.io/v1/rpc';
    this.connected = false;
    this.latencyMs = options.latencyMs || 25;
    this.subscribers = new Map(); // topic -> Set(callbacks)
    this.pendingRpc = new Map(); // id -> { resolve, reject, timer }
    this.messageLog = [];
    this.eventListeners = new Set();
    this.rpcIdCounter = 1;
  }

  connect(endpoint = this.endpoint) {
    this.endpoint = endpoint;
    this.connected = true;

    const event = {
      type: 'connection_open',
      endpoint: this.endpoint,
      timestamp: Date.now(),
      status: 'CONNECTED'
    };
    this._logMessage('SYSTEM', event);
    this._notifyListeners('open', event);
    return Promise.resolve(event);
  }

  disconnect() {
    this.connected = false;
    for (const [id, req] of this.pendingRpc.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error(`RPC request ${id} aborted: WebSocket disconnected`));
    }
    this.pendingRpc.clear();

    const event = {
      type: 'connection_close',
      endpoint: this.endpoint,
      timestamp: Date.now(),
      status: 'DISCONNECTED'
    };
    this._logMessage('SYSTEM', event);
    this._notifyListeners('close', event);
    return event;
  }

  sendRpc(method, params = {}) {
    if (!this.connected) {
      return Promise.reject(new Error('Cannot send RPC: Hub is disconnected'));
    }

    const id = `rpc_${this.rpcIdCounter++}_${Date.now()}`;
    const requestPayload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
      timestamp: Date.now()
    };

    this._logMessage('RPC_REQUEST', requestPayload);
    this._notifyListeners('rpc_request', requestPayload);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRpc.has(id)) {
          this.pendingRpc.delete(id);
          reject(new Error(`RPC timeout for method "${method}" [ID: ${id}]`));
        }
      }, 5000);

      this.pendingRpc.set(id, { resolve, reject, timer });

      setTimeout(() => {
        if (!this.pendingRpc.has(id)) return;
        const entry = this.pendingRpc.get(id);
        clearTimeout(entry.timer);
        this.pendingRpc.delete(id);

        const responsePayload = this._mockServerRpcResponse(method, params, id);
        this._logMessage('RPC_RESPONSE', responsePayload);
        this._notifyListeners('rpc_response', responsePayload);

        if (responsePayload.error) {
          entry.reject(responsePayload.error);
        } else {
          entry.resolve(responsePayload.result);
        }
      }, this.latencyMs);
    });
  }

  broadcastMessage(topic, payload = {}) {
    if (!this.connected) {
      return false;
    }

    const broadcastEvent = {
      topic,
      payload,
      timestamp: Date.now(),
      sender: 'fleet_client'
    };

    this._logMessage('BROADCAST', broadcastEvent);

    if (this.subscribers.has(topic)) {
      const cbs = this.subscribers.get(topic);
      for (const cb of cbs) {
        try {
          cb(payload, topic);
        } catch {
          // Suppress callback error
        }
      }
    }

    this._notifyListeners('broadcast', broadcastEvent);
    return true;
  }

  subscribeTopic(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic).add(callback);
    return () => {
      if (this.subscribers.has(topic)) {
        this.subscribers.get(topic).delete(callback);
      }
    };
  }

  _mockServerRpcResponse(method, params, id) {
    switch (method) {
      case 'ping':
        return { jsonrpc: '2.0', id, result: { pong: true, timestamp: Date.now() } };
      case 'getFleetStatus':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            activeTrucks: 142,
            delayedShipments: 3,
            networkHealth: 'OPTIMAL',
            timestamp: Date.now()
          }
        };
      case 'dispatchManifest':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            manifestId: params.manifestId || 'MAN-8092',
            assignedCarrier: 'DHL Global Forwarding',
            estimatedArrival: new Date(Date.now() + 86400000).toISOString()
          }
        };
      default:
        return {
          jsonrpc: '2.0',
          id,
          result: {
            success: true,
            methodExecuted: method,
            echoParams: params
          }
        };
    }
  }

  _logMessage(direction, data) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      direction,
      data,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };
    this.messageLog.unshift(logEntry);
    if (this.messageLog.length > 100) {
      this.messageLog.pop();
    }
    return logEntry;
  }

  _notifyListeners(event, data) {
    for (const listener of this.eventListeners) {
      try {
        listener(event, data, this.messageLog);
      } catch {
        // Listener error
      }
    }
  }

  addListener(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  getLog() {
    return [...this.messageLog];
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const hub = new SupplyChainLogisticsRpcStreamHub({ latencyMs: 50 });
    const logContainer = document.getElementById('rpcLogContainer');
    const connBadge = document.getElementById('connectionStatusBadge');
    const endpointInput = document.getElementById('wsEndpointInput');

    function renderLog() {
      if (!logContainer) return;
      logContainer.replaceChildren();

      const logs = hub.getLog();
      logs.forEach(item => {
        const row = document.createElement('div');
        row.className = `rpc-log-entry dir-${item.direction.toLowerCase()}`;
        row.innerHTML = `
          <div class="entry-meta">
            <span class="entry-dir">${item.direction}</span>
            <span class="entry-time">${item.timeFormatted}</span>
          </div>
          <pre class="entry-payload">${JSON.stringify(item.data, null, 2)}</pre>
        `;
        logContainer.appendChild(row);
      });
    }

    function updateConnStatus(connected) {
      if (!connBadge) return;
      connBadge.className = `status-badge ${connected ? 'badge-connected' : 'badge-disconnected'}`;
      connBadge.textContent = connected ? 'CONNECTED' : 'DISCONNECTED';
    }

    hub.addListener(() => {
      updateConnStatus(hub.connected);
      renderLog();
    });

    document.getElementById('btnConnect')?.addEventListener('click', () => {
      const ep = endpointInput?.value || undefined;
      hub.connect(ep);
    });

    document.getElementById('btnDisconnect')?.addEventListener('click', () => {
      hub.disconnect();
    });

    document.getElementById('btnSendPing')?.addEventListener('click', () => {
      hub.sendRpc('ping', { clientTime: Date.now() });
    });

    document.getElementById('btnGetFleetStatus')?.addEventListener('click', () => {
      hub.sendRpc('getFleetStatus', { region: 'EMEA' });
    });

    document.getElementById('btnBroadcastTelemetry')?.addEventListener('click', () => {
      hub.broadcastMessage('fleet:telemetry', {
        vehicleId: 'TRK-984',
        speedKmh: 78.4,
        cargoTempC: 3.8,
        gps: [52.3676, 4.9041]
      });
    });

    document.getElementById('btnClearLogs')?.addEventListener('click', () => {
      hub.messageLog = [];
      renderLog();
    });

    hub.connect();
  });
}
