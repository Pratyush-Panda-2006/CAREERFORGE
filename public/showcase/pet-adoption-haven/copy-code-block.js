/**
 * PetAdoptionHavenCodeBlockWidget
 * Reusable syntax-highlighted code display with line numbers
 * and one-click clipboard copying.
 */

export class PetAdoptionHavenCodeBlockWidget {
  constructor(options = {}) {
    this.language = (options.language || "javascript").toLowerCase();
    this.copyLabel = options.copyLabel || "Copy";
    this.copiedLabel = options.copiedLabel || "Copied!";
    this.feedbackDuration = options.feedbackDuration || 2000;
    this.feedbackTimer = null;
    this.copyButton = null;
    this.copyStatus = null;
  }

  /**
   * Escapes HTML to prevent injected markup from being rendered.
   */
  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });
  }

  /**
   * Returns line numbers for the supplied code.
   */
  formatLineNumbers(text) {
    if (typeof text !== "string" || text.length === 0) {
      return "1";
    }

    return text
      .split("\n")
      .map((_, index) => index + 1)
      .join("\n");
  }

  /**
   * Lightweight syntax highlighting without external dependencies.
   */
  highlightCode(codeText, language = this.language) {
    const escaped = this.escapeHTML(codeText);
    const lang = language.toLowerCase();

    if (lang === "html" || lang === "xml") {
      return escaped.replace(
        /(&lt;\/?)([\w-]+)([\s\S]*?)(\/?&gt;)/g,
        '<span class="token-punctuation">$1</span>' +
          '<span class="token-tag">$2</span>' +
          '<span class="token-attribute">$3</span>' +
          '<span class="token-punctuation">$4</span>',
      );
    }

    const patterns = {
      javascript:
        /\b(?:const|let|var|function|return|if|else|for|while|class|new|this|async|await|import|export|from|default|try|catch|throw|typeof|instanceof|of|in)\b|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b(?:true|false|null|undefined)\b/g,
      css: /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%)?\b|[.#]?[a-zA-Z_-][\w-]*(?=\s*\{)/g,
      python:
        /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|pass|break|continue|lambda|in|is|and|or|not|async|await)\b|\b(?:True|False|None)\b|\b\d+(?:\.\d+)?\b/g,
      json: /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g,
    };

    const pattern = patterns[lang];

    if (!pattern) {
      return escaped;
    }

    const keywords = {
      javascript:
        /^(?:const|let|var|function|return|if|else|for|while|class|new|this|async|await|import|export|from|default|try|catch|throw|typeof|instanceof|of|in)$/,
      python:
        /^(?:def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|pass|break|continue|lambda|in|is|and|or|not|async|await)$/,
      json: /^$/,
    };

    return escaped.replace(pattern, (match, offset) => {
      let tokenClass = "token-number";

      if (
        match.startsWith("//") ||
        match.startsWith("/*") ||
        (lang === "python" && match.startsWith("#"))
      ) {
        tokenClass = "token-comment";
      } else if (/^["'`]/.test(match)) {
        const isJsonProperty =
          lang === "json" && /^\s*:/.test(escaped.slice(offset + match.length));

        tokenClass = isJsonProperty ? "token-property" : "token-string";
      } else if (/^(true|false|null|undefined|True|False|None)$/.test(match)) {
        tokenClass = "token-literal";
      } else if (keywords[lang]?.test(match)) {
        tokenClass = "token-keyword";
      }

      return `<span class="${tokenClass}">${match}</span>`;
    });
  }

  /**
   * Copies code without including line numbers.
   */
  async copySnippet(codeText) {
    if (typeof codeText !== "string" || !codeText.length) {
      return false;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        this.fallbackCopy(codeText);
      }

      this.triggerCopyFeedback();
      return true;
    } catch (error) {
      console.error("Unable to copy code snippet:", error);
      return false;
    }
  }

  /**
   * Fallback for browsers without Clipboard API access.
   */
  fallbackCopy(codeText) {
    if (typeof document === "undefined") {
      throw new Error("Clipboard API is unavailable");
    }

    const textarea = document.createElement("textarea");
    textarea.value = codeText;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    try {
      textarea.select();

      const successful = document.execCommand("copy");

      if (!successful) {
        throw new Error("Fallback clipboard copy failed");
      }
    } finally {
      textarea.remove();
    }
  }

  /**
   * Displays temporary success feedback.
   */
  triggerCopyFeedback() {
    if (this.copyButton) {
      this.copyButton.textContent = this.copiedLabel;
      this.copyButton.classList.add("is-copied");
      this.copyButton.setAttribute("aria-label", "Code copied");
    }

    if (this.copyStatus) {
      this.copyStatus.textContent = "Code copied to clipboard!";
    }

    clearTimeout(this.feedbackTimer);

    this.feedbackTimer = setTimeout(() => {
      if (this.copyButton) {
        this.copyButton.textContent = this.copyLabel;
        this.copyButton.classList.remove("is-copied");
        this.copyButton.setAttribute("aria-label", this.copyLabel);
      }

      if (this.copyStatus) {
        this.copyStatus.textContent = "";
      }
    }, this.feedbackDuration);
  }

  /**
   * Renders the complete widget into a DOM container.
   */
  renderToDOM(container, codeText, language = this.language) {
    if (!container || typeof document === "undefined") {
      throw new Error("A valid DOM container is required");
    }

    if (typeof codeText !== "string") {
      throw new TypeError("Code content must be a string");
    }

    this.language = language.toLowerCase();
    this.feedbackTimer && clearTimeout(this.feedbackTimer);

    const widget = document.createElement("section");
    widget.className = "code-widget";

    const header = document.createElement("header");
    header.className = "code-widget-header";

    const badge = document.createElement("span");
    badge.className = "code-language-badge";
    badge.textContent = this.language.toUpperCase();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-button";
    button.textContent = this.copyLabel;
    button.setAttribute("aria-label", this.copyLabel);

    const status = document.createElement("span");
    status.className = "code-copy-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    header.append(badge, button, status);

    const body = document.createElement("div");
    body.className = "code-widget-body";

    const lineNumbers = document.createElement("pre");
    lineNumbers.className = "code-line-numbers";
    lineNumbers.setAttribute("aria-hidden", "true");
    lineNumbers.textContent = this.formatLineNumbers(codeText);

    const pre = document.createElement("pre");
    pre.className = "code-content";

    const code = document.createElement("code");
    code.className = `language-${this.language}`;
    code.innerHTML = this.highlightCode(codeText, this.language);

    pre.appendChild(code);
    body.append(lineNumbers, pre);
    widget.append(header, body);

    container.replaceChildren(widget);

    this.copyButton = button;
    this.copyStatus = status;

    button.addEventListener("click", () => {
      this.copySnippet(codeText);
    });

    return widget;
  }
}
