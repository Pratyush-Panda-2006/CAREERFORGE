const LIMITS = { words: 1000, characters: 64, treeNodes: 120 };
const normalized = (value) => {
  if (typeof value !== 'string') throw new TypeError('Enter text, not another data type.');
  const text = value.trim().normalize('NFC');
  const characters = Array.from(text);
  if (characters.length > LIMITS.characters || characters.some(character => {
    const code = character.codePointAt(0);
    return code < 32 || code === 127;
  })) {
    throw new RangeError('Use at most 64 characters without control characters.');
  }
  return text.toLowerCase();
};
const children = (node) => [...node.children].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
const node = () => ({ children: new Map(), word: null });

export class NeurotechInterfaceTrieEngine {
  constructor(words = []) {
    if (!Array.isArray(words)) throw new TypeError('Initial terms must be an array.');
    this.root = node();
    this.keys = new Set();
    for (const word of words) this.insert(word);
  }
  get size() { return this.keys.size; }
  insert(word) {
    const key = normalized(word);
    if (!key) throw new RangeError('A term cannot be empty.');
    if (this.keys.has(key)) return false;
    if (this.size >= LIMITS.words) throw new RangeError('The local lexicon holds up to 1,000 terms.');
    let current = this.root;
    for (const character of key) {
      if (!current.children.has(character)) current.children.set(character, node());
      current = current.children.get(character);
    }
    current.word = word.trim().normalize('NFC');
    this.keys.add(key);
    return true;
  }
  locate(prefix) {
    let current = this.root;
    for (const character of normalized(prefix)) {
      current = current.children.get(character);
      if (!current) return null;
    }
    return current;
  }
  findWordsWithPrefix(prefix) {
    const start = this.locate(prefix);
    const words = [];
    const visit = (current) => {
      if (current.word !== null) words.push(current.word);
      for (const [, child] of children(current)) visit(child);
    };
    if (start) visit(start);
    return words;
  }
  fuzzySearch(query, maxDistance = 2) {
    const letters = Array.from(normalized(query));
    if (!Number.isInteger(maxDistance) || maxDistance < 0 || maxDistance > 3) {
      throw new RangeError('Edit distance must be an integer from 0 to 3.');
    }
    const results = [];
    const visit = (current, character, previous) => {
      const row = [previous[0] + 1];
      for (let i = 1; i <= letters.length; i++) {
        row[i] = Math.min(row[i - 1] + 1, previous[i] + 1,
          previous[i - 1] + (letters[i - 1] === character ? 0 : 1));
      }
      if (current.word !== null && row[letters.length] <= maxDistance) {
        results.push({ word: current.word, distance: row[letters.length] });
      }
      if (Math.min(...row) <= maxDistance) {
        for (const [nextChar, child] of children(current)) {
          visit(child, nextChar, row);
        }
      }
    };
    const initialRow = Array.from({ length: letters.length + 1 }, (_, i) => i);
    if (this.root.word !== null && initialRow[letters.length] <= maxDistance) {
      results.push({ word: this.root.word, distance: initialRow[letters.length] });
    }
    for (const [char, child] of children(this.root)) {
      visit(child, char, initialRow);
    }
    results.sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word));
    return results;
  }
}

function mount() {
  const input = document.getElementById('typeahead-input'); if (!input) return;
  const initial = ['Synapse', 'Cortex', 'Neural', 'Neuron', 'Dendrite', 'Axon', 'Glial', 'Receptor', 'Spike', 'Plasticity'];
  const trie = new NeurotechInterfaceTrieEngine(initial);
  const get = id => document.getElementById(id);

  function search() {
    const val = input.value;
    const prefixMatches = trie.findWordsWithPrefix(val);
    const fuzzyMatches = trie.fuzzySearch(val, 2);

    get('prefix-list').replaceChildren(...prefixMatches.map(w => {
      const li = document.createElement('li');
      li.textContent = w;
      return li;
    }));

    get('fuzzy-list').replaceChildren(...fuzzyMatches.map(m => {
      const li = document.createElement('li');
      li.textContent = `${m.word} (edit distance: ${m.distance})`;
      return li;
    }));
  }

  input.addEventListener('input', search);
  get('add-form').addEventListener('submit', e => {
    e.preventDefault();
    const w = get('new-word').value;
    if (trie.insert(w)) {
      get('status').textContent = `Inserted: ${w}`;
      get('new-word').value = '';
      search();
    } else {
      get('status').textContent = `Word already exists.`;
    }
  });
  search();
}
if (typeof document !== 'undefined') mount();
