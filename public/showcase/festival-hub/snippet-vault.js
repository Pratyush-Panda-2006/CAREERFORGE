/**
 * Festival Hub - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Issue #1338 - NSoC '26 Level 3 Feature
 */

export class FestivalHubSnippetVault {
  constructor(initialSnippets = []) {
    this.snippets = new Map();
    this.titleSet = new Set();

    if (Array.isArray(initialSnippets)) {
      initialSnippets.forEach(s => {
        if (s && s.title && s.code) {
          this.addSnippet(s.title, s.code, s.tags, s.id);
        }
      });
    }
  }

  addSnippet(title, code, tags = [], customId = null) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Snippet title must be a non-empty string');
    }
    if (code === undefined || code === null || typeof code !== 'string') {
      throw new Error('Snippet code must be a string');
    }

    const normalizedTitle = title.trim();
    const lookupKey = normalizedTitle.toLowerCase();
    if (this.titleSet.has(lookupKey)) {
      throw new Error(`Snippet with title "${normalizedTitle}" already exists`);
    }

    const tagList = Array.isArray(tags)
      ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : typeof tags === 'string'
      ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const id = customId || `snip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const snippet = {
      id,
      title: normalizedTitle,
      code,
      tags: Array.from(new Set(tagList)),
      createdAt: new Date().toISOString()
    };

    this.snippets.set(id, snippet);
    this.titleSet.add(lookupKey);
    return snippet;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all' || tag === '*') {
      return this.getAllSnippets();
    }
    const targetTag = String(tag).trim().toLowerCase();
    return Array.from(this.snippets.values()).filter(s => s.tags.includes(targetTag));
  }

  searchSnippets(query) {
    if (!query || !query.trim()) {
      return this.getAllSnippets();
    }

    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return Array.from(this.snippets.values()).filter(snippet => {
      const titleLower = snippet.title.toLowerCase();
      const codeLower = snippet.code.toLowerCase();
      const tagsJoined = snippet.tags.join(' ');

      // Every token must match either title, code, or tags
      return tokens.every(token =>
        titleLower.includes(token) ||
        codeLower.includes(token) ||
        tagsJoined.includes(token)
      );
    });
  }

  getSnippet(id) {
    return this.snippets.get(id) || null;
  }

  removeSnippet(id) {
    const snip = this.snippets.get(id);
    if (!snip) return false;
    this.titleSet.delete(snip.title.toLowerCase());
    this.snippets.delete(id);
    return true;
  }

  getAllSnippets() {
    return Array.from(this.snippets.values());
  }

  getAllTags() {
    const all = new Set();
    for (const snip of this.snippets.values()) {
      snip.tags.forEach(t => all.add(t));
    }
    return Array.from(all).sort();
  }

  copySnippetCode(id) {
    const snip = this.snippets.get(id);
    if (!snip) throw new Error(`Snippet "${id}" not found`);
    return snip.code;
  }
}
