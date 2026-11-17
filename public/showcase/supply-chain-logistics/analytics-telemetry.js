/**
 * Supply Chain Logistics - Privacy-Preserving Client Analytics & Interaction Heatmap Engine
 * Measures interaction events, calculates scroll depth, computes clamped session duration, and sanitizes PII.
 */

export class SupplyChainLogisticsAnalyticsEngine {
  constructor() {
    this.events = [];
    this.heatmap = new Map();
    this.sessionStartTime = Date.now();
    this.maxScrollDepth = 0;
  }

  // Privacy sanitizer: scrubs emails, query parameters, auth tokens, and IP-like patterns
  static sanitizeData(data = {}) {
    if (!data || typeof data !== 'object') return {};
    const sanitized = {};

    const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

    const blockedPatterns = [/email/i, /token/i, /auth/i, /password/i, /(^|_)ip(_|$)/i, /ssn/i, /phone/i];
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      // Block known PII keys entirely
      if (blockedPatterns.some(regex => regex.test(lowerKey))) {
        continue;
      }

      if (typeof val === 'string') {
        sanitized[key] = val
          .replace(emailRegex, '[SCRUBBED_EMAIL]')
          .replace(ipRegex, '[SCRUBBED_IP]');
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  trackEvent(name, data = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Event name is required and must be a string');
    }

    const cleanName = name.trim();
    const cleanData = SupplyChainLogisticsAnalyticsEngine.sanitizeData(data);

    const event = {
      id: `evt_${Date.now()}_${this.events.length + 1}`,
      name: cleanName,
      data: cleanData,
      timestamp: new Date().toISOString()
    };

    this.events.push(event);

    // Update heatmap counter
    const currentCount = this.heatmap.get(cleanName) || 0;
    this.heatmap.set(cleanName, currentCount + 1);

    return event;
  }

  getScrollDepthPercentage(currentY = 0, scrollHeight = 1000, clientHeight = 800) {
    if (typeof window !== 'undefined') {
      const winY = window.scrollY || window.pageYOffset || 0;
      const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
      const winHeight = window.innerHeight || 1;
      const totalScrollable = Math.max(1, docHeight - winHeight);
      const pct = Math.min(100, Math.max(0, Math.round((winY / totalScrollable) * 100)));
      this.maxScrollDepth = Math.max(this.maxScrollDepth, pct);
      return this.maxScrollDepth;
    }

    const total = Math.max(1, scrollHeight - clientHeight);
    const pct = Math.min(100, Math.max(0, Math.round((currentY / total) * 100)));
    this.maxScrollDepth = Math.max(this.maxScrollDepth, pct);
    return this.maxScrollDepth;
  }

  computeSessionDuration(nowTime = null) {
    const now = nowTime || Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - this.sessionStartTime) / 1000));
    // Clamped to 86400 (24 hours max)
    return Math.min(86400, elapsedSeconds);
  }

  getHeatmapData() {
    const list = [];
    for (const [target, clicks] of this.heatmap.entries()) {
      list.push({ target, clicks });
    }
    return list.sort((a, b) => b.clicks - a.clicks);
  }

  exportTelemetryJSON() {
    return JSON.stringify({
      sessionDurationSeconds: this.computeSessionDuration(),
      maxScrollDepth: this.maxScrollDepth,
      totalEvents: this.events.length,
      heatmap: this.getHeatmapData(),
      events: this.events
    }, null, 2);
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const analytics = new SupplyChainLogisticsAnalyticsEngine();

    const durationVal = document.getElementById('sessionDurationVal');
    const scrollVal = document.getElementById('scrollDepthVal');
    const eventsCountVal = document.getElementById('eventsCountVal');
    const heatmapContainer = document.getElementById('heatmapContainer');
    const eventStreamLog = document.getElementById('eventStreamLog');

    function updateMetricsUI() {
      const sec = analytics.computeSessionDuration();
      const mins = Math.floor(sec / 60).toString().padStart(2, '0');
      const remSec = (sec % 60).toString().padStart(2, '0');
      if (durationVal) durationVal.textContent = `${mins}:${remSec}`;

      if (scrollVal) scrollVal.textContent = `${analytics.getScrollDepthPercentage()}%`;
      if (eventsCountVal) eventsCountVal.textContent = String(analytics.events.length);

      if (heatmapContainer) {
        heatmapContainer.replaceChildren();
        const data = analytics.getHeatmapData();
        if (data.length === 0) {
          const empty = document.createElement('div');
          empty.style.color = 'var(--text-muted)';
          empty.textContent = 'No component interactions recorded yet.';
          heatmapContainer.appendChild(empty);
        } else {
          data.forEach(item => {
            const row = document.createElement('div');
            row.className = 'heatmap-row';
            row.innerHTML = `
              <span class="heatmap-tag">${item.target}</span>
              <div class="heatmap-bar-wrap">
                <span class="heatmap-badge">${item.clicks} hits</span>
              </div>
            `;
            heatmapContainer.appendChild(row);
          });
        }
      }

      if (eventStreamLog) {
        eventStreamLog.replaceChildren();
        analytics.events.slice(-10).reverse().forEach(evt => {
          const entry = document.createElement('div');
          entry.className = 'stream-entry';
          entry.innerHTML = `
            <span class="stream-name">${evt.name}</span>
            <span class="stream-time">${new Date(evt.timestamp).toLocaleTimeString()}</span>
          `;
          eventStreamLog.appendChild(entry);
        });
      }
    }

    // Scroll listener
    window.addEventListener('scroll', () => {
      analytics.getScrollDepthPercentage();
      if (scrollVal) scrollVal.textContent = `${analytics.maxScrollDepth}%`;
    }, { passive: true });

    // Duration timer
    setInterval(updateMetricsUI, 1000);

    // Interactive simulator clicks
    document.getElementById('simManifestClick')?.addEventListener('click', () => {
      analytics.trackEvent('cargo_manifest_audit', { cargo_id: 'C-892', priority: 'express' });
      updateMetricsUI();
    });

    document.getElementById('simRouteClick')?.addEventListener('click', () => {
      analytics.trackEvent('route_recalculation', { origin: 'Port of Rotterdam', destination: 'Chicago Depot' });
      updateMetricsUI();
    });

    document.getElementById('simCustomsClick')?.addEventListener('click', () => {
      analytics.trackEvent('customs_duty_verification', { hts_code: '8471.30', status: 'cleared' });
      updateMetricsUI();
    });

    document.getElementById('simExportReport')?.addEventListener('click', () => {
      const json = analytics.exportTelemetryJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logistics-telemetry-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    updateMetricsUI();
  });
}
