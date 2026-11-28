// Clipboard history for Beat-Forge. Items are kept in memory only, because copied
// text can be private. The class does not touch the page.

const LINK = /^(https?:\/\/|www\.)\S+$/i;
const CODE = [
  /^\s*(const|let|var|function|class|import|export)\s+[\w{*]/m,
  /=>/,
  /^\s*[[{][\s\S]*[\]}]\s*$/,
  /;\s*$/m,
];

export const TYPES = ['text', 'code', 'link'];

export function detectType(text) {
  const value = String(text).trim();
  if (LINK.test(value)) return 'link';
  if (CODE.some((rule) => rule.test(value))) return 'code';
  return 'text';
}

export class MusicDawStudioClipboardVault {
  constructor({ limit = 30, clipboard = globalThis.navigator?.clipboard, now = () => Date.now() } = {}) {
    this.limit = limit;
    this.clipboard = clipboard;
    this.now = now;
    this.items = [];
    this.nextId = 1;
  }

  // Adds text to the top of the stack. Copying the same text again moves it up
  // instead of adding a second entry. Blank text is ignored.
  pushItem(text, type) {
    if (typeof text !== 'string' || !text.trim()) return null;
    const existing = this.items.find((item) => item.text === text);
    const item = {
      id: existing ? existing.id : this.nextId++,
      text,
      type: TYPES.includes(type) ? type : detectType(text),
      copiedAt: this.now(),
    };
    this.items = [item, ...this.items.filter((other) => other.id !== item.id)].slice(0, this.limit);
    return item;
  }

  // Newest first. `type` narrows to one kind; "all" keeps every kind.
  filterItems(query = '', type = 'all') {
    const needle = String(query).trim().toLowerCase();
    return this.items.filter(
      (item) => (type === 'all' || item.type === type) && item.text.toLowerCase().includes(needle),
    );
  }

  // Puts a stored item back on the system clipboard. Resolves to false when the
  // id is unknown or the browser refuses.
  async copyToClipboard(id) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item || !this.clipboard?.writeText) return false;
    try {
      await this.clipboard.writeText(item.text);
    } catch {
      return false;
    }
    this.pushItem(item.text, item.type);
    return true;
  }

  removeItem(id) {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    return this.items.length < before;
  }

  clear() {
    this.items = [];
  }
}

// Reads what a copy event is about to place on the clipboard.
export function textFromCopy(target, selection) {
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    // Never record anything typed into a password box.
    if (target.type === 'password') return '';
    const { selectionStart, selectionEnd, value } = target;
    if (typeof selectionStart === 'number') return value.slice(selectionStart, selectionEnd);
  }
  return selection ? String(selection) : '';
}

export function mountClipboardDrawer(doc, vault) {
  const drawer = doc.getElementById('drawer');
  const search = doc.getElementById('search');
  const list = doc.getElementById('history');
  const empty = doc.getElementById('empty');
  const feedback = doc.getElementById('feedback');
  const count = doc.getElementById('count');
  const chips = [...doc.querySelectorAll('[data-type]')];
  let type = 'all';

  function button(label, name, onClick) {
    const element = doc.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.setAttribute('aria-label', name);
    element.addEventListener('click', onClick);
    return element;
  }

  function row(item) {
    const entry = doc.createElement('li');
    entry.className = `card ${item.type}`;

    const head = doc.createElement('div');
    head.className = 'card-head';
    const badge = doc.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.type;
    const time = doc.createElement('time');
    time.dateTime = new Date(item.copiedAt).toISOString();
    time.textContent = new Date(item.copiedAt).toLocaleTimeString();
    head.append(badge, time);

    // The full text sits in a <details> so long snippets can be previewed.
    const preview = doc.createElement('details');
    const summary = doc.createElement('summary');
    const firstLine = item.text.trim().split('\n')[0];
    summary.textContent = firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
    const body = doc.createElement('pre');
    body.textContent = item.text;
    preview.append(summary, body);

    const actions = doc.createElement('div');
    actions.className = 'card-actions';
    actions.append(
      button('Copy', `Copy ${firstLine.slice(0, 40)}`, async () => {
        const ok = await vault.copyToClipboard(item.id);
        render();
        feedback.textContent = ok ? 'Copied to clipboard.' : 'The browser blocked the copy.';
      }),
      button('Remove', `Remove ${firstLine.slice(0, 40)}`, () => {
        vault.removeItem(item.id);
        render();
        feedback.textContent = 'Removed.';
        search.focus();
      }),
    );

    entry.append(head, preview, actions);
    return entry;
  }

  function render() {
    const items = vault.filterItems(search.value, type);
    list.replaceChildren(...items.map(row));
    count.textContent = String(vault.items.length);
    empty.hidden = items.length > 0;
    empty.textContent = vault.items.length ? 'No snippets match.' : 'Nothing copied yet. Copy any text on this page.';
  }

  search.addEventListener('input', render);
  chips.forEach((chip) => chip.addEventListener('click', () => {
    type = chip.dataset.type;
    chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
    render();
  }));
  doc.getElementById('open-drawer').addEventListener('click', () => {
    feedback.textContent = '';
    render();
    drawer.showModal();
  });
  doc.getElementById('close-drawer').addEventListener('click', () => drawer.close());
  doc.getElementById('clear').addEventListener('click', () => {
    vault.clear();
    render();
    feedback.textContent = 'History cleared.';
  });
  drawer.addEventListener('click', (event) => {
    if (event.target === drawer) drawer.close();
  });
  doc.addEventListener('copy', (event) => {
    const added = vault.pushItem(textFromCopy(event.target, doc.getSelection()));
    if (added) render();
  });
  // The "Copy" buttons beside the sample snippets.
  doc.querySelectorAll('[data-sample]').forEach((sample) => sample.addEventListener('click', async () => {
    const text = doc.getElementById(sample.dataset.sample).textContent;
    const item = vault.pushItem(text);
    const ok = await vault.copyToClipboard(item.id);
    render();
    doc.getElementById('status').textContent = ok
      ? 'Snippet copied and saved to history.'
      : 'Saved to history, but the browser blocked the copy.';
  }));
  render();
}

if (typeof document !== 'undefined') {
  mountClipboardDrawer(document, new MusicDawStudioClipboardVault());
}
