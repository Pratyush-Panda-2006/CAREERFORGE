/**
 * AerospaceOrbiterPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for aerospace flight mission operations.
 */
export class AerospaceOrbiterPipelineEngine {
  constructor(initialData = null) {
    this.columns = [
      { id: 'trajectory', title: 'Trajectory Planning', wipLimit: 6, cards: [] },
      { id: 'thermal', title: 'Thermal Simulation', wipLimit: 4, cards: [] },
      { id: 'flight-readiness', title: 'Mission Go/No-Go', wipLimit: 3, cards: [] },
      { id: 'on-orbit', title: 'Orbit Stationkeeping', wipLimit: 8, cards: [] }
    ];

    if (initialData && Array.isArray(initialData.columns)) {
      this.columns = initialData.columns;
    } else {
      this.seedDefaultCards();
    }
  }

  seedDefaultCards() {
    this.addCard('trajectory', {
      id: 'ao-task-1',
      title: 'GEO Insertion Hohmann Transfer Matrix',
      priority: 'high',
      flightLead: 'Commander-G',
      apogeeKm: 35786
    });
    this.addCard('trajectory', {
      id: 'ao-task-2',
      title: 'Perigee Raising Burn Profile',
      priority: 'medium',
      flightLead: 'Navigator-V',
      apogeeKm: 1200
    });
    this.addCard('thermal', {
      id: 'ao-task-3',
      title: 'Radiative Heat Shield Gradient Sweep',
      priority: 'high',
      flightLead: 'Thermal-Lead',
      apogeeKm: 400
    });
    this.addCard('flight-readiness', {
      id: 'ao-task-4',
      title: 'Cryogenic Stage-2 Fuel Tanking Signoff',
      priority: 'critical',
      flightLead: 'Launch-Director',
      apogeeKm: 250
    });
    this.addCard('on-orbit', {
      id: 'ao-task-5',
      title: 'ISS Co-Orbit Rendezvous Holding Pattern',
      priority: 'medium',
      flightLead: 'Stationkeeping-Team',
      apogeeKm: 420
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

    const cardId = card.id || `ao-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCard = {
      id: cardId,
      title: card.title || 'Untitled Aerospace Task',
      priority: card.priority || 'medium',
      flightLead: card.flightLead || 'Unassigned',
      apogeeKm: card.apogeeKm || 400,
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
    board.className = 'ao-pipeline-board';

    for (const col of this.columns) {
      const colElem = document.createElement('div');
      colElem.className = 'ao-pipeline-column';
      colElem.dataset.colId = col.id;

      const header = document.createElement('div');
      header.className = 'ao-column-header';

      const title = document.createElement('h3');
      title.className = 'ao-column-title';
      title.textContent = col.title;

      const badge = document.createElement('span');
      badge.className = `ao-wip-pill ${col.cards.length >= col.wipLimit ? 'ao-wip-max' : ''}`;
      badge.textContent = `${col.cards.length}/${col.wipLimit}`;

      header.append(title, badge);
      colElem.append(header);

      const cardContainer = document.createElement('div');
      cardContainer.className = 'ao-column-cards';

      cardContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        colElem.classList.add('ao-drag-over');
      });

      cardContainer.addEventListener('dragleave', () => {
        colElem.classList.remove('ao-drag-over');
      });

      cardContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        colElem.classList.remove('ao-drag-over');
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
        cardElem.className = `ao-card ao-card-priority-${card.priority}`;
        cardElem.draggable = true;
        cardElem.dataset.cardId = card.id;

        cardElem.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', card.id);
          cardElem.classList.add('ao-dragging');
        });

        cardElem.addEventListener('dragend', () => {
          cardElem.classList.remove('ao-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'ao-card-top';

        const priorityTag = document.createElement('span');
        priorityTag.className = `ao-priority-badge ao-badge-${card.priority}`;
        priorityTag.textContent = card.priority.toUpperCase();

        const apogeeTag = document.createElement('span');
        apogeeTag.className = 'ao-apogee-tag';
        apogeeTag.textContent = `${card.apogeeKm} km`;

        cardTop.append(priorityTag, apogeeTag);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'ao-card-title';
        cardTitle.textContent = card.title;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'ao-card-footer';

        const lead = document.createElement('span');
        lead.className = 'ao-card-lead';
        lead.textContent = `@${card.flightLead}`;

        const delBtn = document.createElement('button');
        delBtn.className = 'ao-card-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete card');
        delBtn.addEventListener('click', () => {
          this.removeCard(card.id);
          this.render(container, onUpdate);
          if (onUpdate) onUpdate();
        });

        cardFooter.append(lead, delBtn);
        cardElem.append(cardTop, cardTitle, cardFooter);
        cardContainer.append(cardElem);
      }

      colElem.append(cardContainer);
      board.append(colElem);
    }

    container.append(board);
  }
}
