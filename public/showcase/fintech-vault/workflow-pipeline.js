/**
 * FintechVaultPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for institutional payments, AML screening, clearing, and ledger settlement.
 */
export class FintechVaultPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'wire-origination', title: 'Payment & Wire Origination', wipLimit: 6 },
      { id: 'aml-compliance', title: 'AML & Sanctions Screening', wipLimit: 4 },
      { id: 'clearing-settlement', title: 'Clearing & Ledger Posting', wipLimit: 4 },
      { id: 'settled-archived', title: 'Settled & Audited Records', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-f1',
        title: 'Cross-Border SWIFT MT103 Wire Ingestion',
        description: 'Validate BIC/IBAN routing codes and currency exchange hedging for $2,400,000 transfer.',
        columnId: 'wire-origination',
        priority: 'high',
        assignee: 'Treasury Desk',
        durationEst: '15m',
        createdAt: '2026-03-01T08:00:00.000Z'
      },
      {
        id: 'task-f2',
        title: 'OFAC PEP & Specially Designated Nationals Screening',
        description: 'Automated fuzzy matching against FinCEN and EU consolidated financial sanction databases.',
        columnId: 'aml-compliance',
        priority: 'critical',
        assignee: 'Compliance AI / Officer Chen',
        durationEst: '30m',
        createdAt: '2026-03-01T08:45:00.000Z'
      },
      {
        id: 'task-f3',
        title: 'Real-Time Gross Settlement (RTGS) Clearing Batch',
        description: 'Post double-entry debit/credit ledger records through central bank clearing rails.',
        columnId: 'clearing-settlement',
        priority: 'high',
        assignee: 'Settlements Ops',
        durationEst: '1.0h',
        createdAt: '2026-03-01T09:30:00.000Z'
      },
      {
        id: 'task-f4',
        title: 'End-of-Day Merkle Ledger Notarization',
        description: 'Seal cryptographically verified immutable ledger state into audited vault storage.',
        columnId: 'settled-archived',
        priority: 'medium',
        assignee: 'Core Audit Engine',
        durationEst: '1.0d',
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'task-f5',
        title: 'Corporate Collateral Margin Reconciliation',
        description: 'Cross-reference sovereign bond haircuts against intraday prime broker margin call.',
        columnId: 'clearing-settlement',
        priority: 'medium',
        assignee: 'Risk Analytics',
        durationEst: '2.0h',
        createdAt: '2026-03-01T11:00:00.000Z'
      }
    ];

    this.subscribers = new Set();
    this.draggedTaskId = null;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.getBoardState());
      } catch (err) {
        console.error('Fintech pipeline subscriber error:', err);
      }
    }
  }

  getBoardState() {
    return {
      columns: this.columns.map((col) => ({
        ...col,
        tasks: this.tasks.filter((t) => t.columnId === col.id)
      })),
      totalTasks: this.tasks.length
    };
  }

  getTaskById(id) {
    return this.tasks.find((t) => t.id === id) || null;
  }

  getColumnById(id) {
    return this.columns.find((c) => c.id === id) || null;
  }

  moveTask(taskId, targetColumnId) {
    const task = this.getTaskById(taskId);
    if (!task) return { success: false, reason: 'Task not found' };

    const targetColumn = this.getColumnById(targetColumnId);
    if (!targetColumn) return { success: false, reason: 'Target column not found' };

    if (task.columnId === targetColumnId) {
      return { success: true, task };
    }

    const currentCount = this.tasks.filter((t) => t.columnId === targetColumnId).length;
    if (currentCount >= targetColumn.wipLimit) {
      return { success: false, reason: `WIP limit reached for ${targetColumn.title}` };
    }

    task.columnId = targetColumnId;
    task.updatedAt = new Date().toISOString();
    this.notify();
    return { success: true, task };
  }

  addTask(taskData) {
    if (!taskData.title || typeof taskData.title !== 'string') {
      throw new Error('Task title is required');
    }

    const targetColId = taskData.columnId || this.columns[0].id;
    const targetCol = this.getColumnById(targetColId);
    if (!targetCol) throw new Error('Invalid column id');

    const colCount = this.tasks.filter((t) => t.columnId === targetColId).length;
    if (colCount >= targetCol.wipLimit) {
      throw new Error(`WIP limit of ${targetCol.wipLimit} reached for ${targetCol.title}`);
    }

    const newTask = {
      id: taskData.id || `task-f-${Date.now()}`,
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      columnId: targetColId,
      priority: ['critical', 'high', 'medium', 'low'].includes(taskData.priority) ? taskData.priority : 'medium',
      assignee: taskData.assignee ? taskData.assignee.trim() : 'Compliance Officer',
      durationEst: taskData.durationEst || '1.0h',
      createdAt: new Date().toISOString()
    };

    this.tasks.push(newTask);
    this.notify();
    return newTask;
  }

  deleteTask(taskId) {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;

    this.tasks.splice(idx, 1);
    this.notify();
    return true;
  }

  filterTasks(filter = {}) {
    return this.tasks.filter((task) => {
      if (filter.priority && task.priority !== filter.priority) return false;
      if (filter.columnId && task.columnId !== filter.columnId) return false;
      if (filter.query) {
        const q = filter.query.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = task.description.toLowerCase().includes(q);
        const assigneeMatch = task.assignee.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !assigneeMatch) return false;
      }
      return true;
    });
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'fintech-pipeline-container';

    const header = document.createElement('div');
    header.className = 'fintech-pipeline-header';

    const title = document.createElement('h3');
    title.textContent = 'Financial Operations & Settlement Pipeline';

    const stats = document.createElement('div');
    stats.className = 'fintech-pipeline-stats';
    const state = this.getBoardState();
    stats.textContent = `Pending Transactions: ${state.totalTasks}`;

    header.append(title, stats);
    wrapper.append(header);

    const board = document.createElement('div');
    board.className = 'fintech-pipeline-board';

    state.columns.forEach((column) => {
      const colEl = document.createElement('div');
      colEl.className = 'fintech-pipeline-column';
      colEl.setAttribute('data-column-id', column.id);

      const colHeader = document.createElement('div');
      colHeader.className = 'fintech-column-header';

      const colTitle = document.createElement('span');
      colTitle.className = 'fintech-column-title';
      colTitle.textContent = column.title;

      const badge = document.createElement('span');
      badge.className = 'fintech-column-badge';
      badge.textContent = `${column.tasks.length}/${column.wipLimit}`;
      if (column.tasks.length >= column.wipLimit) {
        badge.classList.add('badge-full');
      }

      colHeader.append(colTitle, badge);
      colEl.append(colHeader);

      const taskList = document.createElement('div');
      taskList.className = 'fintech-column-tasks';

      column.tasks.forEach((task) => {
        const taskCard = document.createElement('div');
        taskCard.className = `fintech-task-card priority-${task.priority}`;
        taskCard.draggable = true;
        taskCard.setAttribute('data-task-id', task.id);

        const cardTop = document.createElement('div');
        cardTop.className = 'fintech-card-header';

        const taskHeading = document.createElement('h5');
        taskHeading.textContent = task.title;

        const delBtn = document.createElement('button');
        delBtn.className = 'fintech-task-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete item');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteTask(task.id);
        });

        cardTop.append(taskHeading, delBtn);

        const desc = document.createElement('p');
        desc.className = 'fintech-task-desc';
        desc.textContent = task.description;

        const footer = document.createElement('div');
        footer.className = 'fintech-task-footer';

        const priorityPill = document.createElement('span');
        priorityPill.className = `fintech-priority-pill pill-${task.priority}`;
        priorityPill.textContent = task.priority.toUpperCase();

        const assignee = document.createElement('span');
        assignee.className = 'fintech-assignee';
        assignee.textContent = task.assignee;

        footer.append(priorityPill, assignee);
        taskCard.append(cardTop, desc, footer);

        taskCard.addEventListener('dragstart', (e) => {
          this.draggedTaskId = task.id;
          e.dataTransfer.setData('text/plain', task.id);
          taskCard.classList.add('dragging');
        });

        taskCard.addEventListener('dragend', () => {
          this.draggedTaskId = null;
          taskCard.classList.remove('dragging');
        });

        taskList.append(taskCard);
      });

      taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
        taskList.classList.add('drag-over');
      });

      taskList.addEventListener('dragleave', () => {
        taskList.classList.remove('drag-over');
      });

      taskList.addEventListener('drop', (e) => {
        e.preventDefault();
        taskList.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain') || this.draggedTaskId;
        if (taskId) {
          this.moveTask(taskId, column.id);
        }
      });

      colEl.append(taskList);
      board.append(colEl);
    });

    wrapper.append(board);
    container.append(wrapper);
  }
}
