/**
 * PodcastAudioStreamMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for Podcast Audio Stream.
 * Parses headings, lists, code spans, blockquotes, sanitizes malicious XSS vectors,
 * and calculates estimated reading times in real time.
 */
export class PodcastAudioStreamMarkdownParser {
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

    const defaultContent = initialText || `# Episode 42: The Architecture of Immersive Spatial Audio

## Executive Episode Summary
In this broadcast, we dissect **binaural HRTF rendering**, dynamic dynamic range compression, and lossless audio codecs.

### Key Chapter Segments
- \`00:00:00\` - Introduction and Audio Pipeline Overview
- \`00:08:45\` - Parametric Equalization and Resonance Trapping
- \`00:23:15\` - Spatial Soundfield Modeling & Ambisonics
- \`00:41:00\` - Audience Q&A and Engineering Deep-Dive

> "High-fidelity audio streaming requires mastering psychoacoustics alongside high-throughput packet delivery."

### Audio Production Stack
- Master Bitrate: \`320 kbps AAC / Opus\`
- Sampling Frequency: \`48.0 kHz 24-bit\`
- Peak Loudness Target: \`-14 LUFS\`
`;

    const wrapper = document.createElement('div');
    wrapper.className = 'podcast-audio-stream-md-wrapper';

    // Header with live stats
    const header = document.createElement('div');
    header.className = 'podcast-audio-stream-md-header';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Podcast Audio Stream - Markdown Documentation Sandbox';

    const statsEl = document.createElement('div');
    statsEl.className = 'podcast-audio-stream-md-stats';

    header.appendChild(titleEl);
    header.appendChild(statsEl);

    // Main split panes
    const main = document.createElement('div');
    main.className = 'podcast-audio-stream-md-main';

    // Left editor pane
    const leftPane = document.createElement('div');
    leftPane.className = 'podcast-audio-stream-md-pane podcast-audio-stream-md-pane-left';

    const leftTitle = document.createElement('div');
    leftTitle.className = 'podcast-audio-stream-md-pane-title';
    leftTitle.textContent = 'Markdown Source';

    const textarea = document.createElement('textarea');
    textarea.className = 'podcast-audio-stream-md-textarea';
    textarea.value = defaultContent;

    leftPane.appendChild(leftTitle);
    leftPane.appendChild(textarea);

    // Right preview pane
    const rightPane = document.createElement('div');
    rightPane.className = 'podcast-audio-stream-md-pane';

    const rightTitle = document.createElement('div');
    rightTitle.className = 'podcast-audio-stream-md-pane-title';
    rightTitle.textContent = 'Live HTML Preview';

    const preview = document.createElement('div');
    preview.className = 'podcast-audio-stream-md-preview';

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
