/**
 * DeveloperPortfolioPipelineEngine
 * Interactive drag-and-drop project pipeline & engineering workflow engine for developer project roadmap, sprint execution, and deployment tracking.
 */
export class DeveloperPortfolioPipelineEngine {
  constructor(options = {}) {
    this.stages = options.stages || [
      { id: 'backlog', title: 'Backlog & RFCs', wipLimit: 8 },
      { id: 'in-dev', title: 'Active Development', wipLimit: 3 },
      { id: 'code-review', title: 'Code Review & CI', wipLimit: 3 },
      { id: 'deployed', title: 'Deployed to Production', wipLimit: 10 }
    ];

    this.tasks = options.tasks || [
      {
        id: 'DEV-101',
        title: 'Rust WebAssembly physics simulation engine',
        stage: 'in-dev',
        priority: 'critical',
        tech: 'Rust / Wasm',
        assignee: 'Core Dev'
      },
      {
        id: 'DEV-102',
        title: 'WebGL 3D interactive portfolio shaders',
        stage: 'code-review',
        priority: 'high',
        tech: 'Three.js / GLSL',
        assignee: 'Graphics Guild'
      },
      {
        id: 'DEV-103',
        title: 'Distributed Redis rate-limiting reverse proxy',
        stage: 'deployed',
        priority: 'high',
        tech: 'Go / Redis',
        assignee: 'Infra Lead'
      },
      {
        id: 'DEV-104',
        title: 'Zero-knowledge proof authentication demo',
        stage: 'backlog',
        priority: 'medium',
        tech: 'TypeScript / Circom',
        assignee: 'Crypto R&D'
      },
      {
        id: 'DEV-105',
        title: 'Automated GitHub Actions semantic release matrix',
        stage: 'backlog',
        priority: 'low',
        tech: 'CI / CD',
        assignee: 'DevOps'
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
      id: task.id || `DEV-${Math.floor(100 + Math.random() * 900)}`,
      title: task.title,
      stage: stageId,
      priority: task.priority || 'medium',
      tech: task.tech || 'Fullstack',
      assignee: task.assignee || 'Author'
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
      throw new Error(`Cannot move task: WIP limit of ${targetStage.wipLimit} reached for ${targetStage.title}`);
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

    const deployedCount = stageCounts['deployed'] || 0;
    const inFlightCount = totalTasks - deployedCount;

    return {
      totalTasks,
      stageCounts,
      deployedCount,
      inFlightCount
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
    pipelineContainer.className = 'devport-pipeline-container';

    // Header
    const header = document.createElement('div');
    header.className = 'devport-pipeline-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'devport-pipeline-title-group';

    const title = document.createElement('h3');
    title.textContent = 'Engineering Project Roadmap & Sprint Pipeline';

    const subtitle = document.createElement('p');
    subtitle.className = 'devport-pipeline-subtitle';
    subtitle.textContent = 'Manage project stages with active WIP guardrails, tech stack labels, and drag-and-drop state transitions.';

    titleGroup.append(title, subtitle);

    const metricsBadge = document.createElement('div');
    metricsBadge.className = 'devport-pipeline-metrics';
    const metrics = this.getMetrics();
    metricsBadge.textContent = `${metrics.deployedCount} Shipped • ${metrics.inFlightCount} In Progress`;

    header.append(titleGroup, metricsBadge);
    pipelineContainer.append(header);

    // Board
    const board = document.createElement('div');
    board.className = 'devport-pipeline-board';

    this.stages.forEach((stage) => {
      const col = document.createElement('div');
      col.className = 'devport-pipeline-col';
      col.dataset.stageId = stage.id;

      const colHeader = document.createElement('div');
      colHeader.className = 'devport-col-header';

      const colTitle = document.createElement('h4');
      colTitle.textContent = stage.title;

      const count = this.getTasksByStage(stage.id).length;
      const colBadge = document.createElement('span');
      colBadge.className = `devport-col-badge ${count >= stage.wipLimit ? 'badge-limit' : ''}`;
      colBadge.textContent = `${count}/${stage.wipLimit}`;

      colHeader.append(colTitle, colBadge);
      col.append(colHeader);

      const cardList = document.createElement('div');
      cardList.className = 'devport-col-cards';

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
        card.className = `devport-task-card priority-${task.priority}`;
        card.draggable = true;

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', task.id);
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'devport-task-top';

        const idTag = document.createElement('span');
        idTag.className = 'devport-task-id';
        idTag.textContent = task.id;

        const techBadge = document.createElement('span');
        techBadge.className = 'devport-tech-badge';
        techBadge.textContent = task.tech;

        cardTop.append(idTag, techBadge);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'devport-task-title';
        cardTitle.textContent = task.title;

        const cardBottom = document.createElement('div');
        cardBottom.className = 'devport-task-bottom';

        const assigneeTag = document.createElement('span');
        assigneeTag.className = 'devport-task-assignee';
        assigneeTag.textContent = task.assignee;

        const prioTag = document.createElement('span');
        prioTag.className = `devport-task-prio prio-${task.priority}`;
        prioTag.textContent = task.priority.toUpperCase();

        cardBottom.append(assigneeTag, prioTag);
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
