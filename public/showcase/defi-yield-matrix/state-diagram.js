/**
 * DeFi Yield Matrix - Node-Based Finite State Machine & Yield Lifecycle Visualizer
 * Models liquidity routing and flash loan execution states, validates event-driven transitions,
 * maintains event logs, and exports diagrams to Mermaid.js stateDiagram-v2 format.
 */

export class DefiYieldMatrixFsmVisualizer {
  constructor(initialState = 'WALLET_IDLE') {
    this.initialState = initialState;
    this.currentState = initialState;
    this.states = new Set([
      'WALLET_IDLE',
      'LIQUIDITY_ROUTING',
      'FLASH_LOAN_EXECUTING',
      'YIELD_HARVESTING',
      'COLLATERAL_REBALANCING',
      'EMERGENCY_UNWIND'
    ]);
    this.transitions = [];
    this.history = [];

    this.registerDefaultTransitions();
  }

  registerDefaultTransitions() {
    this.addTransition('WALLET_IDLE', 'INITIATE_SWAP', 'LIQUIDITY_ROUTING');
    this.addTransition('LIQUIDITY_ROUTING', 'TRIGGER_FLASH_LOAN', 'FLASH_LOAN_EXECUTING');
    this.addTransition('FLASH_LOAN_EXECUTING', 'LOAN_REPAID', 'YIELD_HARVESTING');
    this.addTransition('YIELD_HARVESTING', 'REBALANCE', 'COLLATERAL_REBALANCING');
    this.addTransition('COLLATERAL_REBALANCING', 'REBALANCE_COMPLETE', 'WALLET_IDLE');
    this.addTransition('FLASH_LOAN_EXECUTING', 'SLIPPAGE_BREACH', 'EMERGENCY_UNWIND');
    this.addTransition('EMERGENCY_UNWIND', 'FUNDS_RECOVERED', 'WALLET_IDLE');
    this.addTransition('YIELD_HARVESTING', 'CLAIM_ALL', 'WALLET_IDLE');
    this.addTransition('LIQUIDITY_ROUTING', 'CANCEL', 'WALLET_IDLE');
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
    const match = this.transitions.find(t => t.from === this.currentState && t.event === event);
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
      .filter(t => t.from === this.currentState)
      .map(t => t.event);
  }

  /**
   * Exports the state machine schema as Mermaid.js stateDiagram-v2 definition.
   */
  exportMermaid() {
    const lines = ['stateDiagram-v2'];
    lines.push(`  [*] --> ${this.initialState}`);

    this.transitions.forEach(t => {
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

// Browser DOM initializer for interactive DeFi state workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fsm = new DefiYieldMatrixFsmVisualizer();

    const currentStateElem = document.getElementById('current-state-badge');
    const nodesContainer = document.getElementById('nodes-container');
    const triggersContainer = document.getElementById('event-triggers');
    const historyList = document.getElementById('history-log');
    const mermaidExport = document.getElementById('mermaid-output');
    const resetBtn = document.getElementById('reset-fsm-btn');

    function updateView() {
      if (currentStateElem) {
        currentStateElem.textContent = fsm.currentState;
      }

      if (nodesContainer) {
        nodesContainer.replaceChildren();
        Array.from(fsm.states).forEach(state => {
          const card = document.createElement('div');
          card.className = `state-node-card ${state === fsm.currentState ? 'active' : ''}`;

          const dot = document.createElement('span');
          dot.className = 'state-dot';

          const label = document.createElement('span');
          label.textContent = state;

          card.append(dot, label);
          nodesContainer.append(card);
        });
      }

      if (triggersContainer) {
        triggersContainer.replaceChildren();
        const available = fsm.getAvailableEvents();
        if (available.length === 0) {
          const empty = document.createElement('p');
          empty.textContent = 'No forward transitions available from current state.';
          triggersContainer.append(empty);
        } else {
          available.forEach(evt => {
            const btn = document.createElement('button');
            btn.className = 'defi-trigger-btn';
            btn.textContent = `Dispatch: ${evt}`;
            btn.addEventListener('click', () => {
              fsm.dispatch(evt);
              updateView();
            });
            triggersContainer.append(btn);
          });
        }
      }

      if (historyList) {
        historyList.replaceChildren();
        fsm.history.slice(-8).reverse().forEach(entry => {
          const item = document.createElement('li');
          item.textContent = `[${entry.timestamp.split('T')[1].slice(0, 8)}] ${entry.from} -> (${entry.event}) -> ${entry.to}`;
          historyList.append(item);
        });
      }

      if (mermaidExport) {
        mermaidExport.textContent = fsm.exportMermaid();
      }
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        fsm.reset();
        updateView();
      });
    }

    updateView();
  });
}
