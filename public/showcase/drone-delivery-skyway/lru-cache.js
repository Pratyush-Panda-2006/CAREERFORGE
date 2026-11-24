class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class DroneDeliverySkywayLruCache {
  constructor(capacity = 4) {
    if (capacity <= 0) {
      throw new RangeError('Capacity must be greater than 0');
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

  let cache = new DroneDeliverySkywayLruCache(4);
  const get = id => root.querySelector(`#${id}`);

  function render() {
    const entries = cache.getOrderedEntries();
    const capacity = cache.capacity;
    const occupancyPct = Math.round((entries.length / capacity) * 100);

    const fillBar = get('occupancy-bar');
    if (fillBar) fillBar.style.width = `${occupancyPct}%`;

    const countText = get('occupancy-text');
    if (countText) countText.textContent = `${entries.length} / ${capacity} slots used (${occupancyPct}%)`;

    // Render node chain
    const chainContainer = get('node-chain');
    if (chainContainer) {
      chainContainer.replaceChildren();
      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-chain-text';
        empty.textContent = '(Cache is currently empty)';
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

          if (idx < entries.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'chain-arrow';
            arrow.textContent = '⇄';
            chainContainer.appendChild(arrow);
          }
        });
      }
    }

    // Render evictions
    const evictedContainer = get('eviction-log');
    if (evictedContainer) {
      const evicted = cache.getEvictedEntries();
      evictedContainer.replaceChildren();
      if (evicted.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-log-text';
        empty.textContent = 'No cache evictions yet.';
        evictedContainer.appendChild(empty);
      } else {
        [...evicted].reverse().slice(0, 10).forEach(item => {
          const row = document.createElement('div');
          row.className = 'eviction-item';
          const time = new Date(item.timestamp).toLocaleTimeString();
          row.textContent = `[${time}] Evicted: "${item.key}" => "${item.value}"`;
          evictedContainer.appendChild(row);
        });
      }
    }
  }

  get('insert-btn')?.addEventListener('click', () => {
    const key = get('key-input')?.value.trim();
    const val = get('val-input')?.value.trim();
    if (key && val) {
      cache.put(key, val);
      get('key-input').value = '';
      get('val-input').value = '';
      render();
    }
  });

  get('lookup-btn')?.addEventListener('click', () => {
    const key = get('key-input')?.value.trim();
    if (key) {
      const val = cache.get(key);
      const output = get('lookup-result');
      if (output) {
        if (val !== null) {
          output.textContent = `HIT: "${key}" = "${val}" (Promoted to MRU)`;
          output.className = 'lookup-hit';
        } else {
          output.textContent = `MISS: Key "${key}" not in cache`;
          output.className = 'lookup-miss';
        }
      }
      render();
    }
  });

  get('capacity-slider')?.addEventListener('input', (e) => {
    const newCap = Number(e.target.value);
    get('capacity-val').textContent = String(newCap);
    const oldEntries = cache.getOrderedEntries();
    const newCache = new DroneDeliverySkywayLruCache(newCap);
    for (let i = oldEntries.length - 1; i >= 0; i--) {
      newCache.put(oldEntries[i].key, oldEntries[i].value);
    }
    cache = newCache;
    render();
  });

  get('clear-btn')?.addEventListener('click', () => {
    cache.clear();
    const out = get('lookup-result');
    if (out) out.textContent = '';
    render();
  });

  // Seed sample telemetry data
  cache.put('drone:sky-alpha', 'Alt: 120m, Spd: 45km/h, Batt: 88%');
  cache.put('drone:cargo-bravo', 'Alt: 95m, Spd: 38km/h, Batt: 64%');
  cache.put('drone:scout-charlie', 'Alt: 150m, Spd: 52km/h, Batt: 91%');
  render();
}

if (typeof document !== 'undefined') mount();
