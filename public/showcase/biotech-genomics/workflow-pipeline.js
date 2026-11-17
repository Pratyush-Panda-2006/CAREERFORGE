/**
 * Biotech Genomics - Interactive Drag-and-Drop Task Pipeline & Status Workflow Engine
 * Models Kanban columns, WIP capacity limits, card movements, and JSON state persistence.
 */

export class BiotechGenomicsPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || {
      backlog: {
        id: 'backlog',
        title: 'Sample Extraction',
        wipLimit: 8,
        tasks: [
          {
            id: 'BIO-101',
            title: 'CRISPR Target Off-Site Cleavage Screen',
            desc: 'Prepare high-molecular weight genomic DNA library from cultured human lymphoblast cells',
            priority: 'high',
            assignee: 'Dr. Evelyn Reed'
          },
          {
            id: 'BIO-102',
            title: 'Long-Read RNA Isoform Nanopore Run',
            desc: 'Poly(A) transcript enrichment for alternative splicing differential assay',
            priority: 'medium',
            assignee: 'Technician Lucas'
          }
        ]
      },
      in_progress: {
        id: 'in_progress',
        title: 'NGS Sequencing',
        wipLimit: 3,
        tasks: [
          {
            id: 'BIO-103',
            title: 'NovaSeq 100x Deep Exome Flowcell',
            desc: 'Paired-end 150bp sequencing run across 24 pooled pediatric oncology samples',
            priority: 'high',
            assignee: 'Sequencer Core Lead Chen'
          }
        ]
      },
      review: {
        id: 'review',
        title: 'Variant Calling & Annotation',
        wipLimit: 3,
        tasks: [
          {
            id: 'BIO-104',
            title: 'GATK HaplotypeCaller Somatic Panel',
            desc: 'Filter germline polymorphisms and annotate pathogenic SNVs using ClinVar & gnomAD',
            priority: 'medium',
            assignee: 'Bioinformatician Sarah'
          }
        ]
      },
      completed: {
        id: 'completed',
        title: 'Clinical Reporting',
        wipLimit: 50,
        tasks: [
          {
            id: 'BIO-100',
            title: 'BRCA1/2 Pathogenic Variant Report',
            desc: 'Validated with orthogonal Sanger sequencing, sign-off transmitted to oncology team',
            priority: 'low',
            assignee: 'Medical Geneticist Dr. Vance'
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
      id: card.id || `BIO-${Date.now().toString().slice(-4)}`,
      title: card.title || 'Untitled Genomics Task',
      desc: card.desc || 'No protocol specified',
      priority: card.priority || 'medium',
      assignee: card.assignee || 'Lab Scientist'
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

    const pipeline = new BiotechGenomicsPipelineEngine();
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

      Object.values(cols).forEach(col => {
        const colEl = document.createElement('section');
        colEl.className = 'kanban-column';
        colEl.dataset.colId = col.id;

        const isAtLimit = col.tasks.length >= col.wipLimit;

        const header = document.createElement('div');
        header.className = 'column-header';
        header.innerHTML = `
          <div class="column-title-group">
            <h2 class="column-title">${col.title}</h2>
            <span class="count-pill">${col.tasks.length}</span>
          </div>
          <span class="wip-badge ${isAtLimit ? 'wip-warning' : ''}">WIP: ${col.tasks.length}/${col.wipLimit}</span>
        `;

        const taskList = document.createElement('div');
        taskList.className = 'tasks-container';

        col.tasks.forEach(task => {
          const card = document.createElement('article');
          card.className = 'task-card';
          card.draggable = true;
          card.dataset.taskId = task.id;

          card.innerHTML = `
            <div class="task-card-header">
              <span class="task-id">${task.id}</span>
              <span class="priority-tag priority-${task.priority}">${task.priority}</span>
            </div>
            <h3 class="task-title">${task.title}</h3>
            <p class="task-desc">${task.desc}</p>
            <div class="task-footer">
              <span>👤 ${task.assignee}</span>
            </div>
          `;

          card.addEventListener('dragstart', (e) => {
            draggedTaskId = task.id;
            sourceColId = col.id;
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
          });

          card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            draggedTaskId = null;
            sourceColId = null;
          });

          taskList.appendChild(card);
        });

        colEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          colEl.classList.add('drag-over');
        });

        colEl.addEventListener('dragleave', () => {
          colEl.classList.remove('drag-over');
        });

        colEl.addEventListener('drop', (e) => {
          e.preventDefault();
          colEl.classList.remove('drag-over');
          if (draggedTaskId && sourceColId && sourceColId !== col.id) {
            try {
              pipeline.moveCard(draggedTaskId, sourceColId, col.id);
              renderBoard();
            } catch (err) {
              alert(err.message);
            }
          }
        });

        colEl.appendChild(header);
        colEl.appendChild(taskList);
        boardContainer.appendChild(colEl);
      });
    }

    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (cancelModalBtn) {
      cancelModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const colId = document.getElementById('taskColSelect').value;
        const title = document.getElementById('taskTitleInput').value;
        const desc = document.getElementById('taskDescInput').value;
        const priority = document.getElementById('taskPrioritySelect').value;
        const assignee = document.getElementById('taskAssigneeInput').value;

        try {
          pipeline.addCard(colId, { title, desc, priority, assignee });
          modal.classList.remove('active');
          taskForm.reset();
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
        a.download = `biotech-genomics-pipeline-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    renderBoard();
  });
}
