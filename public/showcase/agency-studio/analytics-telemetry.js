/**
 * Agency Studio - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Issue #876 - NSoC '26 Level 3 Feature
 */

export class AgencyStudioAnalyticsEngine {
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
      /ssn/i,
      /budget/i
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
      id: `agency_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
      system: 'agency-studio',
      exportedAt: new Date().toISOString(),
      sessionDuration: this.computeSessionDuration(),
      eventCount: this.events.length,
      events: this.events
    }, null, 2);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.AgencyStudioAnalyticsEngine = AgencyStudioAnalyticsEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AgencyStudioAnalyticsEngine();
    const streamContainer = document.getElementById('analyticsStreamLog');
    const sessionDurationEl = document.getElementById('sessionDurationDisplay');
    const eventCountEl = document.getElementById('eventCountDisplay');
    const exportBtn = document.getElementById('btnExportTelemetry');

    function updateView() {
      if (sessionDurationEl) {
        sessionDurationEl.textContent = engine.computeSessionDuration();
      }
      if (eventCountEl) {
        eventCountEl.textContent = String(engine.events.length);
      }
      if (streamContainer) {
        streamContainer.replaceChildren();
        engine.getEvents().forEach(evt => {
          const item = document.createElement('div');
          item.className = 'telemetry-event-row';
          item.innerHTML = `
            <div class="telemetry-event-meta">
              <span class="telemetry-badge">${evt.name}</span>
              <span class="telemetry-time">${evt.timeFormatted}</span>
            </div>
            <pre class="telemetry-data">${JSON.stringify(evt.data, null, 2)}</pre>
          `;
          streamContainer.appendChild(item);
        });
      }
    }

    setInterval(() => {
      if (sessionDurationEl) sessionDurationEl.textContent = engine.computeSessionDuration();
    }, 1000);

    document.querySelectorAll('[data-analytics-event]').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventName = btn.getAttribute('data-analytics-event');
        engine.trackEvent(eventName, { source: 'agency-studio-dashboard', target: btn.id || 'action-btn' });
        updateView();
      });
    });

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const report = engine.exportTelemetryReport();
        const blob = new Blob([report], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agency-telemetry-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    updateView();
  });
}
