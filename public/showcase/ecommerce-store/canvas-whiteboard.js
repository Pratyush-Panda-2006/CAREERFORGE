/**
 * EcommerceStoreWhiteboardCanvas
 * Collaborative freehand vector sketchpad & whiteboard canvas for e-commerce merchandising,
 * wireframing, and checkout funnel design.
 */

export const COMMERCE_PALETTE = Object.freeze({
  merchantDark: '#0f172a',
  emeraldCheckout: '#10b981',
  amberDeal: '#f59e0b',
  indigoCart: '#6366f1',
  roseDiscount: '#f43f5e',
  pureWhite: '#ffffff',
  slateGrid: '#334155'
});

export const VALID_TOOLS = Object.freeze([
  'pen',
  'eraser',
  'arrow',
  'component',
  'rectangle',
  'circle'
]);

export const TOOL_ALIASES = Object.freeze({
  pencil: 'pen',
  brush: 'pen',
  draw: 'pen',
  freehand: 'pen',
  erase: 'eraser',
  delete: 'eraser',
  rubber: 'eraser',
  pointer: 'arrow',
  'line-arrow': 'arrow',
  rect: 'rectangle',
  box: 'rectangle',
  square: 'rectangle',
  ellipse: 'circle',
  oval: 'circle',
  dot: 'circle',
  card: 'component',
  widget: 'component',
  'store-component': 'component',
  template: 'component'
});

export const BACKDROP_TEMPLATES = Object.freeze([
  'none',
  'checkout-funnel',
  'merchandising-grid',
  'product-showcase'
]);

