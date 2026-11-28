const STATES = ['operational', 'degraded', 'maintenance'];

export class MusicDawStudioStatusIndicator {
  constructor({ slowMs = 250, historySize = 100 } = {}) {
    this.slowMs = slowMs;
    this.historySize = historySize;
    this.state = 'operational';
    this.history = [];
  }

  setStatus(state) {
    if (!STATES.includes(state)) throw new RangeError(`unknown state: ${state}`);
    this.state = state;
    return this.state;
  }

  // A latency of null means the ping got no answer.
  recordPing(latencyMs) {
    if (latencyMs !== null && !(Number.isFinite(latencyMs) && latencyMs >= 0)) {
      throw new RangeError('latency must be a non-negative number or null');
    }
    this.history.push(latencyMs);
    if (this.history.length > this.historySize) this.history.shift();
    // Maintenance is set by a person, so pings do not override it.
    if (this.state !== 'maintenance') {
      this.state = latencyMs === null || latencyMs > this.slowMs ? 'degraded' : 'operational';
    }
    return this.state;
  }

  getUptimeStats() {
    const answered = this.history.filter((latency) => latency !== null);
    const total = this.history.length;
    return {
      total,
      uptime: total ? Math.round((answered.length / total) * 1000) / 10 : null,
      lastLatency: total ? this.history[total - 1] : null,
      averageLatency: answered.length ? Math.round(answered.reduce((sum, ms) => sum + ms, 0) / answered.length) : null,
    };
  }
}

if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  const indicator = new MusicDawStudioStatusIndicator();
  const ms = (value) => (value === null ? 'no answer' : `${value} ms`);

  const render = () => {
    const stats = indicator.getUptimeStats();
    document.querySelector('.card').dataset.state = indicator.state;
    const label = indicator.state[0].toUpperCase() + indicator.state.slice(1);
    // Only write on change, so screen readers are not told the same state at every ping.
    if ($('state').textContent !== label) $('state').textContent = label;
    $('uptime').textContent = stats.uptime === null ? '-' : `${stats.uptime}%`;
    $('pings').textContent = stats.total;
    $('last').textContent = ms(stats.lastLatency);
    $('average').textContent = stats.averageLatency === null ? '-' : ms(stats.averageLatency);
  };

  const ping = () => {
    indicator.recordPing(Math.random() < 0.05 ? null : Math.round(30 + Math.random() ** 3 * 320));
    render();
  };

  $('mode').addEventListener('change', (event) => {
    indicator.setStatus(event.target.value === 'maintenance' ? 'maintenance' : 'operational');
    render();
  });
  ping();
  setInterval(ping, 2000);
}
