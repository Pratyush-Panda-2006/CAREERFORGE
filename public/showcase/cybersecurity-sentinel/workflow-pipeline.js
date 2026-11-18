/**
 * CybersecuritySentinelPipelineEngine
 * Interactive drag-and-drop task pipeline & status workflow engine for SOC incident response lifecycles.
 */
export class CybersecuritySentinelPipelineEngine {
  constructor(initialData = null) {
    this.columns = [
      { id: 'triage', title: 'Incident Triage', wipLimit: 6, cards: [] },
      { id: 'analysis', title: 'Malware Analysis', wipLimit: 4, cards: [] },
      { id: 'containment', title: 'Active Containment', wipLimit: 3, cards: [] },
      { id: 'eradication', title: 'Eradication & Review', wipLimit: 8, cards: [] }
    ];

    if (initialData && Array.isArray(initialData.columns)) {
      this.columns = initialData.columns;
    } else {
      this.seedDefaultCards();
    }
  }

  seedDefaultCards() {
    this.addCard('triage', {
      id: 'cs-task-1',
      title: 'Phishing Campaign URL Beacon Analysis',
      priority: 'high',
      analyst: 'SecAnalyst-01',
      cvssScore: 7.5
    });
    this.addCard('triage', {
      id: 'cs-task-2',
      title: 'Unusual Kerberos TGS-REQ Pattern Investigation',
      priority: 'medium',
      analyst: 'Tier1-SOC',
      cvssScore: 5.4
    });
    this.addCard('analysis', {
      id: 'cs-task-3',
      title: 'Cobalt Strike In-Memory DLL Unpacking',
      priority: 'critical',
      analyst: 'ReverseEngineer-X',
      cvssScore: 9.8
    });
    this.addCard('containment', {
      id: 'cs-task-4',
      title: 'Ransomware C2 Domain BGP Route Sinkholing',
      priority: 'critical',
      analyst: 'NetSec-Lead',
      cvssScore: 9.6
    });
    this.addCard('eradication', {
      id: 'cs-task-5',
      title: 'Compromised Active Directory Golden Ticket Purge',
      priority: 'high',
      analyst: 'Identity-Team',
      cvssScore: 8.8
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

    const cardId = card.id || `cs-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCard = {
      id: cardId,
      title: card.title || 'Untitled Security Incident',
      priority: card.priority || 'medium',
      analyst: card.analyst || 'Unassigned',
      cvssScore: card.cvssScore || 5.0,
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
    board.className = 'cs-pipeline-board';

    for (const col of this.columns) {
      const colElem = document.createElement('div');
      colElem.className = 'cs-pipeline-column';
      colElem.dataset.colId = col.id;

      const header = document.createElement('div');
      header.className = 'cs-column-header';

      const title = document.createElement('h3');
      title.className = 'cs-column-title';
      title.textContent = col.title;

      const badge = document.createElement('span');
      badge.className = `cs-wip-pill ${col.cards.length >= col.wipLimit ? 'cs-wip-max' : ''}`;
      badge.textContent = `${col.cards.length}/${col.wipLimit}`;

      header.append(title, badge);
      colElem.append(header);

      const cardContainer = document.createElement('div');
      cardContainer.className = 'cs-column-cards';

      cardContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        colElem.classList.add('cs-drag-over');
      });

      cardContainer.addEventListener('dragleave', () => {
        colElem.classList.remove('cs-drag-over');
      });

      cardContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        colElem.classList.remove('cs-drag-over');
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
        cardElem.className = `cs-card cs-card-priority-${card.priority}`;
        cardElem.draggable = true;
        cardElem.dataset.cardId = card.id;

        cardElem.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', card.id);
          cardElem.classList.add('cs-dragging');
        });

        cardElem.addEventListener('dragend', () => {
          cardElem.classList.remove('cs-dragging');
        });

        const cardTop = document.createElement('div');
        cardTop.className = 'cs-card-top';

        const priorityTag = document.createElement('span');
        priorityTag.className = `cs-priority-badge cs-badge-${card.priority}`;
        priorityTag.textContent = card.priority.toUpperCase();

        const cvssTag = document.createElement('span');
        cvssTag.className = 'cs-cvss-tag';
        cvssTag.textContent = `CVSS ${card.cvssScore}`;

        cardTop.append(priorityTag, cvssTag);

        const cardTitle = document.createElement('div');
        cardTitle.className = 'cs-card-title';
        cardTitle.textContent = card.title;

        const cardFooter = document.createElement('div');
        cardFooter.className = 'cs-card-footer';

        const analyst = document.createElement('span');
        analyst.className = 'cs-card-analyst';
        analyst.textContent = `@${card.analyst}`;

        const delBtn = document.createElement('button');
        delBtn.className = 'cs-card-del';
        delBtn.textContent = '×';
        delBtn.setAttribute('aria-label', 'Delete card');
        delBtn.addEventListener('click', () => {
          this.removeCard(card.id);
          this.render(container, onUpdate);
          if (onUpdate) onUpdate();
        });

        cardFooter.append(analyst, delBtn);
        cardElem.append(cardTop, cardTitle, cardFooter);
        cardContainer.append(cardElem);
      }

      colElem.append(cardContainer);
      board.append(colElem);
    }

    container.append(board);
  }
}