function escapeXml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class EcommerceStoreWhiteboardCanvas {
  static PALETTE = COMMERCE_PALETTE;
  static VALID_TOOLS = VALID_TOOLS;
  static TOOL_ALIASES = TOOL_ALIASES;
  static BACKDROP_TEMPLATES = BACKDROP_TEMPLATES;

  constructor(options = {}) {
    this.palette = { ...COMMERCE_PALETTE };
    this.width = Number.isFinite(options.width) && options.width > 0 ? options.width : 1200;
    this.height = Number.isFinite(options.height) && options.height > 0 ? options.height : 800;
    this.maxHistory = Number.isInteger(options.maxHistory) && options.maxHistory > 0 ? options.maxHistory : 50;

    this.minStrokeWidth = 1;
    this.maxStrokeWidth = 100;
    this.minOpacity = 0.0;
    this.maxOpacity = 1.0;

    this.currentTool = 'pen';
    this.strokeColor = options.strokeColor || COMMERCE_PALETTE.emeraldCheckout;
    this.strokeWidth = this._clamp(options.strokeWidth ?? 3, this.minStrokeWidth, this.maxStrokeWidth);
    this.opacity = this._clamp(options.opacity ?? 1.0, this.minOpacity, this.maxOpacity);
    this.componentType = options.componentType || 'product-card';
    this.backdropTemplate = BACKDROP_TEMPLATES.includes(options.backdropTemplate) ? options.backdropTemplate : 'none';

    this.strokes = [];
    this.redoStack = [];
    this._listeners = new Map();

    // Active interaction state
    this.isDrawing = false;
    this.activeStroke = null;
    this.lastPoint = null;

    // DOM & Render Engine references
    this.canvas = null;
    this.ctx = null;
    this._boundHandlers = null;

    if (options.canvas) {
      this.attach(options.canvas);
    }
  }

  _clamp(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(Math.max(num, min), max);
  }

  // --- Tool & Brush Mutation Methods ---

  setTool(tool) {
    if (typeof tool !== 'string' || !tool.trim()) {
      throw new TypeError('Tool name must be a non-empty string');
    }
    const normalized = tool.toLowerCase().trim();
    const resolved = TOOL_ALIASES[normalized] || normalized;

    if (!VALID_TOOLS.includes(resolved)) {
      throw new Error(`Invalid tool "${tool}". Supported tools: ${VALID_TOOLS.join(', ')}`);
    }

    const previousTool = this.currentTool;
    this.currentTool = resolved;
    this.emit('tool:change', { tool: resolved, previousTool });
    return this.currentTool;
  }

  getTool() {
    return this.currentTool;
  }

  setStrokeColor(color) {
    if (typeof color !== 'string' || !color.trim()) {
      throw new TypeError('Stroke color must be a valid non-empty string');
    }
    const previousColor = this.strokeColor;
    this.strokeColor = color.trim();
    this.emit('color:change', { color: this.strokeColor, previousColor });
    return this.strokeColor;
  }

  setColor(color) {
    return this.setStrokeColor(color);
  }

  getStrokeColor() {
    return this.strokeColor;
  }

  setStrokeWidth(width) {
    const previousWidth = this.strokeWidth;
    this.strokeWidth = this._clamp(width, this.minStrokeWidth, this.maxStrokeWidth);
    this.emit('width:change', { width: this.strokeWidth, previousWidth });
    return this.strokeWidth;
  }

  setWidth(width) {
    return this.setStrokeWidth(width);
  }

  getStrokeWidth() {
    return this.strokeWidth;
  }

  setOpacity(opacity) {
    const previousOpacity = this.opacity;
    this.opacity = this._clamp(opacity, this.minOpacity, this.maxOpacity);
    this.emit('opacity:change', { opacity: this.opacity, previousOpacity });
    return this.opacity;
  }

  getOpacity() {
    return this.opacity;
  }

  setComponentType(type) {
    if (typeof type !== 'string' || !type.trim()) {
      throw new TypeError('Component type must be a non-empty string');
    }
    this.componentType = type.trim();
    this.emit('component:change', { componentType: this.componentType });
    return this.componentType;
  }

  setBackdropTemplate(template) {
    if (!BACKDROP_TEMPLATES.includes(template)) {
      throw new Error(`Invalid backdrop template "${template}". Supported: ${BACKDROP_TEMPLATES.join(', ')}`);
    }
    const previous = this.backdropTemplate;
    this.backdropTemplate = template;
    this.emit('template:change', { template, previous });
    this.emit('change', { action: 'setTemplate', template });
    this.requestRender();
    return this.backdropTemplate;
  }

  // --- Vector & Geometry Engine ---

  interpolatePoints(p1, p2, dist = 5) {
    if (!p1 || !p2) return p1 ? [{ ...p1 }] : [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d = Math.hypot(dx, dy);
    const stepDist = Number.isFinite(dist) && dist > 0 ? dist : 5;

    if (d <= stepDist || d === 0) {
      return [{ ...p1 }, { ...p2 }];
    }

    const steps = Math.floor(d / stepDist);
    const result = [{ ...p1 }];
    for (let i = 1; i <= steps; i++) {
      const t = (i * stepDist) / d;
      if (t < 1) {
        result.push({
          x: Number((p1.x + t * dx).toFixed(2)),
          y: Number((p1.y + t * dy).toFixed(2)),
          pressure: p1.pressure !== undefined && p2.pressure !== undefined
            ? Number((p1.pressure + t * (p2.pressure - p1.pressure)).toFixed(2))
            : (p1.pressure ?? 0.5)
        });
      }
    }
    result.push({ ...p2 });
    return result;
  }

  catmullRomToBezier(points, tension = 0.5) {
    if (!Array.isArray(points) || points.length === 0) return [];
    if (points.length === 1) {
      return [{ type: 'M', point: { ...points[0] } }];
    }
    if (points.length === 2) {
      return [
        { type: 'M', point: { ...points[0] } },
        { type: 'L', point: { ...points[1] } }
      ];
    }

    const t = Number.isFinite(tension) && tension > 0 ? tension : 0.5;
    const segments = [{ type: 'M', point: { ...points[0] } }];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / (6 * t);
      const cp1y = p1.y + (p2.y - p0.y) / (6 * t);
      const cp2x = p2.x - (p3.x - p1.x) / (6 * t);
      const cp2y = p2.y - (p3.y - p1.y) / (6 * t);

      segments.push({
        type: 'C',
        cp1: { x: Number(cp1x.toFixed(2)), y: Number(cp1y.toFixed(2)) },
        cp2: { x: Number(cp2x.toFixed(2)), y: Number(cp2y.toFixed(2)) },
        end: { x: Number(p2.x.toFixed(2)), y: Number(p2.y.toFixed(2)) }
      });
    }

    return segments;
  }

  segmentsToSVGPath(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return '';
    return segments
      .map((seg) => {
        if (seg.type === 'M') return `M ${seg.point.x} ${seg.point.y}`;
        if (seg.type === 'L') return `L ${seg.point.x} ${seg.point.y}`;
        if (seg.type === 'C') {
          return `C ${seg.cp1.x} ${seg.cp1.y}, ${seg.cp2.x} ${seg.cp2.y}, ${seg.end.x} ${seg.end.y}`;
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  generateSmoothPath(points, tension = 0.5) {
    const segments = this.catmullRomToBezier(points, tension);
    return this.segmentsToSVGPath(segments);
  }

  // --- Undo / Redo & Stroke Management ---

  addStroke(stroke) {
    if (!stroke || typeof stroke !== 'object') {
      throw new TypeError('Stroke must be an object');
    }

    const tool = stroke.tool ? (TOOL_ALIASES[stroke.tool.toLowerCase()] || stroke.tool.toLowerCase()) : this.currentTool;
    const finalizedStroke = {
      id: stroke.id || `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tool,
      color: stroke.color || this.strokeColor,
      strokeWidth: stroke.strokeWidth !== undefined ? this._clamp(stroke.strokeWidth, this.minStrokeWidth, this.maxStrokeWidth) : this.strokeWidth,
      opacity: stroke.opacity !== undefined ? this._clamp(stroke.opacity, this.minOpacity, this.maxOpacity) : this.opacity,
      componentType: stroke.componentType || this.componentType,
      text: stroke.text || this.getComponentDefaultText(stroke.componentType || this.componentType),
      points: Array.isArray(stroke.points) ? stroke.points.map((p) => ({ ...p })) : [],
      startPoint: stroke.startPoint ? { ...stroke.startPoint } : (stroke.points?.[0] ? { ...stroke.points[0] } : null),
      endPoint: stroke.endPoint ? { ...stroke.endPoint } : (stroke.points?.[stroke.points.length - 1] ? { ...stroke.points[stroke.points.length - 1] } : null),
      timestamp: stroke.timestamp || Date.now()
    };

    if ((finalizedStroke.tool === 'pen' || finalizedStroke.tool === 'eraser') && finalizedStroke.points.length > 0) {
      finalizedStroke.segments = this.catmullRomToBezier(finalizedStroke.points);
      finalizedStroke.pathData = this.segmentsToSVGPath(finalizedStroke.segments);
    }

    // Redo eviction on new stroke
    this.redoStack = [];

    // Capacity eviction
    this.strokes.push(finalizedStroke);
    while (this.strokes.length > this.maxHistory) {
      this.strokes.shift();
    }

    this.emit('stroke:added', finalizedStroke);
    this.emit('change', { action: 'addStroke', stroke: finalizedStroke });
    this.requestRender();
    return finalizedStroke;
  }

  undo() {
    if (this.strokes.length === 0) return null;
    const stroke = this.strokes.pop();
    this.redoStack.push(stroke);
    this.emit('undo', stroke);
    this.emit('change', { action: 'undo', stroke });
    this.requestRender();
    return stroke;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const stroke = this.redoStack.pop();
    this.strokes.push(stroke);
    this.emit('redo', stroke);
    this.emit('change', { action: 'redo', stroke });
    this.requestRender();
    return stroke;
  }

  canUndo() {
    return this.strokes.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    if (this.strokes.length === 0) return;
    const previousStrokes = [...this.strokes];
    this.strokes = [];
    this.redoStack = [];
    this.emit('clear', { previousStrokes });
    this.emit('change', { action: 'clear' });
    this.requestRender();
  }

  getComponentDefaultText(type) {
    switch (type) {
      case 'checkout-btn':
        return 'PROCEED TO CHECKOUT ($129.00)';
      case 'price-tag':
        return '$79.99 (20% OFF)';
      case 'badge':
        return 'BESTSELLER';
      case 'cart-drawer':
        return 'Shopping Cart (3 items)';
      case 'product-card':
      default:
        return 'Premium Leather Tote';
    }
  }

  // --- SVG Export Engine ---

  exportSVG(options = {}) {
    const width = options.width || this.width || 1200;
    const height = options.height || this.height || 800;
    const includeBackdrop = options.includeBackdrop !== undefined ? options.includeBackdrop : true;
    const includeBackground = options.includeBackground !== undefined ? options.includeBackground : true;

    const lines = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      '  <defs>',
      '    <linearGradient id="ecomGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
      `      <stop offset="0%" stop-color="${this.palette.indigoCart}" stop-opacity="0.8"/>`,
      `      <stop offset="100%" stop-color="${this.palette.emeraldCheckout}" stop-opacity="0.8"/>`,
      '    </linearGradient>',
      '    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">',
      '      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5"/>',
      '    </filter>',
      '  </defs>'
    ];

    if (includeBackground) {
      lines.push(`  <rect width="100%" height="100%" fill="${this.palette.merchantDark}"/>`);
    }

    if (includeBackdrop && this.backdropTemplate !== 'none') {
      lines.push(this._getBackdropSVG(this.backdropTemplate, width, height));
    }

    for (const stroke of this.strokes) {
      lines.push(this._strokeToSVG(stroke));
    }

    lines.push('</svg>');
    return lines.join('\n');
  }

  _strokeToSVG(stroke) {
    const color = stroke.color || this.palette.emeraldCheckout;
    const width = stroke.strokeWidth || 3;
    const opacity = stroke.opacity ?? 1.0;

    switch (stroke.tool) {
      case 'pen': {
        const pathData = stroke.pathData || (stroke.points ? this.generateSmoothPath(stroke.points) : '');
        return `  <path d="${pathData}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
      }
      case 'eraser': {
        const pathData = stroke.pathData || (stroke.points ? this.generateSmoothPath(stroke.points) : '');
        return `  <path d="${pathData}" fill="none" stroke="${this.palette.merchantDark}" stroke-width="${width * 1.6}" stroke-linecap="round" stroke-linejoin="round" opacity="1.0"/>`;
      }
      case 'rectangle': {
        if (!stroke.startPoint || !stroke.endPoint) return '';
        const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
        const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
        const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
        const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y);
        return `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
      }
      case 'circle': {
        if (!stroke.startPoint || !stroke.endPoint) return '';
        const cx = Number(((stroke.startPoint.x + stroke.endPoint.x) / 2).toFixed(2));
        const cy = Number(((stroke.startPoint.y + stroke.endPoint.y) / 2).toFixed(2));
        const r = Number((Math.hypot(stroke.endPoint.x - stroke.startPoint.x, stroke.endPoint.y - stroke.startPoint.y) / 2).toFixed(2));
        return `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
      }
      case 'arrow': {
        if (!stroke.startPoint || !stroke.endPoint) return '';
        const p1 = stroke.startPoint;
        const p2 = stroke.endPoint;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLen = Math.max(12, width * 3);
        const a1x = Number((p2.x - headLen * Math.cos(angle - Math.PI / 6)).toFixed(2));
        const a1y = Number((p2.y - headLen * Math.sin(angle - Math.PI / 6)).toFixed(2));
        const a2x = Number((p2.x - headLen * Math.cos(angle + Math.PI / 6)).toFixed(2));
        const a2y = Number((p2.y - headLen * Math.sin(angle + Math.PI / 6)).toFixed(2));
        return `  <g class="commerce-arrow" opacity="${opacity}">\n` +
               `    <path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>\n` +
               `    <polygon points="${p2.x},${p2.y} ${a1x},${a1y} ${a2x},${a2y}" fill="${color}"/>\n` +
               `  </g>`;
      }
      case 'component': {
        if (!stroke.startPoint || !stroke.endPoint) return '';
        const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
        const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
        const w = Math.max(Math.abs(stroke.endPoint.x - stroke.startPoint.x), 120);
        const h = Math.max(Math.abs(stroke.endPoint.y - stroke.startPoint.y), 70);
        const label = escapeXml(stroke.text || this.getComponentDefaultText(stroke.componentType));
        return `  <g class="commerce-component" opacity="${opacity}">\n` +
               `    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#1e293b" stroke="${color}" stroke-width="${width}"/>\n` +
               `    <circle cx="${x + 20}" cy="${y + 20}" r="8" fill="${color}" opacity="0.5"/>\n` +
               `    <text x="${x + 36}" y="${y + 24}" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold">${label}</text>\n` +
               `    <rect x="${x + 10}" y="${y + 36}" width="${Math.max(w - 20, 20)}" height="${Math.max(h - 46, 16)}" rx="4" fill="#334155" opacity="0.3"/>\n` +
               `  </g>`;
      }
      default:
        return '';
    }
  }

  _getBackdropSVG(template, width, height) {
    if (template === 'checkout-funnel') {
      return `  <g class="backdrop-funnel" opacity="0.45">\n` +
             `    <text x="60" y="45" fill="${this.palette.emeraldCheckout}" font-family="sans-serif" font-size="16" font-weight="bold">CHECKOUT FUNNEL ARCHITECTURE</text>\n` +
             `    <rect x="60" y="70" width="220" height="260" rx="8" fill="#1e293b" stroke="${this.palette.slateGrid}" stroke-dasharray="4,4"/>\n` +
             `    <text x="80" y="100" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">01 / CART</text>\n` +
             `    <circle cx="250" cy="95" r="8" fill="${this.palette.indigoCart}" opacity="0.7"/>\n` +
             `    <path d="M 285 200 L 335 200" stroke="${this.palette.slateGrid}" stroke-width="2"/>\n` +
             `    <rect x="340" y="70" width="220" height="260" rx="8" fill="#1e293b" stroke="${this.palette.slateGrid}" stroke-dasharray="4,4"/>\n` +
             `    <text x="360" y="100" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">02 / SHIPPING</text>\n` +
             `    <circle cx="530" cy="95" r="8" fill="${this.palette.amberDeal}" opacity="0.7"/>\n` +
             `    <path d="M 565 200 L 615 200" stroke="${this.palette.slateGrid}" stroke-width="2"/>\n` +
             `    <rect x="620" y="70" width="220" height="260" rx="8" fill="#1e293b" stroke="${this.palette.slateGrid}" stroke-dasharray="4,4"/>\n` +
             `    <text x="640" y="100" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">03 / PAYMENT</text>\n` +
             `    <circle cx="810" cy="95" r="8" fill="${this.palette.roseDiscount}" opacity="0.7"/>\n` +
             `    <path d="M 845 200 L 895 200" stroke="${this.palette.slateGrid}" stroke-width="2"/>\n` +
             `    <rect x="900" y="70" width="220" height="260" rx="8" fill="#1e293b" stroke="${this.palette.emeraldCheckout}" stroke-dasharray="4,4"/>\n` +
             `    <text x="920" y="100" fill="${this.palette.emeraldCheckout}" font-family="sans-serif" font-size="14" font-weight="bold">04 / SUCCESS</text>\n` +
             `    <circle cx="1090" cy="95" r="8" fill="${this.palette.emeraldCheckout}" opacity="0.9"/>\n` +
             `  </g>`;
    }
    if (template === 'merchandising-grid') {
      return `  <g class="backdrop-merchandising" opacity="0.45">\n` +
             `    <text x="60" y="45" fill="${this.palette.amberDeal}" font-family="sans-serif" font-size="16" font-weight="bold">MERCHANDISING CAMPAIGN GRID</text>\n` +
             `    <rect x="60" y="70" width="1060" height="180" rx="8" fill="#1e293b" stroke="${this.palette.amberDeal}" stroke-dasharray="4,4"/>\n` +
             `    <text x="90" y="110" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">HERO PROMOTIONAL BANNER (1200 x 400)</text>\n` +
             `    <circle cx="1070" cy="110" r="12" fill="${this.palette.roseDiscount}" opacity="0.6"/>\n` +
             `    <rect x="60" y="270" width="330" height="240" rx="8" fill="#1e293b" stroke="${this.palette.slateGrid}" stroke-dasharray="4,4"/>\n` +
             `    <text x="80" y="305" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">PROMO: DEAL OF THE DAY</text>\n` +
             `    <rect x="425" y="270" width="330" height="240" rx="8" fill="#1e293b" stroke="${this.palette.slateGrid}" stroke-dasharray="4,4"/>\n` +
             `    <text x="445" y="305" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">PROMO: FLASH CLEARANCE</text>\n` +
             `    <rect x="790" y="270" width="330" height="240" rx="8" fill="#1e293b" stroke="${this.palette.slateGrid}" stroke-dasharray="4,4"/>\n` +
             `    <text x="810" y="305" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">PROMO: TRENDING NOW</text>\n` +
             `  </g>`;
    }
    if (template === 'product-showcase') {
      return `  <g class="backdrop-showcase" opacity="0.45">\n` +
             `    <text x="60" y="45" fill="${this.palette.indigoCart}" font-family="sans-serif" font-size="16" font-weight="bold">PRODUCT SHOWCASE WIREFRAME</text>\n` +
             `    <rect x="60" y="70" width="480" height="420" rx="8" fill="#1e293b" stroke="${this.palette.indigoCart}" stroke-dasharray="4,4"/>\n` +
             `    <text x="90" y="110" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">PRIMARY PRODUCT MEDIA GALLERY</text>\n` +
             `    <circle cx="100" cy="180" r="16" fill="${this.palette.indigoCart}" opacity="0.5"/>\n` +
             `    <rect x="580" y="70" width="540" height="420" rx="8" fill="#1e293b" stroke="${this.palette.slateGrid}" stroke-dasharray="4,4"/>\n` +
             `    <text x="610" y="110" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">PRODUCT TITLE &amp; SKU IDENTIFIER</text>\n` +
             `    <text x="610" y="145" fill="${this.palette.emeraldCheckout}" font-family="sans-serif" font-size="16" font-weight="bold">$189.00 USD</text>\n` +
             `    <circle cx="620" cy="190" r="8" fill="${this.palette.roseDiscount}"/>\n` +
             `    <circle cx="645" cy="190" r="8" fill="${this.palette.emeraldCheckout}"/>\n` +
             `    <circle cx="670" cy="190" r="8" fill="${this.palette.amberDeal}"/>\n` +
             `    <rect x="610" y="230" width="240" height="46" rx="6" fill="${this.palette.emeraldCheckout}" opacity="0.3"/>\n` +
             `    <text x="645" y="260" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">ADD TO SHOPPING CART</text>\n` +
             `  </g>`;
    }
    return '';
  }

  // --- JSON Serialization & Loading ---

  exportJSON(options = {}) {
    const pretty = Boolean(options.pretty);
    const payload = {
      version: '1.0.0',
      appName: 'EcommerceStoreWhiteboardCanvas',
      timestamp: new Date().toISOString(),
      width: this.width,
      height: this.height,
      backdropTemplate: this.backdropTemplate,
      palette: this.palette,
      strokes: this.strokes.map((s) => ({
        id: s.id,
        tool: s.tool,
        color: s.color,
        strokeWidth: s.strokeWidth,
        opacity: s.opacity,
        componentType: s.componentType,
        text: s.text,
        points: Array.isArray(s.points) ? s.points.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure })) : [],
        startPoint: s.startPoint ? { ...s.startPoint } : null,
        endPoint: s.endPoint ? { ...s.endPoint } : null,
        timestamp: s.timestamp
      }))
    };
    return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  loadJSON(jsonInput) {
    let data;
    if (typeof jsonInput === 'string') {
      try {
        data = JSON.parse(jsonInput);
      } catch (err) {
        throw new Error(`Failed to parse JSON: ${err.message}`);
      }
    } else if (typeof jsonInput === 'object' && jsonInput !== null) {
      data = jsonInput;
    } else {
      throw new TypeError('loadJSON requires a valid JSON string or object');
    }

    if (!Array.isArray(data.strokes)) {
      throw new Error('Invalid whiteboard data: missing "strokes" array');
    }

    if (Number.isFinite(data.width) && data.width > 0) this.width = data.width;
    if (Number.isFinite(data.height) && data.height > 0) this.height = data.height;
    if (data.backdropTemplate && BACKDROP_TEMPLATES.includes(data.backdropTemplate)) {
      this.backdropTemplate = data.backdropTemplate;
    }

    this.strokes = [];
    this.redoStack = [];

    for (const rawStroke of data.strokes) {
      this.addStroke(rawStroke);
    }

    this.emit('load', data);
    this.emit('change', { action: 'load', data });
    this.requestRender();
    return true;
  }

  // --- Event Emitter Pattern ---

  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Event listener must be a function');
    }
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this._listeners.has(event)) return false;
    const handlers = this._listeners.get(event);
    const deleted = handlers.delete(handler);
    if (handlers.size === 0) {
      this._listeners.delete(event);
    }
    return deleted;
  }

  emit(event, ...args) {
    if (!this._listeners.has(event)) return false;
    const handlers = Array.from(this._listeners.get(event));
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
    return true;
  }

  // --- 2D Render Engine ---

  renderStroke(stroke, ctx) {
    if (!stroke || !ctx) return;
    if (typeof ctx.save === 'function') ctx.save();

    const color = stroke.color || this.palette.emeraldCheckout;
    const width = stroke.strokeWidth || 3;
    const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;

    if (ctx.strokeStyle !== undefined) ctx.strokeStyle = color;
    if (ctx.fillStyle !== undefined) ctx.fillStyle = color;
    if (ctx.lineWidth !== undefined) ctx.lineWidth = width;
    if (ctx.globalAlpha !== undefined) ctx.globalAlpha = opacity;
    if (ctx.lineCap !== undefined) ctx.lineCap = 'round';
    if (ctx.lineJoin !== undefined) ctx.lineJoin = 'round';

    switch (stroke.tool) {
      case 'pen': {
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (stroke.segments && stroke.segments.length > 0) {
          for (const seg of stroke.segments) {
            if (seg.type === 'M' && typeof ctx.moveTo === 'function') ctx.moveTo(seg.point.x, seg.point.y);
            else if (seg.type === 'L' && typeof ctx.lineTo === 'function') ctx.lineTo(seg.point.x, seg.point.y);
            else if (seg.type === 'C' && typeof ctx.bezierCurveTo === 'function') {
              ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
            }
          }
        } else if (stroke.points && stroke.points.length > 0) {
          if (typeof ctx.moveTo === 'function') ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            if (typeof ctx.lineTo === 'function') ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
        }
        if (typeof ctx.stroke === 'function') ctx.stroke();
        break;
      }
      case 'eraser': {
        if (ctx.globalCompositeOperation !== undefined) ctx.globalCompositeOperation = 'destination-out';
        if (ctx.lineWidth !== undefined) ctx.lineWidth = width * 1.6;
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (stroke.segments && stroke.segments.length > 0) {
          for (const seg of stroke.segments) {
            if (seg.type === 'M' && typeof ctx.moveTo === 'function') ctx.moveTo(seg.point.x, seg.point.y);
            else if (seg.type === 'L' && typeof ctx.lineTo === 'function') ctx.lineTo(seg.point.x, seg.point.y);
            else if (seg.type === 'C' && typeof ctx.bezierCurveTo === 'function') {
              ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
            }
          }
        } else if (stroke.points && stroke.points.length > 0) {
          if (typeof ctx.moveTo === 'function') ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            if (typeof ctx.lineTo === 'function') ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
        }
        if (typeof ctx.stroke === 'function') ctx.stroke();
        break;
      }
      case 'rectangle': {
        if (!stroke.startPoint || !stroke.endPoint) break;
        const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
        const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
        const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
        const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y);
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.rect === 'function') ctx.rect(x, y, w, h);
        if (typeof ctx.stroke === 'function') ctx.stroke();
        break;
      }
      case 'circle': {
        if (!stroke.startPoint || !stroke.endPoint) break;
        const cx = (stroke.startPoint.x + stroke.endPoint.x) / 2;
        const cy = (stroke.startPoint.y + stroke.endPoint.y) / 2;
        const r = Math.hypot(stroke.endPoint.x - stroke.startPoint.x, stroke.endPoint.y - stroke.startPoint.y) / 2;
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.arc === 'function') ctx.arc(cx, cy, Math.max(r, 1), 0, Math.PI * 2);
        if (typeof ctx.stroke === 'function') ctx.stroke();
        break;
      }
      case 'arrow': {
        if (!stroke.startPoint || !stroke.endPoint) break;
        const p1 = stroke.startPoint;
        const p2 = stroke.endPoint;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLen = Math.max(12, width * 3);

        // Shaft
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(p1.x, p1.y);
        if (typeof ctx.lineTo === 'function') ctx.lineTo(p2.x, p2.y);
        if (typeof ctx.stroke === 'function') ctx.stroke();

        // Triangular Head
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(p2.x, p2.y);
        if (typeof ctx.lineTo === 'function') {
          ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6));
        }
        if (typeof ctx.fill === 'function') ctx.fill();
        break;
      }
      case 'component': {
        if (!stroke.startPoint || !stroke.endPoint) break;
        const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
        const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
        const w = Math.max(Math.abs(stroke.endPoint.x - stroke.startPoint.x), 120);
        const h = Math.max(Math.abs(stroke.endPoint.y - stroke.startPoint.y), 70);

        // Container card
        if (ctx.fillStyle !== undefined) ctx.fillStyle = '#1e293b';
        if (typeof ctx.fillRect === 'function') ctx.fillRect(x, y, w, h);
        if (typeof ctx.strokeRect === 'function') ctx.strokeRect(x, y, w, h);

        // Header circle indicator
        if (ctx.fillStyle !== undefined) ctx.fillStyle = color;
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.arc === 'function') ctx.arc(x + 20, y + 20, 8, 0, Math.PI * 2);
        if (typeof ctx.fill === 'function') ctx.fill();

        // Label
        if (ctx.font !== undefined) ctx.font = 'bold 12px sans-serif';
        if (ctx.fillStyle !== undefined) ctx.fillStyle = '#ffffff';
        const label = stroke.text || this.getComponentDefaultText(stroke.componentType);
        if (typeof ctx.fillText === 'function') ctx.fillText(label, x + 36, y + 24);

        // Interior wireframe box
        if (ctx.fillStyle !== undefined) ctx.fillStyle = '#334155';
        if (typeof ctx.fillRect === 'function') ctx.fillRect(x + 10, y + 36, Math.max(w - 20, 20), Math.max(h - 46, 16));
        break;
      }
    }

    if (typeof ctx.restore === 'function') ctx.restore();
  }

  renderBackdrop(ctx, template) {
    if (!ctx || template === 'none') return;
    if (typeof ctx.save === 'function') ctx.save();
    if (ctx.globalAlpha !== undefined) ctx.globalAlpha = 0.45;

    if (template === 'checkout-funnel') {
      const stages = [
        { label: '01 / CART', x: 60, color: this.palette.indigoCart },
        { label: '02 / SHIPPING', x: 340, color: this.palette.amberDeal },
        { label: '03 / PAYMENT', x: 620, color: this.palette.roseDiscount },
        { label: '04 / SUCCESS', x: 900, color: this.palette.emeraldCheckout }
      ];

      if (ctx.font !== undefined) ctx.font = 'bold 16px sans-serif';
      if (ctx.fillStyle !== undefined) ctx.fillStyle = this.palette.emeraldCheckout;
      if (typeof ctx.fillText === 'function') ctx.fillText('CHECKOUT FUNNEL ARCHITECTURE', 60, 45);

      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (ctx.fillStyle !== undefined) ctx.fillStyle = '#1e293b';
        if (ctx.strokeStyle !== undefined) ctx.strokeStyle = s.color;
        if (ctx.lineWidth !== undefined) ctx.lineWidth = 1.5;
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 4]);
        if (typeof ctx.strokeRect === 'function') ctx.strokeRect(s.x, 70, 220, 260);

        if (ctx.font !== undefined) ctx.font = 'bold 14px sans-serif';
        if (ctx.fillStyle !== undefined) ctx.fillStyle = '#94a3b8';
        if (typeof ctx.fillText === 'function') ctx.fillText(s.label, s.x + 20, 100);

        // Accent indicator
        if (ctx.fillStyle !== undefined) ctx.fillStyle = s.color;
        if (typeof ctx.beginPath === 'function') ctx.beginPath();
        if (typeof ctx.arc === 'function') ctx.arc(s.x + 190, y => y, 8, 0, Math.PI * 2);
        if (typeof ctx.arc === 'function') ctx.arc(s.x + 190, 95, 8, 0, Math.PI * 2);
        if (typeof ctx.fill === 'function') ctx.fill();

        // Connector arrow
        if (i < stages.length - 1) {
          if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
          if (typeof ctx.beginPath === 'function') ctx.beginPath();
          if (typeof ctx.moveTo === 'function') ctx.moveTo(s.x + 225, 200);
          if (typeof ctx.lineTo === 'function') ctx.lineTo(s.x + 275, 200);
          if (typeof ctx.stroke === 'function') ctx.stroke();
        }
      }
    } else if (template === 'merchandising-grid') {
      if (ctx.font !== undefined) ctx.font = 'bold 16px sans-serif';
      if (ctx.fillStyle !== undefined) ctx.fillStyle = this.palette.amberDeal;
      if (typeof ctx.fillText === 'function') ctx.fillText('MERCHANDISING CAMPAIGN GRID', 60, 45);

      if (ctx.strokeStyle !== undefined) ctx.strokeStyle = this.palette.amberDeal;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 4]);
      if (typeof ctx.strokeRect === 'function') ctx.strokeRect(60, 70, 1060, 180);

      if (ctx.font !== undefined) ctx.font = 'bold 18px sans-serif';
      if (ctx.fillStyle !== undefined) ctx.fillStyle = '#ffffff';
      if (typeof ctx.fillText === 'function') ctx.fillText('HERO PROMOTIONAL BANNER (1200 x 400)', 90, 110);

      const cards = [
        { label: 'PROMO: DEAL OF THE DAY', x: 60 },
        { label: 'PROMO: FLASH CLEARANCE', x: 425 },
        { label: 'PROMO: TRENDING NOW', x: 790 }
      ];
      for (const card of cards) {
        if (ctx.strokeStyle !== undefined) ctx.strokeStyle = this.palette.slateGrid;
        if (typeof ctx.strokeRect === 'function') ctx.strokeRect(card.x, 270, 330, 240);
        if (ctx.font !== undefined) ctx.font = 'bold 14px sans-serif';
        if (ctx.fillStyle !== undefined) ctx.fillStyle = '#94a3b8';
        if (typeof ctx.fillText === 'function') ctx.fillText(card.label, card.x + 20, 305);
      }
    } else if (template === 'product-showcase') {
      if (ctx.font !== undefined) ctx.font = 'bold 16px sans-serif';
      if (ctx.fillStyle !== undefined) ctx.fillStyle = this.palette.indigoCart;
      if (typeof ctx.fillText === 'function') ctx.fillText('PRODUCT SHOWCASE WIREFRAME', 60, 45);

      if (ctx.strokeStyle !== undefined) ctx.strokeStyle = this.palette.indigoCart;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 4]);
      if (typeof ctx.strokeRect === 'function') ctx.strokeRect(60, 70, 480, 420);

      if (ctx.font !== undefined) ctx.font = 'bold 14px sans-serif';
      if (ctx.fillStyle !== undefined) ctx.fillStyle = '#94a3b8';
      if (typeof ctx.fillText === 'function') ctx.fillText('PRIMARY PRODUCT MEDIA GALLERY', 90, 110);

      if (ctx.strokeStyle !== undefined) ctx.strokeStyle = this.palette.slateGrid;
      if (typeof ctx.strokeRect === 'function') ctx.strokeRect(580, 70, 540, 420);

      if (ctx.font !== undefined) ctx.font = 'bold 18px sans-serif';
      if (ctx.fillStyle !== undefined) ctx.fillStyle = '#ffffff';
      if (typeof ctx.fillText === 'function') ctx.fillText('PRODUCT TITLE & SKU IDENTIFIER', 610, 110);

      if (ctx.fillStyle !== undefined) ctx.fillStyle = this.palette.emeraldCheckout;
      if (ctx.font !== undefined) ctx.font = 'bold 16px sans-serif';
      if (typeof ctx.fillText === 'function') ctx.fillText('$189.00 USD', 610, 145);

      if (typeof ctx.strokeRect === 'function') ctx.strokeRect(610, 230, 240, 46);
      if (ctx.font !== undefined) ctx.font = 'bold 13px sans-serif';
      if (ctx.fillStyle !== undefined) ctx.fillStyle = '#ffffff';
      if (typeof ctx.fillText === 'function') ctx.fillText('ADD TO SHOPPING CART', 645, 260);
    }

    if (typeof ctx.restore === 'function') ctx.restore();
  }

  render(targetCtx = this.ctx) {
    if (!targetCtx) return;

    if (typeof targetCtx.clearRect === 'function') {
      targetCtx.clearRect(0, 0, this.width, this.height);
    }

    // Canvas background
    if (typeof targetCtx.fillRect === 'function' && targetCtx.fillStyle !== undefined) {
      if (typeof targetCtx.save === 'function') targetCtx.save();
      targetCtx.fillStyle = this.palette.merchantDark;
      targetCtx.fillRect(0, 0, this.width, this.height);
      if (typeof targetCtx.restore === 'function') targetCtx.restore();
    }

    // Render template backdrop
    if (this.backdropTemplate !== 'none') {
      this.renderBackdrop(targetCtx, this.backdropTemplate);
    }

    // Render all saved strokes
    for (const stroke of this.strokes) {
      this.renderStroke(stroke, targetCtx);
    }

    // Render live active stroke preview
    if (this.isDrawing && this.activeStroke) {
      this.renderStroke(this.activeStroke, targetCtx);
    }

    this.emit('render', { strokesCount: this.strokes.length });
  }

  requestRender() {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => this.render());
    } else {
      this.render();
    }
  }

  // --- DOM Event Binding & High-DPI Support ---

  attach(canvasElement) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext ? canvasElement.getContext('2d') : null;

    if (typeof window !== 'undefined' && canvasElement.getBoundingClientRect) {
      this.setupDPI();
      this.bindDOMEvents();
    }
    this.render();
  }

  setupDPI() {
    if (!this.canvas || typeof window === 'undefined') return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width > 0 ? rect.width : this.width;
    const cssHeight = rect.height > 0 ? rect.height : this.height;

    this.width = cssWidth;
    this.height = cssHeight;

    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);

    if (this.ctx && typeof this.ctx.scale === 'function') {
      if (typeof this.ctx.resetTransform === 'function') {
        this.ctx.resetTransform();
      }
      this.ctx.scale(dpr, dpr);
    }
  }

  bindDOMEvents() {
    if (!this.canvas) return;
    this.detach();

    const onPointerDown = (e) => {
      e.preventDefault();
      const coords = this.getCanvasCoordinates(e);
      this.isDrawing = true;
      this.lastPoint = coords;

      this.activeStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        tool: this.currentTool,
        color: this.strokeColor,
        strokeWidth: this.strokeWidth,
        opacity: this.opacity,
        componentType: this.componentType,
        text: this.getComponentDefaultText(this.componentType),
        points: [coords],
        startPoint: coords,
        endPoint: coords,
        timestamp: Date.now()
      };

      this.emit('stroke:start', this.activeStroke);
    };

    const onPointerMove = (e) => {
      if (!this.isDrawing || !this.activeStroke) return;
      e.preventDefault();
      const coords = this.getCanvasCoordinates(e);

      if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
        const interpolated = this.interpolatePoints(this.lastPoint, coords, Math.max(3, this.strokeWidth));
        for (let i = 1; i < interpolated.length; i++) {
          this.activeStroke.points.push(interpolated[i]);
        }
        this.lastPoint = coords;
        this.activeStroke.segments = this.catmullRomToBezier(this.activeStroke.points);
      } else {
        this.activeStroke.endPoint = coords;
      }

      this.render();
      this.emit('stroke:move', this.activeStroke);
    };

    const onPointerUp = (e) => {
      if (!this.isDrawing || !this.activeStroke) return;
      e.preventDefault();
      const coords = this.getCanvasCoordinates(e);
      this.activeStroke.endPoint = coords;
      this.isDrawing = false;

      const completed = this.addStroke(this.activeStroke);
      this.emit('stroke:end', completed);
      this.activeStroke = null;
      this.lastPoint = null;
    };

    const onResize = () => {
      this.setupDPI();
      this.render();
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);

    this._boundHandlers = {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onResize
    };
  }

  detach() {
    if (this._boundHandlers) {
      if (this.canvas) {
        this.canvas.removeEventListener('pointerdown', this._boundHandlers.onPointerDown);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', this._boundHandlers.onPointerMove);
        window.removeEventListener('pointerup', this._boundHandlers.onPointerUp);
        window.removeEventListener('resize', this._boundHandlers.onResize);
      }
      this._boundHandlers = null;
    }
    this.canvas = null;
    this.ctx = null;
  }

  getCanvasCoordinates(e) {
    if (!this.canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    return {
      x: Number((clientX - rect.left).toFixed(2)),
      y: Number((clientY - rect.top).toFixed(2)),
      pressure
    };
  }
}
