export const TYPES = ['text', 'code', 'link', 'address'];

export class LegalSmartContractsClipboardVault {
  constructor(limit = 25) {
    this.limit = limit;
    this.items = [];
    this.nextId = 1;
  }

  detectType(text) {
    const value = text.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(value)) return 'address';
    if (/^https?:\/\/\S+$/i.test(value)) return 'link';
    if (/[{};]\s*$|^\s*(pragma|contract|function|const|let|import)\b/m.test(value)) return 'code';
    return 'text';
  }

  // Newest first. Copying the same text again moves it to the top.
  pushItem(text, type) {
    const value = String(text);
    if (!value.trim()) return null;
    const item = { id: this.nextId, text: value, type: TYPES.includes(type) ? type : this.detectType(value) };
    this.nextId += 1;
    this.items = [item, ...this.items.filter((old) => old.text !== value)].slice(0, this.limit);
    return item;
  }

  filterItems(query = '', type = 'all') {
    const needle = String(query).trim().toLowerCase();
    return this.items.filter((item) => (type === 'all' || item.type === type) && item.text.toLowerCase().includes(needle));
  }

  async copyToClipboard(id, clipboard = globalThis.navigator?.clipboard) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item || !clipboard) return false;
    try {
      await clipboard.writeText(item.text);
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    this.items = [];
  }
}

if (typeof document !== 'undefined') {
  const vault = new LegalSmartContractsClipboardVault();
  const $ = (id) => document.getElementById(id);
  let activeType = 'all';

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  const render = () => {
    const items = vault.filterItems($('search').value, activeType);
    $('count').textContent = vault.items.length;
    $('history').replaceChildren(...items.map((item) => {
      const card = element('li', '', item.type);
      const button = element('button', 'Copy');
      button.type = 'button';
      button.addEventListener('click', async () => {
        const copied = await vault.copyToClipboard(item.id);
        $('status').textContent = copied ? 'Copied to the clipboard.' : 'The browser blocked clipboard access.';
      });
      card.append(element('span', item.type), element('pre', item.text), button);
      return card;
    }));
    if (!items.length) {
      $('history').append(element('li', vault.items.length ? 'Nothing matches.' : 'Copy something on this page to start.'));
    }
  };

  // The history lives in memory only, so contract text is gone after a reload.
  document.addEventListener('copy', (event) => {
    if ($('drawer').contains(event.target)) return;
    const field = event.target;
    const text = field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement
      ? field.value.slice(field.selectionStart, field.selectionEnd)
      : document.getSelection().toString();
    if (vault.pushItem(text)) render();
  });

  const toggle = (open) => {
    $('drawer').classList.toggle('open', open);
    $('drawer').inert = !open;
    $('trigger').setAttribute('aria-expanded', String(open));
    (open ? $('search') : $('trigger')).focus();
  };
  $('trigger').addEventListener('click', () => toggle(true));
  $('close').addEventListener('click', () => toggle(false));
  $('drawer').addEventListener('keydown', (event) => { if (event.key === 'Escape') toggle(false); });
  $('search').addEventListener('input', render);
  $('clear').addEventListener('click', () => { vault.clear(); render(); });
  document.querySelectorAll('[data-type]').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeType = chip.dataset.type;
      document.querySelectorAll('[data-type]').forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
      render();
    });
  });
  render();
}
