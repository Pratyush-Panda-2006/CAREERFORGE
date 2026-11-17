/**
 * Smart IoT Nexus - Interactive Drag-and-Drop Task Pipeline & Status Workflow Engine
 * Models Kanban columns, WIP capacity limits, card movements, and JSON state persistence.
 */

export class SmartIotNexusPipelineEngine {
  constructor(initialData = null) {
    this.columns = initialData?.columns || {
      backlog: {
        id: 'backlog',
        title: 'Device Provisioning',
        wipLimit: 8,
        tasks: [
          {
            id: 'IOT-101',
            title: 'Gateway ESP32-S3 Secure Boot Flash',
            desc: 'Generate hardware root-of-trust RSA-3072 keypair and burn eFuses for encrypted flash',
            priority: 'high',
            assignee: 'Security Lead Dave'
          },
          {
            id: 'IOT-102',
            title: 'Sub-GHz Mesh Radio Frequency Tuning',
            desc: 'Calibrate 868MHz / 915MHz LoRa PA power output and channel hopping sequence',
            priority: 'medium',
            assignee: 'RF Engineer Maya'
          }
        ]
      },
      in_progress: {
        id: 'in_progress',
        title: 'OTA Firmware Flash',
        wipLimit: 3,
        tasks: [
          {
            id: 'IOT-103',
            title: 'Delta Firmware Differential OTA Rollout',
            desc: 'Deploy compressed bsdiff 180KB patch to 500 edge smart agricultural sensors',
            priority: 'high',
            assignee: 'OTA Deployment Bot'
          }
        ]
      },
      review: {
        id: 'review',
        title: 'Telemetry & Calibration',
        wipLimit: 3,
        tasks: [
          {
            id: 'IOT-104',
            title: 'IMU 6-Axis Gyro Zero-Rate Drift Calibration',
            desc: 'Execute Allan variance drift test and write thermal compensation offsets into EEPROM',
            priority: 'medium',
            assignee: 'Embedded Dev Liam'
          }
        ]
      },
      completed: {
        id: 'completed',
        title: 'Active Fleet Deployment',
        wipLimit: 50,
        tasks: [
          {
            id: 'IOT-100',
            title: 'Smart Meter Cellular NB-IoT Node',
            desc: 'MQTT over TLS 1.3 heartbeat established, streaming telemetry to telemetry sink',
            priority: 'low',
            assignee: 'Field Ops Sarah'
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
      id: card.id || `IOT-${Date.now().toString().slice(-4)}`,
      title: card.title || 'Untitled Edge Device Task',
      desc: card.desc || 'No specification provided',
      priority: card.priority || 'medium',
      assignee: card.assignee || 'Field Ops'
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

    const pipeline = new SmartIotNexusPipelineEngine();
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
        a.download = `smart-iot-nexus-pipeline-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    renderBoard();
  });
}
