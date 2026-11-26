export class SupplyChainLogisticsKanbanBoard {
  #tasks = [];
  #storageKey = 'supply-chain-logistics-kanban';
  #validColumns = ['backlog', 'in-progress', 'review', 'done'];
  #validPriorities = ['low', 'medium', 'high', 'critical'];

  constructor(storageKey = 'supply-chain-logistics-kanban') {
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
        // Fallback
      }
    }
    if (this.#tasks.length === 0) {
      this.#tasks = [
        { id: 'task-1', title: 'System Architecture Review', priority: 'high', column: 'backlog', createdAt: Date.now() - 3600000 },
        { id: 'task-2', title: 'Implement Core Data Pipe', priority: 'critical', column: 'in-progress', createdAt: Date.now() - 7200000 },
        { id: 'task-3', title: 'UI Accessibility Audit', priority: 'medium', column: 'review', createdAt: Date.now() - 10800000 },
        { id: 'task-4', title: 'Deploy Staging Environment', priority: 'low', column: 'done', createdAt: Date.now() - 86400000 }
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
        // Storage quota
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

  const board = new SupplyChainLogisticsKanbanBoard();
  const taskInput = root.querySelector('#new-task-title');
  const prioritySelect = root.querySelector('#new-task-priority');
  const addBtn = root.querySelector('#add-task-btn');

  function render() {
    ['backlog', 'in-progress', 'review', 'done'].forEach(col => {
      const colEl = root.querySelector(`[data-col="${col}"]`);
      if (!colEl) return;
      colEl.innerHTML = '';
      const tasks = board.getTasksByColumn(col);
      tasks.forEach(t => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.id = t.id;
        card.innerHTML = `
          <div class="card-title">${t.title}</div>
          <div class="card-footer">
            <span class="prio-tag prio-${t.priority}">${t.priority}</span>
            <div class="move-actions">
              ${col !== 'backlog' ? '<button class="btn-prev">←</button>' : ''}
              ${col !== 'done' ? '<button class="btn-next">→</button>' : ''}
            </div>
          </div>
        `;

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', t.id);
        });

        const prevBtn = card.querySelector('.btn-prev');
        if (prevBtn) {
          prevBtn.addEventListener('click', () => {
            const cols = ['backlog', 'in-progress', 'review', 'done'];
            const idx = cols.indexOf(col);
            if (idx > 0) {
              board.moveTask(t.id, cols[idx - 1]);
              render();
            }
          });
        }

        const nextBtn = card.querySelector('.btn-next');
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            const cols = ['backlog', 'in-progress', 'review', 'done'];
            const idx = cols.indexOf(col);
            if (idx < cols.length - 1) {
              board.moveTask(t.id, cols[idx + 1]);
              render();
            }
          });
        }

        colEl.appendChild(card);
      });
    });
  }

  root.querySelectorAll('.kanban-column-body').forEach(colBody => {
    colBody.addEventListener('dragover', (e) => e.preventDefault());
    colBody.addEventListener('drop', (e) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      const targetCol = colBody.dataset.col;
      if (taskId && targetCol) {
        board.moveTask(taskId, targetCol);
        render();
      }
    });
  });

  addBtn.addEventListener('click', () => {
    const title = taskInput.value.trim();
    if (title) {
      board.addTask(title, prioritySelect.value);
      taskInput.value = '';
      render();
    }
  });

  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
