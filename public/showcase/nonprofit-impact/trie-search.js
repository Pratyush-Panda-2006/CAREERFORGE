const LIMITS = Object.freeze({ words: 2000, characters: 64, treeNodes: 240 });
const hasControlCharacter = (text) => Array.from(text).some((character) => {
  const code = character.codePointAt(0);
  return code < 32 || code === 127;
});

const normalizeTerm = (value, { allowEmpty = false, label = 'Term' } = {}) => {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  const text = value.trim().normalize('NFC');
  if (!text && !allowEmpty) throw new RangeError(`${label} cannot be empty.`);
  if (Array.from(text).length > LIMITS.characters) {
    throw new RangeError(`${label} must be ${LIMITS.characters} characters or fewer.`);
  }
  if (hasControlCharacter(text)) {
    throw new RangeError(`${label} cannot contain control characters.`);
  }
  return text.toLowerCase();
};

const createNode = () => ({ children: new Map(), word: null });

const sortedChildren = (node) => [...node.children].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

const compareWords = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

export class NonprofitImpactTrieEngine {
  constructor(words = []) {
    if (!Array.isArray(words)) throw new TypeError('Initial terms must be an array.');
    this.root = createNode();
    this.keys = new Set();
    for (const word of words) this.insert(word);
  }

  get size() {
    return this.keys.size;
  }

  get nodeCount() {
    let total = 0;
    const visit = (node) => {
      total += 1;
      for (const [, child] of node.children) visit(child);
    };
    visit(this.root);
    return total;
  }

  insert(word) {
    const key = normalizeTerm(word);
    if (this.keys.has(key)) return false;
    if (this.size >= LIMITS.words) {
      throw new RangeError(`The in-memory lexicon holds up to ${LIMITS.words} terms.`);
    }
    let current = this.root;
    for (const character of key) {
      if (!current.children.has(character)) current.children.set(character, createNode());
      current = current.children.get(character);
    }
    current.word = word.trim().normalize('NFC');
    this.keys.add(key);
    return true;
  }

  has(word) {
    const key = normalizeTerm(word);
    let current = this.root;
    for (const character of key) {
      current = current.children.get(character);
      if (!current) return false;
    }
    return current.word !== null;
  }

  remove(word) {
    const key = normalizeTerm(word);
    if (!this.keys.has(key)) return false;
    const path = [];
    let current = this.root;
    for (const character of key) {
      path.push([current, character]);
      current = current.children.get(character);
    }
    current.word = null;
    this.keys.delete(key);
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const [parent, character] = path[index];
      const child = parent.children.get(character);
      if (!child || child.word !== null || child.children.size > 0) break;
      parent.children.delete(character);
    }
    return true;
  }

  locate(prefix) {
    const key = normalizeTerm(prefix, { allowEmpty: true, label: 'Prefix' });
    let current = this.root;
    for (const character of key) {
      current = current.children.get(character);
      if (!current) return null;
    }
    return current;
  }

  findWordsWithPrefix(prefix, limit = Infinity) {
    if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) {
      throw new RangeError('The result limit must be a positive integer.');
    }
    const start = this.locate(prefix);
    if (!start || limit === 0) return [];
    const words = [];
    const visit = (node) => {
      if (words.length >= limit) return;
      if (node.word !== null) words.push(node.word);
      for (const [, child] of sortedChildren(node)) {
        if (words.length >= limit) return;
        visit(child);
      }
    };
    visit(start);
    return words;
  }

  getAllWords() {
    return this.findWordsWithPrefix('');
  }

  fuzzySearch(query, maxDistance = 2) {
    if (!Number.isInteger(maxDistance) || maxDistance < 0 || maxDistance > 3) {
      throw new RangeError('Edit distance must be an integer from 0 to 3.');
    }
    const letters = Array.from(normalizeTerm(query, { allowEmpty: true, label: 'Query' }));
    const results = [];
    const firstRow = Array.from({ length: letters.length + 1 }, (_, index) => index);
    const visit = (node, character, previousRow) => {
      const row = [previousRow[0] + 1];
      for (let index = 1; index <= letters.length; index += 1) {
        const cost = letters[index - 1] === character ? 0 : 1;
        row[index] = Math.min(row[index - 1] + 1, previousRow[index] + 1, previousRow[index - 1] + cost);
      }
      const distance = row[letters.length];
      if (node.word !== null && distance <= maxDistance) results.push({ word: node.word, distance });
      if (Math.min(...row) <= maxDistance) {
        for (const [nextCharacter, child] of sortedChildren(node)) {
          visit(child, nextCharacter, row);
        }
      }
    };
    for (const [character, child] of sortedChildren(this.root)) visit(child, character, firstRow);
    return results.sort((a, b) => a.distance - b.distance || compareWords(a.word, b.word));
  }

  getTree(prefix = '') {
    const start = this.locate(prefix);
    if (!start) return null;
    let remaining = LIMITS.treeNodes;
    let truncated = false;
    const visit = (node, label) => {
      if (remaining <= 0) {
        truncated = true;
        return null;
      }
      remaining -= 1;
      const children = [];
      for (const [character, child] of sortedChildren(node)) {
        const projection = visit(child, character);
        if (projection) children.push(projection);
      }
      return { label, word: node.word, terminal: node.word !== null, children };
    };
    const key = normalizeTerm(prefix, { allowEmpty: true, label: 'Prefix' });
    const tree = visit(start, key || 'root');
    return tree ? { ...tree, truncated } : null;
  }

  clear() {
    this.root = createNode();
    this.keys.clear();
  }

  static levenshteinDistance(left, right) {
    if (typeof left !== 'string' || typeof right !== 'string') {
      throw new TypeError('Levenshtein distance requires two strings.');
    }
    const a = Array.from(left.normalize('NFC'));
    const b = Array.from(right.normalize('NFC'));
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= b.length; column += 1) {
        const cost = a[row - 1] === b[column - 1] ? 0 : 1;
        current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost);
      }
      previous = current;
    }
    return previous[b.length];
  }
}

