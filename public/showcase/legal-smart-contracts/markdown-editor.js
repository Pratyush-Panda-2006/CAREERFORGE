/**
 * LegalSmartContractsMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for smart legal contract specs, Ricardian clause drafts, and dispute protocols.
 */
export class LegalSmartContractsMarkdownParser {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  getDefaultDocument() {
    return `# Ricardian Legal Smart Contract Agreement

> **Jurisdiction Clause:** This cryptographic agreement is binding across compliant EVM jurisdictions.

## 1. Multi-Signature Escrow & Collateral
- Lockup principal collateral of \`100.0 ETH\` into verified escrow smart contract.
- Timelock release requires **2-of-3** quorum signatures from buyer, seller, or designated arbiter.
- Automatic slash penalty of **15%** for unfulfilled delivery proofs.

## 2. Solidity Clause Specification
\`\`\`solidity
contract RicardianEscrow {
    address public arbiter;
    uint256 public collateralLocked;
    bool public conditionsMet;
}
\`\`\`

## 3. Decentralized Dispute Arbitration
Should disputes arise, either party may invoke the decentralized arbitration DAO before block timeout \`18,500,000\`.`;
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
    editorWrapper.className = 'legal-editor-container';

    // Header
    const header = document.createElement('div');
    header.className = 'legal-editor-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'legal-editor-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Smart Contract Clause & Markdown Sandbox';

    const subtitle = document.createElement('p');
    subtitle.className = 'legal-editor-subtitle';
    subtitle.textContent = 'Draft, sanitize, and verify legal agreement specifications with real-time reading metrics.';

    titleGroup.append(title, subtitle);

    const statsBadge = document.createElement('div');
    statsBadge.className = 'legal-editor-stats-badge';

    header.append(titleGroup, statsBadge);
    editorWrapper.append(header);

    // Split-pane
    const splitPane = document.createElement('div');
    splitPane.className = 'legal-split-pane';

    const editorCol = document.createElement('div');
    editorCol.className = 'legal-pane-col';

    const editorLabel = document.createElement('div');
    editorLabel.className = 'legal-pane-label';
    editorLabel.textContent = 'Markdown Legal Source';

    const textarea = document.createElement('textarea');
    textarea.className = 'legal-editor-textarea';
    textarea.value = initialContent;
    textarea.placeholder = 'Draft legal contract markdown terms here...';

    editorCol.append(editorLabel, textarea);

    const previewCol = document.createElement('div');
    previewCol.className = 'legal-pane-col';

    const previewLabel = document.createElement('div');
    previewLabel.className = 'legal-pane-label';
    previewLabel.textContent = 'Live Clause Preview';

    const previewContent = document.createElement('div');
    previewContent.className = 'legal-preview-content';

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
