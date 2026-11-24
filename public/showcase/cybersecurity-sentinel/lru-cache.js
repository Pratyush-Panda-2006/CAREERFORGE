export class CybersecuritySentinelLruCache {
  constructor(capacity = 4) {
    this.nodes = new Map(); this.head = {}; this.tail = {};
    this.head.next = this.tail; this.tail.prev = this.head;
    this.evicted = []; this.metrics = { hits: 0, misses: 0, writes: 0, evictions: 0 };
    this.resize(capacity);
  }
  unlink(node) { node.prev.next = node.next; node.next.prev = node.prev; }
  front(node) { node.prev = this.head; node.next = this.head.next; this.head.next.prev = node; this.head.next = node; }
  has(key) { return this.nodes.has(key); }
  get(key) {
    const node = this.nodes.get(key);
    if (!node) { this.metrics.misses++; return undefined; }
    this.metrics.hits++; this.unlink(node); this.front(node); return node.value;
  }
  put(key, value) {
    this.metrics.writes++;
    const existing = this.nodes.get(key);
    if (existing) { existing.value = value; this.unlink(existing); this.front(existing); return null; }
    const node = { key, value }; this.nodes.set(key, node); this.front(node);
    return this.nodes.size > this.capacity ? this.evict('capacity') : null;
  }
  evict(reason) {
    const node = this.tail.prev;
    if (node === this.head) return null;
    this.unlink(node); this.nodes.delete(node.key);
    const entry = { key: node.key, value: node.value, reason };
    this.evicted.push(entry); if (this.evicted.length > 100) this.evicted.shift();
    this.metrics.evictions++; return { ...entry };
  }
  resize(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) throw new RangeError('Capacity must be an integer from 1 to 50.');
    this.capacity = capacity;
    while (this.nodes.size > capacity) this.evict('resize');
  }
  clear() {
    this.nodes.clear(); this.head.next = this.tail; this.tail.prev = this.head;
    this.evicted = []; this.metrics = { hits: 0, misses: 0, writes: 0, evictions: 0 };
  }
  entries() {
    const result = [];
    for (let node = this.head.next; node !== this.tail; node = node.next) result.push({ key: node.key, value: node.value });
    return result;
  }
  getEvictedEntries() { return this.evicted.map(entry => ({ ...entry })); }
}

function mount() {
  const form = document.getElementById('cache-form'); if (!form) return;
  const get = id => document.getElementById(id), cache = new CybersecuritySentinelLruCache();
  let shownEvictions = 0;
  function key() { const value = get('key').value; if (!value.trim() || value.length > 64) throw new Error('Enter a nonblank key of at most 64 characters.'); return value; }
  function render() {
    const entries = cache.entries(); get('capacity-value').textContent = cache.capacity;
    get('occupancy').max = cache.capacity; get('occupancy').value = entries.length;
    get('occupancy-text').textContent = `${entries.length} / ${cache.capacity} entries`;
    for (const name of ['hits', 'misses', 'writes', 'evictions']) get(name).textContent = cache.metrics[name];
    get('chain').replaceChildren(...entries.map((entry, i) => {
      const li = document.createElement('li'); li.className = 'node';
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = i === 0 ? (entries.length === 1 ? 'HEAD + TAIL' : 'HEAD / MOST RECENT') : i === entries.length - 1 ? 'TAIL / NEXT EVICTION' : 'CACHED';
      const label = document.createElement('strong'); label.textContent = entry.key;
      const value = document.createElement('span'); value.textContent = entry.value;
      const read = document.createElement('button'); read.type = 'button'; read.textContent = 'Read'; read.setAttribute('aria-label', `Read ${entry.key}`);
      read.addEventListener('click', () => { get('key').value = entry.key; cache.get(entry.key); get('status').textContent = `${entry.key} moved to the head.`; render(); });
      li.append(badge, label, value, read); return li;
    }));
    get('chain').scrollLeft = 0;
    if (!entries.length) { const li = document.createElement('li'); li.textContent = 'Empty cache. Insert your first key and value.'; get('chain').append(li); }
    get('eviction-log').replaceChildren(...cache.getEvictedEntries().reverse().map(entry => {
      const li = document.createElement('li'); li.textContent = `${entry.key} → ${entry.value} · ${entry.reason === 'resize' ? 'capacity reduced' : 'least recently used'}`; return li;
    }));
    if (!cache.evicted.length) { const li = document.createElement('li'); li.textContent = 'No evictions yet.'; get('eviction-log').append(li); get('eviction-flash').replaceChildren(); }
    else if (shownEvictions !== cache.metrics.evictions) {
      const entry = cache.getEvictedEntries().at(-1), node = document.createElement('span');
      node.className = 'evicted-node'; node.textContent = `EVICTED / ${entry.key} → ${entry.value}`;
      get('eviction-flash').replaceChildren(node);
    }
    shownEvictions = cache.metrics.evictions;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const id = key(), value = get('value').value;
      if (value.length > 256) throw new Error('Values are limited to 256 characters.');
      const evicted = cache.put(id, value); get('status').textContent = evicted ? `Stored ${id}; evicted ${evicted.key}.` : `Stored ${id} at the head.`; render();
    } catch (error) { get('status').textContent = error.message; }
  });
  get('read').addEventListener('click', () => {
    try { const id = key(), found = cache.has(id), value = cache.get(id); get('status').textContent = found ? `Hit: ${id} = ${value}. Moved to the head.` : `Miss: ${id} is not cached.`; render(); }
    catch (error) { get('status').textContent = error.message; }
  });
  get('capacity').addEventListener('input', () => { cache.resize(Number(get('capacity').value)); get('status').textContent = `Capacity is ${cache.capacity}. Shrinking evicts the oldest entries.`; render(); });
  get('clear').addEventListener('click', () => { cache.clear(); get('status').textContent = 'Cache, counters and eviction history cleared. Capacity kept.'; render(); });
  render();
}
if (typeof document !== 'undefined') mount();
