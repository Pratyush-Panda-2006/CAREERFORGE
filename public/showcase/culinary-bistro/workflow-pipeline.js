/**
 * CulinaryBistroPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for restaurant tickets, kitchen stations, expediter pass, and table service.
 */
export class CulinaryBistroPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'ticket-intake', title: 'Ticket & Order Ingestion', wipLimit: 6 },
      { id: 'station-prep', title: 'Line Stations & Cooking', wipLimit: 4 },
      { id: 'expediter-pass', title: 'Expediter Pass & Plating', wipLimit: 4 },
      { id: 'served-archived', title: 'Served to Table & Billed', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-c1',
        title: 'Table 6 Order: Squab & Turbot Vin Jaune',
        description: 'Fire Course 3 entrées. Coordinate saucier reduction and fish station searing simultaneously.',
        columnId: 'ticket-intake',
        priority: 'high',
        assignee: 'Sous Chef Daniel',
        durationEst: '12m',
        createdAt: '2026-03-01T18:00:00.000Z'
      },
      {
        id: 'task-c2',
        title: 'Table 2 VIP Tasting: Foie Gras with Black Truffle',
        description: 'Sear Hudson Valley foie gras on high cast iron; finish with fresh Périgord truffle shavings.',
        columnId: 'station-prep',
        priority: 'critical',
        assignee: 'Chef de Partie Chloe',
        durationEst: '8m',
        createdAt: '2026-03-01T18:15:00.000Z'
      },
      {
        id: 'task-c3',
        title: 'Table 4 Pass Inspection & Chervil Garnish',
        description: 'Wipe rim plates, verify allergen ticket protocol (shellfish-free), apply micro-greens.',
        columnId: 'expediter-pass',
        priority: 'high',
        assignee: 'Expediter Marc',
        durationEst: '3m',
        createdAt: '2026-03-01T18:25:00.000Z'
      },
      {
        id: 'task-c4',
        title: 'Table 1 Degustation Service Completed',
        description: 'Final mignardises and digestif trolley presented to dining room guest.',
        columnId: 'served-archived',
        priority: 'medium',
        assignee: 'Maître d’ Pierre',
        durationEst: '1.5h',
        createdAt: '2026-03-01T18:30:00.000Z'
      },
      {
        id: 'task-c5',
        title: 'Table 8 Charcoal Seared Wagyu Striploin',
        description: 'Binchotan grill char finish on sous-vide Miyazaki A5 Wagyu with bone marrow jus.',
        columnId: 'station-prep',
        priority: 'medium',
        assignee: 'Grill Station Chef Sam',
        durationEst: '10m',
        createdAt: '2026-03-01T18:35:00.000Z'
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
        console.error('Culinary pipeline subscriber error:', err);
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
      id: taskData.id || `task-c-${Date.now()}`,
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      columnId: targetColId,
      priority: ['critical', 'high', 'medium', 'low'].includes(taskData.priority) ? taskData.priority : 'medium',
      assignee: taskData.assignee ? taskData.assignee.trim() : 'Kitchen Staff',
      durationEst: taskData.durationEst || '10m',
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
    wrapper.className = 'culinary-pipeline-container';

    const header = document.createElement('div');
    header.className = 'culinary-pipeline-header';

    const title = document.createElement('h3');
    title.textContent = 'Kitchen Expediting & Order Flow Pipeline';

    const stats = document.createElement('div');
    stats.className = 'culinary-pipeline-stats';
    const state = this.getBoardState();
    stats.textContent = `Active Kitchen Tickets: ${state.totalTasks}`;

    header.append(title, stats);
    wrapper.append(header);

    const board = document.createElement('div');
    board.className = 'culinary-pipeline-board';

    state.columns.forEach((column) => {
      const colEl = document.createElement('div');
      colEl.className = 'culinary-pipeline-column';
      colEl.setAttribute('data-column-id', column.id);

      const colHeader = document.createElement('div');
      colHeader.className = 'culinary-column-header';

      const colTitle = document.createElement('span');
      colTitle.className = 'culinary-column-title';
      colTitle.textContent = column.title;

      const badge = document.createElement('span');
      badge.className = 'culinary-column-badge';
      badge.textContent = `${column.tasks.length}/${column.wipLimit}`;
      if (column.tasks.length >= column.wipLimit) {
        badge.classList.add('badge-full');
      }

      colHeader.append(colTitle, badge);
      colEl.append(colHeader);

      const taskList = document.createElement('div');
      taskList.className = 'culinary-column-tasks';

      column.tasks.forEach((task) => {
        const taskCard = document.createElement('div');
        taskCard.className = `culinary-task-card priority-${task.priority}`;
        taskCard.draggable = true;
        taskCard.setAttribute('data-task-id', task.id);

        const cardTop = document.createElement('div');
        cardTop.className = 'culinary-card-header';

        const taskHeading = document.createElement('h5');
        taskHeading.textContent = task.title;

        const delBtn = document.createElement('button');
        delBtn.className = 'culinary-task-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete ticket');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteTask(task.id);
        });

        cardTop.append(taskHeading, delBtn);

        const desc = document.createElement('p');
        desc.className = 'culinary-task-desc';
        desc.textContent = task.description;

        const footer = document.createElement('div');
        footer.className = 'culinary-task-footer';

        const priorityPill = document.createElement('span');
        priorityPill.className = `culinary-priority-pill pill-${task.priority}`;
        priorityPill.textContent = task.priority.toUpperCase();

        const assignee = document.createElement('span');
        assignee.className = 'culinary-assignee';
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
