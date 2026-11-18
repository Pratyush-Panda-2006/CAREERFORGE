/**
 * AiVoiceStudioPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for voice synthesis production tracks.
 */
export class AiVoiceStudioPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'script-drafting', title: 'Script Drafting', wipLimit: 6 },
      { id: 'neural-synthesis', title: 'Neural Synthesis', wipLimit: 4 },
      { id: 'mastering-qa', title: 'Mastering & QA', wipLimit: 3 },
      { id: 'final-export', title: 'Final Export', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-v1',
        title: 'Audiobook Chapter 4 SSML Annotation',
        description: 'Tag dialogue pauses, rate contours, and emotional prosody accents.',
        columnId: 'script-drafting',
        priority: 'high',
        assignee: 'Elena Rostova',
        durationEst: '2.5h',
        createdAt: '2026-03-01T09:00:00.000Z'
      },
      {
        id: 'task-v2',
        title: 'Zero-Shot Polyglot Neural Synthesis',
        description: 'Batch infer Spanish and Japanese localized dub stems with XTTS-v2.',
        columnId: 'neural-synthesis',
        priority: 'critical',
        assignee: 'Devin Miller',
        durationEst: '45m',
        createdAt: '2026-03-01T09:30:00.000Z'
      },
      {
        id: 'task-v3',
        title: 'Multiband Compressor & De-Esser Pass',
        description: 'Eliminate high-frequency sibilance artifacts from generated phonemes.',
        columnId: 'mastering-qa',
        priority: 'medium',
        assignee: 'SoundLab QA',
        durationEst: '1.2h',
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'task-v4',
        title: 'Master FLAC Broadcast Export & Checksum',
        description: 'Render 24-bit 96kHz broadcast WAV + FLAC archive packages.',
        columnId: 'final-export',
        priority: 'low',
        assignee: 'Automated Bot',
        durationEst: '15m',
        createdAt: '2026-03-01T10:15:00.000Z'
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
      id: task.id || `task-v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: task.title.trim(),
      description: (task.description || '').trim(),
      columnId: task.columnId,
      priority: ['critical', 'high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
      assignee: task.assignee || 'Unassigned',
      durationEst: task.durationEst || '1h',
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
    board.className = 'av-pipeline-board';

    for (const column of this.columns) {
      const colEl = document.createElement('div');
      colEl.className = 'av-pipeline-column';
      colEl.dataset.columnId = column.id;

      const colTasks = this.tasks.filter(t => t.columnId === column.id);
      const isOverLimit = colTasks.length >= column.wipLimit;

      const header = document.createElement('div');
      header.className = 'av-column-header';

      const title = document.createElement('h3');
      title.className = 'av-column-title';
      title.textContent = column.title;

      const counter = document.createElement('span');
      counter.className = `av-wip-badge ${isOverLimit ? 'av-wip-full' : ''}`;
      counter.textContent = `${colTasks.length} / ${column.wipLimit}`;

      header.append(title, counter);

      const taskList = document.createElement('div');
      taskList.className = 'av-task-list';

      colEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        colEl.classList.add('av-col-dragover');
      });

      colEl.addEventListener('dragleave', () => {
        colEl.classList.remove('av-col-dragover');
      });

      colEl.addEventListener('drop', (e) => {
        e.preventDefault();
        colEl.classList.remove('av-col-dragover');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          this.moveTask(taskId, column.id);
          this.render(container);
        }
      });

      for (const t of colTasks) {
        const card = document.createElement('div');
        card.className = `av-task-card av-priority-${t.priority}`;
        card.draggable = true;
        card.dataset.taskId = t.id;

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', t.id);
          card.classList.add('av-card-dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('av-card-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'av-card-header';

        const priorityBadge = document.createElement('span');
        priorityBadge.className = `av-priority-tag av-tag-${t.priority}`;
        priorityBadge.textContent = t.priority.toUpperCase();

        const delBtn = document.createElement('button');
        delBtn.className = 'av-card-del-btn';
        delBtn.textContent = '×';
        delBtn.title = 'Delete Task';
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.deleteTask(t.id);
          this.render(container);
        });

        cardTop.append(priorityBadge, delBtn);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'av-task-title';
        cardTitle.textContent = t.title;

        const cardDesc = document.createElement('div');
        cardDesc.className = 'av-task-desc';
        cardDesc.textContent = t.description;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'av-card-meta';

        const assignee = document.createElement('span');
        assignee.className = 'av-assignee';
        assignee.textContent = `👤 ${t.assignee}`;

        const duration = document.createElement('span');
        duration.className = 'av-duration';
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
