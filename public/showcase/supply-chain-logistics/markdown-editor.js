/**
 * SupplyChainLogisticsMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for Supply Chain Logistics.
 * Parses headings, lists, code spans, blockquotes, sanitizes malicious XSS vectors,
 * and calculates estimated reading times in real time.
 */
export class SupplyChainLogisticsMarkdownParser {
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

    const defaultContent = initialText || `# Intermodal Freight Logistics Standard Operating Protocol

## Route Manifest & Cargo Inspection
This documentation defines **cold-chain preservation standards**, automated bill-of-lading protocols, and port clearing checklists.

### Key Transit Milestones
- \`Leg 01\` - Intermodal Container Staging & Seal Verification
- \`Leg 02\` - Maritime Freight Transit & Temperature Monitoring
- \`Leg 03\` - Inland Rail Freight Transfer & Real-time GPS Telemetry
- \`Leg 04\` - Automated Last-Mile Fulfillment & Delivery Receipt

> "Precision timing, transparent custody tracking, and climate monitoring secure uninterrupted global supply chains."

### Compliance & Quality Standards
- Temperature Threshold: \`-20°C to -18°C verified\`
- Seal Integrity: \`Cryptographic RFID e-seal v2.1\`
- On-Time Target: \`99.8% ETA compliance\`
`;

    const wrapper = document.createElement('div');
    wrapper.className = 'supply-chain-logistics-md-wrapper';

    // Header with live stats
    const header = document.createElement('div');
    header.className = 'supply-chain-logistics-md-header';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Supply Chain Logistics - Markdown Documentation Sandbox';

    const statsEl = document.createElement('div');
    statsEl.className = 'supply-chain-logistics-md-stats';

    header.appendChild(titleEl);
    header.appendChild(statsEl);

    // Main split panes
    const main = document.createElement('div');
    main.className = 'supply-chain-logistics-md-main';

    // Left editor pane
    const leftPane = document.createElement('div');
    leftPane.className = 'supply-chain-logistics-md-pane supply-chain-logistics-md-pane-left';

    const leftTitle = document.createElement('div');
    leftTitle.className = 'supply-chain-logistics-md-pane-title';
    leftTitle.textContent = 'Markdown Source';

    const textarea = document.createElement('textarea');
    textarea.className = 'supply-chain-logistics-md-textarea';
    textarea.value = defaultContent;

    leftPane.appendChild(leftTitle);
    leftPane.appendChild(textarea);

    // Right preview pane
    const rightPane = document.createElement('div');
    rightPane.className = 'supply-chain-logistics-md-pane';

    const rightTitle = document.createElement('div');
    rightTitle.className = 'supply-chain-logistics-md-pane-title';
    rightTitle.textContent = 'Live HTML Preview';

    const preview = document.createElement('div');
    preview.className = 'supply-chain-logistics-md-preview';

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
