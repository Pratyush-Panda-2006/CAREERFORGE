/**
 * Luxury Realms - Node-Based Finite State Machine & Workflow Visualizer
 * Models ultra-prime estate acquisitions, VIP private showings, escrow deposits, and deed conveyance,
 * validates event-driven transitions, and exports diagrams to Mermaid.js stateDiagram-v2 format.
 */

export class LuxuryRealmsFsmVisualizer {
  constructor(initialState = 'ESTATE_LISTED') {
    this.initialState = initialState;
    this.currentState = initialState;
    this.states = new Set([
      'ESTATE_LISTED',
      'PRIVATE_SHOWING',
      'OFFER_NEGOTIATION',
      'ESCROW_DEPOSIT',
      'DEED_CONVEYANCE',
      'DUE_DILIGENCE_DISPUTE'
    ]);
    this.transitions = [];
    this.history = [];

    this.registerDefaultTransitions();
  }

  registerDefaultTransitions() {
    this.addTransition('ESTATE_LISTED', 'SCHEDULE_SHOWING', 'PRIVATE_SHOWING');
    this.addTransition('PRIVATE_SHOWING', 'SUBMIT_BID', 'OFFER_NEGOTIATION');
    this.addTransition('OFFER_NEGOTIATION', 'ACCEPT_OFFER', 'ESCROW_DEPOSIT');
    this.addTransition('ESCROW_DEPOSIT', 'VERIFY_FUNDS', 'DEED_CONVEYANCE');
    this.addTransition('DEED_CONVEYANCE', 'CLOSE_TRANSACTION', 'ESTATE_LISTED');
    this.addTransition('ESCROW_DEPOSIT', 'TITLE_ENCUMBRANCE', 'DUE_DILIGENCE_DISPUTE');
    this.addTransition('DUE_DILIGENCE_DISPUTE', 'RESOLVE_COVENANTS', 'ESTATE_LISTED');
    this.addTransition('OFFER_NEGOTIATION', 'WITHDRAW_BID', 'ESTATE_LISTED');
  }

  /**
   * Registers a transition rule between two states given an event trigger.
   */
  addTransition(from, event, to) {
    if (!from || !event || !to) {
      throw new Error('Invalid transition definition: from, event, and to must be specified');
    }
    this.states.add(from);
    this.states.add(to);
    this.transitions.push({ from, event, to });
  }

  /**
   * Dispatches an event from the active state, transitioning if allowed.
   */
  dispatch(event) {
    const match = this.transitions.find((t) => t.from === this.currentState && t.event === event);
    if (!match) {
      return {
        success: false,
        error: `Cannot dispatch event "${event}" from state "${this.currentState}"`,
        currentState: this.currentState
      };
    }

    const previousState = this.currentState;
    this.currentState = match.to;
    this.history.push({
      timestamp: new Date().toISOString(),
      from: previousState,
      event,
      to: this.currentState
    });

    return {
      success: true,
      from: previousState,
      event,
      to: this.currentState
    };
  }

  /**
   * Returns available events callable from the current state.
   */
  getAvailableEvents() {
    return this.transitions
      .filter((t) => t.from === this.currentState)
      .map((t) => t.event);
  }

  /**
   * Exports the state machine schema as Mermaid.js stateDiagram-v2 definition.
   */
  exportMermaid() {
    const lines = ['stateDiagram-v2'];
    lines.push(`  [*] --> ${this.initialState}`);

    this.transitions.forEach((t) => {
      lines.push(`  ${t.from} --> ${t.to} : ${t.event}`);
    });

    return lines.join('\n');
  }

  /**
   * Resets machine back to default state and clears history log.
   */
  reset() {
    this.currentState = this.initialState;
    this.history = [];
  }
}

// Browser DOM UI controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fsm = new LuxuryRealmsFsmVisualizer();

    const stateBadge = document.getElementById('current-state-badge');
    const nodes = document.querySelectorAll('.fsm-node');
    const eventContainer = document.getElementById('event-buttons');
    const historyContainer = document.getElementById('history-log');
    const mermaidCode = document.getElementById('mermaid-code');
    const resetBtn = document.getElementById('reset-fsm-btn');
    const copyBtn = document.getElementById('copy-mermaid-btn');

    function updateView() {
      if (stateBadge) stateBadge.textContent = fsm.currentState;

      nodes.forEach((node) => {
        const nodeState = node.getAttribute('data-state');
        if (nodeState === fsm.currentState) {
          node.classList.add('active');
        } else {
          node.classList.remove('active');
        }
      });

      if (eventContainer) {
        eventContainer.textContent = '';
        const events = fsm.getAvailableEvents();
        if (events.length === 0) {
          const empty = document.createElement('span');
          empty.textContent = 'No outbound transitions available';
          empty.style.color = 'var(--lux-dim)';
          empty.style.fontSize = '0.85rem';
          eventContainer.appendChild(empty);
        } else {
          events.forEach((evt) => {
            const btn = document.createElement('button');
            btn.className = evt.includes('DISPUTE') || evt.includes('ENCUMBRANCE') ? 'event-btn danger' : 'event-btn';
            btn.textContent = evt;
            btn.addEventListener('click', () => {
              const res = fsm.dispatch(evt);
              if (res.success) {
                renderHistory();
                updateView();
              }
            });
            eventContainer.appendChild(btn);
          });
        }
      }

      if (mermaidCode) {
        mermaidCode.textContent = fsm.exportMermaid();
      }
    }

    function renderHistory() {
      if (!historyContainer) return;
      historyContainer.textContent = '';
      if (fsm.history.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'history-item placeholder';
        placeholder.textContent = `Acquisition engine initialized in ${fsm.initialState}`;
        historyContainer.appendChild(placeholder);
        return;
      }

      fsm.history.forEach((h, idx) => {
        const item = document.createElement('div');
        item.className = idx === fsm.history.length - 1 ? 'history-item recent' : 'history-item';
        item.textContent = `[${h.timestamp.slice(11, 19)}] ${h.from} -> (${h.event}) -> ${h.to}`;
        historyContainer.appendChild(item);
      });
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        fsm.reset();
        renderHistory();
        updateView();
      });
    }

    if (copyBtn && mermaidCode) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(mermaidCode.textContent).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Mermaid';
          }, 1500);
        });
      });
    }

    renderHistory();
    updateView();
  });
}
