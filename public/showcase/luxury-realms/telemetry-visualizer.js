/**
 * Luxury Realms - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 * Issue #645 - Level 3 Core Feature
 *
 * Implements interactive metrics visualizer rendering prime estate market valuation trends,
 * private acquisition inquiries, VIP viewing interest velocity, and hover coordinate tracking.
 */

export class LuxuryRealmsTelemetryVisualizer {
  /**
   * @param {object} [options={}]
   * @param {string} [options.timeWindow='24H']
   * @param {Array<object>} [options.data]
   * @param {string} [options.strokeColor='#d4af37']
   * @param {string} [options.accentColor='#f3d87e']
   * @param {object} [options.padding]
   */
  constructor(options = {}) {
    this.timeWindow = options.timeWindow || '24H';
    this.rawSeries = options.data || this._getDefaultData(this.timeWindow);
    this.strokeColor = options.strokeColor || '#d4af37';
    this.accentColor = options.accentColor || '#f3d87e';
    this.padding = options.padding || { top: 20, right: 24, bottom: 32, left: 40 };
    this.activePoint = null;
  }

  /**
   * Default sample portfolio valuation interest telemetry (inquiries / valuation index)
   * @param {string} windowKey
   * @returns {Array<{ timestamp: number, value: number, inquiries: number }>}
   */
  _getDefaultData(windowKey) {
    const counts = { '1H': 12, '24H': 24, '7D': 14 };
    const count = counts[windowKey] || 24;
    const baseValuation = 450.0;

    return Array.from({ length: count }, (_, i) => {
      const wave = Math.sin(i * 0.45) * 85.0 + Math.cos(i * 0.3) * 45.0;
      const jitter = (Math.random() - 0.5) * 15.0;
      const val = Number(Math.max(200, Math.min(800, baseValuation + wave + jitter)).toFixed(1));
      const inq = Math.max(1, Math.round(val / 32));

      return {
        timestamp: Date.now() - (count - 1 - i) * (windowKey === '1H' ? 300000 : windowKey === '7D' ? 43200000 : 3600000),
        value: val,
        inquiries: inq
      };
    });
  }

  /**
   * Updates raw series data
   * @param {Array<object>} data
   * @returns {Array<object>}
   */
  setData(data) {
    if (!Array.isArray(data)) return [];
    this.rawSeries = [...data];
    return this.rawSeries;
  }

  /**
   * Sets time window
   * @param {string} windowKey
   * @returns {boolean}
   */
  setTimeWindow(windowKey) {
    if (!['1H', '24H', '7D'].includes(windowKey)) return false;
    this.timeWindow = windowKey;
    this.rawSeries = this._getDefaultData(windowKey);
    return true;
  }

  /**
   * Calculates coordinate bounds across points
   * @param {Array<object|number>} [points=this.rawSeries]
   * @returns {{ minVal: number, maxVal: number, minTime: number, maxTime: number }}
   */
  getCoordinateBounds(points = this.rawSeries) {
    if (!points || points.length === 0) {
      return { minVal: 0, maxVal: 100, minTime: 0, maxTime: 0 };
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const pt of points) {
      const v = typeof pt === 'number' ? pt : pt.value;
      const t = pt.timestamp || 0;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }

    if (minVal === maxVal) {
      minVal -= 10;
      maxVal += 10;
    }

    return { minVal, maxVal, minTime, maxTime };
  }

  /**
   * Normalizes values into a standard [0.0, 1.0] domain
   * @param {Array<object|number>} [points=this.rawSeries]
   * @returns {Array<number>}
   */
  normalizeData(points = this.rawSeries) {
    if (!points || points.length === 0) return [];
    const { minVal, maxVal } = this.getCoordinateBounds(points);
    const range = maxVal - minVal || 1;

    return points.map(pt => {
      const v = typeof pt === 'number' ? pt : pt.value;
      const normalized = (v - minVal) / range;
      return Math.max(0.0, Math.min(1.0, Number(normalized.toFixed(4))));
    });
  }

  /**
   * Applies Exponential Moving Average (EMA) smoothing
   * @param {Array<object|number>} [points=this.rawSeries]
   * @param {number} [alpha=0.35]
   * @returns {Array<number>}
   */
  smoothPoints(points = this.rawSeries, alpha = 0.35) {
    if (!points || points.length === 0) return [];
    const cleanAlpha = Math.max(0.01, Math.min(1.0, alpha));
    const values = points.map(p => (typeof p === 'number' ? p : p.value));

    const smoothed = [values[0]];
    for (let i = 1; i < values.length; i++) {
      const prev = smoothed[i - 1];
      const curr = values[i];
      const val = cleanAlpha * curr + (1 - cleanAlpha) * prev;
      smoothed.push(Number(val.toFixed(2)));
    }
    return smoothed;
  }

  /**
   * Generates SVG path data string for sparklines and vector charts
   * @param {number} width
   * @param {number} height
   * @param {Array<object|number>} [points=this.rawSeries]
   * @returns {{ pathD: string, areaD: string }}
   */
  generateSvgPath(width = 400, height = 200, points = this.rawSeries) {
    if (!points || points.length < 2) return { pathD: '', areaD: '' };

    const norm = this.normalizeData(points);
    const p = this.padding;
    const plotW = Math.max(10, width - p.left - p.right);
    const plotH = Math.max(10, height - p.top - p.bottom);

    const coords = norm.map((n, idx) => {
      const x = p.left + (idx / (norm.length - 1)) * plotW;
      const y = p.top + (1.0 - n) * plotH;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '').trim();
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    const baselineY = height - p.bottom;
    const areaD = `${pathD} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { pathD, areaD };
  }

  /**
   * Finds nearest telemetry point by mouse X coordinate
   * @param {number} mouseX
   * @param {number} totalWidth
   * @param {Array<object>} [points=this.rawSeries]
   * @returns {object|null}
   */
  getNearestPoint(mouseX, totalWidth = 400, points = this.rawSeries) {
    if (!points || points.length === 0) return null;
    const p = this.padding;
    const plotW = totalWidth - p.left - p.right;
    const relX = Math.max(0, Math.min(plotW, mouseX - p.left));
    const ratio = relX / plotW;
    const index = Math.round(ratio * (points.length - 1));
    const safeIdx = Math.max(0, Math.min(points.length - 1, index));

    const pt = points[safeIdx];
    this.activePoint = pt;
    return {
      index: safeIdx,
      point: pt,
      x: p.left + (safeIdx / (points.length - 1)) * plotW
    };
  }
}
