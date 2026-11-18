/**
 * MusicDawStudioMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for synthesizer patch designs, studio session track sheets, and audio mastering notes.
 */
export class MusicDawStudioMarkdownParser {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  getDefaultDocument() {
    return `# Synthwave Bassline & Sound Design Session Sheet

> **Mastering Note:** Ensure low-end frequencies under \`30Hz\` are high-passed to preserve dynamic headroom.

## 1. Dual-Oscillator FM Patch Architecture
- Oscillator A: Sawtooth wave tuned to \`32'\` pitch with **12%** unison detuning.
- Oscillator B: Square wave modulated at **2.5x** carrier ratio for metallic harmonics.
- Ladder Filter: 24dB/oct low-pass cutoff at **850Hz** with resonance boost.

## 2. Drum Bus Compressor Settings
\`\`\`
Attack: 30ms (transient preservation)
Release: Auto / 120ms (tempo sync)
Ratio: 4:1 (glue compression)
Threshold: -14dB (2dB gain reduction)
\`\`\`

## 3. Mixdown Stems Breakdown
Export uncompressed 24-bit stems grouped into Kick, Sub, Synths, Percussion, and FX.`;
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

    let md = this.sanitizeHTML(raw);

    md = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    md = md.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');
    md = md.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    md = md.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    md = md.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    md = md.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    md = md.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    md = md.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    md = md.replace(/`([^`]+)`/gim, '<code>$1</code>');

    md = md.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    md = md.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

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
    editorWrapper.className = 'daw-editor-container';

    // Header
    const header = document.createElement('div');
    header.className = 'daw-editor-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'daw-editor-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Track Notes & Studio Session Markdown Sandbox';

    const subtitle = document.createElement('p');
    subtitle.className = 'daw-editor-subtitle';
    subtitle.textContent = 'Document sound design presets, mix logs, and stem mastering instructions with real-time reading metrics.';

    titleGroup.append(title, subtitle);

    const statsBadge = document.createElement('div');
    statsBadge.className = 'daw-editor-stats-badge';

    header.append(titleGroup, statsBadge);
    editorWrapper.append(header);

    // Split-pane
    const splitPane = document.createElement('div');
    splitPane.className = 'daw-split-pane';

    const editorCol = document.createElement('div');
    editorCol.className = 'daw-pane-col';

    const editorLabel = document.createElement('div');
    editorLabel.className = 'daw-pane-label';
    editorLabel.textContent = 'Markdown Session Source';

    const textarea = document.createElement('textarea');
    textarea.className = 'daw-editor-textarea';
    textarea.value = initialContent;
    textarea.placeholder = 'Type studio track session notes here...';

    editorCol.append(editorLabel, textarea);

    const previewCol = document.createElement('div');
    previewCol.className = 'daw-pane-col';

    const previewLabel = document.createElement('div');
    previewLabel.className = 'daw-pane-label';
    previewLabel.textContent = 'Live HTML Preview';

    const previewContent = document.createElement('div');
    previewContent.className = 'daw-preview-content';

    previewCol.append(previewLabel, previewContent);
    splitPane.append(editorCol, previewCol);
    editorWrapper.append(splitPane);

    const updatePreview = () => {
      const rawText = textarea.value;
      const html = this.parseMarkdown(rawText);
      previewContent.replaceChildren();

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
