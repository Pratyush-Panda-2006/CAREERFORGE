/**
 * SaasLaunchpadMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for SaaS Launchpad.
 * Parses headings, lists, code spans, blockquotes, sanitizes malicious XSS vectors,
 * and calculates estimated reading times in real time.
 */
export class SaasLaunchpadMarkdownParser {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  /**
   * Sanitizes untrusted HTML by removing script tags, inline event attributes, and javascript: protocols.
   * @param {string} dirty
   * @returns {string}
   */
  sanitizeHTML(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*(["']).*?\1/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Computes word count, reading minutes, and formatted reading time.
   * @param {string} text
   * @returns {{ words: number, minutes: number, seconds: number, display: string }}
   */
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

  /**
   * Compiles markdown string into sanitized HTML.
   * @param {string} raw
   * @returns {string}
   */
  parseMarkdown(raw) {
    if (!raw || typeof raw !== 'string') return '';

    const lines = raw.split(/\r?\n/);
    const htmlLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Unordered list items (- or *)
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

      // Headings
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

    const defaultContent = initialText || `# SaaS Launchpad API Contract & Microservice Architecture

## Webhook Ingestion & Rate-Limiting Protocol
Core enterprise guidelines for third-party webhook verification, idempotency token validation, and multi-tenant billing pipelines.

### Core Workflows & Operational Directives
- \`Step 01\` - Initialization and Automated Protocol Handshake
- \`Step 02\` - Continuous Health Monitoring and Telemetry Streaming
- \`Step 03\` - Incident Resolution and Dynamic Feedback Loop
- \`Step 04\` - Audit Trail Verification & Cryptographic Ledger Signing

> "Uncompromising consistency, high performance, and robust isolation guarantee scalable reliability."

### Benchmarks & Target Indicators
- Response Latency: \`P99 < 12ms target verified\`
- Throughput Volume: \`10,000+ operations/sec supported\`
- Availability SLA: \`99.999% uptime compliance\`
`;

    const wrapper = document.createElement('div');
    wrapper.className = 'saas-launchpad-md-wrapper';

    const header = document.createElement('div');
    header.className = 'saas-launchpad-md-header';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'SaaS Launchpad - Markdown Documentation Sandbox';

    const statsEl = document.createElement('div');
    statsEl.className = 'saas-launchpad-md-stats';

    header.appendChild(titleEl);
    header.appendChild(statsEl);

    const main = document.createElement('div');
    main.className = 'saas-launchpad-md-main';

    const leftPane = document.createElement('div');
    leftPane.className = 'saas-launchpad-md-pane saas-launchpad-md-pane-left';

    const leftTitle = document.createElement('div');
    leftTitle.className = 'saas-launchpad-md-pane-title';
    leftTitle.textContent = 'Markdown Source';

    const textarea = document.createElement('textarea');
    textarea.className = 'saas-launchpad-md-textarea';
    textarea.value = defaultContent;

    leftPane.appendChild(leftTitle);
    leftPane.appendChild(textarea);

    const rightPane = document.createElement('div');
    rightPane.className = 'saas-launchpad-md-pane';

    const rightTitle = document.createElement('div');
    rightTitle.className = 'saas-launchpad-md-pane-title';
    rightTitle.textContent = 'Live HTML Preview';

    const preview = document.createElement('div');
    preview.className = 'saas-launchpad-md-preview';

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
