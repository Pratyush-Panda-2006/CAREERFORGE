const isWordStart = (text, index) => index === 0 || /[\s\-_/]/.test(text[index - 1]);

// Higher is better, null means no match. Every query character must appear in order.
function score(query, text) {
  const haystack = text.toLowerCase();
  const exact = haystack.indexOf(query);
  if (exact !== -1) return 1000 - exact + (isWordStart(haystack, exact) ? 100 : 0);
  let total = 0;
  let previous = -1;
  for (const char of query) {
    const index = haystack.indexOf(char, previous + 1);
    if (index === -1) return null;
    total += 10;
    if (index === previous + 1) total += 5;
    if (isWordStart(haystack, index)) total += 8;
    total -= Math.min(index - previous - 1, 5);
    previous = index;
  }
  return total;
}

export class AgritechPrecisionFarmingCommandPalette {
  constructor() {
    this.actions = new Map();
    this.results = [];
    this.selected = 0;
  }

  registerAction(id, label, category, handler) {
    if (!id || !label || typeof handler !== 'function') {
      throw new TypeError('An action needs an id, a label and a handler function');
    }
    this.actions.set(id, { id, label, category: category || 'General', handler });
  }

  // Returns matches grouped by category, best category first, in display order.
  fuzzySearch(query = '') {
    const needle = String(query).toLowerCase().replace(/\s+/g, ' ').trim();
    const matches = [];
    for (const action of this.actions.values()) {
      const points = needle ? score(needle, action.label) ?? score(needle, `${action.category} ${action.label}`) : 0;
      if (points !== null) matches.push({ action, points });
    }
    matches.sort((a, b) => b.points - a.points);
    const groups = new Map();
    for (const { action } of matches) {
      if (!groups.has(action.category)) groups.set(action.category, []);
      groups.get(action.category).push(action);
    }
    this.results = [...groups.values()].flat();
    this.selected = 0;
    return this.results;
  }

  moveSelection(step) {
    const size = this.results.length;
    if (size) this.selected = (this.selected + step + size) % size;
    return this.selected;
  }

  executeSelected() {
    const action = this.results[this.selected];
    if (!action) return null;
    action.handler(action);
    return action.id;
  }
}

if (typeof document !== 'undefined') {
  const palette = new AgritechPrecisionFarmingCommandPalette();
  const dialog = document.getElementById('palette');
  const input = document.getElementById('query');
  const results = document.getElementById('results');
  const status = document.getElementById('status');

  const say = (message) => () => { status.textContent = message; };
  const open = (url) => () => { window.location.href = url; };
  palette.registerAction('home', 'Open farm dashboard', 'Navigate', open('index.html'));
  palette.registerAction('irrigate', 'Start irrigation cycle (demo)', 'Field operations', say('Irrigation cycle queued for Field A.'));
  palette.registerAction('drone', 'Schedule drone survey (demo)', 'Field operations', say('Drone survey scheduled for 06:00.'));
  palette.registerAction('soil', 'Review soil moisture (demo)', 'Telemetry', say('Soil moisture: 31% in Field A, 27% in Field B.'));
  palette.registerAction('weather', 'Check frost risk (demo)', 'Telemetry', say('No frost expected in the next 48 hours.'));
  palette.registerAction('copy', 'Copy page link', 'Utilities', () => {
    navigator.clipboard.writeText(window.location.href)
      .then(say('Link copied.'), say('Could not copy the link.'));
  });

  const highlight = () => {
    results.querySelectorAll('[role="option"]').forEach((option, index) => {
      const active = index === palette.selected;
      option.setAttribute('aria-selected', String(active));
      if (active) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
    if (!palette.results.length) input.removeAttribute('aria-activedescendant');
  };

  const run = () => {
    if (palette.results.length) {
      dialog.close();
      palette.executeSelected();
    }
  };

  const render = () => {
    results.replaceChildren();
    let category = '';
    palette.fuzzySearch(input.value).forEach((action, index) => {
      if (action.category !== category) {
        category = action.category;
        const heading = document.createElement('li');
        heading.setAttribute('role', 'presentation');
        heading.className = 'category';
        heading.textContent = category;
        results.append(heading);
      }
      const option = document.createElement('li');
      option.id = `option-${action.id}`;
      option.setAttribute('role', 'option');
      option.textContent = action.label;
      option.addEventListener('mousemove', () => { palette.selected = index; highlight(); });
      option.addEventListener('click', () => { palette.selected = index; run(); });
      results.append(option);
    });
    if (!palette.results.length) {
      const empty = document.createElement('li');
      empty.setAttribute('role', 'presentation');
      empty.textContent = 'No matching commands';
      results.append(empty);
    }
    highlight();
  };

  const show = () => {
    if (dialog.open) return;
    input.value = '';
    render();
    dialog.showModal();
    input.focus();
  };

  document.getElementById('open').addEventListener('click', show);
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else show();
    }
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      palette.moveSelection(event.key === 'ArrowDown' ? 1 : -1);
      highlight();
    } else if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      run();
    }
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}
