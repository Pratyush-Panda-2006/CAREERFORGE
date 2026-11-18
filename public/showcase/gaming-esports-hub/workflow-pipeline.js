/**
 * GamingEsportsPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for tournament scheduling, server provisioning, broadcast production, and match archival.
 */
export class GamingEsportsPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'tournament-scheduling', title: 'Tournament Scheduling', wipLimit: 6 },
      { id: 'server-provisioning', title: 'Server & Netcode Setup', wipLimit: 4 },
      { id: 'live-broadcasting', title: 'Live Broadcast & Play', wipLimit: 4 },
      { id: 'results-archival', title: 'Results & Prize Payouts', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-e1',
        title: 'Upper Bracket Quarterfinals Map Veto',
        description: 'Coordinate pick/ban veto order between Team Vitality and FaZe Clan for Decider Map.',
        columnId: 'tournament-scheduling',
        priority: 'high',
        assignee: 'Head Admin Alex',
        durationEst: '45m',
        createdAt: '2026-03-01T08:00:00.000Z'
      },
      {
        id: 'task-e2',
        title: 'Dedicated Tickrate 128 Server Spin-Up',
        description: 'Provision low-latency bare-metal match servers with kernel anti-cheat hooks.',
        columnId: 'server-provisioning',
        priority: 'critical',
        assignee: 'NOC Engineer Dev',
        durationEst: '30m',
        createdAt: '2026-03-01T08:30:00.000Z'
      },
      {
        id: 'task-e3',
        title: 'Main Arena 4K Observer Feeds & Replay HUD',
        description: 'Sync 8 dedicated camera observers with live casters and studio multiview.',
        columnId: 'live-broadcasting',
        priority: 'high',
        assignee: 'Broadcast Lead Sarah',
        durationEst: '3.0h',
        createdAt: '2026-03-01T09:15:00.000Z'
      },
      {
        id: 'task-e4',
        title: 'Prize Pool Smart Contract Payouts',
        description: 'Verify final scorelines and initiate automated $500,000 championship escrow transfer.',
        columnId: 'results-archival',
        priority: 'medium',
        assignee: 'Finance & Legal',
        durationEst: '1.0d',
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'task-e5',
        title: 'Client Netcode Packet Integrity Audit',
        description: 'Verify zero packet loss or desynchronization across client demo recordings.',
        columnId: 'server-provisioning',
        priority: 'medium',
        assignee: 'Referee Mike',
        durationEst: '1.0h',
        createdAt: '2026-03-01T10:30:00.000Z'
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
        console.error('Esports pipeline subscriber error:', err);
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
      id: taskData.id || `task-e-${Date.now()}`,
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      columnId: targetColId,
      priority: ['critical', 'high', 'medium', 'low'].includes(taskData.priority) ? taskData.priority : 'medium',
      assignee: taskData.assignee ? taskData.assignee.trim() : 'Staff Member',
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
    wrapper.className = 'esports-pipeline-container';

    const header = document.createElement('div');
    header.className = 'esports-pipeline-header';

    const title = document.createElement('h3');
    title.textContent = 'Esports Match & Ops Workflow Pipeline';

    const stats = document.createElement('div');
    stats.className = 'esports-pipeline-stats';
    const state = this.getBoardState();
    stats.textContent = `Active Operations: ${state.totalTasks}`;

    header.append(title, stats);
    wrapper.append(header);

    const board = document.createElement('div');
    board.className = 'esports-pipeline-board';

    state.columns.forEach((column) => {
      const colEl = document.createElement('div');
      colEl.className = 'esports-pipeline-column';
      colEl.setAttribute('data-column-id', column.id);

      const colHeader = document.createElement('div');
      colHeader.className = 'esports-column-header';

      const colTitle = document.createElement('span');
      colTitle.className = 'esports-column-title';
      colTitle.textContent = column.title;

      const badge = document.createElement('span');
      badge.className = 'esports-column-badge';
      badge.textContent = `${column.tasks.length}/${column.wipLimit}`;
      if (column.tasks.length >= column.wipLimit) {
        badge.classList.add('badge-full');
      }

      colHeader.append(colTitle, badge);
      colEl.append(colHeader);

      const taskList = document.createElement('div');
      taskList.className = 'esports-column-tasks';

      column.tasks.forEach((task) => {
        const taskCard = document.createElement('div');
        taskCard.className = `esports-task-card priority-${task.priority}`;
        taskCard.draggable = true;
        taskCard.setAttribute('data-task-id', task.id);

        const cardTop = document.createElement('div');
        cardTop.className = 'esports-card-header';

        const taskHeading = document.createElement('h5');
        taskHeading.textContent = task.title;

        const delBtn = document.createElement('button');
        delBtn.className = 'esports-task-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete task');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteTask(task.id);
        });

        cardTop.append(taskHeading, delBtn);

        const desc = document.createElement('p');
        desc.className = 'esports-task-desc';
        desc.textContent = task.description;

        const footer = document.createElement('div');
        footer.className = 'esports-task-footer';

        const priorityPill = document.createElement('span');
        priorityPill.className = `esports-priority-pill pill-${task.priority}`;
        priorityPill.textContent = task.priority.toUpperCase();

        const assignee = document.createElement('span');
        assignee.className = 'esports-assignee';
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
