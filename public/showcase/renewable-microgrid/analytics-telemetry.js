/**
 * Renewable Microgrid - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Issue #977 - NSoC '26 Level 3 Feature
 */

export class RenewableMicrogridAnalyticsEngine {
  static PII_PATTERNS = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // emails
    /\b(?:password|passwd|token|secret|apiKey|auth)\b/i, // sensitive keys
    /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g // phone numbers
  ];

  constructor(options = {}) {
    this.sessionStartTime = options.startTime || Date.now();
    this.events = [];
    this.maxScrollDepth = 0;
    this.clicks = [];
    this.sessionId = options.sessionId || `session-${Math.random().toString(36).slice(2, 9)}`;
  }

  trackEvent(name, data = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    const sanitizedData = this.sanitizeData(data);
    const event = {
      id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      data: sanitizedData,
      timestamp: Date.now(),
      elapsedMs: this.computeSessionDuration()
    };

    this.events.push(event);
    return event;
  }

  recordClick(target) {
    const targetTag = typeof target === 'string' ? target : (target?.tagName || 'UNKNOWN');
    const targetId = typeof target === 'object' && target?.id ? target.id : '';
    const label = targetId ? `${targetTag}#${targetId}` : targetTag;

    const clickData = {
      target: this.sanitizeData(label),
      timestamp: Date.now()
    };
    this.clicks.push(clickData);
    this.trackEvent('user_click', clickData);
    return clickData;
  }

  updateScrollDepth(currentScrollY, totalScrollHeight, viewportHeight) {
    if (totalScrollHeight <= viewportHeight) {
      this.maxScrollDepth = 100;
      return 100;
    }
    const maxScrollable = totalScrollHeight - viewportHeight;
    const rawPct = (currentScrollY / maxScrollable) * 100;
    const clampedPct = Math.min(100, Math.max(0, Math.round(rawPct)));
    if (clampedPct > this.maxScrollDepth) {
      this.maxScrollDepth = clampedPct;
    }
    return this.maxScrollDepth;
  }

  getScrollDepthPercentage() {
    return Math.min(100, Math.max(0, this.maxScrollDepth));
  }

  computeSessionDuration(now = Date.now()) {
    const elapsed = now - this.sessionStartTime;
    return Math.max(0, elapsed);
  }

  sanitizeData(input) {
    if (input === null || input === undefined) return input;
    if (typeof input === 'string') {
      let sanitized = input;
      // Strip email addresses
      sanitized = sanitized.replace(RenewableMicrogridAnalyticsEngine.PII_PATTERNS[0], '[REDACTED_EMAIL]');
      // Strip phone numbers
      sanitized = sanitized.replace(RenewableMicrogridAnalyticsEngine.PII_PATTERNS[2], '[REDACTED_PHONE]');
      return sanitized;
    }
    if (typeof input === 'number' || typeof input === 'boolean') {
      return input;
    }
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeData(item));
    }
    if (typeof input === 'object') {
      const cleanObj = {};
      for (const [key, val] of Object.entries(input)) {
        if (RenewableMicrogridAnalyticsEngine.PII_PATTERNS[1].test(key)) {
          cleanObj[key] = '[REDACTED_CREDENTIAL]';
        } else {
          cleanObj[key] = this.sanitizeData(val);
        }
      }
      return cleanObj;
    }
    return String(input);
  }

  exportReportJSON() {
    return JSON.stringify({
      sessionId: this.sessionId,
      sessionDurationMs: this.computeSessionDuration(),
      maxScrollDepthPercent: this.getScrollDepthPercentage(),
      totalEventsTracked: this.events.length,
      totalClicksRecorded: this.clicks.length,
      events: this.events
    }, null, 2);
  }
}
