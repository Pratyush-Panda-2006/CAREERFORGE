/**
 * LuxuryRealmsPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for ultra-luxury property acquisitions.
 */
export class LuxuryRealmsPipelineEngine {
  constructor(initialData = null) {
    this.columns = [
      { id: 'prospecting', title: 'VIP Sourcing', wipLimit: 6, cards: [] },
      { id: 'due-diligence', title: 'Legal Due Diligence', wipLimit: 4, cards: [] },
      { id: 'escrow', title: 'Escrow & Notary', wipLimit: 3, cards: [] },
      { id: 'concierge-onboarding', title: 'Concierge Handover', wipLimit: 8, cards: [] }
    ];

    if (initialData && Array.isArray(initialData.columns)) {
      this.columns = initialData.columns;
    } else {
      this.seedDefaultCards();
    }
  }

  seedDefaultCards() {
    this.addCard('prospecting', {
      id: 'lr-task-1',
      title: 'Cap d\'Antibes Waterfront Estate Sourcing',
      priority: 'high',
      advisor: 'Julian Thorne',
      valuationM: 54.0
    });
    this.addCard('prospecting', {
      id: 'lr-task-2',
      title: 'Beverly Hills Modernist Trophy Compound',
      priority: 'medium',
      advisor: 'Elena Rostova',
      valuationM: 38.5
    });
    this.addCard('due-diligence', {
      id: 'lr-task-3',
      title: 'Swiss Alpine Chalet Cantonal Title Verification',
      priority: 'critical',
      advisor: 'Henri de Montmirail',
      valuationM: 22.0
    });
    this.addCard('escrow', {
      id: 'lr-task-4',
      title: 'Monaco Penthouse Sovereign Escrow Release',
      priority: 'high',
      advisor: 'Claire Vance',
      valuationM: 65.0
    });
    this.addCard('concierge-onboarding', {
      id: 'lr-task-5',
      title: 'Villa Bellissima Staffing & Wine Cellar Stocking',
      priority: 'medium',
      advisor: 'Bespoke Concierge',
      valuationM: 19.5
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

    const cardId = card.id || `lr-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCard = {
      id: cardId,
      title: card.title || 'Untitled Acquisition Task',
      priority: card.priority || 'medium',
      advisor: card.advisor || 'Unassigned',
      valuationM: card.valuationM || 10.0,
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
    board.className = 'lr-pipeline-board';

    for (const col of this.columns) {
      const colElem = document.createElement('div');
      colElem.className = 'lr-pipeline-column';
      colElem.dataset.colId = col.id;

      const header = document.createElement('div');
      header.className = 'lr-column-header';

      const title = document.createElement('h3');
      title.className = 'lr-column-title';
      title.textContent = col.title;

      const badge = document.createElement('span');
      badge.className = `lr-wip-pill ${col.cards.length >= col.wipLimit ? 'lr-wip-max' : ''}`;
      badge.textContent = `${col.cards.length}/${col.wipLimit}`;

      header.append(title, badge);
      colElem.append(header);

      const cardContainer = document.createElement('div');
      cardContainer.className = 'lr-column-cards';

      cardContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        colElem.classList.add('lr-drag-over');
      });

      cardContainer.addEventListener('dragleave', () => {
        colElem.classList.remove('lr-drag-over');
      });

      cardContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        colElem.classList.remove('lr-drag-over');
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
        cardElem.className = `lr-card lr-card-priority-${card.priority}`;
        cardElem.draggable = true;
        cardElem.dataset.cardId = card.id;

        cardElem.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', card.id);
          cardElem.classList.add('lr-dragging');
        });

        cardElem.addEventListener('dragend', () => {
          cardElem.classList.remove('lr-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'lr-card-top';

        const priorityTag = document.createElement('span');
        priorityTag.className = `lr-priority-badge lr-badge-${card.priority}`;
        priorityTag.textContent = card.priority.toUpperCase();

        const valTag = document.createElement('span');
        valTag.className = 'lr-val-tag';
        valTag.textContent = `€${card.valuationM}M`;

        cardTop.append(priorityTag, valTag);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'lr-card-title';
        cardTitle.textContent = card.title;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'lr-card-footer';

        const advisor = document.createElement('span');
        advisor.className = 'lr-card-advisor';
        advisor.textContent = `@${card.advisor}`;

        const delBtn = document.createElement('button');
        delBtn.className = 'lr-card-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete card');
        delBtn.addEventListener('click', () => {
          this.removeCard(card.id);
          this.render(container, onUpdate);
          if (onUpdate) onUpdate();
        });

        cardFooter.append(advisor, delBtn);
        cardElem.append(cardTop, cardTitle, cardFooter);
        cardContainer.append(cardElem);
      }

      colElem.append(cardContainer);
      board.append(colElem);
    }

    container.append(board);
  }
}
