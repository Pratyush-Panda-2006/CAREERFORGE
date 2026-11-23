/**
 * FintechVaultWhiteboardCanvas
 * Production-grade collaborative freehand vector sketchpad & financial architecture whiteboard canvas.
 * Part of ApexVault institutional fintech showcase.
 */

export const FINTECH_PALETTE = Object.freeze({
  vaultNavy: '#081226',
  emeraldGreen: '#10b981',
  amberGold: '#f59e0b',
  azureBlue: '#0284c7',
  indigoSecurity: '#6366f1',
  roseAlert: '#ec4899',
  pureWhite: '#ffffff',
});

export const SUPPORTED_TOOLS = Object.freeze(['pen', 'eraser', 'flow', 'node', 'rectangle', 'circle']);

export const TOOL_ALIASES = Object.freeze({
  pencil: 'pen',
  draw: 'pen',
  freehand: 'pen',
  brush: 'pen',
  line: 'flow',
  arrow: 'flow',
  connector: 'flow',
  badge: 'node',
  box: 'rectangle',
  rect: 'rectangle',
  square: 'rectangle',
  zone: 'rectangle',
  ellipse: 'circle',
  ring: 'circle',
  enclave: 'circle',
  delete: 'eraser',
  rub: 'eraser',
});

/**
 * Escapes characters for safe inclusion in SVG XML attributes and text.
 */
