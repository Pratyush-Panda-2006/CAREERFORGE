/**
 * Smart IoT Nexus - Split-Pane Markdown Documentation & Live Preview Sandbox
 * Parses markdown syntax, sanitizes XSS vectors, and calculates reading time metrics in real time.
 */

export class SmartIotNexusMarkdownParser {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  /**
   * Sanitizes untrusted HTML by removing executable script tags, iframes, inline event attributes,
   * and dangerous protocol schemes.
   * @param {string} dirty
   * @returns {string} Sanitized string
   */
  sanitizeHTML(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';

    return dirty
      // Strip script tags and their contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Strip iframe, object, embed tags
      .replace(/<\/?(iframe|object|embed|frame|frameset)\b[^>]*>/gi, '')
      // Strip dangerous attributes (e.g. onerror=, onclick=, onload=)
      .replace(/\s+on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      // Neutralize javascript: or data: in href/src
      .replace(/(href|src)\s*=\s*['"]\s*(?:javascript|data):[^'"]*['"]/gi, '$1="#"');
  }

  /**
   * Computes word count, character count, and estimated reading time.
   * @param {string} text
   * @returns {{ words: number, characters: number, minutes: number, formattedTime: string }}
   */
  computeReadingTime(text) {
    if (!text || typeof text !== 'string') {
      return { words: 0, characters: 0, minutes: 0, formattedTime: '0 min read' };
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { words: 0, characters: 0, minutes: 0, formattedTime: '0 min read' };
    }

    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const characters = trimmed.length;
    const rawMinutes = words / this.wordsPerMinute;
    const minutes = Math.max(1, Math.ceil(rawMinutes));
    const formattedTime = words < 100 ? '< 1 min read' : `${minutes} min read`;

    return {
      words,
      characters,
      minutes,
      formattedTime
    };
  }

  /**
   * Parses Markdown input into formatted HTML.
   * Supports headers (H1-H4), fenced code blocks, inline code, blockquotes,
   * unordered lists, bold/italic formatting, and hyperlinks.
   * @param {string} raw
   * @returns {string} Formatted, sanitized HTML output
   */
  parseMarkdown(raw) {
    if (!raw || typeof raw !== 'string') return '';

    // Step 1: Pre-sanitize raw input to neutralize malicious embedded HTML tags
    let md = this.sanitizeHTML(raw);

    // Normalize line endings
    md = md.replace(/\r\n/g, '\n');

    // Step 2: Fenced code blocks ```lang ... ```
    md = md.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre class="code-block" data-lang="${lang || 'text'}"><code>${escapedCode.trim()}</code></pre>`;
    });

    // Step 3: Inline code `code`
    md = md.replace(/`([^`]+)`/g, (_match, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code class="inline-code">${escaped}</code>`;
    });

    // Step 4: Headers
    md = md.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    md = md.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    md = md.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    md = md.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Step 5: Blockquotes
    md = md.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Step 6: Bold and Italic
    md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Step 7: Hyperlinks [text](url)
    md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
      const safeUrl = url.trim().replace(/^javascript:/i, '#');
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // Step 8: Unordered lists (- item or * item)
    md = md.replace(/^(?:[-*]) (.*$)/gim, '<li>$1</li>');
    md = md.replace(/(<li>.*<\/li>(\n<li>.*<\/li>)*)/g, '<ul class="md-list">$1</ul>');

    // Step 9: Paragraphs for remaining text blocks
    const lines = md.split('\n\n');
    const parsedBlocks = lines.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // If block starts with a block-level HTML tag, don't wrap in <p>
      if (/^<(h[1-6]|pre|ul|ol|blockquote|div|p)\b/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    });

    return parsedBlocks.filter(Boolean).join('\n');
  }
}
