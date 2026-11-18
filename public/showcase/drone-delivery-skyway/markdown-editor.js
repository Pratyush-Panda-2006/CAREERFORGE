/**
 * DroneDeliverySkywayMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for autonomous drone delivery flight manuals, UTM corridor protocols, and vertiport specs.
 */
export class DroneDeliverySkywayMarkdownParser {
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
        // Blockquotes
        const quote = line.replace(/^>\s+/, '');
        htmlLines.push(`<blockquote>${this.formatInline(quote)}</blockquote>`);
      } else if (line.trim().length === 0) {
        // Empty lines
        continue;
      } else {
        // Regular paragraphs
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
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'drone-md-wrapper';

    // Toolbar / Header
    const header = document.createElement('div');
    header.className = 'drone-md-header';

    const title = document.createElement('h3');
    title.textContent = 'Skyway Flight Manual & Documentation Sandbox';

    const stats = document.createElement('div');
    stats.className = 'drone-md-stats';

    header.append(title, stats);
    editorWrapper.append(header);

    // Panes
    const panes = document.createElement('div');
    panes.className = 'drone-md-panes';

    const editorPane = document.createElement('div');
    editorPane.className = 'drone-md-editor-pane';

    const textarea = document.createElement('textarea');
    textarea.className = 'drone-md-textarea';
    textarea.placeholder = 'Type drone corridor flight docs in markdown...';
    textarea.value = initialText || this.getDefaultSample();

    editorPane.append(textarea);

    const previewPane = document.createElement('div');
    previewPane.className = 'drone-md-preview-pane';

    const previewContent = document.createElement('div');
    previewContent.className = 'drone-md-preview-content';

    previewPane.append(previewContent);
    panes.append(editorPane, previewPane);
    editorWrapper.append(panes);

    // Update function
    const updatePreview = () => {
      const text = textarea.value;
      const parsed = this.parseMarkdown(text);
      previewContent.replaceChildren();
      const template = document.createElement('template');
      template.innerHTML = parsed;
      previewContent.append(template.content.cloneNode(true));

      const statsInfo = this.computeReadingTime(text);
      stats.textContent = `${statsInfo.words} words • ${statsInfo.display}`;
    };

    textarea.addEventListener('input', updatePreview);
    updatePreview();

    container.append(editorWrapper);
  }

  getDefaultSample() {
    return `# Skyway UTM Corridor Operational Manual
## Flight Authorization & Collision Avoidance Protocols

Autonomous drone delivery routes require active airspace reservation before takeoff.

### Drone Pre-Flight Checklist
- Verify battery cycle health > 90%
- Calibrate GPS compass & LiDAR rangefinders
- Test payload release servo tension
- Ping Skyway traffic control UTM node

> Always maintain 120-meter altitude separation inside urban high-density delivery zones.

For autopilot commands, execute \`skyway-dispatch --route corridor-A4 --payload 2.5kg\`.`;
  }
}