function escapeXml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class FintechVaultWhiteboardCanvas {
  static PALETTE = FINTECH_PALETTE;
  static TOOLS = SUPPORTED_TOOLS;

  #canvas = null;
  #ctx = null;
  #width = 1200;
  #height = 800;
  #currentTool = 'pen';
  #currentColor = FINTECH_PALETTE.emeraldGreen;
  #strokeWidth = 3;
  #opacity = 1.0;
  #nodeLabel = 'SECURITY_VAULT';
  #nodeBadgeType = 'SECURE';
  #maxHistory = 50;
  #strokes = [];
  #redoStack = [];
  #currentStroke = null;
  #backdropTemplate = 'none';
  #showGrid = true;
  #isDrawing = false;
  #listeners = new Map();
  #boundEventHandlers = null;
  #dpr = 1;

  constructor(canvasOrOptions = {}, options = {}) {
    let opts = options;
    let canvasElement = null;

    if (canvasOrOptions && typeof canvasOrOptions === 'object') {
      if (typeof canvasOrOptions.getContext === 'function' || ('nodeType' in canvasOrOptions && canvasOrOptions.nodeType === 1)) {
        canvasElement = canvasOrOptions;
      } else {
        opts = canvasOrOptions;
      }
    }

    if (opts.width && Number.isFinite(opts.width)) this.#width = Math.max(100, Number(opts.width));
    if (opts.height && Number.isFinite(opts.height)) this.#height = Math.max(100, Number(opts.height));
    if (opts.maxHistory && Number.isInteger(opts.maxHistory)) this.#maxHistory = Math.max(5, opts.maxHistory);
    if (opts.tool) this.setTool(opts.tool);
    if (opts.color) this.setColor(opts.color);
    if (opts.strokeWidth !== undefined) this.setStrokeWidth(opts.strokeWidth);
    if (opts.opacity !== undefined) this.setOpacity(opts.opacity);
    if (opts.showGrid !== undefined) this.#showGrid = Boolean(opts.showGrid);
    if (opts.template) this.setTemplate(opts.template);

    if (canvasElement) {
      this.attachCanvas(canvasElement);
    }
  }

  // --- Getters & Accessors ---
  get canvas() { return this.#canvas; }
  get ctx() { return this.#ctx; }
  get width() { return this.#width; }
  get height() { return this.#height; }
  get currentTool() { return this.#currentTool; }
  get currentColor() { return this.#currentColor; }
  get strokeWidth() { return this.#strokeWidth; }
  get opacity() { return this.#opacity; }
  get nodeLabel() { return this.#nodeLabel; }
  get nodeBadgeType() { return this.#nodeBadgeType; }
  get maxHistory() { return this.#maxHistory; }
  get strokes() { return this.#strokes.map(s => this.#cloneStroke(s)); }
  get redoStack() { return this.#redoStack.map(s => this.#cloneStroke(s)); }
  get currentStroke() { return this.#currentStroke ? this.#cloneStroke(this.#currentStroke) : null; }
  get backdropTemplate() { return this.#backdropTemplate; }
  get showGrid() { return this.#showGrid; }
  get isDrawing() { return this.#isDrawing; }
  get canUndo() { return this.#strokes.length > 0; }
  get canRedo() { return this.#redoStack.length > 0; }
  get historyCount() { return this.#strokes.length; }
  get palette() { return FINTECH_PALETTE; }

  // --- Tool & Brush Configuration ---

  static normalizeTool(tool) {
    if (typeof tool !== 'string' || !tool.trim()) {
      throw new TypeError(`Invalid tool: must be a non-empty string. Supported tools: ${SUPPORTED_TOOLS.join(', ')}`);
    }
    const normalized = tool.trim().toLowerCase();
    if (SUPPORTED_TOOLS.includes(normalized)) {
      return normalized;
    }
    if (TOOL_ALIASES[normalized]) {
      return TOOL_ALIASES[normalized];
    }
    throw new Error(`Unsupported tool "${tool}". Supported tools: ${SUPPORTED_TOOLS.join(', ')}`);
  }

  normalizeTool(tool) {
    return FintechVaultWhiteboardCanvas.normalizeTool(tool);
  }

  setTool(tool) {
    const validTool = this.normalizeTool(tool);
    if (this.#currentTool !== validTool) {
      const prev = this.#currentTool;
      this.#currentTool = validTool;
      this.emit('tool:change', { tool: validTool, previous: prev });
    }
    return this;
  }

  setColor(color) {
    if (typeof color !== 'string' || !color.trim()) {
      throw new TypeError('Color must be a valid CSS color string.');
    }
    const cleanColor = color.trim();
    if (this.#currentColor !== cleanColor) {
      const prev = this.#currentColor;
      this.#currentColor = cleanColor;
      this.emit('color:change', { color: cleanColor, previous: prev });
    }
    return this;
  }

  setStrokeWidth(width) {
    const parsed = Number(width);
    if (!Number.isFinite(parsed)) {
      this.#strokeWidth = 3;
    } else {
      this.#strokeWidth = Math.max(1, Math.min(64, Math.round(parsed)));
    }
    this.emit('brush:change', { strokeWidth: this.#strokeWidth, opacity: this.#opacity });
    return this;
  }

  setOpacity(opacity) {
    const parsed = Number(opacity);
    if (!Number.isFinite(parsed)) {
      this.#opacity = 1.0;
    } else {
      this.#opacity = Math.max(0.0, Math.min(1.0, Math.round(parsed * 100) / 100));
    }
    this.emit('brush:change', { strokeWidth: this.#strokeWidth, opacity: this.#opacity });
    return this;
  }

  setNodeLabel(label, badgeType = 'SECURE') {
    if (typeof label === 'string' && label.trim()) {
      this.#nodeLabel = label.trim().slice(0, 48);
    }
    if (typeof badgeType === 'string' && badgeType.trim()) {
      this.#nodeBadgeType = badgeType.trim().slice(0, 24);
    }
    return this;
  }

  setShowGrid(show) {
    this.#showGrid = Boolean(show);
    this.render();
    this.emit('grid:change', { showGrid: this.#showGrid });
    return this;
  }

  setDimensions(width, height) {
    const w = Math.max(100, Number(width) || this.#width);
    const h = Math.max(100, Number(height) || this.#height);
    this.#width = w;
    this.#height = h;
    if (this.#canvas) {
      this.#canvas.width = w * this.#dpr;
      this.#canvas.height = h * this.#dpr;
      if (this.#ctx && this.#dpr !== 1) {
        this.#ctx.scale(this.#dpr, this.#dpr);
      }
    }
    this.render();
    this.emit('resize', { width: w, height: h });
    return this;
  }

  // --- Geometry, Interpolation & Spline Smoothing ---

  /**
   * Distance-based point interpolation:
   * Generates intermediate points between p1 and p2 such that step <= dist.
   * Prevents sparse gaps during fast mouse/pen velocity.
   */
  static interpolatePoints(p1, p2, dist = 5) {
    if (!p1 || !p2) return [];
    const x1 = Number(p1.x) || 0;
    const y1 = Number(p1.y) || 0;
    const x2 = Number(p2.x) || 0;
    const y2 = Number(p2.y) || 0;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      return [{ x: x1, y: y1 }];
    }

    const stepDist = Math.max(1, Number(dist) || 5);
    const steps = Math.ceil(distance / stepDist);

    if (steps <= 1) {
      return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    }

    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: Math.round((x1 + dx * t) * 100) / 100,
        y: Math.round((y1 + dy * t) * 100) / 100,
      });
    }
    return points;
  }

  interpolatePoints(p1, p2, dist = 5) {
    return FintechVaultWhiteboardCanvas.interpolatePoints(p1, p2, dist);
  }

  /**
   * Converts a sequence of points to smooth cubic Bezier curve segments using Catmull-Rom spline.
   * Tension = 0.5 (Centripetal standard).
   */
  static catmullRomToBezier(points, tension = 0.5) {
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }

    if (points.length === 2) {
      const p0 = points[0];
      const p1 = points[1];
      const cp1 = {
        x: p0.x + (p1.x - p0.x) / 3,
        y: p0.y + (p1.y - p0.y) / 3,
      };
      const cp2 = {
        x: p1.x - (p1.x - p0.x) / 3,
        y: p1.y - (p1.y - p0.y) / 3,
      };
      return [{ p0, cp1, cp2, p1 }];
    }

    const segments = [];
    const n = points.length;

    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      const pPrev = i > 0 ? points[i - 1] : { x: 2 * p0.x - p1.x, y: 2 * p0.y - p1.y };
      const pNext = i < n - 2 ? points[i + 2] : { x: 2 * p1.x - p0.x, y: 2 * p1.y - p0.y };

      const cp1 = {
        x: p0.x + ((p1.x - pPrev.x) * tension) / 3,
        y: p0.y + ((p1.y - pPrev.y) * tension) / 3,
      };

      const cp2 = {
        x: p1.x - ((pNext.x - p0.x) * tension) / 3,
        y: p1.y - ((pNext.y - p0.y) * tension) / 3,
      };

      segments.push({ p0, cp1, cp2, p1 });
    }

    return segments;
  }

  catmullRomToBezier(points, tension = 0.5) {
    return FintechVaultWhiteboardCanvas.catmullRomToBezier(points, tension);
  }

  /**
   * Generates SVG path string `d` from points using Catmull-Rom to cubic Bezier curve conversion.
   */
  static pointsToSVGPath(points, tension = 0.5) {
    if (!Array.isArray(points) || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} l 0.01 0`;
    }

    const segments = FintechVaultWhiteboardCanvas.catmullRomToBezier(points, tension);
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (const seg of segments) {
      d += ` C ${seg.cp1.x.toFixed(2)} ${seg.cp1.y.toFixed(2)}, ${seg.cp2.x.toFixed(2)} ${seg.cp2.y.toFixed(2)}, ${seg.p1.x.toFixed(2)} ${seg.p1.y.toFixed(2)}`;
    }

    return d;
  }

  pointsToSVGPath(points, tension = 0.5) {
    return FintechVaultWhiteboardCanvas.pointsToSVGPath(points, tension);
  }

  // --- History (Undo / Redo / Eviction) ---

  #cloneStroke(stroke) {
    if (!stroke) return null;
    return JSON.parse(JSON.stringify(stroke));
  }

  addStroke(stroke) {
    if (!stroke || typeof stroke !== 'object') {
      throw new TypeError('Stroke must be an object.');
    }
    const tool = this.normalizeTool(stroke.tool || this.#currentTool);
    const strokeRecord = {
      id: stroke.id || `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tool,
      color: stroke.color || this.#currentColor,
      strokeWidth: stroke.strokeWidth !== undefined ? Number(stroke.strokeWidth) : this.#strokeWidth,
      opacity: stroke.opacity !== undefined ? Number(stroke.opacity) : this.#opacity,
      timestamp: stroke.timestamp || Date.now(),
      ...stroke,
    };

    // If history capacity is exceeded, evict the oldest stroke
    if (this.#strokes.length >= this.#maxHistory) {
      this.#strokes.shift();
    }

    this.#strokes.push(strokeRecord);
    // Adding a new stroke invalidates and clears the redo stack
    this.#redoStack = [];

    this.emit('stroke:add', { stroke: this.#cloneStroke(strokeRecord) });
    this.emit('change', { historyCount: this.#strokes.length });
    this.render();
    return strokeRecord;
  }

  undo() {
    if (this.#strokes.length === 0) return false;
    const stroke = this.#strokes.pop();
    this.#redoStack.push(stroke);
    this.emit('undo', { stroke: this.#cloneStroke(stroke) });
    this.emit('change', { historyCount: this.#strokes.length });
    this.render();
    return true;
  }

  redo() {
    if (this.#redoStack.length === 0) return false;
    const stroke = this.#redoStack.pop();
    this.#strokes.push(stroke);
    this.emit('redo', { stroke: this.#cloneStroke(stroke) });
    this.emit('change', { historyCount: this.#strokes.length });
    this.render();
    return true;
  }

  clear() {
    if (this.#strokes.length === 0 && this.#redoStack.length === 0) return false;
    this.#strokes = [];
    this.#redoStack = [];
    this.#currentStroke = null;
    this.emit('clear', {});
    this.emit('change', { historyCount: 0 });
    this.render();
    return true;
  }

  // --- Templates ---

  getTemplateData(templateName) {
    const w = this.#width;
    const h = this.#height;

    switch (templateName) {
      case 'payment-flow':
        return [
          {
            tool: 'node',
            x: 80,
            y: 120,
            width: 180,
            height: 70,
            color: FINTECH_PALETTE.emeraldGreen,
            strokeWidth: 2,
            opacity: 1,
            label: 'CLIENT APPS',
            badgeType: 'INGRESS',
          },
          {
            tool: 'flow',
            start: { x: 260, y: 155 },
            end: { x: 380, y: 155 },
            color: FINTECH_PALETTE.azureBlue,
            strokeWidth: 3,
            opacity: 1,
            label: 'mTLS JWT',
          },
          {
            tool: 'node',
            x: 380,
            y: 120,
            width: 200,
            height: 70,
            color: FINTECH_PALETTE.indigoSecurity,
            strokeWidth: 2,
            opacity: 1,
            label: 'API GATEWAY & WAF',
            badgeType: 'DMZ SHIELD',
          },
          {
            tool: 'flow',
            start: { x: 580, y: 155 },
            end: { x: 700, y: 155 },
            color: FINTECH_PALETTE.azureBlue,
            strokeWidth: 3,
            opacity: 1,
            label: 'ENCRYPTED RPC',
          },
          {
            tool: 'node',
            x: 700,
            y: 120,
            width: 220,
            height: 70,
            color: FINTECH_PALETTE.amberGold,
            strokeWidth: 2,
            opacity: 1,
            label: 'TRANSACTION ENGINE',
            badgeType: 'CORE KERNEL',
          },
          {
            tool: 'flow',
            start: { x: 810, y: 190 },
            end: { x: 810, y: 280 },
            color: FINTECH_PALETTE.roseAlert,
            strokeWidth: 3,
            opacity: 1,
            label: 'DOUBLE-ENTRY',
          },
          {
            tool: 'node',
            x: 700,
            y: 280,
            width: 220,
            height: 70,
            color: FINTECH_PALETTE.pureWhite,
            strokeWidth: 2,
            opacity: 1,
            label: 'IMMUTABLE LEDGER',
            badgeType: 'AUDIT STORE',
          },
          {
            tool: 'rectangle',
            x: 660,
            y: 80,
            width: 300,
            height: 310,
            color: FINTECH_PALETTE.indigoSecurity,
            strokeWidth: 2,
            opacity: 0.6,
            dashed: true,
            label: 'ZERO TRUST ENCLAVE',
          },
        ];

      case 'escrow-engine':
        return [
          {
            tool: 'circle',
            cx: 160,
            cy: 220,
            radius: 55,
            color: FINTECH_PALETTE.emeraldGreen,
            strokeWidth: 2,
            opacity: 1,
            label: 'BUYER VAULT',
          },
          {
            tool: 'flow',
            start: { x: 215, y: 220 },
            end: { x: 380, y: 220 },
            color: FINTECH_PALETTE.emeraldGreen,
            strokeWidth: 3,
            opacity: 1,
            label: 'FUND ESCROW',
          },
          {
            tool: 'node',
            x: 380,
            y: 175,
            width: 240,
            height: 90,
            color: FINTECH_PALETTE.amberGold,
            strokeWidth: 3,
            opacity: 1,
            label: 'SMART ESCROW AGENT',
            badgeType: 'MULTI-SIG TIMELOCK',
          },
          {
            tool: 'flow',
            start: { x: 620, y: 220 },
            end: { x: 785, y: 220 },
            color: FINTECH_PALETTE.azureBlue,
            strokeWidth: 3,
            opacity: 1,
            label: 'SETTLE RELEASE',
          },
          {
            tool: 'circle',
            cx: 840,
            cy: 220,
            radius: 55,
            color: FINTECH_PALETTE.azureBlue,
            strokeWidth: 2,
            opacity: 1,
            label: 'SELLER WALLET',
          },
          {
            tool: 'rectangle',
            x: 340,
            y: 120,
            width: 320,
            height: 200,
            color: FINTECH_PALETTE.amberGold,
            strokeWidth: 2,
            opacity: 0.6,
            dashed: true,
            label: 'FINANCIAL CUSTODY BOUNDARY',
          },
        ];

      case 'security-boundary':
        return [
          {
            tool: 'rectangle',
            x: 60,
            y: 60,
            width: w - 120,
            height: h - 140,
            color: FINTECH_PALETTE.indigoSecurity,
            strokeWidth: 2,
            opacity: 0.8,
            dashed: true,
            label: 'PCI-DSS LEVEL 1 TRUST REALM',
          },
          {
            tool: 'node',
            x: 120,
            y: 140,
            width: 220,
            height: 80,
            color: FINTECH_PALETTE.azureBlue,
            strokeWidth: 2,
            opacity: 1,
            label: 'PUBLIC DMZ PROXY',
            badgeType: 'INGRESS',
          },
          {
            tool: 'flow',
            start: { x: 340, y: 180 },
            end: { x: 480, y: 180 },
            color: FINTECH_PALETTE.indigoSecurity,
            strokeWidth: 3,
            opacity: 1,
            label: 'ATTESTED HANDSHAKE',
          },
          {
            tool: 'node',
            x: 480,
            y: 140,
            width: 240,
            height: 80,
            color: FINTECH_PALETTE.roseAlert,
            strokeWidth: 3,
            opacity: 1,
            label: 'HSM ENCRYPTION KEYSTORE',
            badgeType: 'HARDWARE ENCLAVE',
          },
        ];

      default:
        return [];
    }
  }

  setTemplate(templateName) {
    const valid = ['none', 'payment-flow', 'escrow-engine', 'security-boundary'];
    if (!valid.includes(templateName)) {
      throw new Error(`Invalid template "${templateName}". Choose from: ${valid.join(', ')}`);
    }
    this.#backdropTemplate = templateName;
    this.emit('template:change', { template: templateName });
    this.render();
    return this;
  }

  loadTemplateStrokes(templateName) {
    const strokes = this.getTemplateData(templateName);
    for (const stroke of strokes) {
      this.addStroke(stroke);
    }
    return this;
  }

  // --- SVG Export ---

  exportSVG() {
    const w = this.#width;
    const h = this.#height;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n`;
    svg += `  <defs>\n`;
    svg += `    <style>\n`;
    svg += `      .ft-label { font-family: Inter, system-ui, sans-serif; font-size: 12px; font-weight: 600; fill: #ffffff; }\n`;
    svg += `      .ft-badge { font-family: "JetBrains Mono", monospace; font-size: 9px; font-weight: 700; fill: #081226; }\n`;
    svg += `      .ft-flow-label { font-family: "JetBrains Mono", monospace; font-size: 10px; font-weight: 600; fill: #ffffff; }\n`;
    svg += `      .ft-tag { font-family: "JetBrains Mono", monospace; font-size: 10px; font-weight: 700; }\n`;
    svg += `    </style>\n`;

    // Arrow marker defs for each palette color
    for (const [key, color] of Object.entries(FINTECH_PALETTE)) {
      svg += `    <marker id="arrow-${key}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n`;
      svg += `      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${color}" />\n`;
      svg += `    </marker>\n`;
    }
    svg += `  </defs>\n`;

    // Background
    svg += `  <rect width="100%" height="100%" fill="${FINTECH_PALETTE.vaultNavy}" />\n`;

    // Grid (if active)
    if (this.#showGrid) {
      svg += `  <g class="fintech-grid" stroke="#1e293b" stroke-width="1" opacity="0.25">\n`;
      for (let x = 40; x < w; x += 40) {
        svg += `    <line x1="${x}" y1="0" x2="${x}" y2="${h}" />\n`;
      }
      for (let y = 40; y < h; y += 40) {
        svg += `    <line x1="0" y1="${y}" x2="${w}" y2="${y}" />\n`;
      }
      svg += `  </g>\n`;
    }

    // Template backdrop guides (if any)
    if (this.#backdropTemplate !== 'none') {
      const templateStrokes = this.getTemplateData(this.#backdropTemplate);
      svg += `  <g class="template-backdrop" opacity="0.3">\n`;
      for (const stroke of templateStrokes) {
        svg += this.#renderStrokeToSVG(stroke);
      }
      svg += `  </g>\n`;
    }

    // Canvas strokes
    svg += `  <g class="fintech-strokes">\n`;
    for (const stroke of this.#strokes) {
      svg += this.#renderStrokeToSVG(stroke);
    }
    svg += `  </g>\n`;

    svg += `</svg>`;
    return svg;
  }

  #renderStrokeToSVG(stroke) {
    if (!stroke) return '';
    const tool = stroke.tool;
    const color = stroke.color || FINTECH_PALETTE.emeraldGreen;
    const strokeWidth = stroke.strokeWidth || 3;
    const opacity = stroke.opacity !== undefined ? stroke.opacity : 1;

    let out = '';

    if (tool === 'pen') {
      if (Array.isArray(stroke.points) && stroke.points.length > 0) {
        const d = FintechVaultWhiteboardCanvas.pointsToSVGPath(stroke.points);
        out += `    <path d="${d}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${opacity}" />\n`;
      }
    } else if (tool === 'eraser') {
      if (Array.isArray(stroke.points) && stroke.points.length > 0) {
        const d = FintechVaultWhiteboardCanvas.pointsToSVGPath(stroke.points);
        out += `    <path d="${d}" stroke="${FINTECH_PALETTE.vaultNavy}" stroke-width="${strokeWidth * 3}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="1" />\n`;
      }
    } else if (tool === 'flow') {
      const start = stroke.start || { x: 0, y: 0 };
      const end = stroke.end || { x: 0, y: 0 };
      // Find matching color marker or default
      let markerId = 'arrow-azureBlue';
      for (const [k, v] of Object.entries(FINTECH_PALETTE)) {
        if (v.toLowerCase() === color.toLowerCase()) {
          markerId = `arrow-${k}`;
          break;
        }
      }
      out += `    <g class="flow-arrow" opacity="${opacity}">\n`;
      out += `      <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${strokeWidth}" marker-end="url(#${markerId})" />\n`;
      if (stroke.label) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        out += `      <rect x="${midX - 45}" y="${midY - 10}" width="90" height="20" rx="4" fill="${FINTECH_PALETTE.vaultNavy}" stroke="${color}" stroke-width="1" />\n`;
        out += `      <text x="${midX}" y="${midY + 4}" class="ft-flow-label" text-anchor="middle">${escapeXml(stroke.label)}</text>\n`;
      }
      out += `    </g>\n`;
    } else if (tool === 'node') {
      const x = stroke.x || 0;
      const y = stroke.y || 0;
      const width = stroke.width || 180;
      const height = stroke.height || 70;
      const badge = escapeXml(stroke.badgeType || 'SECURITY');
      const label = escapeXml(stroke.label || 'VAULT_NODE');

      out += `    <g class="fintech-node" opacity="${opacity}">\n`;
      out += `      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="#0b1739" stroke="${color}" stroke-width="${strokeWidth}" />\n`;
      out += `      <rect x="${x}" y="${y}" width="${width}" height="18" rx="6" fill="${color}" />\n`;
      out += `      <text x="${x + 6}" y="${y + 13}" class="ft-badge">${badge}</text>\n`;
      out += `      <text x="${x + width / 2}" y="${y + 18 + (height - 18) / 2 + 4}" class="ft-label" text-anchor="middle">${label}</text>\n`;
      out += `    </g>\n`;
    } else if (tool === 'rectangle') {
      const x = stroke.x || 0;
      const y = stroke.y || 0;
      const width = stroke.width || 100;
      const height = stroke.height || 60;
      const dashAttr = stroke.dashed ? 'stroke-dasharray="8 6"' : '';

      out += `    <g class="fintech-rect" opacity="${opacity}">\n`;
      out += `      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" ${dashAttr} />\n`;
      if (stroke.label) {
        out += `      <text x="${x + 8}" y="${y + 18}" class="ft-tag" fill="${color}">${escapeXml(stroke.label)}</text>\n`;
      }
      out += `    </g>\n`;
    } else if (tool === 'circle') {
      const cx = stroke.cx || 0;
      const cy = stroke.cy || 0;
      const radius = stroke.radius || 40;

      out += `    <g class="fintech-circle" opacity="${opacity}">\n`;
      out += `      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />\n`;
      if (stroke.label) {
        out += `      <text x="${cx}" y="${cy + 4}" class="ft-label" text-anchor="middle">${escapeXml(stroke.label)}</text>\n`;
      }
      out += `    </g>\n`;
    }

    return out;
  }

  // --- JSON Serialization & Loading ---

  exportJSON(pretty = false) {
    const payload = {
      version: '1.0.0',
      generator: 'FintechVaultWhiteboardCanvas',
      timestamp: Date.now(),
      theme: 'midnight-executive',
      dimensions: {
        width: this.#width,
        height: this.#height,
      },
      template: this.#backdropTemplate,
      showGrid: this.#showGrid,
      strokes: this.#strokes,
    };
    return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  loadJSON(jsonOrObject) {
    let data;
    if (typeof jsonOrObject === 'string') {
      try {
        data = JSON.parse(jsonOrObject);
      } catch (err) {
        throw new Error(`Failed to parse JSON: ${err.message}`);
      }
    } else if (jsonOrObject && typeof jsonOrObject === 'object') {
      data = jsonOrObject;
    } else {
      throw new TypeError('loadJSON requires a valid JSON string or object.');
    }

    if (!data || typeof data !== 'object') {
      throw new TypeError('Invalid JSON payload: expected an object.');
    }

    if (!Array.isArray(data.strokes)) {
      throw new Error('Invalid JSON payload: missing "strokes" array.');
    }

    // Validate and sanitize strokes
    const validatedStrokes = [];
    for (let i = 0; i < data.strokes.length; i++) {
      const s = data.strokes[i];
      if (!s || typeof s !== 'object') continue;
      const tool = this.normalizeTool(s.tool || 'pen');
      validatedStrokes.push({
        ...s,
        tool,
        id: s.id || `stroke_${Date.now()}_${i}`,
        color: typeof s.color === 'string' ? s.color : FINTECH_PALETTE.emeraldGreen,
        strokeWidth: Number.isFinite(s.strokeWidth) ? Number(s.strokeWidth) : 3,
        opacity: Number.isFinite(s.opacity) ? Number(s.opacity) : 1,
      });
    }

    if (data.dimensions && Number.isFinite(data.dimensions.width) && Number.isFinite(data.dimensions.height)) {
      this.#width = Math.max(100, Number(data.dimensions.width));
      this.#height = Math.max(100, Number(data.dimensions.height));
    }

    if (typeof data.template === 'string') {
      try {
        this.setTemplate(data.template);
      } catch {
        this.#backdropTemplate = 'none';
      }
    }

    if (data.showGrid !== undefined) {
      this.#showGrid = Boolean(data.showGrid);
    }

    this.#strokes = validatedStrokes.slice(-this.#maxHistory);
    this.#redoStack = [];

    this.emit('load', { strokeCount: this.#strokes.length });
    this.emit('change', { historyCount: this.#strokes.length });
    this.render();
    return true;
  }

  // --- Event Emitter ---

  on(event, handler) {
    if (typeof event !== 'string' || typeof handler !== 'function') {
      throw new TypeError('on() requires event name (string) and handler (function).');
    }
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (typeof event !== 'string') return this;
    if (this.#listeners.has(event)) {
      if (typeof handler === 'function') {
        this.#listeners.get(event).delete(handler);
      } else {
        this.#listeners.delete(event);
      }
    }
    return this;
  }

  emit(event, payload = {}) {
    if (typeof event !== 'string') return;
    const handlers = this.#listeners.get(event);
    if (!handlers || handlers.size === 0) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        if (this.#listeners.has('error')) {
          this.emit('error', err);
        }
      }
    }
  }

  // --- 2D Context Render Engine ---

  render(targetCtx = this.#ctx) {
    const ctx = targetCtx;
    if (!ctx) return;

    const w = this.#width;
    const h = this.#height;

    if (typeof ctx.save === 'function') ctx.save();

    // Background fill
    ctx.fillStyle = FINTECH_PALETTE.vaultNavy;
    if (typeof ctx.fillRect === 'function') {
      ctx.fillRect(0, 0, w, h);
    }

    // Grid rendering
    if (this.#showGrid && typeof ctx.beginPath === 'function') {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;

      for (let x = 40; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 40; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    // Template backdrop
    if (this.#backdropTemplate !== 'none') {
      const templateStrokes = this.getTemplateData(this.#backdropTemplate);
      if (typeof ctx.save === 'function') {
        ctx.save();
        ctx.globalAlpha = 0.35;
        for (const stroke of templateStrokes) {
          this.renderStroke(stroke, ctx);
        }
        ctx.restore();
      }
    }

    // Committed strokes
    for (const stroke of this.#strokes) {
      this.renderStroke(stroke, ctx);
    }

    // In-progress stroke
    if (this.#currentStroke) {
      this.renderStroke(this.#currentStroke, ctx);
    }

    if (typeof ctx.restore === 'function') ctx.restore();
  }

  renderStroke(stroke, targetCtx = this.#ctx) {
    const ctx = targetCtx;
    if (!ctx || !stroke) return;

    const tool = stroke.tool || 'pen';
    const color = stroke.color || FINTECH_PALETTE.emeraldGreen;
    const strokeWidth = Number.isFinite(stroke.strokeWidth) ? Number(stroke.strokeWidth) : 3;
    const opacity = Number.isFinite(stroke.opacity) ? Number(stroke.opacity) : 1.0;

    if (typeof ctx.save === 'function') ctx.save();
    ctx.globalAlpha = opacity;

    switch (tool) {
      case 'pen': {
        if (!Array.isArray(stroke.points) || stroke.points.length === 0) break;
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points.length === 1) {
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(1, strokeWidth / 2), 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
          }
        } else if (stroke.points.length === 2) {
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
            ctx.stroke();
          }
        } else {
          const segments = this.catmullRomToBezier(stroke.points);
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (const seg of segments) {
              if (typeof ctx.bezierCurveTo === 'function') {
                ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.p1.x, seg.p1.y);
              } else {
                ctx.lineTo(seg.p1.x, seg.p1.y);
              }
            }
            ctx.stroke();
          }
        }
        break;
      }

      case 'eraser': {
        if (!Array.isArray(stroke.points) || stroke.points.length === 0) break;
        ctx.lineWidth = strokeWidth * 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // In standard canvas we use destination-out; if unsupported or mock, draw vaultNavy
        if (typeof ctx.globalCompositeOperation !== 'undefined') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.strokeStyle = FINTECH_PALETTE.vaultNavy;
          ctx.fillStyle = FINTECH_PALETTE.vaultNavy;
        }

        if (typeof ctx.beginPath === 'function') {
          if (stroke.points.length === 1) {
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(2, (strokeWidth * 3) / 2), 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
          }
        }
        break;
      }

      case 'flow': {
        const start = stroke.start || { x: 0, y: 0 };
        const end = stroke.end || { x: 0, y: 0 };
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const headLength = Math.max(10, strokeWidth * 3.5);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = strokeWidth;

        // Line
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          // Arrowhead
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }

        // Label pill
        if (stroke.label && typeof ctx.fillText === 'function') {
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const text = String(stroke.label);
          ctx.font = '600 11px Inter, sans-serif';
          let textWidth = 60;
          if (typeof ctx.measureText === 'function') {
            const m = ctx.measureText(text);
            if (m && Number.isFinite(m.width)) textWidth = m.width;
          }

          if (typeof ctx.fillRect === 'function') {
            ctx.fillStyle = FINTECH_PALETTE.vaultNavy;
            ctx.fillRect(midX - textWidth / 2 - 8, midY - 10, textWidth + 16, 20);
          }
          if (typeof ctx.strokeRect === 'function') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(midX - textWidth / 2 - 8, midY - 10, textWidth + 16, 20);
          }

          ctx.fillStyle = FINTECH_PALETTE.pureWhite;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, midX, midY);
        }
        break;
      }

      case 'node': {
        const x = stroke.x || 0;
        const y = stroke.y || 0;
        const width = stroke.width || 180;
        const height = stroke.height || 70;
        const badge = stroke.badgeType || 'SECURITY';
        const label = stroke.label || 'VAULT_NODE';

        // Outer box
        ctx.fillStyle = '#0b1739';
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        if (typeof ctx.fillRect === 'function') ctx.fillRect(x, y, width, height);
        if (typeof ctx.strokeRect === 'function') ctx.strokeRect(x, y, width, height);

        // Header ribbon
        ctx.fillStyle = color;
        if (typeof ctx.fillRect === 'function') ctx.fillRect(x, y, width, 18);

        // Badge text
        if (typeof ctx.fillText === 'function') {
          ctx.fillStyle = FINTECH_PALETTE.vaultNavy;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(badge, x + 6, y + 9);

          // Node label text
          ctx.fillStyle = FINTECH_PALETTE.pureWhite;
          ctx.font = '600 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, x + width / 2, y + 18 + (height - 18) / 2);
        }
        break;
      }

      case 'rectangle': {
        const x = stroke.x || 0;
        const y = stroke.y || 0;
        const width = stroke.width || 100;
        const height = stroke.height || 60;

        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;

        if (stroke.dashed && typeof ctx.setLineDash === 'function') {
          ctx.setLineDash([8, 6]);
        }
        if (typeof ctx.strokeRect === 'function') ctx.strokeRect(x, y, width, height);
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);

        if (stroke.label && typeof ctx.fillText === 'function') {
          ctx.fillStyle = color;
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(stroke.label, x + 8, y + 8);
        }
        break;
      }

      case 'circle': {
        const cx = stroke.cx || 0;
        const cy = stroke.cy || 0;
        const radius = Math.max(1, stroke.radius || 40);

        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;

        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (stroke.label && typeof ctx.fillText === 'function') {
          ctx.fillStyle = FINTECH_PALETTE.pureWhite;
          ctx.font = '600 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stroke.label, cx, cy);
        }
        break;
      }
    }

    if (typeof ctx.restore === 'function') ctx.restore();
  }

  // --- Canvas Attachment & DOM Event Listeners ---

  attachCanvas(canvasElement) {
    if (!canvasElement || typeof canvasElement.getContext !== 'function') {
      throw new TypeError('attachCanvas requires an HTMLCanvasElement.');
    }
    this.detachCanvas();
    this.#canvas = canvasElement;
    this.#ctx = canvasElement.getContext('2d');

    this.#initDPI();
    this.#bindDOMEvents();
    this.render();
    return this;
  }

  detachCanvas() {
    if (this.#canvas) {
      this.#unbindDOMEvents();
      this.#canvas = null;
      this.#ctx = null;
    }
    return this;
  }

  #initDPI() {
    if (typeof window === 'undefined' || !this.#canvas) return;
    this.#dpr = window.devicePixelRatio || 1;
    const rect = this.#canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : this.#width;
    const h = rect.height > 0 ? rect.height : this.#height;
    this.#width = Math.round(w);
    this.#height = Math.round(h);

    this.#canvas.width = this.#width * this.#dpr;
    this.#canvas.height = this.#height * this.#dpr;

    if (this.#ctx && this.#dpr !== 1) {
      this.#ctx.scale(this.#dpr, this.#dpr);
    }
  }

  #getCanvasCoordinates(event) {
    if (!this.#canvas) return { x: 0, y: 0 };
    const rect = this.#canvas.getBoundingClientRect();
    const clientX = event.clientX !== undefined ? event.clientX : (event.touches?.[0]?.clientX ?? 0);
    const clientY = event.clientY !== undefined ? event.clientY : (event.touches?.[0]?.clientY ?? 0);

    const scaleX = this.#width / (rect.width || 1);
    const scaleY = this.#height / (rect.height || 1);

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  }

  #bindDOMEvents() {
    if (!this.#canvas) return;

    const onPointerDown = (e) => {
      e.preventDefault();
      const coords = this.#getCanvasCoordinates(e);
      this.handlePointerDown(coords.x, coords.y);
      if (typeof this.#canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
        try { this.#canvas.setPointerCapture(e.pointerId); } catch {}
      }
    };

    const onPointerMove = (e) => {
      e.preventDefault();
      const coords = this.#getCanvasCoordinates(e);
      this.handlePointerMove(coords.x, coords.y);
    };

    const onPointerUp = (e) => {
      e.preventDefault();
      const coords = this.#getCanvasCoordinates(e);
      this.handlePointerUp(coords.x, coords.y);
      if (typeof this.#canvas.releasePointerCapture === 'function' && e.pointerId !== undefined) {
        try { this.#canvas.releasePointerCapture(e.pointerId); } catch {}
      }
    };

    const onPointerCancel = (e) => {
      e.preventDefault();
      this.handlePointerCancel();
    };

    const onResize = () => {
      this.#initDPI();
      this.render();
    };

    this.#canvas.addEventListener('pointerdown', onPointerDown);
    this.#canvas.addEventListener('pointermove', onPointerMove);
    this.#canvas.addEventListener('pointerup', onPointerUp);
    this.#canvas.addEventListener('pointercancel', onPointerCancel);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
    }

    this.#boundEventHandlers = {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onResize,
    };
  }

  #unbindDOMEvents() {
    if (!this.#canvas || !this.#boundEventHandlers) return;
    this.#canvas.removeEventListener('pointerdown', this.#boundEventHandlers.onPointerDown);
    this.#canvas.removeEventListener('pointermove', this.#boundEventHandlers.onPointerMove);
    this.#canvas.removeEventListener('pointerup', this.#boundEventHandlers.onPointerUp);
    this.#canvas.removeEventListener('pointercancel', this.#boundEventHandlers.onPointerCancel);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.#boundEventHandlers.onResize);
    }
    this.#boundEventHandlers = null;
  }

  // --- Abstract Pointer Handling (Usable Headless or in UI) ---

  handlePointerDown(x, y) {
    this.#isDrawing = true;
    const pt = { x, y };

    switch (this.#currentTool) {
      case 'pen':
      case 'eraser':
        this.#currentStroke = {
          tool: this.#currentTool,
          color: this.#currentColor,
          strokeWidth: this.#strokeWidth,
          opacity: this.#opacity,
          points: [pt],
          timestamp: Date.now(),
        };
        break;

      case 'flow':
        this.#currentStroke = {
          tool: 'flow',
          color: this.#currentColor,
          strokeWidth: this.#strokeWidth,
          opacity: this.#opacity,
          start: pt,
          end: pt,
          label: '',
          timestamp: Date.now(),
        };
        break;

      case 'node':
        this.#currentStroke = {
          tool: 'node',
          color: this.#currentColor,
          strokeWidth: this.#strokeWidth,
          opacity: this.#opacity,
          x: pt.x - 90,
          y: pt.y - 35,
          width: 180,
          height: 70,
          label: this.#nodeLabel,
          badgeType: this.#nodeBadgeType,
          timestamp: Date.now(),
        };
        break;

      case 'rectangle':
        this.#currentStroke = {
          tool: 'rectangle',
          color: this.#currentColor,
          strokeWidth: this.#strokeWidth,
          opacity: this.#opacity,
          originX: pt.x,
          originY: pt.y,
          x: pt.x,
          y: pt.y,
          width: 0,
          height: 0,
          dashed: false,
          label: '',
          timestamp: Date.now(),
        };
        break;

      case 'circle':
        this.#currentStroke = {
          tool: 'circle',
          color: this.#currentColor,
          strokeWidth: this.#strokeWidth,
          opacity: this.#opacity,
          cx: pt.x,
          cy: pt.y,
          radius: 0,
          label: '',
          timestamp: Date.now(),
        };
        break;
    }

    this.emit('stroke:start', { point: pt, stroke: this.currentStroke });
    this.render();
  }

  handlePointerMove(x, y) {
    if (!this.#isDrawing || !this.#currentStroke) {
      this.emit('pointer:hover', { x, y });
      return;
    }

    const pt = { x, y };

    switch (this.#currentStroke.tool) {
      case 'pen':
      case 'eraser': {
        const lastPt = this.#currentStroke.points[this.#currentStroke.points.length - 1];
        // Interpolate points to prevent gaps
        const interpolated = this.interpolatePoints(lastPt, pt, 5);
        if (interpolated.length > 1) {
          for (let i = 1; i < interpolated.length; i++) {
            this.#currentStroke.points.push(interpolated[i]);
          }
        }
        break;
      }

      case 'flow':
        this.#currentStroke.end = pt;
        break;

      case 'node':
        this.#currentStroke.x = pt.x - (this.#currentStroke.width || 180) / 2;
        this.#currentStroke.y = pt.y - (this.#currentStroke.height || 70) / 2;
        break;

      case 'rectangle': {
        const ox = this.#currentStroke.originX;
        const oy = this.#currentStroke.originY;
        this.#currentStroke.x = Math.min(ox, pt.x);
        this.#currentStroke.y = Math.min(oy, pt.y);
        this.#currentStroke.width = Math.abs(pt.x - ox);
        this.#currentStroke.height = Math.abs(pt.y - oy);
        break;
      }

      case 'circle': {
        const dx = pt.x - this.#currentStroke.cx;
        const dy = pt.y - this.#currentStroke.cy;
        this.#currentStroke.radius = Math.round(Math.hypot(dx, dy));
        break;
      }
    }

    this.emit('stroke:point', { point: pt, stroke: this.currentStroke });
    this.render();
  }

  handlePointerUp(x, y) {
    if (!this.#isDrawing || !this.#currentStroke) return;

    this.handlePointerMove(x, y);

    const finished = this.#currentStroke;
    this.#isDrawing = false;
    this.#currentStroke = null;

    // Filter out accidental clicks/empty strokes
    let isValid = true;
    if (finished.tool === 'pen' || finished.tool === 'eraser') {
      isValid = Array.isArray(finished.points) && finished.points.length > 0;
    } else if (finished.tool === 'rectangle') {
      isValid = finished.width > 4 && finished.height > 4;
    } else if (finished.tool === 'circle') {
      isValid = finished.radius > 3;
    } else if (finished.tool === 'flow') {
      const d = Math.hypot(finished.end.x - finished.start.x, finished.end.y - finished.start.y);
      isValid = d > 5;
    }

    if (isValid) {
      delete finished.originX;
      delete finished.originY;
      this.addStroke(finished);
      this.emit('stroke:end', { stroke: this.#cloneStroke(finished) });
    } else {
      this.render();
    }
  }

  handlePointerCancel() {
    this.#isDrawing = false;
    this.#currentStroke = null;
    this.render();
  }

  exportPNG() {
    if (!this.#canvas || typeof this.#canvas.toDataURL !== 'function') {
      throw new Error('exportPNG requires an attached HTMLCanvasElement.');
    }
    return this.#canvas.toDataURL('image/png');
  }
}

// Browser auto-mount if target element exists
if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvasElement = document.getElementById('whiteboard-canvas');
    if (canvasElement) {
      const app = new FintechVaultWhiteboardCanvas(canvasElement);
      window.__fintechWhiteboard = app;
    }
  });
}
