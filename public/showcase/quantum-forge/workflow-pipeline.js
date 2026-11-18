/**
 * QuantumForgePipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for quantum computing experiments.
 */
export class QuantumForgePipelineEngine {
  constructor(initialData = null) {
    this.columns = [
      { id: 'formulation', title: 'Circuit Formulation', wipLimit: 6, cards: [] },
      { id: 'simulation', title: 'Noise Simulation', wipLimit: 4, cards: [] },
      { id: 'execution', title: 'QPU Hardware Queue', wipLimit: 3, cards: [] },
      { id: 'analysis', title: 'Tomography Analysis', wipLimit: 8, cards: [] }
    ];

    if (initialData && Array.isArray(initialData.columns)) {
      this.columns = initialData.columns;
    } else {
      this.seedDefaultCards();
    }
  }

  seedDefaultCards() {
    this.addCard('formulation', {
      id: 'qf-task-1',
      title: 'VQE Ansatz Optimization',
      priority: 'high',
      assignee: 'Alice',
      qubits: 12
    });
    this.addCard('formulation', {
      id: 'qf-task-2',
      title: 'QFT Circuit Decomposition',
      priority: 'medium',
      assignee: 'Bob',
      qubits: 8
    });
    this.addCard('simulation', {
      id: 'qf-task-3',
      title: 'Thermal Relaxation Kraus Map',
      priority: 'high',
      assignee: 'Charlie',
      qubits: 16
    });
    this.addCard('execution', {
      id: 'qf-task-4',
      title: 'IBM Heron 133Q Calibration Run',
      priority: 'critical',
      assignee: 'Ops-Engine',
      qubits: 64
    });
    this.addCard('analysis', {
      id: 'qf-task-5',
      title: 'State Fidelity Reconstruction',
      priority: 'medium',
      assignee: 'Dana',
      qubits: 4
    });
  }

  getColumns() {
    return this.columns.map(col => ({
      ...col,
      cards: [...col.cards]
    }));
  }

  getColumn(colId) {
    return this.columns.find(col => col.id === colId) || null;
  }

  checkWipLimit(colId) {
    const col = this.getColumn(colId);
    if (!col) return false;
    return col.cards.length >= col.wipLimit;
  }

  addCard(colId, card) {
    const col = this.getColumn(colId);
    if (!col) {
      throw new Error(`Column "${colId}" does not exist`);
    }

    if (this.checkWipLimit(colId)) {
      throw new Error(`WIP limit of ${col.wipLimit} reached for column "${col.title}"`);
    }

    const cardId = card.id || `qf-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCard = {
      id: cardId,
      title: card.title || 'Untitled Quantum Task',
      priority: card.priority || 'medium',
      assignee: card.assignee || 'Unassigned',
      qubits: card.qubits || 1,
      createdAt: card.createdAt || new Date().toISOString()
    };

    col.cards.push(newCard);
    return newCard;
  }

  findCard(cardId) {
    for (const col of this.columns) {
      const card = col.cards.find(c => c.id === cardId);
      if (card) {
        return { card, columnId: col.id };
      }
    }
    return null;
  }

  moveCard(cardId, fromColId, toColId) {
    const fromCol = this.getColumn(fromColId);
    const toCol = this.getColumn(toColId);

    if (!fromCol || !toCol) {
      throw new Error('Invalid source or target column ID');
    }

    if (fromColId !== toColId && this.checkWipLimit(toColId)) {
      throw new Error(`Cannot move card: WIP limit of ${toCol.wipLimit} reached on "${toCol.title}"`);
    }

    const cardIndex = fromCol.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      throw new Error(`Card "${cardId}" not found in column "${fromColId}"`);
    }

    const [card] = fromCol.cards.splice(cardIndex, 1);
    toCol.cards.push(card);
    return true;
  }

  removeCard(cardId) {
    for (const col of this.columns) {
      const idx = col.cards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const [removed] = col.cards.splice(idx, 1);
        return removed;
      }
    }
    return null;
  }

  exportPipelineJSON() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      columns: this.columns
    }, null, 2);
  }

  importPipelineJSON(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.columns)) {
      throw new Error('Invalid pipeline JSON format');
    }
    this.columns = parsed.columns;
    return true;
  }

  render(container, onUpdate = null) {
    if (!container) return;
    container.replaceChildren();

    const board = document.createElement('div');
    board.className = 'qf-pipeline-board';

    for (const col of this.columns) {
      const colElem = document.createElement('div');
      colElem.className = 'qf-pipeline-column';
      colElem.dataset.colId = col.id;

      const header = document.createElement('div');
      header.className = 'qf-column-header';

      const title = document.createElement('h3');
      title.className = 'qf-column-title';
      title.textContent = col.title;

      const badge = document.createElement('span');
      badge.className = `qf-wip-pill ${col.cards.length >= col.wipLimit ? 'qf-wip-max' : ''}`;
      badge.textContent = `${col.cards.length}/${col.wipLimit}`;

      header.append(title, badge);
      colElem.append(header);

      const cardContainer = document.createElement('div');
      cardContainer.className = 'qf-column-cards';

      cardContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        colElem.classList.add('qf-drag-over');
      });

      cardContainer.addEventListener('dragleave', () => {
        colElem.classList.remove('qf-drag-over');
      });

      cardContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        colElem.classList.remove('qf-drag-over');
        const cardId = e.dataTransfer.getData('text/plain');
        const found = this.findCard(cardId);
        if (found && found.columnId !== col.id) {
          try {
            this.moveCard(cardId, found.columnId, col.id);
            this.render(container, onUpdate);
            if (onUpdate) onUpdate();
          } catch (err) {
            alert(err.message);
          }
        }
      });

      for (const card of col.cards) {
        const cardElem = document.createElement('div');
        cardElem.className = `qf-card qf-card-priority-${card.priority}`;
        cardElem.draggable = true;
        cardElem.dataset.cardId = card.id;

        cardElem.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', card.id);
          cardElem.classList.add('qf-dragging');
        });

        cardElem.addEventListener('dragend', () => {
          cardElem.classList.remove('qf-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'qf-card-top';

        const priorityTag = document.createElement('span');
        priorityTag.className = `qf-priority-badge qf-badge-${card.priority}`;
        priorityTag.textContent = card.priority.toUpperCase();

        const qubitTag = document.createElement('span');
        qubitTag.className = 'qf-qubit-tag';
        qubitTag.textContent = `${card.qubits} Qubits`;

        cardTop.append(priorityTag, qubitTag);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'qf-card-title';
        cardTitle.textContent = card.title;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'qf-card-footer';

        const assignee = document.createElement('span');
        assignee.className = 'qf-card-assignee';
        assignee.textContent = `@${card.assignee}`;

        const delBtn = document.createElement('button');
        delBtn.className = 'qf-card-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete card');
        delBtn.addEventListener('click', () => {
          this.removeCard(card.id);
          this.render(container, onUpdate);
          if (onUpdate) onUpdate();
        });

        cardFooter.append(assignee, delBtn);
        cardElem.append(cardTop, cardTitle, cardFooter);
        cardContainer.append(cardElem);
      }

      colElem.append(cardContainer);
      board.append(colElem);
    }

    container.append(board);
  }
}
