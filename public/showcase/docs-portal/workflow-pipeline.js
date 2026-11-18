/**
 * DocsPortalPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for API documentation lifecycle, review gates, and production publishing.
 */
export class DocsPortalPipelineEngine {
  constructor(options = {}) {
    this.stages = options.stages || [
      { id: 'draft-proposal', title: 'Draft API Proposals', wipLimit: 6 },
      { id: 'schema-review', title: 'Schema Linting & Review', wipLimit: 4 },
      { id: 'sdk-generation', title: 'SDK Generation & Staging', wipLimit: 4 },
      { id: 'published', title: 'Published to Production', wipLimit: 8 }
    ];

    this.tasks = options.tasks || [
      {
        id: 'DOC-201',
        title: 'OpenAPI 3.1 Webhooks spec specification',
        stage: 'draft-proposal',
        priority: 'high',
        owner: 'DevRel Team',
        specType: 'OpenAPI'
      },
      {
        id: 'DOC-202',
        title: 'Python SDK v2 async client code generation',
        stage: 'schema-review',
        priority: 'critical',
        owner: 'SDK Guild',
        specType: 'SDK Tooling'
      },
      {
        id: 'DOC-203',
        title: 'GraphQL mutation deprecation timeline docs',
        stage: 'sdk-generation',
        priority: 'medium',
        owner: 'API Core',
        specType: 'GraphQL'
      },
      {
        id: 'DOC-204',
        title: 'Rate limiting retry header reference guide',
        stage: 'draft-proposal',
        priority: 'low',
        owner: 'Infrastructure',
        specType: 'REST API'
      },
      {
        id: 'DOC-205',
        title: 'Production release notes for v2026.4.0',
        stage: 'published',
        priority: 'high',
        owner: 'Tech Writing',
        specType: 'Changelog'
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
      id: task.id || `DOC-${Math.floor(200 + Math.random() * 800)}`,
      title: task.title,
      stage: stageId,
      priority: task.priority || 'medium',
      owner: task.owner || 'Docs Contributor',
      specType: task.specType || 'Spec'
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

    const publishedCount = stageCounts['published'] || 0;
    const inFlightCount = totalTasks - publishedCount;

    return {
      totalTasks,
      stageCounts,
      publishedCount,
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
    pipelineContainer.className = 'docs-pipeline-container';

    // Header
    const header = document.createElement('div');
    header.className = 'docs-pipeline-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'docs-pipeline-title-group';

    const title = document.createElement('h3');
    title.textContent = 'API Documentation & Spec Release Pipeline';

    const subtitle = document.createElement('p');
    subtitle.className = 'docs-pipeline-subtitle';
    subtitle.textContent = 'Track and transition API specifications from initial proposal through automated linting to production publishing.';

    titleGroup.append(title, subtitle);

    const metricsBadge = document.createElement('div');
    metricsBadge.className = 'docs-pipeline-metrics';
    const metrics = this.getMetrics();
    metricsBadge.textContent = `${metrics.publishedCount} Published • ${metrics.inFlightCount} In Review`;

    header.append(titleGroup, metricsBadge);
    pipelineContainer.append(header);

    // Board Columns
    const board = document.createElement('div');
    board.className = 'docs-pipeline-board';

    this.stages.forEach((stage) => {
      const col = document.createElement('div');
      col.className = 'docs-pipeline-col';
      col.dataset.stageId = stage.id;

      const colHeader = document.createElement('div');
      colHeader.className = 'docs-col-header';

      const colTitle = document.createElement('h4');
      colTitle.textContent = stage.title;

      const count = this.getTasksByStage(stage.id).length;
      const colBadge = document.createElement('span');
      colBadge.className = `docs-col-badge ${count >= stage.wipLimit ? 'badge-limit' : ''}`;
      colBadge.textContent = `${count}/${stage.wipLimit}`;

      colHeader.append(colTitle, colBadge);
      col.append(colHeader);

      const cardList = document.createElement('div');
      cardList.className = 'docs-col-cards';

      // Drag over / drop
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
        card.className = `docs-task-card priority-${task.priority}`;
        card.draggable = true;

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', task.id);
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'docs-task-top';

        const idTag = document.createElement('span');
        idTag.className = 'docs-task-id';
        idTag.textContent = task.id;

        const specBadge = document.createElement('span');
        specBadge.className = 'docs-spec-badge';
        specBadge.textContent = task.specType;

        cardTop.append(idTag, specBadge);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'docs-task-title';
        cardTitle.textContent = task.title;

        const cardBottom = document.createElement('div');
        cardBottom.className = 'docs-task-bottom';

        const ownerTag = document.createElement('span');
        ownerTag.className = 'docs-task-owner';
        ownerTag.textContent = task.owner;

        const prioTag = document.createElement('span');
        prioTag.className = `docs-task-prio prio-${task.priority}`;
        prioTag.textContent = task.priority.toUpperCase();

        cardBottom.append(ownerTag, prioTag);
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
