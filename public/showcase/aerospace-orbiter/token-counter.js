// A word with its leading space, a number group, one punctuation mark, or a run of whitespace.
const PIECE = / ?\p{L}[\p{L}\p{M}']*| ?\p{N}{1,3}| ?[^\s\p{L}\p{M}\p{N}]|\s+/gu;
// Scripts written without spaces tend to cost about one token per character.
const DENSE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

export class AerospaceOrbiterTokenAnalyzer {
  // A BPE-like approximation: long words are split into chunks of about four letters.
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
        // The leading space stays attached to the first chunk.
        const end = start + size + (start === 0 ? lead : 0);
        tokens.push(chars.slice(start, end).join(''));
        start = end;
      }
    }
    return tokens;
  }

  estimateTokens(text) {
    return this.tokenize(text).length;
  }

  getWordCount(text) {
    const words = String(text).match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu);
    return words ? words.length : 0;
  }

  // Counts code points, so an emoji is one character rather than two.
  getCharacterCount(text) {
    return [...String(text)].length;
  }

  calculateByteSize(text) {
    return new TextEncoder().encode(String(text)).length;
  }

  getCharacterFrequency(text, limit = 8) {
    const counts = new Map();
    for (const char of String(text).toLowerCase()) {
      if (!/\s/.test(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit);
  }
}

if (typeof document !== 'undefined') {
  const analyzer = new AerospaceOrbiterTokenAnalyzer();
  const $ = (id) => document.getElementById(id);
  const PILL_LIMIT = 600;

  const element = (tag, text) => {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  };

  const render = () => {
    const text = $('text').value;
    const tokens = analyzer.tokenize(text);
    const budget = Number($('budget').value);
    $('tokens').textContent = tokens.length;
    $('words').textContent = analyzer.getWordCount(text);
    $('characters').textContent = analyzer.getCharacterCount(text);
    $('bytes').textContent = analyzer.calculateByteSize(text);

    const used = budget > 0 ? tokens.length / budget : 0;
    $('tokens').closest('div').dataset.level = used > 1 ? 'over' : used > 0.8 ? 'near' : 'ok';
    $('warning').textContent = used > 1 ? 'Over the token budget.' : used > 0.8 ? 'Close to the token budget.' : '';

    const pills = tokens.slice(0, PILL_LIMIT).map((token) => element('span', token.replace(/\n/g, '↵')));
    if (tokens.length > PILL_LIMIT) pills.push(element('em', `and ${tokens.length - PILL_LIMIT} more`));
    $('pills').replaceChildren(...pills);
    $('frequency').replaceChildren(
      ...analyzer.getCharacterFrequency(text).map(([char, count]) => element('li', `${char} × ${count}`)),
    );
  };

  $('text').addEventListener('input', render);
  $('budget').addEventListener('input', render);
  render();
}
