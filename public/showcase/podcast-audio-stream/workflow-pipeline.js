/**
 * PodcastAudioStreamPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for podcast episode production and distribution.
 */
export class PodcastAudioStreamPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || [
      { id: 'recording-prep', title: 'Recording & Ingest', wipLimit: 6 },
      { id: 'editing-mastering', title: 'Editing & Mastering', wipLimit: 4 },
      { id: 'transcription-chapters', title: 'Chapters & Transcript', wipLimit: 3 },
      { id: 'rss-cdn-syndication', title: 'Syndication & CDN', wipLimit: 8 }
    ];

    this.tasks = initialData?.tasks || [
      {
        id: 'task-p1',
        title: 'Host Multitrack Ingest & Level Balance',
        description: 'Ingest raw 32-bit float audio tracks from guest and host studio microphones.',
        columnId: 'recording-prep',
        priority: 'high',
        assignee: 'Sarah Vance',
        durationEst: '2.0h',
        createdAt: '2026-03-01T08:30:00.000Z'
      },
      {
        id: 'task-p2',
        title: 'LUFS Normalization & Noise Gate Pass',
        description: 'Process two-pass loudness compressor to hit strict -16 LUFS standard.',
        columnId: 'editing-mastering',
        priority: 'critical',
        assignee: 'Audio Engineer Alpha',
        durationEst: '1.5h',
        createdAt: '2026-03-01T09:15:00.000Z'
      },
      {
        id: 'task-p3',
        title: 'Whisper AI Speech-to-Text & Chapter Tags',
        description: 'Generate WebVTT transcript with speaker identification and ID3 chapter anchors.',
        columnId: 'transcription-chapters',
        priority: 'medium',
        assignee: 'Content Editor',
        durationEst: '45m',
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'task-p4',
        title: 'HLS Transcode & RSS 2.0 Webhook Ping',
        description: 'Deploy multi-bitrate AAC ladder to edge CDN and notify podcast aggregators.',
        columnId: 'rss-cdn-syndication',
        priority: 'low',
        assignee: 'Syndication Bot',
        durationEst: '15m',
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
      id: task.id || `task-p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: task.title.trim(),
      description: (task.description || '').trim(),
      columnId: task.columnId,
      priority: ['critical', 'high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
      assignee: task.assignee || 'Studio Team',
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
    board.className = 'pas-pipeline-board';

    for (const column of this.columns) {
      const colEl = document.createElement('div');
      colEl.className = 'pas-pipeline-column';
      colEl.dataset.columnId = column.id;

      const colTasks = this.tasks.filter(t => t.columnId === column.id);
      const isOverLimit = colTasks.length >= column.wipLimit;

      const header = document.createElement('div');
      header.className = 'pas-column-header';

      const title = document.createElement('h3');
      title.className = 'pas-column-title';
      title.textContent = column.title;

      const counter = document.createElement('span');
      counter.className = `pas-wip-badge ${isOverLimit ? 'pas-wip-full' : ''}`;
      counter.textContent = `${colTasks.length} / ${column.wipLimit}`;

      header.append(title, counter);

      const taskList = document.createElement('div');
      taskList.className = 'pas-task-list';

      colEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        colEl.classList.add('pas-col-dragover');
      });

      colEl.addEventListener('dragleave', () => {
        colEl.classList.remove('pas-col-dragover');
      });

      colEl.addEventListener('drop', (e) => {
        e.preventDefault();
        colEl.classList.remove('pas-col-dragover');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          this.moveTask(taskId, column.id);
          this.render(container);
        }
      });

      for (const t of colTasks) {
        const card = document.createElement('div');
        card.className = `pas-task-card pas-priority-${t.priority}`;
        card.draggable = true;
        card.dataset.taskId = t.id;

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', t.id);
          card.classList.add('pas-card-dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('pas-card-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'pas-card-header';

        const priorityBadge = document.createElement('span');
        priorityBadge.className = `pas-priority-tag pas-tag-${t.priority}`;
        priorityBadge.textContent = t.priority.toUpperCase();

        const delBtn = document.createElement('button');
        delBtn.className = 'pas-card-del-btn';
        delBtn.textContent = '×';
        delBtn.title = 'Delete Task';
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.deleteTask(t.id);
          this.render(container);
        });

        cardTop.append(priorityBadge, delBtn);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'pas-task-title';
        cardTitle.textContent = t.title;

        const cardDesc = document.createElement('div');
        cardDesc.className = 'pas-task-desc';
        cardDesc.textContent = t.description;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'pas-card-meta';

        const assignee = document.createElement('span');
        assignee.className = 'pas-assignee';
        assignee.textContent = `👤 ${t.assignee}`;

        const duration = document.createElement('span');
        duration.className = 'pas-duration';
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
