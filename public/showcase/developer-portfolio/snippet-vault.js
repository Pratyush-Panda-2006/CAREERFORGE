/**
 * DeveloperPortfolioSnippetVault
 * Reusable preset code snippet library & tag-based search vault for software engineering algorithms, async primitives, and creative canvas scripts.
 */
export class DeveloperPortfolioSnippetVault {
  constructor(options = {}) {
    this.snippets = options.snippets || this.getDefaultSnippets();
    this.customSnippets = [];
  }

  getDefaultSnippets() {
    return [
      {
        id: 'debounced-throttle',
        title: 'High-Frequency Debounce & Throttle Composite',
        category: 'DOM & Events',
        tags: ['performance', 'event', 'dom', 'utility'],
        description: 'Combines leading-edge throttle with trailing-edge debounce for smooth 60fps window resize and scroll listeners.',
        code: `function createDebounceThrottle(callback, wait = 150) {
  let timeoutId = null;
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall < wait) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = now;
        callback.apply(this, args);
      }, wait);
    } else {
      lastCall = now;
      callback.apply(this, args);
    }
  };
}`
      },
      {
        id: 'deep-clone-proxy',
        title: 'Deep Clone with Reactive Proxy Observable',
        category: 'State Management',
        tags: ['javascript', 'state', 'proxy', 'reactive'],
        description: 'Deeply clones arbitrary JSON trees and wraps nested objects in observable Proxies for instant mutation traps.',
        code: `function createReactiveStore(initialState, onMutation) {
  const handler = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (value !== null && typeof value === 'object') {
        return new Proxy(value, handler);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      const prev = target[prop];
      const result = Reflect.set(target, prop, value, receiver);
      if (prev !== value && typeof onMutation === 'function') {
        onMutation(prop, value, prev);
      }
      return result;
    }
  };
  return new Proxy(structuredClone(initialState), handler);
}`
      },
      {
        id: 'lru-cache',
        title: 'O(1) LRU Memory Cache with TTL Expiry',
        category: 'Data Structures',
        tags: ['data-structure', 'cache', 'algorithms', 'memory'],
        description: 'Map-backed Doubly-Linked-List cache implementation providing constant time get/set with millisecond TTL expiration.',
        code: `class LRUCache {
  constructor(capacity = 50, defaultTtlMs = 60000) {
    this.capacity = capacity;
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return null;
    const entry = this.cache.get(key);
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }
  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }
}`
      },
      {
        id: 'async-concurrency-pool',
        title: 'Promise Concurrency Limiter Pool',
        category: 'Async Primitives',
        tags: ['async', 'promise', 'concurrency', 'flow'],
        description: 'Throttles simultaneous asynchronous operations to a fixed execution window, preventing socket and memory exhaustion.',
        code: `async function runWithConcurrency(items, fn, limit = 4) {
  const results = [];
  const executing = new Set();
  for (const [index, item] of items.entries()) {
    const p = Promise.resolve().then(() => fn(item, index));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}`
      },
      {
        id: 'canvas-matrix-rain',
        title: 'HTML5 Canvas Cyberpunk Matrix Rain Animator',
        category: 'Creative Graphics',
        tags: ['canvas', 'graphics', 'animation', 'creative'],
        description: 'Procedural green phosphor character streaming engine for terminal headers and dynamic hacker canvas backgrounds.',
        code: `function initMatrixRain(canvas, characters = '0123456789ABCDEF<>/*+-~') {
  const ctx = canvas.getContext('2d');
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = Array(columns).fill(1);
  return function renderFrame() {
    ctx.fillStyle = 'rgba(13, 17, 23, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3fb950';
    ctx.font = \`\${fontSize}px monospace\`;
    for (let i = 0; i < drops.length; i++) {
      const text = characters[Math.floor(Math.random() * characters.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  };
}`
      }
    ];
  }

  getAllSnippets() {
    return [...this.snippets, ...this.customSnippets];
  }

  getSnippetById(id) {
    return this.getAllSnippets().find((s) => s.id === id) || null;
  }

