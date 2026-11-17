/**
 * Biotech Genomics - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Issue #961 - NSoC '26 Level 3 Feature
 */

export class BiotechGenomicsAnalyticsEngine {
  constructor(options = {}) {
    this.sessionStart = options.sessionStart || Date.now();
    this.maskPII = options.maskPII !== false;
    this.maxEvents = options.maxEvents || 500;
    this.events = [];
    this.heatmapPoints = [];
    this.scrollDepthMax = 0;
  }

  // Sanitize text and nested properties to eliminate PII (Emails, phones, tokens, credentials)
  sanitizeData(input) {
    if (!this.maskPII || input === null || input === undefined) return input;

    if (typeof input === 'string') {
      let cleaned = input;
      // Mask Email addresses
      cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
      // Mask Phone numbers (international, parenthesis, dashes)
      cleaned = cleaned.replace(/(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
      // Mask Tokens / API Keys
      cleaned = cleaned.replace(/\b(bearer\s+)?[a-zA-Z0-9_\-]{24,}\b/gi, '[REDACTED_TOKEN]');
      return cleaned;
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeData(item));
    }

    if (typeof input === 'object') {
      const sanitized = {};
      const sensitiveKeys = ['password', 'secret', 'token', 'apikey', 'auth', 'ssn', 'patientid'];

      for (const [key, val] of Object.entries(input)) {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
          sanitized[key] = '[REDACTED_CREDENTIAL]';
        } else {
          sanitized[key] = this.sanitizeData(val);
        }
      }
      return sanitized;
    }

    return input;
  }

  trackEvent(eventName, eventData = {}) {
    if (!eventName) throw new Error('Event name is required');

    const sanitizedData = this.sanitizeData(eventData);
    const eventRecord = {
      id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: String(eventName).trim(),
      data: sanitizedData,
      timestamp: Date.now(),
      timeOffsetMs: Date.now() - this.sessionStart
    };

    this.events.push(eventRecord);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return eventRecord;
  }

  recordInteraction(x, y, target = 'element') {
    const point = {
      x: Math.max(0, Math.round(Number(x) || 0)),
      y: Math.max(0, Math.round(Number(y) || 0)),
      target: this.sanitizeData(String(target)),
      timestamp: Date.now()
    };

    this.heatmapPoints.push(point);
    return point;
  }

  recordScroll(percent) {
    const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    if (p > this.scrollDepthMax) {
      this.scrollDepthMax = p;
    }
    return this.scrollDepthMax;
  }

  computeSessionDuration() {
    return Math.max(0, Date.now() - this.sessionStart);
  }

  getEvents() {
    return [...this.events];
  }

  getHeatmapPoints() {
    return [...this.heatmapPoints];
  }

  getScrollDepthPercentage() {
    return this.scrollDepthMax;
  }

  exportAnonymizedReport() {
    return {
      sessionDurationMs: this.computeSessionDuration(),
      maxScrollDepth: this.scrollDepthMax,
      totalEvents: this.events.length,
      interactionCount: this.heatmapPoints.length,
      events: this.getEvents(),
      heatmap: this.getHeatmapPoints()
    };
  }

  clear() {
    this.events = [];
    this.heatmapPoints = [];
    this.scrollDepthMax = 0;
  }
}

// Browser UI bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.BiotechGenomicsAnalyticsEngine = BiotechGenomicsAnalyticsEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new BiotechGenomicsAnalyticsEngine();
    const eventLog = document.getElementById('event-log');
    const scrollEl = document.getElementById('metric-scroll');
    const clicksEl = document.getElementById('metric-clicks');
    const durationEl = document.getElementById('metric-duration');

    const updateUI = () => {
      if (scrollEl) scrollEl.textContent = `${engine.getScrollDepthPercentage()}%`;
      if (clicksEl) clicksEl.textContent = engine.getHeatmapPoints().length;
      if (durationEl) durationEl.textContent = `${Math.floor(engine.computeSessionDuration() / 1000)}s`;

      if (eventLog) {
        eventLog.innerHTML = '';
        engine.getEvents().slice(-8).reverse().forEach(evt => {
          const li = document.createElement('li');
          li.className = 'event-item';
          li.textContent = `[+${evt.timeOffsetMs}ms] ${evt.name}: ${JSON.stringify(evt.data)}`;
          eventLog.appendChild(li);
        });
      }
    };

    document.addEventListener('click', (e) => {
      engine.recordInteraction(e.clientX, e.clientY, e.target?.tagName || 'UNKNOWN');
      engine.trackEvent('ui_click', { tag: e.target?.tagName, id: e.target?.id });
      updateUI();
    });

    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const b = document.body;
      const st = 'scrollTop';
      const sh = 'scrollHeight';
      const percent = ((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100;
      engine.recordScroll(percent || 0);
      updateUI();
    });

    setInterval(updateUI, 2000);
    updateUI();
  });
}
