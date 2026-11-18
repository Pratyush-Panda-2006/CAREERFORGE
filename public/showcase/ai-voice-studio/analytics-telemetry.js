/**
 * AI Voice Studio - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Tracks synthesis node adjustments, spectrogram renders, and interaction metrics without third-party telemetry.
 */

export class AiVoiceStudioAnalyticsEngine {
  constructor(options = {}) {
    this.sessionStartTime = options.startTime || Date.now();
    this.events = [];
    this.maxEvents = options.maxEvents || 100;

    // Strict PII and telemetry privacy filters
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
    const cleanName = String(name || 'voice_studio_event').trim();
    const scrubbed = this.scrubData(data);

    const record = {
      id: `voice_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
      sessionStartTime: this.sessionStartTime,
      exportedAt: Date.now(),
      eventCount: this.events.length,
      events: this.events
    }, null, 2);
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AiVoiceStudioAnalyticsEngine();

    const triggerBtn = document.getElementById('triggerEventBtn');
    const clearBtn = document.getElementById('clearAnalyticsBtn');
    const exportBtn = document.getElementById('exportAnalyticsBtn');
    const eventNameInput = document.getElementById('eventNameInput');
    const eventsList = document.getElementById('eventsList');
    const eventCountBadge = document.getElementById('eventCountBadge');
    const sessionDurationVal = document.getElementById('sessionDurationVal');

    function renderEvents() {
      if (eventCountBadge) eventCountBadge.textContent = engine.events.length;
      if (eventsList) {
        eventsList.innerHTML = engine.events.map(evt => `
          <div class="event-item">
            <span class="event-time">${evt.timeFormatted}</span>
            <span class="event-name">${evt.name}</span>
            <span class="event-payload">${JSON.stringify(evt.data)}</span>
          </div>
        `).join('') || '<div class="empty-state">No events captured yet</div>';
      }
    }

    if (triggerBtn && eventNameInput) {
      triggerBtn.addEventListener('click', () => {
        const name = eventNameInput.value.trim() || 'node_frequency_modulate';
        engine.trackEvent(name, { pitchHz: 440, gainDb: -3.5 });
        eventNameInput.value = '';
        renderEvents();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        engine.clearEvents();
        renderEvents();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([engine.exportTelemetryJson()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-studio-telemetry-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    setInterval(() => {
      if (sessionDurationVal) {
        sessionDurationVal.textContent = engine.computeSessionDuration();
      }
    }, 1000);

    // Initial event
    engine.trackEvent('studio_session_initialized', { codec: 'neural_pcm_48k' });
    renderEvents();
  });
}
