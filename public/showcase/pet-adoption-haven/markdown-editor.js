/**
 * PetAdoptionHavenMarkdownParser
 * Split-pane markdown documentation & live preview sandbox for animal rescue profiles, foster home agreements, and post-adoption care logs.
 */
export class PetAdoptionHavenMarkdownParser {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 200;
  }

  getDefaultDocument() {
    return `# Foster Pet Onboarding & Daily Care Protocol

> **Notice:** Always keep rescue dogs leashed during the initial 2-week decompression phase.

## 1. Arrival & Decompression Routine
- Prepare a quiet, enclosed sanctuary space with fresh water and a cozy bed.
- Feed high-protein nutrition twice daily at **8:00 AM** and **6:00 PM**.
- Administer heartworm prevention medication dosage of \`1 chewable tablet\`.

## 2. Emergency Veterinarian Contact
\`\`\`
Haven 24/7 Dispatch: +1 (800) 555-PETS
Clinic Address: 42 Animal Rescue Way, Suite 100
\`\`\`

## 3. Socialization Milestones
Allow the pet to initiate contact voluntarily. Observe tail wagging, ear posture, and appetite before introducing other household pets.`;
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
    editorWrapper.className = 'pet-editor-container';

    // Header
    const header = document.createElement('div');
    header.className = 'pet-editor-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'pet-editor-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Pet Care Protocol & Markdown Sandbox';

    const subtitle = document.createElement('p');
    subtitle.className = 'pet-editor-subtitle';
    subtitle.textContent = 'Draft and review foster care guides, behavioral protocols, and animal adoption contracts.';

    titleGroup.append(title, subtitle);

    const statsBadge = document.createElement('div');
    statsBadge.className = 'pet-editor-stats-badge';

    header.append(titleGroup, statsBadge);
    editorWrapper.append(header);

    // Split-pane
    const splitPane = document.createElement('div');
    splitPane.className = 'pet-split-pane';

    const editorCol = document.createElement('div');
    editorCol.className = 'pet-pane-col';

    const editorLabel = document.createElement('div');
    editorLabel.className = 'pet-pane-label';
    editorLabel.textContent = 'Markdown Source';

    const textarea = document.createElement('textarea');
    textarea.className = 'pet-editor-textarea';
    textarea.value = initialContent;
    textarea.placeholder = 'Type pet care instructions in markdown...';

    editorCol.append(editorLabel, textarea);

    const previewCol = document.createElement('div');
    previewCol.className = 'pet-pane-col';

    const previewLabel = document.createElement('div');
    previewLabel.className = 'pet-pane-label';
    previewLabel.textContent = 'Live HTML Care Preview';

    const previewContent = document.createElement('div');
    previewContent.className = 'pet-preview-content';

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
