/**
 * HealthVitalityPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for health intake, biomarker diagnostics, active regimens, and goal achievement.
 */
export class HealthVitalityPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'intake-assessment', title: 'Intake & Vitals Assessment', wipLimit: 6 },
      { id: 'biomarker-screening', title: 'Biomarker & Lab Diagnostics', wipLimit: 4 },
      { id: 'active-regimen', title: 'Active Health Regimen', wipLimit: 4 },
      { id: 'goals-achieved', title: 'Goals Achieved & Maintenance', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-h1',
        title: 'Wearable Biometric Sync & Sleep Profiling',
        description: 'Pair continuous glucose monitor and optical HR band to establish 14-day baseline.',
        columnId: 'intake-assessment',
        priority: 'high',
        assignee: 'Dr. Sarah Lin',
        durationEst: '2.0d',
        createdAt: '2026-03-01T08:00:00.000Z'
      },
      {
        id: 'task-h2',
        title: 'Comprehensive Cardio-Metabolic Lipid Panel',
        description: 'Complete ApoB, hs-CRP, fasting insulin, and NMR lipoprofile blood chemistry.',
        columnId: 'biomarker-screening',
        priority: 'critical',
        assignee: 'Quest Diagnostics',
        durationEst: '1.0d',
        createdAt: '2026-03-01T09:30:00.000Z'
      },
      {
        id: 'task-h3',
        title: 'Zone 2 Heart Rate Endurance & VO2 Regimen',
        description: 'Target 180 min weekly aerobic conditioning at 65-72% HR max to boost mitochondrial density.',
        columnId: 'active-regimen',
        priority: 'high',
        assignee: 'Coach Marcus',
        durationEst: '4.0w',
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'task-h4',
        title: 'Metabolic Flexibility & Glucose Stability Attained',
        description: 'Fasting glucose below 88 mg/dL and postprandial spike standard deviation within 15 mg/dL.',
        columnId: 'goals-achieved',
        priority: 'medium',
        assignee: 'Nutritionist Elena',
        durationEst: '8.0w',
        createdAt: '2026-03-01T11:00:00.000Z'
      },
      {
        id: 'task-h5',
        title: 'Circadian Light Optimization & Sleep Hygiene',
        description: 'Morning 10,000 lux photon exposure within 30 min of waking and 9 PM blue-light cutoff.',
        columnId: 'active-regimen',
        priority: 'medium',
        assignee: 'Self-Directed',
        durationEst: '2.0w',
        createdAt: '2026-03-01T11:45:00.000Z'
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
        console.error('Health vitality pipeline subscriber error:', err);
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
      id: taskData.id || `task-h-${Date.now()}`,
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      columnId: targetColId,
      priority: ['critical', 'high', 'medium', 'low'].includes(taskData.priority) ? taskData.priority : 'medium',
      assignee: taskData.assignee ? taskData.assignee.trim() : 'Unassigned',
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
    wrapper.className = 'health-pipeline-container';

    const header = document.createElement('div');
    header.className = 'health-pipeline-header';

    const title = document.createElement('h3');
    title.textContent = 'Clinical Vitals & Regimen Pipeline';

    const stats = document.createElement('div');
    stats.className = 'health-pipeline-stats';
    const state = this.getBoardState();
    stats.textContent = `Total Clinical Tasks: ${state.totalTasks}`;

    header.append(title, stats);
    wrapper.append(header);

    const board = document.createElement('div');
    board.className = 'health-pipeline-board';

    state.columns.forEach((column) => {
      const colEl = document.createElement('div');
      colEl.className = 'health-pipeline-column';
      colEl.setAttribute('data-column-id', column.id);

      const colHeader = document.createElement('div');
      colHeader.className = 'health-column-header';

      const colTitle = document.createElement('span');
      colTitle.className = 'health-column-title';
      colTitle.textContent = column.title;

      const badge = document.createElement('span');
      badge.className = 'health-column-badge';
      badge.textContent = `${column.tasks.length}/${column.wipLimit}`;
      if (column.tasks.length >= column.wipLimit) {
        badge.classList.add('badge-full');
      }

      colHeader.append(colTitle, badge);
      colEl.append(colHeader);

      const taskList = document.createElement('div');
      taskList.className = 'health-column-tasks';

      column.tasks.forEach((task) => {
        const taskCard = document.createElement('div');
        taskCard.className = `health-task-card priority-${task.priority}`;
        taskCard.draggable = true;
        taskCard.setAttribute('data-task-id', task.id);

        const cardTop = document.createElement('div');
        cardTop.className = 'health-card-header';

        const taskHeading = document.createElement('h5');
        taskHeading.textContent = task.title;

        const delBtn = document.createElement('button');
        delBtn.className = 'health-task-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete task');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteTask(task.id);
        });

        cardTop.append(taskHeading, delBtn);

        const desc = document.createElement('p');
        desc.className = 'health-task-desc';
        desc.textContent = task.description;

        const footer = document.createElement('div');
        footer.className = 'health-task-footer';

        const priorityPill = document.createElement('span');
        priorityPill.className = `health-priority-pill pill-${task.priority}`;
        priorityPill.textContent = task.priority.toUpperCase();

        const assignee = document.createElement('span');
        assignee.className = 'health-assignee';
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
