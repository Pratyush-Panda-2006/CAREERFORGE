/**
 * SaaS Launchpad - Least-Recently-Used (LRU) In-Memory Cache Engine
 * High-performance O(1) Cache backed by a Doubly-Linked List & Hash-Map.
 * public/showcase/saas-launchpad/lru-cache.js
 */

/**
 * Node element representing an entry in the doubly-linked list.
 */
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

/**
 * Main LRU Cache implementation for SaaS Launchpad.
 */
export class SaasLaunchpadLruCache {
  /**
   * @param {number} capacity - Maximum number of entries the cache can hold.
   */
  constructor(capacity = 4) {
    if (typeof capacity !== 'number' || isNaN(capacity) || capacity <= 0) {
      throw new RangeError('Capacity must be a positive integer greater than 0');
    }
    this.capacity = capacity;
    this.map = new Map();
    this.evictedEntries = [];

    // Sentinel Head (Most Recently Used) & Tail (Least Recently Used)
    this.head = new Node('__HEAD__', null);
    this.tail = new Node('__TAIL__', null);
    this.head.next = this.tail;
    this.tail.prev = this.head;

    // Internal EventTarget for reactive UI binding
    this._eventTarget = new EventTarget();
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

  #dispatch(type, detail = {}) {
    if (this._eventTarget) {
      this._eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }
  }

  /**
   * Retrieves a value from the cache in O(1) time.
   * If found, promotes the node to MRU (head).
   * @param {string|number} key
   * @returns {*} Stored value or null if not found.
   */
  get(key) {
    const node = this.map.get(key);
    if (!node) {
      this.#dispatch('cache:miss', { key });
      return null;
    }
    this.#moveToHead(node);
    this.#dispatch('cache:hit', { key, value: node.value });
    return node.value;
  }

  /**
   * Inserts or updates a key-value pair in O(1) time.
   * Evicts the oldest entry (tail.prev) if capacity is reached.
   * @param {string|number} key
   * @param {*} value
   */
  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this.#moveToHead(node);
      this.#dispatch('cache:update', { key, value });
      return;
    }

    if (this.map.size >= this.capacity) {
      const lruNode = this.tail.prev;
      this.#remove(lruNode);
      this.map.delete(lruNode.key);

      const record = {
        key: lruNode.key,
        value: lruNode.value,
        timestamp: Date.now()
      };
      this.evictedEntries.push(record);
      this.#dispatch('cache:evict', record);
    }

    const newNode = new Node(key, value);
    this.#insertAtHead(newNode);
    this.map.set(key, newNode);
    this.#dispatch('cache:insert', { key, value });
  }

  /**
   * Dynamically resizes the cache capacity.
   * If the new capacity is lower than the current size, evicts oldest nodes.
   * @param {number} newCapacity
   */
  setCapacity(newCapacity) {
    if (typeof newCapacity !== 'number' || isNaN(newCapacity) || newCapacity <= 0) {
      throw new RangeError('Capacity must be a positive integer greater than 0');
    }
    this.capacity = newCapacity;

    while (this.map.size > this.capacity) {
      const lruNode = this.tail.prev;
      this.#remove(lruNode);
      this.map.delete(lruNode.key);

      const record = {
        key: lruNode.key,
        value: lruNode.value,
        timestamp: Date.now()
      };
      this.evictedEntries.push(record);
      this.#dispatch('cache:evict', record);
    }

    this.#dispatch('cache:resize', { capacity: newCapacity });
  }

  /**
   * Returns a copy of all evicted entries in chronological order.
   * @returns {Array<{key: *, value: *, timestamp: number}>}
   */
  getEvictedEntries() {
    return [...this.evictedEntries];
  }

  /**
   * Returns current entries ordered from MRU (head) to LRU (tail).
   * @returns {Array<{key: *, value: *}>}
   */
  getOrderedEntries() {
    const entries = [];
    let curr = this.head.next;
    while (curr !== this.tail) {
      entries.push({ key: curr.key, value: curr.value });
      curr = curr.next;
    }
    return entries;
  }

  /**
   * Resets the cache, purging all stored entries and eviction logs.
   */
  clear() {
    this.map.clear();
    this.evictedEntries = [];
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.#dispatch('cache:clear');
  }
}

