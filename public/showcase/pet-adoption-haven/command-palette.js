// Command palette for Paws & Haven. The class holds the search and selection logic
// and never touches the page, so it can be tested on its own.

const WORD_BREAK = /[\s\-_/&]/;

// Scores how well the letters of `query` appear, in order, inside `text`.
// Returns null when they do not. Letters that sit together or start a word count more.
export function fuzzyScore(query, text) {
  const needle = query.toLowerCase().replace(/\s+/g, '');
  const hay = text.toLowerCase();
  if (!needle) return { score: 0, positions: [] };

  const startsWord = (at) => at === 0 || WORD_BREAK.test(hay[at - 1]);
  // True when needle[i...] can still be found in order from position `from`.
  const canFinish = (from, i) => {
    for (let at = from; i < needle.length; i += 1, at += 1) {
      at = hay.indexOf(needle[i], at);
      if (at === -1) return false;
    }
    return true;
  };

  let best = null;
  // Try every place the first letter occurs, so an early stray match cannot hide a better later one.
  for (let start = hay.indexOf(needle[0]); start !== -1; start = hay.indexOf(needle[0], start + 1)) {
    const positions = [start];
    for (let i = 1; i < needle.length; i += 1) {
      let next = hay.indexOf(needle[i], positions[i - 1] + 1);
      if (next === -1) break;
      // A letter that follows on directly is best. Failing that, take the start of a later word.
      if (next !== positions[i - 1] + 1) {
        for (let at = next; at !== -1; at = hay.indexOf(needle[i], at + 1)) {
          if (startsWord(at) && canFinish(at + 1, i + 1)) {
            next = at;
            break;
          }
        }
      }
      positions.push(next);
    }
    if (positions.length < needle.length) break;

    let score = 0;
    positions.forEach((at, i) => {
      score += 1;
      if (startsWord(at)) score += 4;
      if (i > 0 && at === positions[i - 1] + 1) score += 5;
      if (i > 0) score -= Math.min(3, at - positions[i - 1] - 1);
    });
    if (!best || score > best.score) best = { score, positions };
  }
  return best;
}

export class PetAdoptionHavenCommandPalette {
  constructor() {
    this.actions = new Map();
    this.results = [];
    this.selected = 0;
  }

  // Registering an id that already exists replaces the earlier action.
  registerAction(id, label, category, handler) {
    if (!id || !label || typeof handler !== 'function') {
      throw new TypeError('An action needs an id, a label and a handler function.');
    }
    const action = { id, label, category: category || 'General', handler };
    this.actions.set(id, action);
    return action;
  }

  // Returns matches grouped by category, with the category holding the best match first.
  // The order of the returned list is the order shown on screen.
  fuzzySearch(query = '') {
    const text = String(query).trim();
    const matches = [];
    for (const action of this.actions.values()) {
      const onLabel = fuzzyScore(text, action.label);
      const onCategory = onLabel ? null : fuzzyScore(text, action.category);
      if (onLabel) matches.push({ ...action, score: onLabel.score + 100, positions: onLabel.positions });
      else if (onCategory) matches.push({ ...action, score: onCategory.score, positions: [] });
    }
    if (text) matches.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

    const groups = new Map();
    for (const match of matches) {
      if (!groups.has(match.category)) groups.set(match.category, []);
      groups.get(match.category).push(match);
    }
    this.results = [...groups.values()].flat();
    this.selected = 0;
    return this.results;
  }

  // Moves the cursor and wraps around at both ends.
  moveSelection(step) {
    const count = this.results.length;
    if (count) this.selected = (((this.selected + step) % count) + count) % count;
    return this.selected;
  }

  select(index) {
    if (index >= 0 && index < this.results.length) this.selected = index;
    return this.selected;
  }

  // Runs the highlighted action and returns it, or null when nothing is highlighted.
  executeSelected() {
    const action = this.results[this.selected];
    if (!action) return null;
    action.handler(action);
    return action;
  }
}

