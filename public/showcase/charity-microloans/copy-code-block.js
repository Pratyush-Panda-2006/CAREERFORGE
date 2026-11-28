const TOKEN = /(\/\/.*$)|\b(const|let|function|return|if)\b|\b(\d+(?:\.\d+)?)\b/g;

export class CharityMicroloansCodeBlockWidget {
  constructor({ clipboard = globalThis.navigator?.clipboard, onFeedback = () => {}, feedbackMs = 2000 } = {}) {
    this.clipboard = clipboard;
    this.onFeedback = onFeedback;
    this.feedbackMs = feedbackMs;
    this.timer = null;
  }

  // Copies the code itself, never the line numbers.
  async copySnippet(codeText) {
    try {
      await this.clipboard.writeText(codeText);
    } catch {
      this.triggerCopyFeedback(false);
      return false;
    }
    this.triggerCopyFeedback(true);
    return true;
  }

  formatLineNumbers(text) {
    // A final newline ends the last line; it does not start a new one.
    return String(text).replace(/\r?\n$/, '').split(/\r?\n/).map((line, index) => ({ number: index + 1, text: line }));
  }

  // Splits a line into plain and highlighted parts. Strings are not parsed.
  tokenize(line) {
    const parts = [];
    let end = 0;
    for (const match of line.matchAll(TOKEN)) {
      if (match.index > end) parts.push({ text: line.slice(end, match.index) });
      parts.push({ text: match[0], kind: match[1] ? 'comment' : match[2] ? 'keyword' : 'number' });
      end = match.index + match[0].length;
    }
    if (end < line.length) parts.push({ text: line.slice(end) });
    return parts;
  }

  triggerCopyFeedback(ok = true) {
    clearTimeout(this.timer);
    this.onFeedback(ok ? 'Copied' : 'Copy failed. Select the code and copy it by hand.');
    this.timer = setTimeout(() => this.onFeedback(''), this.feedbackMs);
  }
}

if (typeof document !== 'undefined') {
  const SNIPPET = `// Equal monthly instalment, interest rate given per year
function monthlyPayment(principal, yearlyRate, months) {
  const rate = yearlyRate / 12;
  if (rate === 0) return principal / months;
  return (principal * rate) / (1 - (1 + rate) ** -months);
}

const payment = monthlyPayment(500, 0.08, 12);
`;
  const feedback = document.getElementById('feedback');
  const widget = new CharityMicroloansCodeBlockWidget({
    onFeedback: (message) => {
      if (message) feedback.textContent = message;
      feedback.classList.toggle('show', Boolean(message));
    },
  });

  document.getElementById('code').replaceChildren(...widget.formatLineNumbers(SNIPPET).map(({ text }) => {
    const line = document.createElement('li');
    line.append(...widget.tokenize(text).map((part) => {
      const span = document.createElement('span');
      span.textContent = part.text;
      if (part.kind) span.className = part.kind;
      return span;
    }));
    return line;
  }));
  document.getElementById('copy').addEventListener('click', () => widget.copySnippet(SNIPPET));
}
