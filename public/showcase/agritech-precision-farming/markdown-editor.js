/**
 * AgritechPrecisionFarmingMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for agronomy protocols, sensor calibration guides, and field telemetry specifications.
 */
export class AgritechPrecisionFarmingMarkdownParser {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  getDefaultDocument() {
    return `# Precision Agriculture Field Calibration Guide

> **Note:** Calibrate all subterranean soil probes prior to spring sowing.

## 1. NPK Sensor Array Deployment
- Install capacitive moisture probes at **15cm**, **30cm**, and **60cm** depth intervals.
- Verify optical reflectance sensors are free of silt deposits.
- Confirm solar battery charge voltage is at least \`3.7V\`.

## 2. Autonomous Irrigation Valve Cycle
\`\`\`
IF soil_tension > 45kPa AND solar_irradiance > 600W/m2 THEN
  trigger_drip_zone(zone_id=4, volume_liters=250)
\`\`\`

## 3. Remote Telemetry Health
Ensure the LoRaWAN gateway packet forwarder heartbeat latency remains below \`250ms\`.`;
  }

  sanitizeHTML(dirty = '') {
    if (typeof dirty !== 'string') return '';

    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:[^"']*/gi, '');
  }

  parseMarkdown(raw = '') {
    if (typeof raw !== 'string') return '';

    // First sanitize raw input
    let md = this.sanitizeHTML(raw);

    // Escape HTML characters that aren't markdown tags
    md = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Restore blockquote tag
    md = md.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

    // Headers
    md = md.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    md = md.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    md = md.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and Italic
    md = md.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    md = md.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Code blocks
    md = md.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');

    // Inline code
    md = md.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Unordered lists
    md = md.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    md = md.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Paragraphs / line breaks
    const lines = md.split('\n\n');
    const htmlLines = lines.map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h1') ||
        trimmed.startsWith('<h2') ||
        trimmed.startsWith('<h3') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote')
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    });

    return htmlLines.filter(Boolean).join('\n');
  }

  computeReadingTime(text = '') {
    if (!text || typeof text !== 'string') {
      return { words: 0, characters: 0, minutes: 0, text: '0 min read' };
    }

    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    const minutes = Math.max(1, Math.ceil(words / this.wordsPerMinute));

    return {
      words,
      characters,
      minutes,
      text: `${minutes} min read`
    };
  }

  renderToDOM(container, initialContent = this.getDefaultDocument()) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'agri-editor-container';

    // Header
    const header = document.createElement('div');
    header.className = 'agri-editor-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'agri-editor-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Agronomy Docs & Markdown Live Sandbox';

    const subtitle = document.createElement('p');
    subtitle.className = 'agri-editor-subtitle';
    subtitle.textContent = 'Draft and preview precision farming operating procedures with real-time reading metrics.';

    titleGroup.append(title, subtitle);

    const statsBadge = document.createElement('div');
    statsBadge.className = 'agri-editor-stats-badge';

    header.append(titleGroup, statsBadge);
    editorWrapper.append(header);

    // Split-pane layout
    const splitPane = document.createElement('div');
    splitPane.className = 'agri-split-pane';

    // Left editor pane
    const editorCol = document.createElement('div');
    editorCol.className = 'agri-pane-col';

    const editorLabel = document.createElement('div');
    editorLabel.className = 'agri-pane-label';
    editorLabel.textContent = 'Markdown Source Editor';

    const textarea = document.createElement('textarea');
    textarea.className = 'agri-editor-textarea';
    textarea.value = initialContent;
    textarea.placeholder = 'Type markdown documentation here...';

    editorCol.append(editorLabel, textarea);

    // Right preview pane
    const previewCol = document.createElement('div');
    previewCol.className = 'agri-pane-col';

    const previewLabel = document.createElement('div');
    previewLabel.className = 'agri-pane-label';
    previewLabel.textContent = 'Live HTML Preview';

    const previewContent = document.createElement('div');
    previewContent.className = 'agri-preview-content';

    previewCol.append(previewLabel, previewContent);
    splitPane.append(editorCol, previewCol);
    editorWrapper.append(splitPane);

    const updatePreview = () => {
      const rawText = textarea.value;
      const html = this.parseMarkdown(rawText);
      previewContent.replaceChildren();

      // Render parsed html safely using DOMParser
      const doc = new DOMParser().parseFromString(html, 'text/html');
      Array.from(doc.body.childNodes).forEach((node) => {
        previewContent.append(node.cloneNode(true));
      });

      const metrics = this.computeReadingTime(rawText);
      statsBadge.textContent = `${metrics.words} words • ${metrics.characters} chars • ${metrics.text}`;
    };

    textarea.addEventListener('input', updatePreview);
    updatePreview();

    container.append(editorWrapper);
  }
}
