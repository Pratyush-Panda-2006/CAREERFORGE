/**
 * BiotechGenomicsTokenAnalyzer
 * Client-side BPE tokenizer and sequence byte analyzer for Biotech Genomics.
 * Accurately estimates tokens, counts words, code points, and calculates UTF-8 byte sizes.
 */

// A word with its leading space, a number group, one punctuation mark, or a run of whitespace.
const PIECE = / ?\p{L}[\p{L}\p{M}']*| ?\p{N}{1,3}| ?[^\s\p{L}\p{M}\p{N}]|\s+/gu;
// Scripts written without spaces tend to cost about one token per character.
const DENSE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

export class BiotechGenomicsTokenAnalyzer {
  /**
   * BPE-like approximation: splits input text into sub-word token chunks.
   * @param {string} text
   * @returns {Array<string>}
   */
  tokenize(text) {
    const tokens = [];
    for (const [piece] of String(text).matchAll(PIECE)) {
      if (!/\p{L}/u.test(piece)) {
        tokens.push(piece);
        continue;
      }
      const chars = [...piece];
      const lead = chars[0] === ' ' ? 1 : 0;
      const size = DENSE.test(piece) ? 1 : chars.length - lead <= 7 ? chars.length : 4;
      for (let start = 0; start < chars.length;) {
        // Leading space stays attached to the first chunk
        const end = start + size + (start === 0 ? lead : 0);
        tokens.push(chars.slice(start, end).join(''));
        start = end;
      }
    }
    return tokens;
  }

  /**
   * Estimates total token count for given text.
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
    return this.tokenize(text).length;
  }

  /**
   * Calculates total word count.
   * @param {string} text
   * @returns {number}
   */
  getWordCount(text) {
    const words = String(text).match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu);
    return words ? words.length : 0;
  }

  /**
   * Counts unicode code points.
   * @param {string} text
   * @returns {number}
   */
  getCharacterCount(text) {
    return [...String(text)].length;
  }

  /**
   * Computes UTF-8 byte size.
   * @param {string} text
   * @returns {number}
   */
  calculateByteSize(text) {
    return new TextEncoder().encode(String(text)).length;
  }

  /**
   * Calculates character frequencies excluding whitespace.
   * @param {string} text
   * @param {number} [limit=8]
   * @returns {Array<[string, number]>}
   */
  getCharacterFrequency(text, limit = 8) {
    const counts = new Map();
    for (const char of String(text).toLowerCase()) {
      if (!/\s/.test(char)) {
        counts.set(char, (counts.get(char) ?? 0) + 1);
      }
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit);
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  const initTokenizer = () => {
    const analyzer = new BiotechGenomicsTokenAnalyzer();
    const textArea = document.getElementById('text');
    const budgetInput = document.getElementById('budget');
    const tokensOutput = document.getElementById('tokens');
    const wordsOutput = document.getElementById('words');
    const charactersOutput = document.getElementById('characters');
    const bytesOutput = document.getElementById('bytes');
    const warningEl = document.getElementById('warning');
    const pillsContainer = document.getElementById('pills');
    const pillCountTag = document.getElementById('pill-count-tag');
    const frequencyList = document.getElementById('frequency');
    const tokensCard = document.getElementById('card-tokens');

    if (!textArea) return;

    const PILL_LIMIT = 600;

    const render = () => {
      const text = textArea.value;
      const tokens = analyzer.tokenize(text);
      const budget = Number(budgetInput?.value) || 200;

      if (tokensOutput) tokensOutput.textContent = tokens.length;
      if (wordsOutput) wordsOutput.textContent = analyzer.getWordCount(text);
      if (charactersOutput) charactersOutput.textContent = analyzer.getCharacterCount(text);
      if (bytesOutput) bytesOutput.textContent = analyzer.calculateByteSize(text);

      const ratio = budget > 0 ? tokens.length / budget : 0;
      let level = 'ok';
      if (ratio > 1) {
        level = 'over';
      } else if (ratio > 0.8) {
        level = 'near';
      }

      if (tokensCard) {
        tokensCard.dataset.level = level;
      }

      if (warningEl) {
        if (level === 'over') {
          warningEl.textContent = `⚠️ Over budget! Sequence uses ${tokens.length} tokens, exceeding your ${budget} token limit.`;
          warningEl.className = 'warning-banner visible over';
        } else if (level === 'near') {
          warningEl.textContent = `⚡ Approaching limit: ${tokens.length} / ${budget} tokens utilized (${Math.round(ratio * 100)}%).`;
          warningEl.className = 'warning-banner visible near';
        } else {
          warningEl.textContent = '';
          warningEl.className = 'warning-banner';
        }
      }

      if (pillCountTag) {
        pillCountTag.textContent = `${tokens.length} tokens rendered`;
      }

      if (pillsContainer) {
        pillsContainer.innerHTML = '';
        const slice = tokens.slice(0, PILL_LIMIT);
        slice.forEach((t) => {
          const span = document.createElement('span');
          span.textContent = t.replace(/\n/g, '↵');
          pillsContainer.appendChild(span);
        });

        if (tokens.length > PILL_LIMIT) {
          const em = document.createElement('em');
          em.textContent = `... and ${tokens.length - PILL_LIMIT} more tokens truncated for display performance`;
          pillsContainer.appendChild(em);
        }
      }

      if (frequencyList) {
        frequencyList.innerHTML = '';
        const freq = analyzer.getCharacterFrequency(text, 10);
        freq.forEach(([char, count]) => {
          const li = document.createElement('li');
          li.textContent = `${char} × ${count}`;
          frequencyList.appendChild(li);
        });
      }
    };

    textArea.addEventListener('input', render);
    if (budgetInput) {
      budgetInput.addEventListener('input', render);
    }

    render();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTokenizer);
  } else {
    initTokenizer();
  }
}
