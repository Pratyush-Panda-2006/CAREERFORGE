/**
 * RealEstateLuxePipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for luxury estate listings, VIP buyer vetting, escrow due diligence, and title closings.
 */
export class RealEstateLuxePipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'exclusive-listing', title: 'Exclusive Listing Intake', wipLimit: 6 },
      { id: 'buyer-verification', title: 'VIP Buyer Vetting & NDA', wipLimit: 4 },
      { id: 'escrow-due-diligence', title: 'Escrow Due Diligence', wipLimit: 4 },
      { id: 'title-closed', title: 'Title Recorded & Handover', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-r1',
        title: 'Bel Air Promontory Estate LiDAR Mapping',
        description: 'Complete high-precision architectural photogrammetry and interior 3D matterport model.',
        columnId: 'exclusive-listing',
        priority: 'high',
        assignee: 'Media Lead Julian',
        durationEst: '2.0d',
        createdAt: '2026-03-01T08:00:00.000Z'
      },
      {
        id: 'task-r2',
        title: 'Family Office Proof-of-Funds & KYC Clearance',
        description: 'Review sovereign wealth fund liquidity statement for $35,000,000 cash acquisition.',
        columnId: 'buyer-verification',
        priority: 'critical',
        assignee: 'General Counsel Sophia',
        durationEst: '1.0d',
        createdAt: '2026-03-01T08:45:00.000Z'
      },
      {
        id: 'task-r3',
        title: 'Geotechnical Soil Survey & Slope Stability Audit',
        description: 'Inspect caisson bedrock anchors and hillside retaining walls with structural engineers.',
        columnId: 'escrow-due-diligence',
        priority: 'high',
        assignee: 'Engineering Ops',
        durationEst: '4.0d',
        createdAt: '2026-03-01T09:30:00.000Z'
      },
      {
        id: 'task-r4',
        title: 'County Recorder Grant Deed Registration',
        description: 'Notarize official grant deed conveyance and coordinate biometric keycard handover.',
        columnId: 'title-closed',
        priority: 'medium',
        assignee: 'Escrow Officer Miller',
        durationEst: '1.0d',
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'task-r5',
        title: 'Custom Curated Italian Furniture Bill of Sale',
        description: 'Execute bespoke furnishing transfer schedule and provenance authentication certificates.',
        columnId: 'escrow-due-diligence',
        priority: 'medium',
        assignee: 'Interior Architect Leo',
        durationEst: '2.0d',
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
        console.error('Real estate pipeline subscriber error:', err);
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
      id: taskData.id || `task-r-${Date.now()}`,
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      columnId: targetColId,
      priority: ['critical', 'high', 'medium', 'low'].includes(taskData.priority) ? taskData.priority : 'medium',
      assignee: taskData.assignee ? taskData.assignee.trim() : 'Listing Agent',
      durationEst: taskData.durationEst || '1.0d',
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
    wrapper.className = 'luxe-pipeline-container';

    const header = document.createElement('div');
    header.className = 'luxe-pipeline-header';

    const title = document.createElement('h3');
    title.textContent = 'Luxury Estate Dealflow Pipeline';

    const stats = document.createElement('div');
    stats.className = 'luxe-pipeline-stats';
    const state = this.getBoardState();
    stats.textContent = `Active Estate Transactions: ${state.totalTasks}`;

    header.append(title, stats);
    wrapper.append(header);

    const board = document.createElement('div');
    board.className = 'luxe-pipeline-board';

    state.columns.forEach((column) => {
      const colEl = document.createElement('div');
      colEl.className = 'luxe-pipeline-column';
      colEl.setAttribute('data-column-id', column.id);

      const colHeader = document.createElement('div');
      colHeader.className = 'luxe-column-header';

      const colTitle = document.createElement('span');
      colTitle.className = 'luxe-column-title';
      colTitle.textContent = column.title;

      const badge = document.createElement('span');
      badge.className = 'luxe-column-badge';
      badge.textContent = `${column.tasks.length}/${column.wipLimit}`;
      if (column.tasks.length >= column.wipLimit) {
        badge.classList.add('badge-full');
      }

      colHeader.append(colTitle, badge);
      colEl.append(colHeader);

      const taskList = document.createElement('div');
      taskList.className = 'luxe-column-tasks';

      column.tasks.forEach((task) => {
        const taskCard = document.createElement('div');
        taskCard.className = `luxe-task-card priority-${task.priority}`;
        taskCard.draggable = true;
        taskCard.setAttribute('data-task-id', task.id);

        const cardTop = document.createElement('div');
        cardTop.className = 'luxe-card-header';

        const taskHeading = document.createElement('h5');
        taskHeading.textContent = task.title;

        const delBtn = document.createElement('button');
        delBtn.className = 'luxe-task-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete item');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteTask(task.id);
        });

        cardTop.append(taskHeading, delBtn);

        const desc = document.createElement('p');
        desc.className = 'luxe-task-desc';
        desc.textContent = task.description;

        const footer = document.createElement('div');
        footer.className = 'luxe-task-footer';

        const priorityPill = document.createElement('span');
        priorityPill.className = `luxe-priority-pill pill-${task.priority}`;
        priorityPill.textContent = task.priority.toUpperCase();

        const assignee = document.createElement('span');
        assignee.className = 'luxe-assignee';
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