const STARTER_TERMS = [
  'Water',
  'Forest',
  'Solar',
  'Ocean',
  'Climate',
  'Education',
  'Health',
  'Wildlife',
  'Sanitation',
  'Reforestation',
  'Mangrove',
  'Coral',
  'Biochar',
  'Agroforestry',
  'Biodiversity',
  'Clean Water Access',
  'Rainforest Restoration',
  'Mangrove Restoration',
  'Coral Reef Revival',
  'Ocean Plastic Recovery',
  'Community Solar Microgrids',
  'Girls Education Fund',
  'Wildlife Corridor',
  'Sustainable Farming',
  'Food Security',
  'Disaster Relief',
  'Medical Outreach',
  'Refugee Support',
  'Climate Policy',
  'Carbon Offset',
  'Solar Lanterns',
  'Water Sanitation',
  'Seed Bank',
  'Biochar Kilns',
  'Rainwater Harvesting',
  'Coastal Cleanup',
  'Tree Nursery',
  'Habitat Protection',
  'Renewable Energy',
  'Zero Hunger',
  'Ocean Conservation',
  'Community Health',
  'Youth Mentorship',
  'Emergency Shelter',
  'Biodiversity Survey',
  'Soil Regeneration',
  'Green Jobs',
  'Water Wells',
  'Pollinator Gardens',
  'Flood Resilience'
];

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const highlightPrefix = (word, prefix) => {
  const characters = Array.from(word);
  const matched = Array.from(prefix.toLowerCase());
  let shared = 0;
  while (shared < matched.length && shared < characters.length
    && characters[shared].toLowerCase() === matched[shared]) shared += 1;
  if (shared === 0) return escapeHtml(word);
  return `<mark>${escapeHtml(characters.slice(0, shared).join(''))}</mark>${escapeHtml(characters.slice(shared).join(''))}`;
};

