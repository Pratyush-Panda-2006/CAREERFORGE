/**
 * CryptoExchangeProPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for crypto trading strategies and risk approvals.
 */
export class CryptoExchangeProPipelineEngine {
  constructor(initialData = null) {
    this.columns = [
      { id: 'alpha-research', title: 'Alpha Research', wipLimit: 6, cards: [] },
      { id: 'risk-review', title: 'Risk Review', wipLimit: 4, cards: [] },
      { id: 'paper-trading', title: 'Paper Trading', wipLimit: 3, cards: [] },
      { id: 'live-production', title: 'Live Production', wipLimit: 8, cards: [] }
    ];

    if (initialData && Array.isArray(initialData.columns)) {
      this.columns = initialData.columns;
    } else {
      this.seedDefaultCards();
    }
  }

  seedDefaultCards() {
    this.addCard('alpha-research', {
      id: 'cep-task-1',
      title: 'SOL/USDT Momentum Breakout Model',
      priority: 'high',
      quantLead: 'Trader-Alex',
      allocatedCapital: 50000
    });
    this.addCard('alpha-research', {
      id: 'cep-task-2',
      title: 'Funding Rate Basis Arbitrage Bot',
      priority: 'medium',
      quantLead: 'Quant-Dev-01',
      allocatedCapital: 25000
    });
    this.addCard('risk-review', {
      id: 'cep-task-3',
      title: 'Cross-Margin Liquidation Threshold Audit',
      priority: 'critical',
      quantLead: 'Risk-Officer',
      allocatedCapital: 100000
    });
    this.addCard('paper-trading', {
      id: 'cep-task-4',
      title: 'BTC Micro-Futures Latency Arbitrage',
      priority: 'high',
      quantLead: 'HFT-Group',
      allocatedCapital: 75000
    });
    this.addCard('live-production', {
      id: 'cep-task-5',
      title: 'ETH/USDT Market Making Spreads',
      priority: 'medium',
      quantLead: 'MM-Bot-Alpha',
      allocatedCapital: 200000
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

    const cardId = card.id || `cep-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCard = {
      id: cardId,
      title: card.title || 'Untitled Trading Strategy',
      priority: card.priority || 'medium',
      quantLead: card.quantLead || 'Unassigned',
      allocatedCapital: card.allocatedCapital || 10000,
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
    board.className = 'cep-pipeline-board';

    for (const col of this.columns) {
      const colElem = document.createElement('div');
      colElem.className = 'cep-pipeline-column';
      colElem.dataset.colId = col.id;

      const header = document.createElement('div');
      header.className = 'cep-column-header';

      const title = document.createElement('h3');
      title.className = 'cep-column-title';
      title.textContent = col.title;

      const badge = document.createElement('span');
      badge.className = `cep-wip-pill ${col.cards.length >= col.wipLimit ? 'cep-wip-max' : ''}`;
      badge.textContent = `${col.cards.length}/${col.wipLimit}`;

      header.append(title, badge);
      colElem.append(header);

      const cardContainer = document.createElement('div');
      cardContainer.className = 'cep-column-cards';

      cardContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        colElem.classList.add('cep-drag-over');
      });

      cardContainer.addEventListener('dragleave', () => {
        colElem.classList.remove('cep-drag-over');
      });

      cardContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        colElem.classList.remove('cep-drag-over');
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
        cardElem.className = `cep-card cep-card-priority-${card.priority}`;
        cardElem.draggable = true;
        cardElem.dataset.cardId = card.id;

        cardElem.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', card.id);
          cardElem.classList.add('cep-dragging');
        });

        cardElem.addEventListener('dragend', () => {
          cardElem.classList.remove('cep-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'cep-card-top';

        const priorityTag = document.createElement('span');
        priorityTag.className = `cep-priority-badge cep-badge-${card.priority}`;
        priorityTag.textContent = card.priority.toUpperCase();

        const capitalTag = document.createElement('span');
        capitalTag.className = 'cep-capital-tag';
        capitalTag.textContent = `$${card.allocatedCapital.toLocaleString()}`;

        cardTop.append(priorityTag, capitalTag);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'cep-card-title';
        cardTitle.textContent = card.title;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'cep-card-footer';

        const lead = document.createElement('span');
        lead.className = 'cep-card-lead';
        lead.textContent = `@${card.quantLead}`;

        const delBtn = document.createElement('button');
        delBtn.className = 'cep-card-del';
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
