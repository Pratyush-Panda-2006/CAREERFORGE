export class AgritechPrecisionFarmingStatusIndicator {
  static VALID_STATES = ['operational', 'degraded', 'maintenance'];

  constructor(initialState = 'operational') {
    if (!AgritechPrecisionFarmingStatusIndicator.VALID_STATES.includes(initialState)) {
      throw new Error(`Invalid state: ${initialState}`);
    }
    this.state = initialState;
    this.pings = [];
  }

  setStatus(state) {
    if (!AgritechPrecisionFarmingStatusIndicator.VALID_STATES.includes(state)) {
      throw new Error(`Invalid state: ${state}. Must be one of: ${AgritechPrecisionFarmingStatusIndicator.VALID_STATES.join(', ')}`);
    }
    this.state = state;
    return this.state;
  }

  recordPing(latencyMs) {
    if (typeof latencyMs !== 'number' || latencyMs < 0 || !Number.isFinite(latencyMs)) {
      throw new TypeError('Latency must be a non-negative finite number');
    }
    const entry = {
      latencyMs: Math.round(latencyMs),
      state: this.state,
      timestamp: Date.now()
    };
    this.pings.push(entry);
    return entry;
  }

  getUptimeStats() {
    if (this.pings.length === 0) {
      return {
        currentState: this.state,
        totalPings: 0,
        averageLatencyMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        uptimePercentage: 100.0
      };
    }

    const total = this.pings.length;
    const operationalCount = this.pings.filter(p => p.state === 'operational').length;
    const latencies = this.pings.map(p => p.latencyMs);
    const sumLatency = latencies.reduce((acc, val) => acc + val, 0);

    return {
      currentState: this.state,
      totalPings: total,
      averageLatencyMs: Math.round((sumLatency / total) * 10) / 10,
      minLatencyMs: Math.min(...latencies),
      maxLatencyMs: Math.max(...latencies),
      uptimePercentage: Math.round((operationalCount / total) * 1000) / 10
    };
  }
}

function mount() {
  const root = document.querySelector('[data-status-badge-lab]');
  if (!root) return;

  const indicator = new AgritechPrecisionFarmingStatusIndicator('operational');
  const get = id => root.querySelector(`#${id}`);

  function updateUI() {
    const stats = indicator.getUptimeStats();
    const state = indicator.state;

    const badge = get('status-pill');
    if (badge) {
      badge.className = `status-pill status-${state}`;
      const dot = badge.querySelector('.status-dot');
      const text = badge.querySelector('.status-label');
      if (text) {
        text.textContent = state.charAt(0).toUpperCase() + state.slice(1);
      }
      if (dot) {
        dot.className = `status-dot dot-${state}`;
      }
    }

    const uptimeVal = get('uptime-val');
    if (uptimeVal) uptimeVal.textContent = `${stats.uptimePercentage.toFixed(1)}%`;

    const avgPing = get('avg-ping-val');
    if (avgPing) avgPing.textContent = `${stats.averageLatencyMs.toFixed(1)} ms`;

    const totalPings = get('total-pings-val');
    if (totalPings) totalPings.textContent = String(stats.totalPings);

    // Update ping list
    const pingLog = get('ping-log');
    if (pingLog) {
      const recent = [...indicator.pings].reverse().slice(0, 10);
      pingLog.replaceChildren();
      recent.forEach(p => {
        const row = document.createElement('div');
        row.className = `ping-item ping-${p.state}`;
        const time = new Date(p.timestamp).toLocaleTimeString();
        row.textContent = `[${time}] ${p.latencyMs}ms - ${p.state.toUpperCase()}`;
        pingLog.appendChild(row);
      });
    }
  }

  function simulatePing() {
    // Simulated realistic network latency
    const base = indicator.state === 'operational' ? 20 : indicator.state === 'degraded' ? 140 : 350;
    const jitter = Math.floor(Math.random() * 25);
    indicator.recordPing(base + jitter);
    updateUI();
  }

  get('btn-operational')?.addEventListener('click', () => {
    indicator.setStatus('operational');
    simulatePing();
  });

  get('btn-degraded')?.addEventListener('click', () => {
    indicator.setStatus('degraded');
    simulatePing();
  });

  get('btn-maintenance')?.addEventListener('click', () => {
    indicator.setStatus('maintenance');
    simulatePing();
  });

  get('btn-ping')?.addEventListener('click', simulatePing);

  // Seed with initial sample pings
  indicator.recordPing(24);
  indicator.recordPing(28);
  indicator.recordPing(22);
  updateUI();
}

if (typeof document !== 'undefined') mount();
