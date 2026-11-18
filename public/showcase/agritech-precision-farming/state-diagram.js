/**
 * AgritechPrecisionFarmingFsmVisualizer
 * In-browser finite state machine (FSM) transition mapper and workflow visualizer
 * for autonomous agricultural crop cycles, irrigation workflows, frost defenses, and Mermaid.js diagram generation.
 */
export class AgritechPrecisionFarmingFsmVisualizer {
  constructor(options = {}) {
    this.initialState = options.initialState || 'SOIL_SAMPLING';
    this.currentState = this.initialState;
    this.transitions = [];
    this.history = [];
    this.listeners = [];

    if (options.transitions && Array.isArray(options.transitions)) {
      options.transitions.forEach((t) => this.addTransition(t.from, t.event, t.to));
    } else {
      this.initDefaultAgritechWorkflow();
    }

    this.recordHistory(null, null, this.currentState, 'Soil baseline established');
  }

  initDefaultAgritechWorkflow() {
    const defaultTransitions = [
      { from: 'SOIL_SAMPLING', event: 'MOISTURE_VERIFIED', to: 'SEEDING_PREPARATION' },
      { from: 'SEEDING_PREPARATION', event: 'PLANTING_COMPLETE', to: 'IRRIGATION_ACTIVE' },
      { from: 'IRRIGATION_ACTIVE', event: 'SOIL_SATURATED', to: 'NUTRIENT_DISPENSING' },
      { from: 'NUTRIENT_DISPENSING', event: 'DOSING_FINISHED', to: 'CROP_MONITORING' },
      { from: 'CROP_MONITORING', event: 'MATURITY_REACHED', to: 'HARVEST_READY' },
      { from: 'CROP_MONITORING', event: 'FREEZING_TEMP_DETECTED', to: 'FROST_ALERT_DEFENSE' },
      { from: 'FROST_ALERT_DEFENSE', event: 'HEATERS_NORMALIZED', to: 'CROP_MONITORING' },
      { from: 'HARVEST_READY', event: 'COMBINE_HARVEST_COMPLETE', to: 'SOIL_SAMPLING' },
      { from: 'IRRIGATION_ACTIVE', event: 'RAIN_DETECTED', to: 'CROP_MONITORING' },
      { from: 'CROP_MONITORING', event: 'DRY_SPELL_WARNING', to: 'IRRIGATION_ACTIVE' }
    ];

    defaultTransitions.forEach((t) => this.addTransition(t.from, t.event, t.to));
  }

  addTransition(from, event, to) {
    if (!from || !event || !to) {
      throw new Error('From state, event, and to state are strictly required');
    }

    const trimmedFrom = String(from).trim().toUpperCase();
    const trimmedEvent = String(event).trim().toUpperCase();
    const trimmedTo = String(to).trim().toUpperCase();

    const exists = this.transitions.some(
      (t) => t.from === trimmedFrom && t.event === trimmedEvent && t.to === trimmedTo
    );

    if (!exists) {
      this.transitions.push({ from: trimmedFrom, event: trimmedEvent, to: trimmedTo });
    }

    return this;
  }

  getAvailableEvents(state = this.currentState) {
    return this.transitions
      .filter((t) => t.from === state)
      .map((t) => ({ event: t.event, targetState: t.to }));
  }

  dispatch(event) {
    if (!event) {
      throw new Error('Event parameter is required to dispatch transition');
    }

    const trimmedEvent = String(event).trim().toUpperCase();
    const validTransition = this.transitions.find(
      (t) => t.from === this.currentState && t.event === trimmedEvent
    );

    if (!validTransition) {
      const err = new Error(
        `Invalid transition: Event "${trimmedEvent}" cannot be dispatched from state "${this.currentState}"`
      );
      this.notifyError(err);
      throw err;
    }

    const previousState = this.currentState;
    this.currentState = validTransition.to;
    this.recordHistory(previousState, trimmedEvent, this.currentState, 'Agritech cycle transition successful');
    this.notify();

    return {
      previousState,
      event: trimmedEvent,
      currentState: this.currentState
    };
  }

  recordHistory(from, event, to, note) {
    this.history.unshift({
      timestamp: new Date().toISOString(),
      from,
      event,
      to,
      note
    });

    if (this.history.length > 50) {
      this.history.pop();
    }
  }