// ============================================================================
// Interactive Visualizer Mount Controller
// ============================================================================
function mountVisualizer() {
  const root = document.querySelector('[data-lru-cache-app]');
  if (!root) return;

  const cache = new SaasLaunchpadLruCache(4);

  const $ = (id) => root.querySelector(`#${id}`);
  const keyInput = $('key-input');
  const valInput = $('val-input');
  const insertBtn = $('insert-btn');
  const lookupBtn = $('lookup-btn');
  const clearBtn = $('clear-btn');
  const slider = $('capacity-slider');
  const capVal = $('capacity-val');
  const occBar = $('occupancy-bar');
  const occText = $('occupancy-text');
  const memState = $('memory-state');
  const nodeChain = $('node-chain');
  const evictionLog = $('eviction-log');
  const evictBadge = $('eviction-count-badge');
  const lookupResult = $('lookup-result');

  function render() {
    const entries = cache.getOrderedEntries();
    const capacity = cache.capacity;
    const totalCount = entries.length;
    const occupancyPct = Math.min(100, Math.round((totalCount / capacity) * 100));

    // Update Capacity Slider & Labels
    if (capVal) capVal.textContent = String(capacity);
    if (slider && Number(slider.value) !== capacity) {
      slider.value = String(capacity);
    }

    // Update Occupancy Bar & Status Meta
    if (occBar) {
      occBar.style.width = `${occupancyPct}%`;
      occBar.classList.remove('warning', 'full');
      if (occupancyPct >= 100) {
        occBar.classList.add('full');
      } else if (occupancyPct >= 75) {
        occBar.classList.add('warning');
      }
    }

    if (occText) {
      occText.textContent = `${totalCount} / ${capacity} slots used (${occupancyPct}%)`;
    }

    if (memState) {
      memState.classList.remove('optimal', 'warning', 'full');
      if (occupancyPct >= 100) {
        memState.textContent = 'At Max Capacity';
        memState.classList.add('full');
      } else if (occupancyPct >= 75) {
        memState.textContent = 'High Load';
        memState.classList.add('warning');
      } else {
        memState.textContent = 'Optimal Load';
        memState.classList.add('optimal');
      }
    }

    // Render Doubly-Linked Node Chain
    if (nodeChain) {
      nodeChain.replaceChildren();

      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-chain-text';
        empty.textContent = '(Cache is empty. Insert an entry above to populate)';
        nodeChain.appendChild(empty);
      } else {
        entries.forEach((entry, idx) => {
          const card = document.createElement('div');
          card.className = 'cache-node';

          const badgeWrapper = document.createElement('div');
          badgeWrapper.className = 'node-badge-wrapper';

          const badge = document.createElement('span');
          badge.className = 'node-badge';
          if (idx === 0) {
            badge.classList.add('badge-mru');
            badge.textContent = 'MRU (Head)';
          } else if (idx === entries.length - 1) {
            badge.classList.add('badge-lru');
            badge.textContent = 'LRU (Tail)';
          } else {
            badge.textContent = `Node #${idx + 1}`;
          }

          const posSpan = document.createElement('span');
          posSpan.className = 'node-pos';
          posSpan.textContent = `[${idx}]`;

          badgeWrapper.append(badge, posSpan);

          const keySpan = document.createElement('strong');
          keySpan.className = 'node-key';
          keySpan.textContent = String(entry.key);

          const valSpan = document.createElement('div');
          valSpan.className = 'node-val';
          valSpan.textContent = String(entry.value);

          card.append(badgeWrapper, keySpan, valSpan);
          nodeChain.appendChild(card);

          // Add bidirectional link pointer between nodes
          if (idx < entries.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'chain-arrow';
            arrow.innerHTML = '&#8644;'; // ⇄
            arrow.setAttribute('title', 'Doubly-Linked List: prev ⇄ next');
            nodeChain.appendChild(arrow);
          }
        });
      }
    }

    // Render Eviction Audit Log
    if (evictionLog) {
      const evicted = cache.getEvictedEntries();
      if (evictBadge) {
        evictBadge.textContent = `${evicted.length} Eviction${evicted.length === 1 ? '' : 's'}`;
      }

      evictionLog.replaceChildren();
      if (evicted.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-log-text';
        empty.textContent = 'No cache evictions recorded yet. Overflow capacity to trigger eviction.';
        evictionLog.appendChild(empty);
      } else {
        // Show newest evictions first
        [...evicted].reverse().slice(0, 15).forEach((record) => {
          const item = document.createElement('div');
          item.className = 'eviction-item';

          const main = document.createElement('div');
          main.className = 'eviction-main';

          const badge = document.createElement('span');
          badge.className = 'eviction-badge';
          badge.textContent = 'EVICTED';

          const key = document.createElement('span');
          key.className = 'eviction-key';
          key.textContent = String(record.key);

          const val = document.createElement('span');
          val.className = 'eviction-val';
          val.textContent = `payload: "${String(record.value)}"`;

          main.append(badge, key, val);

          const time = document.createElement('span');
          time.className = 'eviction-time';
          time.textContent = new Date(record.timestamp).toLocaleTimeString();

          item.append(main, time);
          evictionLog.appendChild(item);
        });
      }
    }
  }

  // --- Handlers ---
  function showFeedback(message, type) {
    if (!lookupResult) return;
    lookupResult.textContent = message;
    lookupResult.className = `lookup-output lookup-${type}`;
  }

  insertBtn?.addEventListener('click', () => {
    const k = keyInput?.value.trim();
    const v = valInput?.value.trim();

    if (!k) {
      showFeedback('Please provide a valid Cache Key', 'miss');
      keyInput?.focus();
      return;
    }

    const payload = v || `Auto-payload: ${Date.now()}`;
    const isUpdate = cache.map.has(k);
    cache.put(k, payload);

    if (keyInput) keyInput.value = '';
    if (valInput) valInput.value = '';

    showFeedback(
      isUpdate
        ? `UPDATE: Key "${k}" value updated and promoted to MRU (Head).`
        : `INSERT: Key "${k}" stored at MRU (Head).`,
      'hit'
    );
    render();
  });

  lookupBtn?.addEventListener('click', () => {
    const k = keyInput?.value.trim();
    if (!k) {
      showFeedback('Please enter a key to lookup', 'miss');
      keyInput?.focus();
      return;
    }

    const val = cache.get(k);
    if (val !== null) {
      showFeedback(`CACHE HIT: Key "${k}" found! Value: "${val}". Promoted to MRU (Head).`, 'hit');
    } else {
      showFeedback(`CACHE MISS: Key "${k}" was not found in cache.`, 'miss');
    }
    render();
  });

  clearBtn?.addEventListener('click', () => {
    cache.clear();
    showFeedback('Cache and eviction log successfully purged.', 'hit');
    render();
  });

  slider?.addEventListener('input', (e) => {
    const targetCap = Number(e.target.value);
    if (targetCap > 0) {
      cache.setCapacity(targetCap);
      showFeedback(`Cache capacity adjusted to ${targetCap} entries.`, 'hit');
      render();
    }
  });

  // Attach sample preset buttons
  root.querySelectorAll('.btn-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-key');
      const v = btn.getAttribute('data-val');
      if (keyInput) keyInput.value = k;
      if (valInput) valInput.value = v;
      insertBtn?.click();
    });
  });

  // Seed default SaaS Launchpad cache items
  cache.put('tenant:org_4901:session', 'User: Sarah (Admin) | Plan: Enterprise');
  cache.put('ratelimit:api_gateway', 'Quota: 10,000 req/min | Allowed');
  cache.put('feature:realtime_stream', 'Rollout: 100% | Status: Healthy');

  render();
}

// Auto-mount in browser environments
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountVisualizer);
  } else {
    mountVisualizer();
  }
}
