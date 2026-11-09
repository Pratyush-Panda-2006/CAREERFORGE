(function (root) {
  class EpisodeQueue {
    constructor(catalogue) { this.catalogue = catalogue; this.items = []; this.serial = 0; }
    add(episode) {
      if (!Object.hasOwn(this.catalogue, episode) || this.items.length >= 50) return false;
      this.items.push({ key: ++this.serial, episode }); return true;
    }
    remove(key) { const index = this.items.findIndex(item => item.key === key); if (index < 0) return false; this.items.splice(index, 1); return true; }
    move(key, direction) {
      if (direction !== -1 && direction !== 1) return false;
      const index = this.items.findIndex(item => item.key === key); const target = index + direction;
      if (index < 0 || target < 0 || target >= this.items.length) return false;
      [this.items[index], this.items[target]] = [this.items[target], this.items[index]]; return true;
    }
    next() { return this.items.shift()?.episode ?? null; }
    clear() { this.items = []; }
    seconds() { return this.items.reduce((total, item) => total + this.catalogue[item.episode].duration, 0); }
  }
  root.EpisodeQueue = EpisodeQueue;
})(typeof window !== 'undefined' ? window : globalThis);