// Wraps the matched letters in <mark> using text nodes only.
function highlight(doc, label, positions) {
  const fragment = doc.createDocumentFragment();
  const hits = new Set(positions);
  [...label].forEach((letter, i) => {
    if (!hits.has(i)) {
      fragment.append(letter);
      return;
    }
    const mark = doc.createElement('mark');
    mark.textContent = letter;
    fragment.append(mark);
  });
  return fragment;
}

export function mountCommandPalette(doc, palette) {
  const dialog = doc.getElementById('palette');
  const input = doc.getElementById('palette-input');
  const list = doc.getElementById('palette-results');
  const empty = doc.getElementById('palette-empty');

  function paintSelection() {
    const options = list.querySelectorAll('[role="option"]');
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === palette.selected)));
    const current = options[palette.selected];
    if (current) {
      input.setAttribute('aria-activedescendant', current.id);
      current.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function render() {
    const results = palette.fuzzySearch(input.value);
    list.replaceChildren();
    let group = null;
    results.forEach((action, index) => {
      if (!group || group.dataset.category !== action.category) {
        group = doc.createElement('div');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', action.category);
        group.dataset.category = action.category;
        const heading = doc.createElement('div');
        heading.className = 'group-title';
        heading.setAttribute('aria-hidden', 'true');
        heading.textContent = action.category;
        group.append(heading);
        list.append(group);
      }
      const option = doc.createElement('div');
      option.id = `palette-option-${index}`;
      option.className = 'option';
      option.setAttribute('role', 'option');
      option.append(highlight(doc, action.label, action.positions));
      option.addEventListener('mousemove', () => {
        palette.select(index);
        paintSelection();
      });
      option.addEventListener('click', () => {
        palette.select(index);
        run();
      });
      group.append(option);
    });
    empty.hidden = results.length > 0;
    paintSelection();
  }

  function open() {
    if (dialog.open) return;
    input.value = '';
    render();
    dialog.showModal();
    input.focus();
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function run() {
    // Close first so an action that moves focus is not undone by the dialog restoring it.
    close();
    palette.executeSelected();
  }

  doc.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) close();
      else open();
    }
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      palette.moveSelection(event.key === 'ArrowDown' ? 1 : -1);
      paintSelection();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run();
    } else if (event.key === 'Escape') {
      // A search field would otherwise use the first Escape just to clear itself.
      event.preventDefault();
      close();
    }
  });
  // A click on the dimmed backdrop lands on the dialog element itself.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  doc.getElementById('open-palette').addEventListener('click', open);
  return { open, close };
}

const PAGES = [
  ['home', 'Go to Paws & Haven home', 'Navigate', 'index.html'],
  ['tour', 'Take the virtual shelter tour', 'Navigate', 'virtual-tour.html'],
  ['quest', 'Open volunteer quests', 'Navigate', 'gamified-quest.html'],
  ['geo', 'Open the location tracker', 'Navigate', 'geo-tracker.html'],
  ['sounds', 'Open the sound board', 'Tools', 'audio-synthesizer.html'],
  ['notes', 'Write notes in the markdown editor', 'Tools', 'markdown-editor.html'],
  ['board', 'Sketch on the whiteboard', 'Tools', 'canvas-whiteboard.html'],
  ['prefs', 'Change preferences', 'Settings', 'preferences.html'],
  ['access', 'Open accessibility assistant', 'Settings', 'accessibility-assistant.html'],
];

if (typeof document !== 'undefined') {
  const palette = new PetAdoptionHavenCommandPalette();
  const status = document.getElementById('status');

  for (const [id, label, category, href] of PAGES) {
    palette.registerAction(id, label, category, () => globalThis.location.assign(href));
  }
  palette.registerAction('copy-link', 'Copy link to this page', 'Tools', async () => {
    try {
      await navigator.clipboard.writeText(globalThis.location.href);
      status.textContent = 'Page link copied.';
    } catch {
      status.textContent = 'Could not copy. Copy the address from the browser bar instead.';
    }
  });

  mountCommandPalette(document, palette);
}
