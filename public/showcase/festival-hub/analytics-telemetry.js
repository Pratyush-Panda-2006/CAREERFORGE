/**
 * Festival Hub - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Issue #880 - NSoC '26 Level 3 Feature
 */

export class FestivalHubAnalyticsEngine {
  constructor(options = {}) {
    this.sessionStartTime = options.startTime || Date.now();
    this.events = [];
    this.maxEvents = options.maxEvents || 100;

    // Strict PII privacy filters
    this.piiPatterns = [
      /email/i,
      /token/i,
      /auth/i,
      /password/i,
      /secret/i,
      /credential/i,
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
      id: `fest_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  getEvents() {
    return [...this.events];
  }

  computeSessionDuration() {
    const elapsedSec = Math.max(0, Math.floor((Date.now() - this.sessionStartTime) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getScrollDepthPercentage(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc || !doc.documentElement) return 0;
    const el = doc.documentElement;
    const scrollTop = el.scrollTop || (doc.body ? doc.body.scrollTop : 0);
    const scrollHeight = el.scrollHeight || (doc.body ? doc.body.scrollHeight : 0);
    const clientHeight = el.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 0);

    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) return 100;
    const pct = Math.round((scrollTop / maxScroll) * 100);
    return Math.max(0, Math.min(100, pct));
  }

  exportTelemetryReport() {
    return JSON.stringify({
      system: 'festival-hub',
      exportedAt: new Date().toISOString(),
      sessionDuration: this.computeSessionDuration(),
      eventCount: this.events.length,
      events: this.events
    }, null, 2);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.FestivalHubAnalyticsEngine = FestivalHubAnalyticsEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new FestivalHubAnalyticsEngine();
    const eventStreamEl = document.getElementById('event-stream-log');
    const eventCountEl = document.getElementById('event-count-badge');
    const sessionTimeEl = document.getElementById('session-time-display');
    const scrollDepthEl = document.getElementById('scroll-depth-display');
    const exportBtn = document.getElementById('export-telemetry-btn');

    function updateUI() {
      if (eventCountEl) eventCountEl.textContent = engine.getEvents().length;
      if (sessionTimeEl) sessionTimeEl.textContent = engine.computeSessionDuration();
      if (scrollDepthEl) scrollDepthEl.textContent = engine.getScrollDepthPercentage() + '%';

      if (eventStreamEl) {
        eventStreamEl.innerHTML = engine.getEvents().slice(0, 15).map(e => `
          <div class="event-item">
            <span class="event-time">${e.timeFormatted}</span>
            <span class="event-name">${e.name}</span>
            <pre class="event-data">${JSON.stringify(e.data)}</pre>
          </div>
        `).join('');
      }
    }

    // Auto-update timer
    setInterval(() => {
      if (sessionTimeEl) sessionTimeEl.textContent = engine.computeSessionDuration();
    }, 1000);

    window.addEventListener('scroll', () => {
      if (scrollDepthEl) scrollDepthEl.textContent = engine.getScrollDepthPercentage() + '%';
    });

    document.getElementById('btn-track-stage')?.addEventListener('click', () => {
      engine.trackEvent('stage_viewed', { stageName: 'Neon Meadows', artist: 'Hyperion' });
      updateUI();
    });

    document.getElementById('btn-track-ticket')?.addEventListener('click', () => {
      engine.trackEvent('ticket_clicked', { tier: 'VIP Weekend Pass', priceUsd: 280 });
      updateUI();
    });

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = engine.exportTelemetryReport();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'festival-hub-telemetry.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    updateUI();
  });
}
