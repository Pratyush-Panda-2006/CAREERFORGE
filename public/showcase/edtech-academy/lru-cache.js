class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class EdtechAcademyLruCache {
  constructor(capacity = 4) {
    if (typeof capacity !== 'number' || capacity <= 0) {
      throw new RangeError('Capacity must be a positive integer greater than 0');
    }
    this.capacity = capacity;
    this.map = new Map();
    this.evictedEntries = [];

    // Sentinel head & tail nodes
    this.head = new Node('__HEAD__', null);
    this.tail = new Node('__TAIL__', null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  #remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  #insertAtHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  #moveToHead(node) {
    this.#remove(node);
    this.#insertAtHead(node);
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return null;
    this.#moveToHead(node);
    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this.#moveToHead(node);
      return;
    }

    if (this.map.size >= this.capacity) {
      const lruNode = this.tail.prev;
      this.#remove(lruNode);
      this.map.delete(lruNode.key);
      this.evictedEntries.push({
        key: lruNode.key,
        value: lruNode.value,
        timestamp: Date.now()
      });
    }

    const newNode = new Node(key, value);
    this.#insertAtHead(newNode);
    this.map.set(key, newNode);
  }

  getEvictedEntries() {
    return [...this.evictedEntries];
  }

  getOrderedEntries() {
    const entries = [];
    let curr = this.head.next;
    while (curr !== this.tail) {
      entries.push({ key: curr.key, value: curr.value });
      curr = curr.next;
    }
    return entries;
  }

  clear() {
    this.map.clear();
    this.evictedEntries = [];
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
}

function mount() {
  const root = document.querySelector('[data-lru-cache-lab]');
  if (!root) return;

  let cache = new EdtechAcademyLruCache(4);
  const get = id => root.querySelector(`#${id}`);

  function render() {
    const entries = cache.getOrderedEntries();
    const capacity = cache.capacity;
    const occupancyPct = Math.round((entries.length / capacity) * 100);

    const fillBar = get('occupancy-bar');
    if (fillBar) fillBar.style.width = `${occupancyPct}%`;

    const countText = get('occupancy-text');
    if (countText) countText.textContent = `${entries.length} / ${capacity} classroom modules cached (${occupancyPct}%)`;

    // Render node chain
    const chainContainer = get('node-chain');
    if (chainContainer) {
      chainContainer.replaceChildren();
      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-chain-text';
        empty.textContent = '(Classroom cache is currently empty)';
        chainContainer.appendChild(empty);
      } else {
        entries.forEach((entry, idx) => {
          const card = document.createElement('div');
          card.className = 'cache-node';

          const badge = document.createElement('span');
          badge.className = 'node-badge';
          if (idx === 0) {
            badge.classList.add('badge-mru');
            badge.textContent = 'MRU (Head)';
          } else if (idx === entries.length - 1) {
            badge.classList.add('badge-lru');
            badge.textContent = 'LRU (Tail)';
          } else {
            badge.textContent = `Pos ${idx + 1}`;
          }

          const keySpan = document.createElement('strong');
          keySpan.className = 'node-key';
          keySpan.textContent = String(entry.key);

          const valSpan = document.createElement('span');
          valSpan.className = 'node-val';
          valSpan.textContent = String(entry.value);

          card.append(badge, keySpan, valSpan);
          chainContainer.appendChild(card);
        });
      }
    }

    // Render evicted log
    const evictContainer = get('eviction-log');
    if (evictContainer) {
      evictContainer.replaceChildren();
      const evicted = cache.getEvictedEntries();
      if (evicted.length === 0) {
        const none = document.createElement('div');
        none.className = 'no-evictions-text';
        none.textContent = 'No modules have been evicted yet.';
        evictContainer.appendChild(none);
      } else {
        evicted.slice(-6).reverse().forEach(entry => {
          const item = document.createElement('div');
          item.className = 'evicted-item';
          const time = new Date(entry.timestamp).toLocaleTimeString();
          item.textContent = `[${time}] Evicted Module: ${entry.key} → "${entry.value}"`;
          evictContainer.appendChild(item);
        });
      }
    }
  }

  get('capacity-slider')?.addEventListener('input', (e) => {
    const newCap = parseInt(e.target.value, 10);
    const oldEntries = cache.getOrderedEntries();
    cache = new EdtechAcademyLruCache(newCap);
    oldEntries.slice(0, newCap).reverse().forEach(entry => cache.put(entry.key, entry.value));
    const capVal = get('capacity-val');
    if (capVal) capVal.textContent = newCap;
    render();
  });

  get('insert-btn')?.addEventListener('click', () => {
    const key = get('key-input')?.value.trim();
    const val = get('val-input')?.value.trim();
    if (!key) return;
    cache.put(key, val || 'Active Lesson Material');
    if (get('key-input')) get('key-input').value = '';
    if (get('val-input')) get('val-input').value = '';
    render();
  });

  get('lookup-btn')?.addEventListener('click', () => {
    const key = get('key-input')?.value.trim();
    const res = get('lookup-result');
    if (!key || !res) return;
    const value = cache.get(key);
    if (value !== null) {
      res.textContent = `Found in cache: "${value}" (Promoted to MRU)`;
      res.className = 'lookup-output hit';
    } else {
      res.textContent = `Key "${key}" not present in cache (Miss)`;
      res.className = 'lookup-output miss';
    }
    render();
  });

  get('clear-btn')?.addEventListener('click', () => {
    cache.clear();
    const res = get('lookup-result');
    if (res) res.textContent = '';
    render();
  });

  // Initial seed
  cache.put('CS101', 'Intro to Algorithms');
  cache.put('MATH201', 'Multivariable Calculus');
  cache.put('PHYS301', 'Quantum Mechanics Basics');
  render();
}

if (typeof document !== 'undefined') mount();
