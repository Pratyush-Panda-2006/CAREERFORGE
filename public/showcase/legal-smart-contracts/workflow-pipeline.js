/**
 * Legal Smart Contracts - Interactive Drag-and-Drop Task Pipeline & Status Workflow Engine
 * Models Kanban columns, WIP capacity limits, card movements, and JSON state persistence.
 */

export class LegalSmartContractsPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || {
      backlog: {
        id: 'backlog',
        title: 'Drafting Queue',
        wipLimit: 8,
        tasks: [
          {
            id: 'LGL-201',
            title: 'DAO Cross-Chain Treasury Charter',
            desc: 'Draft multisig quorum threshold rules & snapshot hook',
            priority: 'high',
            assignee: 'Alice (Legal Counsel)'
          },
          {
            id: 'LGL-202',
            title: 'IP Licensing Tokenization Wrapper',
            desc: 'Synthesize commercial royalty distribution provisions',
            priority: 'medium',
            assignee: 'Bob (Smart Contract Dev)'
          }
        ]
      },
      in_progress: {
        id: 'in_progress',
        title: 'Audit & Analysis',
        wipLimit: 3,
        tasks: [
          {
            id: 'LGL-203',
            title: 'Formal Verification of Reentrancy Locks',
            desc: 'Run Certora provers on escrow settlement contract',
            priority: 'high',
            assignee: 'SecAudit Team'
          }
        ]
      },
      review: {
        id: 'review',
        title: 'Jurisdiction Review',
        wipLimit: 3,
        tasks: [
          {
            id: 'LGL-204',
            title: 'EIP-712 Signature Legal Binding Test',
            desc: 'Cross-reference statutory compliance under electronic e-sign acts',
            priority: 'medium',
            assignee: 'Partner Advocate'
          }
        ]
      },
      completed: {
        id: 'completed',
        title: 'On-Chain Deployed',
        wipLimit: 50,
        tasks: [
          {
            id: 'LGL-200',
            title: 'Automated Dispute Escrow Module',
            desc: 'Audited and deployed to Ethereum Mainnet with multisig ownership',
            priority: 'low',
            assignee: 'DevOps Lead'
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
      id: card.id || `LGL-${Date.now().toString().slice(-4)}`,
      title: card.title || 'Untitled Legal Clause Task',
      desc: card.desc || 'No description provided',
      priority: card.priority || 'medium',
      assignee: card.assignee || 'Unassigned'
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

    const pipeline = new LegalSmartContractsPipelineEngine();
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

      for (const colKey of Object.keys(cols)) {
        const colData = cols[colKey];
        const isWipExceeded = colData.tasks.length >= colData.wipLimit;

        const colEl = document.createElement('div');
        colEl.className = `kanban-column ${isWipExceeded ? 'wip-exceeded' : ''}`;
        colEl.dataset.colId = colKey;

        // Header
        const header = document.createElement('div');
        header.className = 'column-header';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'column-title-wrap';

        const title = document.createElement('h3');
        title.className = 'column-title';
        title.textContent = colData.title;

        const badge = document.createElement('span');
        badge.className = 'column-count-badge';
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
          assignee.textContent = `⚖️ ${task.assignee}`;

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
        const assigneeVal = document.getElementById('taskAssigneeInput')?.value || 'Legal Associate';

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
        a.download = `legal-pipeline-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    renderBoard();
  });
}
