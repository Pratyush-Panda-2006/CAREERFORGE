export class LegalSmartContractsKanbanBoard {
  #tasks = [];
  #storageKey = 'legal-smart-contracts-kanban';
  #validColumns = ['backlog', 'in-progress', 'review', 'done'];
  #validPriorities = ['low', 'medium', 'high', 'critical'];

  constructor(storageKey = 'legal-smart-contracts-kanban') {
    this.#storageKey = storageKey;
    this.#loadBoardState();
  }

  #loadBoardState() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.#storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.#tasks = parsed.filter(t => t && t.id && t.title);
            return;
          }
        }
      } catch {
        // Fallback to empty if parse fails
      }
    }
    // Default seed tasks if empty
    if (this.#tasks.length === 0) {
      this.#tasks = [
        { id: 'task-1', title: 'Audit ERC-20 Vesting Contract', priority: 'high', column: 'backlog', createdAt: Date.now() - 3600000 },
        { id: 'task-2', title: 'Verify Multi-Sig Quorum Threshold', priority: 'critical', column: 'in-progress', createdAt: Date.now() - 7200000 },
        { id: 'task-3', title: 'Review Gas Optimization for Settlement', priority: 'medium', column: 'review', createdAt: Date.now() - 10800000 },
        { id: 'task-4', title: 'Deploy Testnet Oracles', priority: 'low', column: 'done', createdAt: Date.now() - 86400000 }
      ];
    }
  }

  addTask(title, priority = 'medium', column = 'backlog') {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Task title cannot be empty');
    }
    const cleanPriority = this.#validPriorities.includes(priority) ? priority : 'medium';
    const cleanColumn = this.#validColumns.includes(column) ? column : 'backlog';

    const newTask = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: title.trim(),
      priority: cleanPriority,
      column: cleanColumn,
      createdAt: Date.now()
    };

    this.#tasks.push(newTask);
    this.saveBoardState();
    return structuredClone(newTask);
  }

  moveTask(taskId, targetColumn) {
    if (!this.#validColumns.includes(targetColumn)) {
      throw new Error(`Invalid target column: ${targetColumn}`);
    }
    const task = this.#tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found with ID: ${taskId}`);
    }
    task.column = targetColumn;
    this.saveBoardState();
    return structuredClone(task);
  }

  saveBoardState() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.#storageKey, JSON.stringify(this.#tasks));
      } catch {
        // Storage quota or sandboxed
      }
    }
    return this.getBoardState();
  }

  getBoardState() {
    return structuredClone(this.#tasks);
  }

  getTasksByColumn(column) {
    return this.#tasks.filter(t => t.column === column).map(t => structuredClone(t));
  }

  clearBoard() {
    this.#tasks = [];
    this.saveBoardState();
  }
}

function mount() {
  const root = document.querySelector('[data-kanban-lab]');
  if (!root) return;

  const board = new LegalSmartContractsKanbanBoard();
  const get = id => root.querySelector(`#${id}`);

  function render() {
    const columns = ['backlog', 'in-progress', 'review', 'done'];
    columns.forEach(col => {
      const container = get(`col-${col}`);
      const countEl = get(`count-${col}`);
      const tasks = board.getTasksByColumn(col);

      if (countEl) countEl.textContent = String(tasks.length);
      if (!container) return;

      container.replaceChildren();
      tasks.forEach(task => {
        const card = document.createElement('article');
        card.className = `kanban-card priority-${task.priority}`;
        card.draggable = true;
        card.dataset.id = task.id;

        const header = document.createElement('div');
        header.className = 'card-header';

        const badge = document.createElement('span');
        badge.className = 'priority-badge';
        badge.textContent = task.priority.toUpperCase();

        const idSpan = document.createElement('span');
        idSpan.className = 'card-id';
        idSpan.textContent = task.id.split('-').slice(0, 2).join('-');

        header.append(badge, idSpan);

        const titleEl = document.createElement('p');
        titleEl.className = 'card-title';
        titleEl.textContent = task.title;

        card.append(header, titleEl);

        card.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', task.id);
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
        });

        container.appendChild(card);
      });
    });
  }

  // Setup drag drop zones
  root.querySelectorAll('.kanban-column').forEach(colEl => {
    const colName = colEl.dataset.column;
    colEl.addEventListener('dragover', e => {
      e.preventDefault();
      colEl.classList.add('drag-over');
    });

    colEl.addEventListener('dragleave', () => {
      colEl.classList.remove('drag-over');
    });

    colEl.addEventListener('drop', e => {
      e.preventDefault();
      colEl.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId && colName) {
        board.moveTask(taskId, colName);
        render();
      }
    });
  });

  get('add-task-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = get('task-title').value.trim();
    const priority = get('task-priority').value;
    const col = get('task-column').value;
    if (title) {
      board.addTask(title, priority, col);
      get('task-title').value = '';
      render();
    }
  });

  get('reset-btn').addEventListener('click', () => {
    board.clearBoard();
    render();
  });

  render();
}

if (typeof document !== 'undefined') mount();
