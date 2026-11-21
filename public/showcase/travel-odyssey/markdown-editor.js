/**
 * Travel Odyssey - Markdown Documentation & Live Preview Sandbox
 * Splits pane editor and live preview, parses Markdown headings, lists,
 * code blocks, and blockquotes, sanitizes dangerous HTML, and calculates reading time.
 */

export class TravelOdysseyMarkdownParser {
  constructor(options = {}) {
    this.name = 'TravelOdysseyMarkdownParser';
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  /**
   * Sanitizes dirty HTML to prevent DOM XSS vulnerabilities.
   * @param {string} dirty
   * @returns {string} Sanitized HTML
   */
  sanitizeHTML(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*(["']).*?\1/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Calculates word count and estimated reading time.
   * @param {string} text - Raw text
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
   * Parses Markdown string into safe rendered HTML.
   * @param {string} raw - Markdown source text
   * @returns {string} HTML string
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

  /**
   * Formats inline Markdown styles: code, bold, italics.
   * @param {string} text
   * @returns {string}
   */
  formatInline(text) {
    if (!text) return '';
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  /**
   * Default sample markdown for travel documentation.
   * @returns {string}
   */
  getDefaultSample() {
    return `# Himalayan Alpine Expedition Itinerary v3.2

> NOTICE: Check high-altitude weather telemetry and oxygen saturation baselines before departure from Base Camp.

## 1. Route Navigation Waypoints
- Establish high camp at **Point Echo (4,850m)**.
- Secure fixed safety lines along the *Western Ridge Traverse*.
- Sync GPS telemetry with the satellite transceiver via \`geo_locator_v2\`.

### 2. Critical Expedition Gear
All climbers must carry backup crampons, thermal bivouac sacks, and emergency transponders.`;
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const parser = new TravelOdysseyMarkdownParser();

    const textarea = document.getElementById('markdown-input');
    const preview = document.getElementById('preview-output');
    const wordCount = document.getElementById('word-count');
    const charCount = document.getElementById('char-count');
    const readingTime = document.getElementById('reading-time');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const clearBtn = document.getElementById('clear-btn');

    function updatePreview() {
      const text = textarea?.value || '';
      if (preview) {
        preview.innerHTML = parser.parseMarkdown(text);
      }

      const stats = parser.computeReadingTime(text);
      if (wordCount) wordCount.textContent = String(stats.words);
      if (charCount) charCount.textContent = String(text.length);
      if (readingTime) readingTime.textContent = stats.display;
    }

    if (textarea) {
      textarea.value = parser.getDefaultSample();
      textarea.addEventListener('input', updatePreview);
    }

    if (loadSampleBtn && textarea) {
      loadSampleBtn.addEventListener('click', () => {
        textarea.value = parser.getDefaultSample();
        updatePreview();
      });
    }

    if (clearBtn && textarea) {
      clearBtn.addEventListener('click', () => {
        textarea.value = '';
        updatePreview();
      });
    }

    updatePreview();
  });
}
