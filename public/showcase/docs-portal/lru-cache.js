/**
 * DocsPortal - LRU In-Memory Cache Engine
 * Doubly-linked-list and hash-map backed cache with O(1) get/put and eviction tracking.
 * Emits custom events for UI visualizer integration.
 */

export class DocsPortalLruCache {
  constructor(capacity = 4) {
    if (typeof capacity !== 'number' || capacity <= 0) {
      throw new RangeError('Capacity must be a positive integer greater than 0');
    }
    this.capacity = capacity;
    this.map = new Map();
    this.evictedEntries = [];

    // Doubly-linked list sentinel nodes (head = MRU, tail = LRU)
    this.head = new Node('__HEAD__', null);
    this.tail = new Node('__TAIL__', null);
    this.head.next = this.tail;
    this.tail.prev = this.head;

    // Event dispatch target (typically the document or a custom target)
    this._eventTarget = typeof EventTarget !== 'undefined'
      ? new EventTarget()
      : null;
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

  #dispatch(eventName, detail = {}) {
    if (this._eventTarget) {
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: true
      });
      this._eventTarget.dispatchEvent(event);
    }
  }

  /**
   * Retrieve a value by key. Updates recency order (moves node to head).
   * Returns the value, or null if the key is not present.
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
   * Insert or update a key-value pair.
   * If the key already exists, its value is updated and the node moves to head.
   * If the cache is at capacity, the least recently used item (tail.prev) is evicted first.
   */
  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this.#moveToHead(node);
      this.#dispatch('cache:update', { key, oldValue: node.value, newValue: value });
      return;
    }

    // Evict LRU item if at capacity
    if (this.map.size >= this.capacity) {
      const lruNode = this.tail.prev;
      this.#remove(lruNode);
      this.map.delete(lruNode.key);
      this.evictedEntries.push({
        key: lruNode.key,
        value: lruNode.value,
        timestamp: Date.now()
      });
      this.#dispatch('cache:evict', {
        key: lruNode.key,
        value: lruNode.value,
        evictionOrder: this.evictedEntries.length
      });
    }

    const newNode = new Node(key, value);
    this.#insertAtHead(newNode);
    this.map.set(key, newNode);
    this.#dispatch('cache:insert', { key, value });
  }

  /**
   * Return a copy of the eviction log entries.
   * Each entry has: key, value, timestamp (ms since epoch).
   */
  getEvictedEntries() {
    return [...this.evictedEntries];
  }

  /**
   * Return ordered entries from most recently used (head.next) to least recently used (tail.prev).
   * Each entry is { key, value }.
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
   * Clear the cache: removes all entries, resets eviction log, and rebuilds the linked list.
   */
  clear() {
    this.map.clear();
    this.evictedEntries = [];
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.#dispatch('cache:clear');
  }
}

/* Node class for the doubly-linked list (internal) */
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}