  reset(initialState = this.initialState) {
    const prev = this.currentState;
    this.currentState = initialState.toUpperCase();
    this.recordHistory(prev, 'RESET', this.currentState, 'FSM reset to initial soil sampling state');
    this.notify();
    return this.currentState;
  }

  exportMermaid() {
    const lines = ['stateDiagram-v2'];
    lines.push(`    [*] --> ${this.initialState}`);

    this.transitions.forEach((t) => {
      lines.push(`    ${t.from} --> ${t.to}: ${t.event}`);
    });

    return lines.join('\n');
  }

  getState() {
    return this.currentState;
  }

  getTransitions() {
    return [...this.transitions];
  }

  getHistory() {
    return [...this.history];
  }

  getAllStates() {
    const stateSet = new Set();
    stateSet.add(this.initialState);
    stateSet.add(this.currentState);
    this.transitions.forEach((t) => {
      stateSet.add(t.from);
      stateSet.add(t.to);
    });
    return Array.from(stateSet);
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.currentState, this.getAvailableEvents(), this.history);
      } catch (e) {
        console.error('FSM listener execution error:', e);
      }
    });
  }

  notifyError(error) {
    this.listeners.forEach((fn) => {
      try {
        if (typeof fn.onError === 'function') {
          fn.onError(error);
        }
      } catch (e) {
        console.error('FSM error callback error:', e);
      }
    });
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element is required');
    }

    container.replaceChildren();

    const rootWrapper = document.createElement('div');
    rootWrapper.className = 'fsm-workbench-root';

    // Header
    const header = document.createElement('header');
    header.className = 'fsm-header';
    const title = document.createElement('h2');
    title.textContent = 'Agritech Precision Farming — Finite State Machine & Crop Visualizer';
    const subtitle = document.createElement('p');
    subtitle.textContent =
      'Real-time agronomic crop cycle transitions, event dispatching engine, and Mermaid.js topology exporter.';
    header.append(title, subtitle);

    // Current State Banner
    const statusBanner = document.createElement('div');
    statusBanner.className = 'fsm-status-banner';
    const statusLabel = document.createElement('span');
    statusLabel.className = 'fsm-status-label';
    statusLabel.textContent = 'Active Agronomic State:';
    const statusBadge = document.createElement('span');
    statusBadge.className = 'fsm-status-badge';
    statusBadge.textContent = this.currentState;
    statusBanner.append(statusLabel, statusBadge);

    // Main layout
    const mainGrid = document.createElement('div');
    mainGrid.className = 'fsm-main-grid';

    // State Topology Visualization Panel
    const topologyPanel = document.createElement('div');
    topologyPanel.className = 'fsm-panel fsm-topology-panel';
    const topoHeading = document.createElement('h3');
    topoHeading.textContent = 'Crop Lifecycle Nodes';
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'fsm-nodes-container';

    // Event Trigger Panel
    const actionsPanel = document.createElement('div');
    actionsPanel.className = 'fsm-panel fsm-actions-panel';
    const actHeading = document.createElement('h3');
    actHeading.textContent = 'Available Farming Dispatches';
    const eventButtonsContainer = document.createElement('div');
    eventButtonsContainer.className = 'fsm-event-buttons';

    // Custom Transition Form
    const customForm = document.createElement('div');
    customForm.className = 'fsm-custom-form';
    const customTitle = document.createElement('h4');
    customTitle.textContent = 'Inject Custom Crop Transition';
    const inputFrom = document.createElement('input');
    inputFrom.placeholder = 'From State (e.g. SILO_STORAGE)';
    const inputEvent = document.createElement('input');
    inputEvent.placeholder = 'Event (e.g. GRAIN_TRANSFER)';
    const inputTo = document.createElement('input');
    inputTo.placeholder = 'To State (e.g. PACKAGING_BAY)';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Transition';
    addBtn.className = 'fsm-btn fsm-btn-primary';

    customForm.append(customTitle, inputFrom, inputEvent, inputTo, addBtn);

    // Event History & Mermaid Export Panel
    const sidebarPanel = document.createElement('div');
    sidebarPanel.className = 'fsm-panel fsm-sidebar-panel';

    const mermaidHeading = document.createElement('h3');
    mermaidHeading.textContent = 'Mermaid.js Topology Code';
    const mermaidTextarea = document.createElement('textarea');
    mermaidTextarea.className = 'fsm-mermaid-box';
    mermaidTextarea.readOnly = true;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'fsm-btn fsm-btn-secondary';
    copyBtn.textContent = 'Copy Mermaid Definition';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(mermaidTextarea.value);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Mermaid Definition';
      }, 1500);
    });

    const historyHeading = document.createElement('h3');
    historyHeading.textContent = 'Agronomic Event History';
    const historyList = document.createElement('ul');
    historyList.className = 'fsm-history-list';

    sidebarPanel.append(mermaidHeading, mermaidTextarea, copyBtn, historyHeading, historyList);

    // DOM Update Function
    const updateUI = () => {
      statusBadge.textContent = this.currentState;
      statusBadge.setAttribute('data-state', this.currentState);

      // Render Nodes
      nodesContainer.replaceChildren();
      const allStates = this.getAllStates();
      allStates.forEach((state) => {
        const nodeCard = document.createElement('div');
        nodeCard.className = 'fsm-state-node';
        if (state === this.currentState) {
          nodeCard.classList.add('fsm-state-active');
        }

        const nodeTitle = document.createElement('div');
        nodeTitle.className = 'fsm-node-title';
        nodeTitle.textContent = state;

        const outgoing = this.transitions.filter((t) => t.from === state);
        const nodeSub = document.createElement('div');
        nodeSub.className = 'fsm-node-outgoing';
        nodeSub.textContent = `${outgoing.length} outgoing link(s)`;

        nodeCard.append(nodeTitle, nodeSub);
        nodesContainer.append(nodeCard);
      });

      // Render Event Buttons
      eventButtonsContainer.replaceChildren();
      const available = this.getAvailableEvents();
      if (available.length === 0) {
        const noEvents = document.createElement('p');
        noEvents.className = 'fsm-muted';
        noEvents.textContent = 'No outgoing transitions from current state (Terminal state).';
        eventButtonsContainer.append(noEvents);
      } else {
        available.forEach((ev) => {
          const btn = document.createElement('button');
          btn.className = 'fsm-btn fsm-event-btn';
          btn.textContent = `Dispatch ${ev.event} → [${ev.targetState}]`;
          btn.addEventListener('click', () => {
            try {
              this.dispatch(ev.event);
            } catch (err) {
              alert(err.message);
            }
          });
          eventButtonsContainer.append(btn);
        });
      }

      // Reset Button
      const resetBtn = document.createElement('button');
      resetBtn.className = 'fsm-btn fsm-btn-warning';
      resetBtn.textContent = 'Reset to Soil Sampling';
      resetBtn.addEventListener('click', () => this.reset());
      eventButtonsContainer.append(resetBtn);

      // Mermaid Export
      mermaidTextarea.value = this.exportMermaid();

      // History
      historyList.replaceChildren();
      this.history.forEach((h) => {
        const li = document.createElement('li');
        li.className = 'fsm-history-item';
        const timeSpan = document.createElement('span');
        timeSpan.className = 'fsm-hist-time';
        timeSpan.textContent = h.timestamp.split('T')[1].split('.')[0];

        const descSpan = document.createElement('span');
        descSpan.className = 'fsm-hist-desc';
        if (h.from) {
          descSpan.textContent = `[${h.from}] --(${h.event})--> [${h.to}]`;
        } else {
          descSpan.textContent = `[${h.to}] : ${h.note}`;
        }

        li.append(timeSpan, descSpan);
        historyList.append(li);
      });
    };

    addBtn.addEventListener('click', () => {
      const fromVal = inputFrom.value.trim();
      const eventVal = inputEvent.value.trim();
      const toVal = inputTo.value.trim();
      if (fromVal && eventVal && toVal) {
        this.addTransition(fromVal, eventVal, toVal);
        inputFrom.value = '';
        inputEvent.value = '';
        inputTo.value = '';
        updateUI();
      }
    });

    this.subscribe(updateUI);

    topologyPanel.append(topoHeading, nodesContainer);
    actionsPanel.append(actHeading, eventButtonsContainer, customForm);
    mainGrid.append(topologyPanel, actionsPanel, sidebarPanel);
    rootWrapper.append(header, statusBanner, mainGrid);
    container.append(rootWrapper);

    updateUI();
    return rootWrapper;
  }
}
