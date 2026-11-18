/**
 * EcommercePipelineEngine
 * Interactive drag-and-drop order fulfillment & warehouse status workflow engine for e-commerce order routing, picking, dispatch, and final delivery.
 */
export class EcommercePipelineEngine {
  constructor(options = {}) {
    this.stages = options.stages || [
      { id: 'order-placed', title: 'Order Placed & Verified', wipLimit: 8 },
      { id: 'picking-packing', title: 'Warehouse Picking & Packing', wipLimit: 5 },
      { id: 'in-transit', title: 'Dispatched & Carrier In-Transit', wipLimit: 6 },
      { id: 'delivered', title: 'Delivered & Completed', wipLimit: 12 }
    ];

    this.tasks = options.tasks || [
      {
        id: 'ORD-8801',
        title: 'Obsidian Merino Wool Performance Tee x2',
        stage: 'order-placed',
        priority: 'high',
        courier: 'DHL Express',
        value: '$98.00'
      },
      {
        id: 'ORD-8802',
        title: 'Noise-Cancelling Wireless Headphones x1',
        stage: 'picking-packing',
        priority: 'critical',
        courier: 'FedEx Overnight',
        value: '$249.99'
      },
      {
        id: 'ORD-8803',
        title: 'Ergonomic Mechanical Keyboard with Wrist Rest',
        stage: 'in-transit',
        priority: 'medium',
        courier: 'UPS Ground',
        value: '$139.50'
      },
      {
        id: 'ORD-8804',
        title: 'Titanium Minimalist Smart Watchband',
        stage: 'delivered',
        priority: 'low',
        courier: 'USPS Priority',
        value: '$45.00'
      },
      {
        id: 'ORD-8805',
        title: 'Ultra-Lightweight Carbon Fiber Travel Bag',
        stage: 'order-placed',
        priority: 'high',
        courier: 'DHL Express',
        value: '$185.00'
      }
    ];

    this.listeners = [];
  }

  getStages() {
    return this.stages;
  }

  getTasks() {
    return this.tasks;
  }

  getTasksByStage(stageId) {
    return this.tasks.filter((t) => t.stage === stageId);
  }

  addTask(task) {
    if (!task.title) {
      throw new Error('Task title is required');
    }
    const stageId = task.stage || this.stages[0].id;
    const currentInStage = this.getTasksByStage(stageId);
    const stageConfig = this.stages.find((s) => s.id === stageId);

    if (stageConfig && currentInStage.length >= stageConfig.wipLimit) {
      throw new Error(`WIP limit of ${stageConfig.wipLimit} reached for stage: ${stageConfig.title}`);
    }

    const newTask = {
      id: task.id || `ORD-${Math.floor(8000 + Math.random() * 2000)}`,
      title: task.title,
      stage: stageId,
      priority: task.priority || 'medium',
      courier: task.courier || 'Standard Ground',
      value: task.value || '$50.00'
    };

    this.tasks.push(newTask);
    this.notify();
    return newTask;
  }

  moveTask(taskId, targetStageId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const targetStage = this.stages.find((s) => s.id === targetStageId);
    if (!targetStage) {
      throw new Error(`Stage ${targetStageId} does not exist`);
    }

    if (task.stage === targetStageId) return task;

    const countInTarget = this.getTasksByStage(targetStageId).length;
    if (countInTarget >= targetStage.wipLimit) {
      throw new Error(`Cannot move order: WIP limit of ${targetStage.wipLimit} reached for ${targetStage.title}`);
    }

    task.stage = targetStageId;
    this.notify();
    return task;
  }

  deleteTask(taskId) {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    this.notify();
    return true;
  }

  getMetrics() {
    const totalTasks = this.tasks.length;
    const stageCounts = {};
    this.stages.forEach((s) => {
      stageCounts[s.id] = this.getTasksByStage(s.id).length;
    });

    const deliveredCount = stageCounts['delivered'] || 0;
    const inFulfillmentCount = totalTasks - deliveredCount;

    return {
      totalTasks,
      stageCounts,
      deliveredCount,
      inFulfillmentCount
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.tasks));
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const pipelineContainer = document.createElement('div');
    pipelineContainer.className = 'ecom-pipeline-container';

    // Header
    const header = document.createElement('div');
    header.className = 'ecom-pipeline-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'ecom-pipeline-title-group';

    const title = document.createElement('h3');
    title.textContent = 'E-Commerce Order Fulfillment & Logistics Pipeline';

    const subtitle = document.createElement('p');
    subtitle.className = 'ecom-pipeline-subtitle';
    subtitle.textContent = 'Monitor customer orders from checkout verification through automated picking and carrier dispatch to final delivery.';

    titleGroup.append(title, subtitle);

    const metricsBadge = document.createElement('div');
    metricsBadge.className = 'ecom-pipeline-metrics';
    const metrics = this.getMetrics();
    metricsBadge.textContent = `${metrics.deliveredCount} Delivered • ${metrics.inFulfillmentCount} In Fulfillment`;

    header.append(titleGroup, metricsBadge);
    pipelineContainer.append(header);

    // Board
    const board = document.createElement('div');
    board.className = 'ecom-pipeline-board';

    this.stages.forEach((stage) => {
      const col = document.createElement('div');
      col.className = 'ecom-pipeline-col';
      col.dataset.stageId = stage.id;

      const colHeader = document.createElement('div');
      colHeader.className = 'ecom-col-header';

      const colTitle = document.createElement('h4');
      colTitle.textContent = stage.title;

      const count = this.getTasksByStage(stage.id).length;
      const colBadge = document.createElement('span');
      colBadge.className = `ecom-col-badge ${count >= stage.wipLimit ? 'badge-limit' : ''}`;
      colBadge.textContent = `${count}/${stage.wipLimit}`;

      colHeader.append(colTitle, colBadge);
      col.append(colHeader);

      const cardList = document.createElement('div');
      cardList.className = 'ecom-col-cards';

      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          try {
            this.moveTask(taskId, stage.id);
            this.renderToDOM(container);
          } catch (err) {
            alert(err.message);
          }
        }
      });

      const tasksInStage = this.getTasksByStage(stage.id);
      tasksInStage.forEach((task) => {
        const card = document.createElement('div');
        card.className = `ecom-task-card priority-${task.priority}`;
        card.draggable = true;

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', task.id);
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'ecom-task-top';

        const idTag = document.createElement('span');
        idTag.className = 'ecom-task-id';
        idTag.textContent = task.id;

        const valBadge = document.createElement('span');
        valBadge.className = 'ecom-val-badge';
        valBadge.textContent = task.value;

        cardTop.append(idTag, valBadge);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'ecom-task-title';
        cardTitle.textContent = task.title;

        const cardBottom = document.createElement('div');
        cardBottom.className = 'ecom-task-bottom';

        const courierTag = document.createElement('span');
        courierTag.className = 'ecom-task-courier';
        courierTag.textContent = task.courier;

        const prioTag = document.createElement('span');
        prioTag.className = `ecom-task-prio prio-${task.priority}`;
        prioTag.textContent = task.priority.toUpperCase();

        cardBottom.append(courierTag, prioTag);
        card.append(cardTop, cardTitle, cardBottom);
        cardList.append(card);
      });

      col.append(cardList);
      board.append(col);
    });

    pipelineContainer.append(board);
    container.append(pipelineContainer);
  }
}
