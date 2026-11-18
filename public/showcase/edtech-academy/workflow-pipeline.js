/**
 * EdtechAcademyPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for course authoring, peer review, and certification publishing.
 */
export class EdtechAcademyPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'course-authoring', title: 'Curriculum Authoring', wipLimit: 6 },
      { id: 'peer-review', title: 'Faculty Peer Review', wipLimit: 4 },
      { id: 'beta-testing', title: 'Beta Cohort Testing', wipLimit: 3 },
      { id: 'published-live', title: 'Published & Live', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-e1',
        title: 'WebGL Quantum Simulator Module',
        description: 'Interactive Bloch sphere visualizer and circuit gate builder.',
        columnId: 'course-authoring',
        priority: 'high',
        assignee: 'Prof. Alan Chen',
        durationEst: '4.0d',
        createdAt: '2026-03-01T08:30:00.000Z'
      },
      {
        id: 'task-e2',
        title: 'Autograding Container Sandbox Audit',
        description: 'Verify memory limits, CPU quotas, and syscall sandboxing for student code runs.',
        columnId: 'peer-review',
        priority: 'critical',
        assignee: 'Security Reviewer',
        durationEst: '2.0d',
        createdAt: '2026-03-01T09:15:00.000Z'
      },
      {
        id: 'task-e3',
        title: 'Midterm Beta Cohort Telemetry Run',
        description: 'Analyze item discrimination (IRT) and quiz completion times across 50 beta students.',
        columnId: 'beta-testing',
        priority: 'medium',
        assignee: 'TA Jessica Wu',
        durationEst: '3.0d',
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'task-e4',
        title: 'W3C Open Badges Credential Webhook',
        description: 'Deploy automated cryptographic certificate issuance on course completion.',
        columnId: 'published-live',
        priority: 'low',
        assignee: 'Registrar Automation',
        durationEst: '1.0d',
        createdAt: '2026-03-01T10:30:00.000Z'
      }
    ];

    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getMetrics());
      } catch (err) {
        console.error('Pipeline listener error:', err);
      }
    }
  }

  getColumns() {
    return this.columns.map(c => ({
      ...c,
      taskCount: this.tasks.filter(t => t.columnId === c.id).length
    }));
  }

  getTasks(columnId = null) {
    if (columnId) {
      return this.tasks.filter(t => t.columnId === columnId);
    }
    return [...this.tasks];
  }

  addTask(task) {
    if (!task || !task.title || !task.columnId) {
      throw new Error('Task must include title and columnId');
    }
    const column = this.columns.find(c => c.id === task.columnId);
    if (!column) {
      throw new Error(`Invalid columnId: ${task.columnId}`);
    }

    const currentCount = this.tasks.filter(t => t.columnId === task.columnId).length;
    if (currentCount >= column.wipLimit) {
      throw new Error(`WIP limit reached for column: ${column.title} (${column.wipLimit})`);
    }

    const newTask = {
      id: task.id || `task-e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: task.title.trim(),
      description: (task.description || '').trim(),
      columnId: task.columnId,
      priority: ['critical', 'high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
      assignee: task.assignee || 'Instructional Designer',
      durationEst: task.durationEst || '2d',
      createdAt: task.createdAt || new Date().toISOString()
    };

    this.tasks.push(newTask);
    this.notify();
    return newTask;
  }

  moveTask(taskId, targetColumnId, newIndex = null) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, reason: 'Task not found' };
    }

    const targetColumn = this.columns.find(c => c.id === targetColumnId);
    if (!targetColumn) {
      return { success: false, reason: 'Invalid target column' };
    }

    const currentColumnId = this.tasks[taskIndex].columnId;
    if (currentColumnId !== targetColumnId) {
      const targetCount = this.tasks.filter(t => t.columnId === targetColumnId).length;
      if (targetCount >= targetColumn.wipLimit) {
        return { success: false, reason: `WIP limit exceeded for ${targetColumn.title}` };
      }
    }

    const [task] = this.tasks.splice(taskIndex, 1);
    task.columnId = targetColumnId;

    if (newIndex !== null && newIndex >= 0) {
      const colTasks = this.tasks.filter(t => t.columnId === targetColumnId);
      const insertAtColIdx = Math.min(newIndex, colTasks.length);
      if (insertAtColIdx === colTasks.length) {
        this.tasks.push(task);
      } else {
        const targetRefTask = colTasks[insertAtColIdx];
        const overallIndex = this.tasks.indexOf(targetRefTask);
        this.tasks.splice(overallIndex, 0, task);
      }
    } else {
      this.tasks.push(task);
    }

    this.notify();
    return { success: true, task };
  }

  deleteTask(taskId) {
    const idx = this.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      this.tasks.splice(idx, 1);
      this.notify();
      return true;
    }
    return false;
  }

  getMetrics() {
    const colStats = {};
    for (const c of this.columns) {
      const count = this.tasks.filter(t => t.columnId === c.id).length;
      colStats[c.id] = {
        count,
        wipLimit: c.wipLimit,
        atCapacity: count >= c.wipLimit
      };
    }
    return {
      totalTasks: this.tasks.length,
      columnStats: colStats
    };
  }

  render(container) {
    if (!container) return;
    container.replaceChildren();

    const board = document.createElement('div');
    board.className = 'ed-pipeline-board';

    for (const column of this.columns) {
      const colEl = document.createElement('div');
      colEl.className = 'ed-pipeline-column';
      colEl.dataset.columnId = column.id;

      const colTasks = this.tasks.filter(t => t.columnId === column.id);
      const isOverLimit = colTasks.length >= column.wipLimit;

      const header = document.createElement('div');
      header.className = 'ed-column-header';

      const title = document.createElement('h3');
      title.className = 'ed-column-title';
      title.textContent = column.title;

      const counter = document.createElement('span');
      counter.className = `ed-wip-badge ${isOverLimit ? 'ed-wip-full' : ''}`;
      counter.textContent = `${colTasks.length} / ${column.wipLimit}`;

      header.append(title, counter);

      const taskList = document.createElement('div');
      taskList.className = 'ed-task-list';

      colEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        colEl.classList.add('ed-col-dragover');
      });

      colEl.addEventListener('dragleave', () => {
        colEl.classList.remove('ed-col-dragover');
      });

      colEl.addEventListener('drop', (e) => {
        e.preventDefault();
        colEl.classList.remove('ed-col-dragover');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          this.moveTask(taskId, column.id);
          this.render(container);
        }
      });

      for (const t of colTasks) {
        const card = document.createElement('div');
        card.className = `ed-task-card ed-priority-${t.priority}`;
        card.draggable = true;
        card.dataset.taskId = t.id;

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', t.id);
          card.classList.add('ed-card-dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('ed-card-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'ed-card-header';

        const priorityBadge = document.createElement('span');
        priorityBadge.className = `ed-priority-tag ed-tag-${t.priority}`;
        priorityBadge.textContent = t.priority.toUpperCase();

        const delBtn = document.createElement('button');
        delBtn.className = 'ed-card-del-btn';
        delBtn.textContent = '×';
        delBtn.title = 'Delete Curriculum Task';
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.deleteTask(t.id);
          this.render(container);
        });

        cardTop.append(priorityBadge, delBtn);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'ed-task-title';
        cardTitle.textContent = t.title;

        const cardDesc = document.createElement('div');
        cardDesc.className = 'ed-task-desc';
        cardDesc.textContent = t.description;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'ed-card-meta';

        const assignee = document.createElement('span');
        assignee.className = 'ed-assignee';
        assignee.textContent = `👤 ${t.assignee}`;

        const duration = document.createElement('span');
        duration.className = 'ed-duration';
        duration.textContent = `⏱ ${t.durationEst}`;

        cardFooter.append(assignee, duration);

        card.append(cardTop, cardTitle, cardDesc, cardFooter);
        taskList.append(card);
      }

      colEl.append(header, taskList);
      board.append(colEl);
    }

    container.append(board);
  }
}