  addCustomSnippet(snippet) {
    if (!snippet.title || !snippet.code) {
      throw new Error('Title and code are required for custom snippet');
    }
    const id = snippet.id || `custom-${Date.now()}`;
    const newSnippet = {
      ...snippet,
      id,
      category: snippet.category || 'Custom Algorithm',
      tags: snippet.tags || ['custom'],
      description: snippet.description || ''
    };
    this.customSnippets.push(newSnippet);
    return newSnippet;
  }

  getAllTags() {
    const tagSet = new Set();
    this.getAllSnippets().forEach((s) => {
      s.tags.forEach((t) => tagSet.add(t.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }

  search(query = '', selectedTag = '') {
    const q = query.trim().toLowerCase();
    const tag = selectedTag.trim().toLowerCase();

    return this.getAllSnippets().filter((s) => {
      const matchesTag = !tag || s.tags.some((t) => t.toLowerCase() === tag);
      if (!matchesTag) return false;
      if (!q) return true;

      const titleMatch = s.title.toLowerCase().includes(q);
      const descMatch = s.description.toLowerCase().includes(q);
      const codeMatch = s.code.toLowerCase().includes(q);
      const categoryMatch = s.category.toLowerCase().includes(q);

      return titleMatch || descMatch || codeMatch || categoryMatch;
    });
  }

  copySnippet(id) {
    const snippet = this.getSnippetById(id);
    if (!snippet) return null;
    return snippet.code;
  }

  renderToDOM(container, onSelect) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const vaultWrapper = document.createElement('div');
    vaultWrapper.className = 'devport-vault-container';

    const header = document.createElement('div');
    header.className = 'devport-vault-header';

    const title = document.createElement('h3');
    title.textContent = 'Engineering Algorithms & Code Snippet Vault';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'devport-vault-search';
    searchInput.placeholder = 'Search LRU Cache, Concurrency, Matrix Rain, Proxy...';

    header.append(title, searchInput);
    vaultWrapper.append(header);

    const tagsRow = document.createElement('div');
    tagsRow.className = 'devport-vault-tags';

    const allTagBtn = document.createElement('button');
    allTagBtn.className = 'devport-tag-btn active';
    allTagBtn.textContent = 'All';
    let currentTag = '';

    tagsRow.append(allTagBtn);

    const tags = this.getAllTags();
    tags.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'devport-tag-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        tagsRow.querySelectorAll('.devport-tag-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = t;
        renderList();
      });
      tagsRow.append(btn);
    });

    allTagBtn.addEventListener('click', () => {
      tagsRow.querySelectorAll('.devport-tag-btn').forEach((b) => b.classList.remove('active'));
      allTagBtn.classList.add('active');
      currentTag = '';
      renderList();
    });

    vaultWrapper.append(tagsRow);

    const listContainer = document.createElement('div');
    listContainer.className = 'devport-vault-list';
    vaultWrapper.append(listContainer);

    const renderList = () => {
      listContainer.replaceChildren();
      const filtered = this.search(searchInput.value, currentTag);

      if (filtered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'devport-vault-empty';
        emptyMsg.textContent = 'No matching engineering snippets found.';
        listContainer.append(emptyMsg);
        return;
      }

      filtered.forEach((snippet) => {
        const card = document.createElement('div');
        card.className = 'devport-snippet-card';

        const top = document.createElement('div');
        top.className = 'devport-card-top';

        const cardTitle = document.createElement('h4');
        cardTitle.textContent = snippet.title;

        const catBadge = document.createElement('span');
        catBadge.className = 'devport-cat-badge';
        catBadge.textContent = snippet.category;

        top.append(cardTitle, catBadge);

        const desc = document.createElement('p');
        desc.className = 'devport-snippet-desc';
        desc.textContent = snippet.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'devport-snippet-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = snippet.code;
        codeBlock.append(codeElem);

        const actions = document.createElement('div');
        actions.className = 'devport-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'devport-copy-btn';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', () => {
          if (typeof onSelect === 'function') {
            onSelect(snippet);
          }
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Code';
          }, 1500);
        });

        actions.append(copyBtn);
        card.append(top, desc, codeBlock, actions);
        listContainer.append(card);
      });
    };

    searchInput.addEventListener('input', () => {
      renderList();
    });

    renderList();
    container.append(vaultWrapper);
  }
}
