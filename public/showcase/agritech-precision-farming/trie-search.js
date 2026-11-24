class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.word = null;
  }
}

export class AgritechPrecisionFarmingTrieEngine {
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
      const distance = AgritechPrecisionFarmingTrieEngine.levenshteinDistance(normalized, word);
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

  const engine = new AgritechPrecisionFarmingTrieEngine();
  const get = id => root.querySelector(`#${id}`);

  // Seed with agritech precision crop vocabulary
  const seedWords = [
    'agriculture', 'agronomy', 'irrigation', 'hydroponics', 'aeroponics',
    'soil', 'sensor', 'solenoid', 'satellite', 'spectrometry',
    'nitrogen', 'phosphorus', 'potassium', 'fertilizer', 'photosynthesis',
    'drone', 'drip', 'drainage', 'yield', 'harvest', 'herbicide'
  ];
  seedWords.forEach(w => engine.insert(w));

  function renderTree(prefix) {
    const treeContainer = get('tree-viewer');
    if (!treeContainer) return;

    treeContainer.replaceChildren();
    const words = prefix ? engine.findWordsWithPrefix(prefix) : engine.getAllWords();

    if (words.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-tree-text';
      empty.textContent = `No Trie branches found for prefix "${prefix}"`;
      treeContainer.appendChild(empty);
      return;
    }

    words.slice(0, 12).forEach(w => {
      const row = document.createElement('div');
      row.className = 'tree-row';

      const pathSpan = document.createElement('span');
      pathSpan.className = 'tree-path';

      if (prefix && w.startsWith(prefix.toLowerCase())) {
        const match = w.slice(0, prefix.length);
        const rest = w.slice(prefix.length);
        pathSpan.innerHTML = `<span class="matched-prefix">${match}</span><span class="unmatched-rest">${rest}</span>`;
      } else {
        pathSpan.textContent = w;
      }

      row.appendChild(pathSpan);
      treeContainer.appendChild(row);
    });
  }

  function handleSearch() {
    const query = get('search-input')?.value.trim() || '';
    const suggestionsList = get('suggestions-list');
    const fuzzyList = get('fuzzy-list');

    if (!query) {
      if (suggestionsList) suggestionsList.replaceChildren();
      if (fuzzyList) fuzzyList.replaceChildren();
      renderTree('');
      return;
    }

    // Exact Prefix Autocomplete
    const prefixMatches = engine.findWordsWithPrefix(query);
    if (suggestionsList) {
      suggestionsList.replaceChildren();
      if (prefixMatches.length === 0) {
        const noMatch = document.createElement('li');
        noMatch.className = 'no-match-item';
        noMatch.textContent = 'No prefix matches found';
        suggestionsList.appendChild(noMatch);
      } else {
        prefixMatches.slice(0, 8).forEach(w => {
          const li = document.createElement('li');
          li.className = 'suggest-item';
          const matchPart = w.slice(0, query.length);
          const restPart = w.slice(query.length);
          li.innerHTML = `<strong>${matchPart}</strong>${restPart}`;
          li.addEventListener('click', () => {
            get('search-input').value = w;
            handleSearch();
          });
          suggestionsList.appendChild(li);
        });
      }
    }

    // Levenshtein Spell Suggestions
    const fuzzyMatches = engine.fuzzySearch(query, 2);
    if (fuzzyList) {
      fuzzyList.replaceChildren();
      if (fuzzyMatches.length === 0) {
        const noFuzzy = document.createElement('div');
        noFuzzy.className = 'empty-fuzzy-text';
        noFuzzy.textContent = 'No fuzzy matches within distance &le; 2';
        fuzzyList.appendChild(noFuzzy);
      } else {
        fuzzyMatches.slice(0, 6).forEach(item => {
          const chip = document.createElement('span');
          chip.className = 'fuzzy-chip';
          chip.textContent = `${item.word} (dist: ${item.distance})`;
          chip.addEventListener('click', () => {
            get('search-input').value = item.word;
            handleSearch();
          });
          fuzzyList.appendChild(chip);
        });
      }
    }

    renderTree(query);
  }

  get('search-input')?.addEventListener('input', handleSearch);

  get('add-word-btn')?.addEventListener('click', () => {
    const newWord = get('new-word-input')?.value.trim();
    if (newWord) {
      engine.insert(newWord);
      get('new-word-input').value = '';
      handleSearch();
    }
  });

  renderTree('');
}

if (typeof document !== 'undefined') mount();
