class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.word = null;
  }
}

export class PetAdoptionHavenTrieEngine {
  constructor() {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  insert(word) {
    if (typeof word !== 'string' || word.trim().length === 0) {
      return false;
    }
    const normalized = word.trim().toLowerCase();
    let current = this.root;

    for (const char of normalized) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char);
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      current.word = normalized;
      this.wordCount++;
      return true;
    }
    return false;
  }

  findWordsWithPrefix(prefix) {
    if (typeof prefix !== 'string') {
      throw new TypeError('Prefix must be a string');
    }
    const normalized = prefix.trim().toLowerCase();
    let current = this.root;

    for (const char of normalized) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char);
    }

    const results = [];
    const dfs = (node) => {
      if (node.isEndOfWord && node.word) {
        results.push(node.word);
      }
      for (const child of node.children.values()) {
        dfs(child);
      }
    };

    dfs(current);
    return results.sort();
  }

  static levenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],    // deletion
            dp[i][j - 1],    // insertion
            dp[i - 1][j - 1] // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  fuzzySearch(query, maxDistance = 2) {
    if (typeof query !== 'string') {
      throw new TypeError('Query must be a string');
    }
    const normalized = query.trim().toLowerCase();
    const allWords = this.findWordsWithPrefix('');
    const matches = [];

    for (const word of allWords) {
      const distance = PetAdoptionHavenTrieEngine.levenshteinDistance(normalized, word);
      if (distance <= maxDistance) {
        matches.push({ word, distance });
      }
    }

    return matches.sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word));
  }

  getAllWords() {
    return this.findWordsWithPrefix('');
  }
}

function mount() {
  const root = document.querySelector('[data-trie-lab]');
  if (!root) return;

  const engine = new PetAdoptionHavenTrieEngine();
  const get = id => root.querySelector(`#${id}`);

  // Seed sample pet breeds & traits
  const initialBreeds = [
    'golden retriever',
    'german shepherd',
    'beagle',
    'bulldog',
    'poodle',
    'persian cat',
    'siamese cat',
    'maine coon',
    'ragdoll',
    'cockatiel',
    'playful',
    'calm and gentle',
    'friendly with kids',
    'house trained'
  ];
  for (const b of initialBreeds) engine.insert(b);

  function renderTree(prefix = '') {
    const container = get('tree-viewer');
    if (!container) return;

    const words = engine.findWordsWithPrefix(prefix);
    if (words.length === 0) {
      container.textContent = `(No Trie subtree paths matching prefix "${prefix}")`;
      return;
    }

    const lines = [];
    lines.push(`Root Trie ["${prefix || '*'}"] (${words.length} matching entries):`);
    for (const w of words.slice(0, 15)) {
      lines.push(`  └── ${w}`);
    }
    if (words.length > 15) {
      lines.push(`  ... and ${words.length - 15} more entries`);
    }
    container.textContent = lines.join('\n');
  }

  function handleSearch() {
    const input = get('search-input');
    const val = input?.value.trim().toLowerCase() || '';

    const dropdown = get('suggestions-list');
    if (dropdown) {
      dropdown.replaceChildren();
      if (val) {
        const matches = engine.findWordsWithPrefix(val);
        for (const m of matches) {
          const li = document.createElement('li');
          li.textContent = m;
          li.addEventListener('click', () => {
            input.value = m;
            dropdown.replaceChildren();
            renderTree(m);
          });
          dropdown.appendChild(li);
        }
      }
    }

    const fuzzyContainer = get('fuzzy-list');
    if (fuzzyContainer) {
      fuzzyContainer.replaceChildren();
      if (val.length >= 2) {
        const fuzzy = engine.fuzzySearch(val, 2);
        if (fuzzy.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'empty-fuzzy-text';
          empty.textContent = 'No close spell corrections found.';
          fuzzyContainer.appendChild(empty);
        } else {
          for (const item of fuzzy.slice(0, 6)) {
            const chip = document.createElement('div');
            chip.className = 'fuzzy-chip';
            chip.textContent = item.word;

            const badge = document.createElement('span');
            badge.className = 'dist-badge';
            badge.textContent = `d=${item.distance}`;
            chip.appendChild(badge);

            chip.addEventListener('click', () => {
              input.value = item.word;
              handleSearch();
            });
            fuzzyContainer.appendChild(chip);
          }
        }
      } else {
        const empty = document.createElement('span');
        empty.className = 'empty-fuzzy-text';
        empty.textContent = 'Start typing above to see spelling suggestions.';
        fuzzyContainer.appendChild(empty);
      }
    }

    renderTree(val);
  }

  get('search-input')?.addEventListener('input', handleSearch);

  get('add-word-btn')?.addEventListener('click', () => {
    const input = get('new-word-input');
    const val = input?.value.trim();
    if (val) {
      const added = engine.insert(val);
      if (added) {
        input.value = '';
        handleSearch();
      }
    }
  });

  renderTree('');
}

if (typeof document !== 'undefined') mount();
