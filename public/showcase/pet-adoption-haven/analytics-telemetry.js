/**
 * Pet Adoption Haven - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Measures adopter searches, foster applications, and shelter dwell time without third-party trackers.
 */

export class PetAdoptionHavenAnalyticsEngine {
  constructor(options = {}) {
    this.sessionStartTime = options.startTime || Date.now();
    this.events = [];
    this.maxEvents = options.maxEvents || 100;

    // Strict PII and privacy scrubbing patterns
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
      id: `pet_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
      system: 'PetAdoptionHaven-Analytics',
      sessionStart: new Date(this.sessionStartTime).toISOString(),
      eventCount: this.events.length,
      events: this.events
    }, null, 2);
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new PetAdoptionHavenAnalyticsEngine();

    const sessionDurationVal = document.getElementById('sessionDurationVal');
    const scrollDepthVal = document.getElementById('scrollDepthVal');
    const eventCountVal = document.getElementById('eventCountVal');
    const eventStreamContainer = document.getElementById('eventStreamContainer');

    const viewProfileBtn = document.getElementById('viewProfileBtn');
    const submitInquiryBtn = document.getElementById('submitInquiryBtn');
    const exportTelemetryBtn = document.getElementById('exportTelemetryBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');

    function renderEvents() {
      if (!eventStreamContainer) return;
      const events = engine.getEvents();
      eventStreamContainer.innerHTML = '';

      if (events.length === 0) {
        eventStreamContainer.innerHTML = '<div style="color: #64748b; font-size: 0.8rem; text-align: center; margin-top: 2rem;">No adopter telemetry recorded yet.</div>';
        return;
      }

      events.forEach(evt => {
        const row = document.createElement('div');
        row.className = 'event-row';
        row.innerHTML = `
          <div>
            <span class="event-title">${evt.name}</span>
            <span class="event-time" style="margin-left: 0.5rem;">${evt.timeFormatted}</span>
          </div>
          <span class="event-chip">${Object.keys(evt.data).length} fields</span>
        `;
        eventStreamContainer.appendChild(row);
      });

      if (eventCountVal) eventCountVal.textContent = events.length;
    }

    setInterval(() => {
      if (sessionDurationVal) {
        sessionDurationVal.textContent = engine.computeSessionDuration();
      }
    }, 1000);

    window.addEventListener('scroll', () => {
      if (scrollDepthVal) {
        scrollDepthVal.textContent = `${engine.getScrollDepthPercentage()}%`;
      }
    });

    if (viewProfileBtn) {
      viewProfileBtn.addEventListener('click', () => {
        engine.trackEvent('pet_profile_viewed', {
          pet_id: 'DOG-704',
          name: 'Buddy',
          breed: 'Golden Retriever Mix',
          age_years: 2.5
        });
        renderEvents();
      });
    }

    if (submitInquiryBtn) {
      submitInquiryBtn.addEventListener('click', () => {
        engine.trackEvent('adoption_inquiry_submitted', {
          pet_id: 'DOG-704',
          home_type: 'Single Family Yard',
          other_pets: true
        });
        renderEvents();
      });
    }

    if (exportTelemetryBtn) {
      exportTelemetryBtn.addEventListener('click', () => {
        const json = engine.exportTelemetryJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pet_adoption_telemetry_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        engine.clearEvents();
        renderEvents();
      });
    }

    engine.trackEvent('shelter_session_initialized', {
      portal: 'pet_adoption_haven',
      active_filters: ['Dogs', 'Young', 'Vaccinated']
    });
    renderEvents();
  });
}
