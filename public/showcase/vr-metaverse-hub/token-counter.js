export class VrMetaverseHubTokenAnalyzer {
  calculateByteSize(text) {
    if (typeof text !== 'string') throw new TypeError('Text must be a string');
    return new TextEncoder().encode(text).length;
  }

  getWordCount(text) {
    if (typeof text !== 'string') throw new TypeError('Text must be a string');
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  estimateTokens(text) {
    if (typeof text !== 'string') throw new TypeError('Text must be a string');
    if (!text) return { count: 0, tokens: [] };

    const matches = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]|\s+/gu) || [];
    const tokens = [];

    for (const match of matches) {
      if (/^\s+$/.test(match)) {
        tokens.push(match);
      } else if (match.length > 4 && /^[\p{L}\p{N}]+$/u.test(match)) {
        for (let i = 0; i < match.length; i += 4) {
          tokens.push(match.slice(i, i + 4));
        }
      } else {
        tokens.push(match);
      }
    }

    return {
      count: tokens.length,
      tokens
    };
  }

  getCharacterFrequency(text) {
    if (typeof text !== 'string') throw new TypeError('Text must be a string');
    const freq = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    return freq;
  }
}

function mount() {
  const root = document.querySelector('[data-token-lab]');
  if (!root) return;

  const analyzer = new VrMetaverseHubTokenAnalyzer();
  const input = root.querySelector('#token-input');
  const tokenCountEl = root.querySelector('#count-tokens');
  const wordCountEl = root.querySelector('#count-words');
  const charCountEl = root.querySelector('#count-chars');
  const byteSizeEl = root.querySelector('#count-bytes');
  const pillsContainer = root.querySelector('#token-pills');

  function update() {
    const text = input.value;
    const { count, tokens } = analyzer.estimateTokens(text);
    const words = analyzer.getWordCount(text);
    const bytes = analyzer.calculateByteSize(text);

    tokenCountEl.textContent = count;
    wordCountEl.textContent = words;
    charCountEl.textContent = text.length;
    byteSizeEl.textContent = bytes;

    pillsContainer.innerHTML = '';
    const colors = ['token-c1', 'token-c2', 'token-c3', 'token-c4'];
    tokens.slice(0, 80).forEach((t, i) => {
      const span = document.createElement('span');
      span.className = `token-pill ${colors[i % colors.length]}`;
      span.textContent = t.replace(/\s/g, '␣');
      pillsContainer.appendChild(span);
    });

    if (tokens.length > 80) {
      const more = document.createElement('span');
      more.className = 'token-pill token-c1';
      more.textContent = `+${tokens.length - 80} more`;
      pillsContainer.appendChild(more);
    }
  }

  input.addEventListener('input', update);
  update();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