export function mountTrieSearch(document) {
  const search = document.getElementById('term-search');
  if (!search) return null;

  const engine = new NonprofitImpactTrieEngine(STARTER_TERMS);
  const suggestions = document.getElementById('suggestions');
  const status = document.getElementById('search-status');
  const distanceSelect = document.getElementById('edit-distance');
  const fuzzyList = document.getElementById('fuzzy-list');
  const tree = document.getElementById('trie-tree');
  const treeCaption = document.getElementById('tree-caption');
  const lexiconList = document.getElementById('lexicon-list');
  const lexiconStatus = document.getElementById('lexicon-status');
  const addForm = document.getElementById('add-term-form');
  const newTerm = document.getElementById('new-term');
  const resetButton = document.getElementById('reset-lexicon');
  const logList = document.getElementById('event-log');
  const clearLog = document.getElementById('clear-log');
  const termCount = document.getElementById('metric-terms');
  const nodeCount = document.getElementById('metric-nodes');
  const prefixHits = document.getElementById('metric-prefix');
  const fuzzyHits = document.getElementById('metric-fuzzy');
  const lookupTime = document.getElementById('metric-time');

  const metrics = { lookups: 0, prefix: 0, fuzzy: 0, lastMs: 0 };
  let matches = [];
  let activeIndex = -1;
  let lastQuery = '';

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const log = (kind, message) => {
    if (!logList) return;
    const item = document.createElement('li');
    item.className = `log-entry log-${kind}`;
    const badge = document.createElement('span');
    badge.className = `log-badge badge-${kind}`;
    badge.textContent = kind;
    const text = document.createElement('span');
    text.className = 'log-message';
    text.textContent = message;
    const time = document.createElement('time');
    time.className = 'log-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.append(badge, text, time);
    logList.prepend(item);
    while (logList.children.length > 60) logList.lastElementChild.remove();
  };

  const updateMetrics = () => {
    if (termCount) termCount.textContent = String(engine.size);
    if (nodeCount) nodeCount.textContent = String(engine.nodeCount);
    if (prefixHits) prefixHits.textContent = String(metrics.prefix);
    if (fuzzyHits) fuzzyHits.textContent = String(metrics.fuzzy);
    if (lookupTime) lookupTime.textContent = `${metrics.lastMs.toFixed(2)} ms`;
  };

  const closeSuggestions = () => {
    if (!suggestions) return;
    suggestions.hidden = true;
    suggestions.replaceChildren();
    search.setAttribute('aria-expanded', 'false');
    search.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  };

  const setActive = (index) => {
    if (!suggestions) return;
    const options = [...suggestions.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    activeIndex = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => {
      option.setAttribute('aria-selected', String(optionIndex === activeIndex));
      option.classList.toggle('is-active', optionIndex === activeIndex);
    });
    const option = options[activeIndex];
    search.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView?.({ block: 'nearest' });
  };

  const choose = (word) => {
    search.value = word;
    closeSuggestions();
    renderTree(word);
    if (status) status.textContent = `Selected “${word}”. Prefix subtree pinned below.`;
    log('select', `Selected “${word}” from the suggestion list.`);
    search.focus();
  };

  const renderSuggestions = (results, prefix) => {
    if (!suggestions) return;
    suggestions.replaceChildren();
    if (!results.length) {
      closeSuggestions();
      return;
    }
    results.forEach((word, index) => {
      const option = document.createElement('li');
      option.id = `suggestion-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.className = 'suggestion';
      option.innerHTML = `<span class="suggestion-word">${highlightPrefix(word, prefix)}</span><span class="suggestion-hint">prefix</span>`;
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        choose(word);
      });
      suggestions.append(option);
    });
    suggestions.hidden = false;
    search.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
  };

  const renderFuzzy = (results, query, hasPrefixMatches) => {
    if (!fuzzyList) return;
    fuzzyList.replaceChildren();
    if (Array.from(query.trim()).length < 2) {
      const hint = document.createElement('span');
      hint.className = 'fuzzy-empty';
      hint.textContent = 'Type at least two characters to compute spelling neighbours.';
      fuzzyList.append(hint);
      return;
    }
    if (!results.length) {
      const empty = document.createElement('span');
      empty.className = 'fuzzy-empty';
      empty.textContent = hasPrefixMatches
        ? 'Prefix path found · spelling suggestions appear when a fragment misses the trie.'
        : 'No spelling neighbours inside the chosen edit distance.';
      fuzzyList.append(empty);
      return;
    }
    results.forEach(({ word, distance }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'fuzzy-chip';
      chip.innerHTML = `<span>${escapeHtml(word)}</span><span class="distance-badge">d=${distance}</span>`;
      chip.addEventListener('click', () => {
        search.value = word;
        log('fuzzy', `Applied spelling correction “${word}” at distance ${distance}.`);
        refresh();
        search.focus();
      });
      fuzzyList.append(chip);
    });
  };

  const renderTree = (prefix) => {
    if (!tree) return;
    tree.replaceChildren();
    const projection = engine.getTree(prefix);
    if (!projection) {
      const empty = document.createElement('p');
      empty.className = 'tree-empty';
      empty.textContent = `No stored prefix path matches “${prefix}”. Try a shorter fragment.`;
      tree.append(empty);
      if (treeCaption) treeCaption.textContent = 'Subtree unavailable';
      return;
    }
    const draw = (node, depth) => {
      const item = document.createElement('li');
      item.className = 'tree-node';
      const hasChildren = node.children.length > 0;
      const wrapper = document.createElement(hasChildren ? 'details' : 'div');
      wrapper.className = 'tree-branch';
      if (hasChildren) wrapper.open = depth < 2;
      const label = document.createElement(hasChildren ? 'summary' : 'span');
      label.className = `tree-label${node.terminal ? ' is-terminal' : ''}`;
      const glyph = document.createElement('span');
      glyph.className = 'tree-glyph';
      glyph.textContent = node.label === ' ' ? '␣' : node.label;
      label.append(glyph);
      if (node.terminal) {
        const word = document.createElement('span');
        word.className = 'tree-word';
        word.textContent = node.word;
        label.append(word);
      }
      wrapper.append(label);
      if (hasChildren) {
        const list = document.createElement('ul');
        list.className = 'tree-children';
        node.children.forEach((child) => list.append(draw(child, depth + 1)));
        wrapper.append(list);
      }
      item.append(wrapper);
      return item;
    };
    const rootList = document.createElement('ul');
    rootList.className = 'tree-root';
    rootList.append(draw(projection, 0));
    tree.append(rootList);
    if (treeCaption) {
      treeCaption.textContent = projection.truncated
        ? 'Showing the first 240 nodes of this subtree.'
        : `Live projection · ${prefix ? `prefix “${prefix}”` : 'whole lexicon'}`;
    }
  };

  const renderLexicon = () => {
    if (!lexiconList) return;
    lexiconList.replaceChildren();
    const words = engine.getAllWords();
    words.forEach((word) => {
      const item = document.createElement('li');
      item.className = 'lexicon-term';
      const label = document.createElement('span');
      label.textContent = word;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'term-remove';
      remove.setAttribute('aria-label', `Remove ${word}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        engine.remove(word);
        log('remove', `Removed “${word}” from the lexicon.`);
        if (lexiconStatus) lexiconStatus.textContent = `Removed “${word}”.`;
        renderLexicon();
        refresh();
      });
      item.append(label, remove);
      lexiconList.append(item);
    });
  };

  const refresh = () => {
    const query = search.value;
    lastQuery = query;
    const started = now();
    let prefixMatches = [];
    try {
      prefixMatches = engine.findWordsWithPrefix(query, 8);
    } catch (error) {
      if (status) status.textContent = error.message;
      closeSuggestions();
      return;
    }
    metrics.lookups += 1;
    metrics.prefix += prefixMatches.length;
    let fuzzy = [];
    const distance = Number(distanceSelect?.value ?? 2);
    if (Array.from(query.trim()).length >= 2) {
      fuzzy = engine.fuzzySearch(query, distance).slice(0, 8);
      metrics.fuzzy += fuzzy.length;
    }
    metrics.lastMs = now() - started;
    matches = prefixMatches;
    if (query.trim()) {
      renderSuggestions(prefixMatches, query.trim());
    } else {
      closeSuggestions();
    }
    renderFuzzy(fuzzy, query, prefixMatches.length > 0);
    renderTree(query);
    updateMetrics();
    if (status) {
      if (!query.trim()) {
        status.textContent = `Ready · ${engine.size} indexed terms. Start typing for instant prefix completions.`;
      } else if (prefixMatches.length) {
        status.textContent = `${prefixMatches.length} prefix completion${prefixMatches.length === 1 ? '' : 's'} for “${query.trim()}”.`;
      } else {
        status.textContent = `No prefix path for “${query.trim()}”. ${fuzzy.length} spelling suggestion${fuzzy.length === 1 ? '' : 's'} below.`;
      }
    }
  };

  search.addEventListener('input', refresh);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && matches.length) {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp' && matches.length) {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      closeSuggestions();
    }
  });
  search.addEventListener('blur', () => {
    closeSuggestions();
  });
  search.addEventListener('focus', () => {
    if (search.value !== lastQuery) {
      refresh();
    } else if (matches.length && search.value.trim()) {
      renderSuggestions(matches, search.value.trim());
    }
  });

  distanceSelect?.addEventListener('change', () => {
    log('config', `Fuzzy distance set to ${distanceSelect.value}.`);
    refresh();
  });

  addForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = newTerm?.value ?? '';
    try {
      const added = engine.insert(value);
      if (lexiconStatus) {
        lexiconStatus.textContent = added ? `Indexed “${value.trim()}”.` : `“${value.trim()}” already exists.`;
      }
      log(added ? 'insert' : 'duplicate', added
        ? `Indexed “${value.trim()}” across ${Array.from(value.trim()).length} trie edges.`
        : `Skipped duplicate “${value.trim()}”.`);
      if (added && newTerm) newTerm.value = '';
      renderLexicon();
      refresh();
    } catch (error) {
      if (lexiconStatus) lexiconStatus.textContent = error.message;
    }
  });

  resetButton?.addEventListener('click', () => {
    engine.clear();
    for (const word of STARTER_TERMS) engine.insert(word);
    if (lexiconStatus) lexiconStatus.textContent = 'Starter lexicon restored.';
    log('reset', `Restored ${engine.size} starter terms.`);
    renderLexicon();
    refresh();
  });

  clearLog?.addEventListener('click', () => {
    logList?.replaceChildren();
  });

  renderLexicon();
  updateMetrics();
  refresh();
  log('ready', `Trie booted with ${engine.size} terms and ${engine.nodeCount} nodes.`);
  return { engine, refresh, metrics, get lastQuery() { return lastQuery; } };
}

if (typeof document !== 'undefined') mountTrieSearch(document);
