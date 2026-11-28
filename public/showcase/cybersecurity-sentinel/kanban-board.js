export const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['low', 'medium', 'high'];
const KEY = 'cybersecurity-sentinel-kanban';

const isTask = (task) => task !== null && typeof task === 'object'
  && typeof task.id === 'string' && typeof task.title === 'string'
  && PRIORITIES.includes(task.priority) && COLUMNS.includes(task.column);

// Reading localStorage can itself throw when storage is blocked.
const browserStorage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export class CybersecuritySentinelKanbanBoard {
  constructor({ storage = browserStorage(), seed = [] } = {}) {
    this.storage = storage;
    this.tasks = this.loadBoardState() ?? seed.map((task) => ({ ...task }));
    this.nextId = this.tasks.reduce((max, task) => Math.max(max, Number(task.id.slice(5)) || 0), 0) + 1;
  }

  loadBoardState() {
    try {
      const saved = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      return Array.isArray(saved) ? saved.filter(isTask) : null;
    } catch {
      return null;
    }
  }

  addTask(title, priority = 'medium') {
    const name = String(title ?? '').trim();
    if (!name || !PRIORITIES.includes(priority)) return null;
    const task = { id: `task-${this.nextId++}`, title: name, priority, column: COLUMNS[0] };
    this.tasks.push(task);
    this.saveBoardState();
    return { ...task };
  }

  moveTask(taskId, targetColumn) {
    const index = this.tasks.findIndex((task) => task.id === taskId);
    if (index === -1 || !COLUMNS.includes(targetColumn)) return false;
    if (this.tasks[index].column === targetColumn) return true;
    // A moved card goes to the bottom of its new column.
    const [task] = this.tasks.splice(index, 1);
    this.tasks.push({ ...task, column: targetColumn });
    this.saveBoardState();
    return true;
  }

  saveBoardState() {
    try {
      if (!this.storage) return false;
      this.storage.setItem(KEY, JSON.stringify(this.tasks));
      return true;
    } catch {
      return false;
    }
  }
}

if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  const board = new CybersecuritySentinelKanbanBoard({
    seed: [
      { id: 'task-1', title: 'Rotate the VPN certificates', priority: 'high', column: 'Backlog' },
      { id: 'task-2', title: 'Review failed login alerts', priority: 'medium', column: 'In Progress' },
      { id: 'task-3', title: 'Update the incident runbook', priority: 'low', column: 'Review' },
    ],
  });
  const element = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  const report = () => {
    $('saved').textContent = board.saveBoardState() ? 'Saved' : 'Could not save. Changes last until you leave the page.';
  };

  const move = (id, column) => {
    if (!board.moveTask(id, column)) return;
    render();
    report();
  };

  const card = (task) => {
    const select = element('select', { ariaLabel: `Column for ${task.title}` }, COLUMNS.map((name) => new Option(name)));
    select.value = task.column;
    select.dataset.id = task.id;
    select.addEventListener('change', () => {
      move(task.id, select.value);
      // The board is redrawn, so put focus back on the same menu.
      [...document.querySelectorAll('article select')].find((node) => node.dataset.id === task.id)?.focus();
    });
    const node = element('article', { className: task.priority, draggable: true }, [
      element('strong', { textContent: task.title }),
      element('small', { textContent: `${task.priority} priority` }),
      select,
    ]);
    node.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', task.id));
    return node;
  };

  function render() {
    $('board').replaceChildren(...COLUMNS.map((name) => {
      const tasks = board.tasks.filter((task) => task.column === name);
      const lane = element('section', { ariaLabel: name }, [element('h2', { textContent: `${name} (${tasks.length})` }), ...tasks.map(card)]);
      lane.addEventListener('dragover', (event) => {
        event.preventDefault();
        lane.classList.add('over');
      });
      lane.addEventListener('dragleave', (event) => {
        if (!lane.contains(event.relatedTarget)) lane.classList.remove('over');
      });
      lane.addEventListener('drop', (event) => {
        event.preventDefault();
        lane.classList.remove('over');
        move(event.dataTransfer.getData('text/plain'), name);
      });
      return lane;
    }));
  }

  $('open').addEventListener('click', () => {
    $('dialog').returnValue = '';
    $('title').value = '';
    $('dialog').showModal();
  });
  $('dialog').addEventListener('close', () => {
    if ($('dialog').returnValue !== 'add' || !board.addTask($('title').value, $('priority').value)) return;
    render();
    report();
  });
  render();
}
