/**
 * AutomotiveHypercarMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for Automotive Hypercar.
 * Parses headings, lists, code spans, blockquotes, sanitizes malicious XSS vectors,
 * and calculates estimated reading times in real time.
 */
export class AutomotiveHypercarMarkdownParser {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  sanitizeHTML(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*(["']).*?\1/gi, '')
      .replace(/javascript:/gi, '');
  }

  computeReadingTime(text) {
    if (!text || typeof text !== 'string') {
      return { words: 0, minutes: 0, seconds: 0, display: '0 min read' };
    }
    const clean = text.trim();
    if (!clean) {
      return { words: 0, minutes: 0, seconds: 0, display: '0 min read' };
    }

    const words = clean.split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / this.wordsPerMinute);
    const seconds = Math.round((words / this.wordsPerMinute) * 60);

    return {
      words,
      minutes,
      seconds,
      display: `${minutes} min read`
    };
  }

  parseMarkdown(raw) {
    if (!raw || typeof raw !== 'string') return '';

    const lines = raw.split(/\r?\n/);
    const htmlLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^\s*[-*]\s+(.*)$/.test(line)) {
        if (!inList) {
          htmlLines.push('<ul>');
          inList = true;
        }
        const itemContent = line.replace(/^\s*[-*]\s+/, '');
        htmlLines.push(`<li>${this.formatInline(itemContent)}</li>`);
        continue;
      } else if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }

      if (/^###\s+(.*)$/.test(line)) {
        const text = line.replace(/^###\s+/, '');
        htmlLines.push(`<h3>${this.formatInline(text)}</h3>`);
      } else if (/^##\s+(.*)$/.test(line)) {
        const text = line.replace(/^##\s+/, '');
        htmlLines.push(`<h2>${this.formatInline(text)}</h2>`);
      } else if (/^#\s+(.*)$/.test(line)) {
        const text = line.replace(/^#\s+/, '');
        htmlLines.push(`<h1>${this.formatInline(text)}</h1>`);
      } else if (/^>\s+(.*)$/.test(line)) {
        const quote = line.replace(/^>\s+/, '');
        htmlLines.push(`<blockquote>${this.formatInline(quote)}</blockquote>`);
      } else if (line.trim().length === 0) {
        continue;
      } else {
        htmlLines.push(`<p>${this.formatInline(line)}</p>`);
      }
    }

    if (inList) {
      htmlLines.push('</ul>');
    }

    const compiled = htmlLines.join('\n');
    return this.sanitizeHTML(compiled);
  }

  formatInline(text) {
    if (!text) return '';
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  renderToDOM(container, initialText = '') {
    if (!container) return;
    container.innerHTML = '';

    const defaultContent = initialText || `# Hypercar Powertrain Calibration & Aerodynamic Benchmarks

## Telemetry Standards & Wind Tunnel Validation
Chassis dynamics specifications, active aero coefficient tables, and hybrid regenerative braking protocols.

### Core Directives & Verification Checks
- \`Check 01\` - System Handshake & Sensor Calibration
- \`Check 02\` - Low-Latency Telemetry Streaming Verification
- \`Check 03\` - Fault Tolerance Threshold Monitoring
- \`Check 04\` - Real-Time Dynamic Ledger Cryptographic Checksum

> "Precision, robust modular isolation, and high performance guarantee reliable scalability."

### Target Operational SLAs
- Latency Benchmark: \`P99 < 15ms verified\`
- Throughput Volume: \`20,000 ops/sec supported\`
- Availability SLA: \`99.999% uptime compliance\`
`;

    const wrapper = document.createElement('div');
    wrapper.className = 'automotive-hypercar-md-wrapper';

    const header = document.createElement('div');
    header.className = 'automotive-hypercar-md-header';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Automotive Hypercar - Markdown Documentation Sandbox';

    const statsEl = document.createElement('div');
    statsEl.className = 'automotive-hypercar-md-stats';

    header.appendChild(titleEl);
    header.appendChild(statsEl);

    const main = document.createElement('div');
    main.className = 'automotive-hypercar-md-main';

    const leftPane = document.createElement('div');
    leftPane.className = 'automotive-hypercar-md-pane automotive-hypercar-md-pane-left';

    const leftTitle = document.createElement('div');
    leftTitle.className = 'automotive-hypercar-md-pane-title';
    leftTitle.textContent = 'Markdown Source';

    const textarea = document.createElement('textarea');
    textarea.className = 'automotive-hypercar-md-textarea';
    textarea.value = defaultContent;

    leftPane.appendChild(leftTitle);
    leftPane.appendChild(textarea);

    const rightPane = document.createElement('div');
    rightPane.className = 'automotive-hypercar-md-pane';

    const rightTitle = document.createElement('div');
    rightTitle.className = 'automotive-hypercar-md-pane-title';
    rightTitle.textContent = 'Live HTML Preview';

    const preview = document.createElement('div');
    preview.className = 'automotive-hypercar-md-preview';

    rightPane.appendChild(rightTitle);
    rightPane.appendChild(preview);

    main.appendChild(leftPane);
    main.appendChild(rightPane);

    wrapper.appendChild(header);
    wrapper.appendChild(main);
    container.appendChild(wrapper);

    const updateView = () => {
      const text = textarea.value;
      const stats = this.computeReadingTime(text);
      statsEl.innerHTML = `Words: <span>${stats.words}</span> • Read Time: <span>${stats.display}</span>`;
      preview.innerHTML = this.parseMarkdown(text);
    };

    textarea.addEventListener('input', updateView);
    updateView();
  }
}
