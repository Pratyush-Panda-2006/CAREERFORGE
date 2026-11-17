/**
 * Streaming Cinema Hub - Interactive Drag-and-Drop Task Pipeline & Status Workflow Engine
 * Models Kanban columns, WIP capacity limits, card movements, and JSON state persistence.
 */

export class StreamingCinemaHubPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || {
      backlog: {
        id: 'backlog',
        title: 'Licensing & Catalog Queue',
        wipLimit: 8,
        tasks: [
          {
            id: 'MOV-101',
            title: '4K HDR Master Ingestion - Dune 2',
            desc: 'Ingest ProRes 4444 master and Dolby Atmos stem mix',
            priority: 'high',
            assignee: 'Warner Bros / Ingest QC'
          },
          {
            id: 'MOV-102',
            title: 'Multilingual Subtitle Alignment - Blade Runner',
            desc: 'Sync 24 international language WebVTT tracks with timecodes',
            priority: 'medium',
            assignee: 'Localization Ops'
          }
        ]
      },
      in_progress: {
        id: 'in_progress',
        title: 'Encoding & Transcoding',
        wipLimit: 3,
        tasks: [
          {
            id: 'MOV-103',
            title: 'AV1 & HEVC Adaptive Ladder Transcode',
            desc: 'Transcode bitrates from 360p to 4K UHD with HDR10 metadata',
            priority: 'high',
            assignee: 'Encoding Cluster A'
          }
        ]
      },
      review: {
        id: 'review',
        title: 'Editorial & Quality Assurance',
        wipLimit: 3,
        tasks: [
          {
            id: 'MOV-104',
            title: 'Digital Rights & DRM Licensing Checks',
            desc: 'Verify Widevine L1 and FairPlay Streaming encryption certificates',
            priority: 'medium',
            assignee: 'Security Lead'
          }
        ]
      },
      completed: {
        id: 'completed',
        title: 'Live on Streaming CDN',
        wipLimit: 50,
        tasks: [
          {
            id: 'MOV-100',
            title: 'Sci-Fi Classics Premieres',
            desc: 'Pushed to Cloudflare Edge CDN with geo-redundancy',
            priority: 'low',
            assignee: 'Release Engineer'
          }
        ]
      }
    };
  }

  getColumns() {
    return this.columns;
  }

  checkWipLimit(colId) {
    const col = this.columns[colId];
    if (!col) return false;
    return col.tasks.length >= col.wipLimit;
  }

  moveCard(cardId, fromColId, toColId) {
    const fromCol = this.columns[fromColId];
    const toCol = this.columns[toColId];

    if (!fromCol || !toCol) {
      throw new Error(`Invalid column identifier: from '${fromColId}' to '${toColId}'`);
    }

    if (fromColId === toColId) {
      return false;
    }

    if (this.checkWipLimit(toColId)) {
      throw new Error(`WIP limit exceeded for column '${toCol.title}' (Max: ${toCol.wipLimit})`);
    }

    const taskIndex = fromCol.tasks.findIndex(t => t.id === cardId);
    if (taskIndex === -1) {
      throw new Error(`Task with id '${cardId}' not found in column '${fromColId}'`);
    }

    const [card] = fromCol.tasks.splice(taskIndex, 1);
    toCol.tasks.push(card);
    return true;
  }

  addCard(colId, card) {
    const col = this.columns[colId];
    if (!col) throw new Error(`Column '${colId}' not found`);
    if (this.checkWipLimit(colId)) {
      throw new Error(`Cannot add task: WIP limit exceeded for '${col.title}'`);
    }

    const newCard = {
      id: card.id || `MOV-${Date.now().toString().slice(-4)}`,
      title: card.title || 'Untitled Stream Release',
      desc: card.desc || 'No description provided',
      priority: card.priority || 'medium',
      assignee: card.assignee || 'Media Operations'
    };

    col.tasks.push(newCard);
    return newCard;
  }

  removeCard(cardId) {
    for (const col of Object.values(this.columns)) {
      const idx = col.tasks.findIndex(t => t.id === cardId);
      if (idx !== -1) {
        return col.tasks.splice(idx, 1)[0];
      }
    }
    return null;
  }

  exportPipelineJSON() {
    return JSON.stringify(this.columns, null, 2);
  }
}

// UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const boardContainer = document.getElementById('kanbanBoard');
    if (!boardContainer) return;

    const pipeline = new StreamingCinemaHubPipelineEngine();
    let draggedTaskId = null;
    let sourceColId = null;

    const modal = document.getElementById('taskModal');
    const openModalBtn = document.getElementById('openNewTaskModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const taskForm = document.getElementById('newTaskForm');
    const exportBtn = document.getElementById('exportPipelineBtn');

    function renderBoard() {
      boardContainer.replaceChildren();
      const cols = pipeline.getColumns();

      for (const [colKey, colData] of Object.entries(cols)) {
        const colEl = document.createElement('div');
        colEl.className = 'kanban-column';
        colEl.dataset.colId = colKey;

        // Header
        const header = document.createElement('div');
        header.className = 'column-header';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'col-title-wrap';

        const title = document.createElement('span');
        title.className = 'column-title';
        title.textContent = colData.title;

        const isWipExceeded = colData.tasks.length >= colData.wipLimit;
        const badge = document.createElement('span');
        badge.className = 'count-badge';
        badge.textContent = `${colData.tasks.length}/${colData.wipLimit}`;

        titleWrap.append(title, badge);

        const wip = document.createElement('span');
        wip.className = `wip-indicator ${isWipExceeded ? 'warning' : ''}`;
        wip.textContent = isWipExceeded ? 'WIP Full' : 'WIP Ok';

        header.append(titleWrap, wip);

        // Body
        const body = document.createElement('div');
        body.className = 'column-body';
        body.dataset.colId = colKey;

        for (const task of colData.tasks) {
          const card = document.createElement('div');
          card.className = 'task-card';
          card.draggable = true;
          card.dataset.taskId = task.id;
          card.dataset.colId = colKey;

          const topRow = document.createElement('div');
          topRow.className = 'card-top';

          const idSpan = document.createElement('span');
          idSpan.className = 'card-id';
          idSpan.textContent = task.id;

          const prioSpan = document.createElement('span');
          prioSpan.className = `priority-tag priority-${task.priority}`;
          prioSpan.textContent = task.priority;

          topRow.append(idSpan, prioSpan);

          const h4 = document.createElement('h4');
          h4.className = 'card-title';
          h4.textContent = task.title;

          const pDesc = document.createElement('p');
          pDesc.className = 'card-desc';
          pDesc.textContent = task.desc;

          const meta = document.createElement('div');
          meta.className = 'card-meta';

          const assignee = document.createElement('span');
          assignee.textContent = `🎬 ${task.assignee}`;

          meta.append(assignee);
          card.append(topRow, h4, pDesc, meta);

          card.addEventListener('dragstart', (e) => {
            draggedTaskId = task.id;
            sourceColId = colKey;
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
          });

          card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
          });

          body.appendChild(card);
        }

        colEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          colEl.classList.add('drag-over');
        });

        colEl.addEventListener('dragleave', (e) => {
          if (!colEl.contains(e.relatedTarget)) {
            colEl.classList.remove('drag-over');
          }
        });

        colEl.addEventListener('drop', (e) => {
          e.preventDefault();
          colEl.classList.remove('drag-over');
          if (!draggedTaskId || !sourceColId) return;

          try {
            pipeline.moveCard(draggedTaskId, sourceColId, colKey);
            renderBoard();
          } catch (err) {
            alert(err.message);
          } finally {
            draggedTaskId = null;
            sourceColId = null;
          }
        });

        colEl.append(header, body);
        boardContainer.appendChild(colEl);
      }
    }

    if (openModalBtn && modal) {
      openModalBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (cancelModalBtn && modal) {
      cancelModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const targetCol = document.getElementById('taskColSelect')?.value || 'backlog';
        const titleVal = document.getElementById('taskTitleInput')?.value || '';
        const descVal = document.getElementById('taskDescInput')?.value || '';
        const prioVal = document.getElementById('taskPrioritySelect')?.value || 'medium';
        const assigneeVal = document.getElementById('taskAssigneeInput')?.value || 'Cinema QC';

        try {
          pipeline.addCard(targetCol, {
            title: titleVal,
            desc: descVal,
            priority: prioVal,
            assignee: assigneeVal
          });
          taskForm.reset();
          modal?.classList.remove('active');
          renderBoard();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = pipeline.exportPipelineJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cinema-pipeline-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    renderBoard();
  });
}
