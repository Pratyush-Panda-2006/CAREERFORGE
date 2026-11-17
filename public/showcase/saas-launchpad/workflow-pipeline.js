/**
 * SaaS Launchpad - Interactive Kanban Workflow Pipeline Engine
 * Issue #1340 - NSoC '26 Level 3 Feature
 */

export class SaasLaunchpadPipelineEngine {
  static DEFAULT_COLUMNS = [
    { id: 'backlog', title: 'Backlog', wipLimit: 0 },
    { id: 'in_progress', title: 'In Progress', wipLimit: 3 },
    { id: 'review', title: 'Review', wipLimit: 2 },
    { id: 'completed', title: 'Completed', wipLimit: 0 }
  ];

  constructor(options = {}) {
    this.columns = options.columns
      ? JSON.parse(JSON.stringify(options.columns))
      : JSON.parse(JSON.stringify(SaasLaunchpadPipelineEngine.DEFAULT_COLUMNS));
    
    this.cards = new Map();
    this.columnCards = new Map();

    this.columns.forEach(col => {
      this.columnCards.set(col.id, []);
    });

    if (Array.isArray(options.cards)) {
      options.cards.forEach(card => this.addCard(card));
    }
  }

  addCard(card) {
    if (!card || !card.id) {
      throw new Error('Card must have a valid id');
    }
    const columnId = card.columnId || 'backlog';
    if (!this.columnCards.has(columnId)) {
      throw new Error(`Target column "${columnId}" does not exist`);
    }

    if (this.cards.has(card.id)) {
      throw new Error(`Card with id "${card.id}" already exists`);
    }

    if (!this.checkWipLimit(columnId)) {
      throw new Error(`WIP limit exceeded for column "${columnId}"`);
    }

    const newCard = {
      id: card.id,
      title: card.title || 'Untitled Sprint Task',
      description: card.description || '',
      priority: card.priority || 'medium',
      columnId: columnId,
      createdAt: card.createdAt || new Date().toISOString()
    };

    this.cards.set(newCard.id, newCard);
    this.columnCards.get(columnId).push(newCard.id);
    return newCard;
  }

  checkWipLimit(colId) {
    const col = this.columns.find(c => c.id === colId);
    if (!col) return false;
    if (!col.wipLimit || col.wipLimit <= 0) return true;
    const currentCount = (this.columnCards.get(colId) || []).length;
    return currentCount < col.wipLimit;
  }

  moveCard(cardId, fromCol, toCol) {
    if (!this.cards.has(cardId)) {
      throw new Error(`Card "${cardId}" not found`);
    }
    if (!this.columnCards.has(fromCol) || !this.columnCards.has(toCol)) {
      throw new Error('Invalid source or destination column');
    }

    const card = this.cards.get(cardId);
    if (card.columnId !== fromCol) {
      throw new Error(`Card "${cardId}" is not currently in column "${fromCol}"`);
    }

    if (fromCol === toCol) {
      return card;
    }

    if (!this.checkWipLimit(toCol)) {
      throw new Error(`WIP limit reached for target column "${toCol}"`);
    }

    const fromList = this.columnCards.get(fromCol);
    const idx = fromList.indexOf(cardId);
    if (idx !== -1) {
      fromList.splice(idx, 1);
    }

    this.columnCards.get(toCol).push(cardId);
    card.columnId = toCol;
    card.updatedAt = new Date().toISOString();
    return card;
  }

  removeCard(cardId) {
    if (!this.cards.has(cardId)) return false;
    const card = this.cards.get(cardId);
    const colList = this.columnCards.get(card.columnId);
    if (colList) {
      const idx = colList.indexOf(cardId);
      if (idx !== -1) colList.splice(idx, 1);
    }
    this.cards.delete(cardId);
    return true;
  }

  getCardsInColumn(colId) {
    const ids = this.columnCards.get(colId) || [];
    return ids.map(id => this.cards.get(id)).filter(Boolean);
  }

  exportPipelineJSON() {
    const data = {
      version: '1.0.0',
      columns: this.columns,
      cards: Array.from(this.cards.values()),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importPipelineJSON(jsonStr) {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    if (!parsed || !Array.isArray(parsed.columns) || !Array.isArray(parsed.cards)) {
      throw new Error('Invalid pipeline export format');
    }

    this.columns = parsed.columns;
    this.cards.clear();
    this.columnCards.clear();
    this.columns.forEach(col => {
      this.columnCards.set(col.id, []);
    });

    parsed.cards.forEach(card => {
      this.cards.set(card.id, card);
      if (this.columnCards.has(card.columnId)) {
        this.columnCards.get(card.columnId).push(card.id);
      }
    });
    return true;
  }
}
