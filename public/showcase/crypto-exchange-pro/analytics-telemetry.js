/**
 * Crypto Exchange Pro - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Measures interaction metrics (scroll depth, click targets, order desk dwell) without third-party trackers.
 */

export class CryptoExchangeProAnalyticsEngine {
  constructor(options = {}) {
    this.sessionStartTime = options.startTime || Date.now();
    this.events = [];
    this.maxEvents = options.maxEvents || 100;

    // Strict PII filter keys for crypto exchange security
    this.piiPatterns = [
      /email/i,
      /token/i,
      /auth/i,
      /password/i,
      /secret/i,
      /private_key/i,
      /seed/i,
      /(^|_)ip(_|$)/i,
      /phone/i,
      /ssn/i
    ];
  }

  scrubData(data) {
    if (!data || typeof data !== 'object') return data;
    const clean = {};
    for (const [key, val] of Object.entries(data)) {
      const isSensitive = this.piiPatterns.some(pat => pat.test(key));
      if (isSensitive) {
        clean[key] = '[SCRUBBED]';
      } else if (typeof val === 'object' && val !== null) {
        clean[key] = this.scrubData(val);
      } else {
        clean[key] = val;
      }
    }
    return clean;
  }

  trackEvent(name, data = {}) {
    const cleanName = String(name || 'unspecified_event').trim();
    const scrubbed = this.scrubData(data);

    const record = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      data: scrubbed,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };

    this.events.unshift(record);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    return record;
  }

  computeSessionDuration(now = Date.now()) {
    const diffMs = Math.max(0, now - this.sessionStartTime);
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getScrollDepthPercentage(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc || !doc.documentElement) return 0;
    const docElem = doc.documentElement;
    const scrollTop = docElem.scrollTop || (doc.body ? doc.body.scrollTop : 0);
    const scrollHeight = (docElem.scrollHeight || 0) - (docElem.clientHeight || 1);
    if (scrollHeight <= 0) return 100;
    const pct = Math.round((scrollTop / scrollHeight) * 100);
    return Math.min(100, Math.max(0, pct));
  }

  getEvents() {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }

  exportTelemetryJson() {
    return JSON.stringify({
      version: '1.0.0',
      system: 'CryptoExchangePro-Telemetry',
      sessionStart: new Date(this.sessionStartTime).toISOString(),
      eventCount: this.events.length,
      events: this.events
    }, null, 2);
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new CryptoExchangeProAnalyticsEngine();

    const durationVal = document.getElementById('sessionDurationVal');
    const scrollVal = document.getElementById('scrollDepthVal');
    const countVal = document.getElementById('eventCountVal');
    const streamContainer = document.getElementById('eventStreamContainer');

    function renderEvents() {
      if (!streamContainer) return;
      streamContainer.replaceChildren();

      const events = engine.getEvents();
      if (countVal) countVal.textContent = String(events.length);

      if (events.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.padding = '2rem';
        empty.style.textAlign = 'center';
        empty.textContent = 'No telemetry events recorded yet.';
        streamContainer.appendChild(empty);
        return;
      }

      events.forEach(evt => {
        const el = document.createElement('div');
        el.className = 'event-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'event-name';
        nameSpan.textContent = evt.name;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'event-time';
        timeSpan.textContent = evt.timeFormatted;

        el.appendChild(nameSpan);
        el.appendChild(timeSpan);
        streamContainer.appendChild(el);
      });
    }

    setInterval(() => {
      if (durationVal) durationVal.textContent = engine.computeSessionDuration();
    }, 1000);

    window.addEventListener('scroll', () => {
      const depth = engine.getScrollDepthPercentage();
      if (scrollVal) scrollVal.textContent = `${depth}%`;
    }, { passive: true });

    document.getElementById('recordSampleTradeBtn')?.addEventListener('click', () => {
      engine.trackEvent('order_book_buy_click', { pair: 'BTC/USDT', price: 92450.0 });
      renderEvents();
    });

    document.getElementById('recordOrderCancelBtn')?.addEventListener('click', () => {
      engine.trackEvent('order_cancel_click', { order_id: 'ord_91823' });
      renderEvents();
    });

    document.getElementById('clearLogBtn')?.addEventListener('click', () => {
      engine.clearEvents();
      renderEvents();
    });

    document.getElementById('exportTelemetryBtn')?.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(engine.exportTelemetryJson());
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `crypto-exchange-telemetry-${Date.now()}.json`);
      dlAnchor.click();
    });

    engine.trackEvent('session_initialized', { module: 'crypto-exchange-pro' });
    renderEvents();
  });
}
