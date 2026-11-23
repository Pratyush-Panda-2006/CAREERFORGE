/**
 * Luxury Realms Circuit Breaker & API Resilience Simulator
 * Fault-tolerant tri-state circuit breaker (CLOSED, OPEN, HALF_OPEN)
 * with exponential cooldown backoff, graceful VIP concierge fallback,
 * request timeout interception, and real-time telemetry metrics.
 * 
 * Part of Luxury Realms Estate Concierge Infrastructure (NSoC 2026).
 */

export const CIRCUIT_STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
});

export class LuxuryRealmsCircuitBreaker {
  /**
   * @param {Object} options
   * @param {number} [options.failureThreshold=3] Number of consecutive failures to trip circuit
   * @param {number} [options.cooldownPeriod=2000] Cooldown period in ms before canary probe (alias: cooldownMs)
   * @param {number} [options.cooldownMs]
   * @param {number} [options.halfOpenSuccessThreshold=2] Successes required in HALF_OPEN to close circuit
   * @param {number} [options.requestTimeout=3000] Per-request timeout in ms (0 to disable) (alias: timeoutMs)
   * @param {number} [options.timeoutMs]
   * @param {number} [options.maxCooldownPeriod=30000] Max exponential cooldown cap in ms (alias: maxCooldownMs)
   * @param {number} [options.maxCooldownMs]
   * @param {boolean} [options.exponentialBackoff=true] Double cooldown on consecutive trips
   * @param {Function} [options.now=() => Date.now()] Clock provider
   * @param {string} [options.name='Luxury Realms Concierge API'] Service label
   */
  constructor(options = {}) {
    this.failureThreshold = Number.isInteger(options.failureThreshold) && options.failureThreshold > 0
      ? options.failureThreshold
      : 3;

    const baseCooldown = options.cooldownPeriod ?? options.cooldownMs ?? 2000;
    this.cooldownPeriod = typeof baseCooldown === 'number' && baseCooldown >= 0 ? baseCooldown : 2000;

    this.halfOpenSuccessThreshold = Number.isInteger(options.halfOpenSuccessThreshold) && options.halfOpenSuccessThreshold > 0
      ? options.halfOpenSuccessThreshold
      : 2;

    const baseTimeout = options.requestTimeout ?? options.timeoutMs ?? 3000;
    this.requestTimeout = typeof baseTimeout === 'number' && baseTimeout >= 0 ? baseTimeout : 3000;

    const baseMaxCooldown = options.maxCooldownPeriod ?? options.maxCooldownMs ?? 30000;
    this.maxCooldownPeriod = typeof baseMaxCooldown === 'number' && baseMaxCooldown >= this.cooldownPeriod
      ? baseMaxCooldown
      : Math.max(this.cooldownPeriod, 30000);

    this.exponentialBackoff = options.exponentialBackoff !== false;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.name = options.name || 'Luxury Realms Concierge API';

    // State internals
    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.consecutiveSuccessCount = 0;
    this.consecutiveTrips = 0;
    this.nextAttemptTime = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.lastStateChange = this.now();

    // Event listeners
    this._listeners = new Map();

    // Telemetry & Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      timedOutRequests: 0,
      fallbackCount: 0,
      trips: 0,
      resets: 0
    };

    // Audit Timeline
    this.history = [];
    this._maxHistory = 100;

    this._recordEvent('INITIALIZED', {
      state: this.state,
      failureThreshold: this.failureThreshold,
      cooldownPeriod: this.cooldownPeriod,
      halfOpenSuccessThreshold: this.halfOpenSuccessThreshold,
      requestTimeout: this.requestTimeout
    });
  }

  static get STATES() {
    return CIRCUIT_STATE;
  }

  /**
   * Internal event history recorder
   */
  _recordEvent(type, details = {}) {
    const entry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: this.now(),
      type,
      state: this.state,
      details
    };
    this.history.unshift(entry);
    if (this.history.length > this._maxHistory) {
      this.history.pop();
    }
    this.emit('event', entry);
    return entry;
  }

  /**
   * Register event listener
   * @param {string} event 'event' | 'stateChange' | 'trip' | 'reset'
   * @param {Function} handler
   */
  on(event, handler) {
    if (typeof handler !== 'function') return;
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Deregister event listener
   */
  off(event, handler) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(handler);
    }
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      for (const fn of handlers) {
        try {
          fn(data);
        } catch {
          // Guard against subscriber errors
        }
      }
    }
  }

  /**
   * Convenience listener for state transitions
   */
  onStateChange(handler) {
    return this.on('stateChange', handler);
  }

  /**
   * Calculates current effective cooldown taking exponential backoff into account
   */
  getEffectiveCooldown() {
    if (!this.exponentialBackoff || this.consecutiveTrips <= 1) {
      return this.cooldownPeriod;
    }
    const multiplier = Math.pow(2, Math.min(this.consecutiveTrips - 1, 8));
    return Math.min(this.maxCooldownPeriod, this.cooldownPeriod * multiplier);
  }

  /**
   * Returns deep status snapshot
   */
  getStatus() {
    const now = this.now();
    const remainingCooldownMs = this.state === CIRCUIT_STATE.OPEN
      ? Math.max(0, Math.ceil(this.nextAttemptTime - now))
      : 0;

    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      consecutiveSuccessCount: this.consecutiveSuccessCount,
      halfOpenSuccessThreshold: this.halfOpenSuccessThreshold,
      cooldownPeriod: this.cooldownPeriod,
      effectiveCooldownMs: this.getEffectiveCooldown(),
      maxCooldownPeriod: this.maxCooldownPeriod,
      requestTimeout: this.requestTimeout,
      nextAttemptTime: this.nextAttemptTime,
      remainingCooldownMs,
      consecutiveTrips: this.consecutiveTrips,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
      metrics: { ...this.metrics },
      history: [...this.history]
    };
  }

  /**
   * Manually or automatically trip circuit into OPEN state
   * @param {string} [reason='Manual intervention']
   */
  trip(reason = 'Manual intervention') {
    const prevState = this.state;
    this.state = CIRCUIT_STATE.OPEN;
    this.consecutiveTrips++;
    this.metrics.trips++;

    const effectiveCooldown = this.getEffectiveCooldown();
    this.nextAttemptTime = this.now() + effectiveCooldown;
    this.lastStateChange = this.now();

    const tripData = {
      from: prevState,
      to: CIRCUIT_STATE.OPEN,
      reason,
      cooldownMs: effectiveCooldown,
      nextAttemptTime: this.nextAttemptTime,
      consecutiveTrips: this.consecutiveTrips
    };

    this._recordEvent('TRIP', tripData);
    this.emit('trip', tripData);
    if (prevState !== CIRCUIT_STATE.OPEN) {
      this.emit('stateChange', { from: prevState, to: CIRCUIT_STATE.OPEN, reason });
    }

    return this.getStatus();
  }

  /**
   * Reset circuit back to healthy CLOSED state
   */
  reset() {
    const prevState = this.state;
    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.consecutiveSuccessCount = 0;
    this.consecutiveTrips = 0;
    this.nextAttemptTime = 0;
    this.metrics.resets++;
    this.lastStateChange = this.now();

    const resetData = {
      from: prevState,
      to: CIRCUIT_STATE.CLOSED,
      reason: 'Manual or automated reset'
    };

    this._recordEvent('RESET', resetData);
    this.emit('reset', resetData);
    if (prevState !== CIRCUIT_STATE.CLOSED) {
      this.emit('stateChange', { from: prevState, to: CIRCUIT_STATE.CLOSED, reason: 'Reset invoked' });
    }

    return this.getStatus();
  }

  /**
   * Execute protected request with fault-tolerant circuit breaker resilience
   * @param {Function} fn Function returning promise or value; receives (AbortSignal)
   * @param {Function|*} [fallback] Optional fallback function (error => result) or value
   */
  async execute(fn, fallback = null) {
    if (typeof fn !== 'function') {
      const err = new TypeError('LuxuryRealmsCircuitBreaker.execute expects a callable request function.');
      return this._handleFallback(err, fallback);
    }

    const currentTime = this.now();

    // Check if OPEN circuit has passed cooldown and should probe HALF_OPEN
    if (this.state === CIRCUIT_STATE.OPEN) {
      if (currentTime >= this.nextAttemptTime) {
        const prevState = this.state;
        this.state = CIRCUIT_STATE.HALF_OPEN;
        this.consecutiveSuccessCount = 0;
        this.lastStateChange = currentTime;

        const canaryData = {
          from: prevState,
          to: CIRCUIT_STATE.HALF_OPEN,
          reason: 'Cooldown expired; admitting canary probe'
        };
        this._recordEvent('STATE_CHANGE', canaryData);
        this.emit('stateChange', canaryData);
      } else {
        // Circuit is still OPEN during cooldown
        this.metrics.totalRequests++;
        this.metrics.rejectedRequests++;

        const remainingMs = Math.max(0, Math.ceil(this.nextAttemptTime - currentTime));
        const err = Object.assign(
          new Error(`Luxury Realms Circuit is OPEN. Request blocked for security. Retry after ${remainingMs}ms.`),
          {
            code: 'CIRCUIT_OPEN',
            circuitState: CIRCUIT_STATE.OPEN,
            retryAfterMs: remainingMs
          }
        );

        this._recordEvent('REJECTED', {
          reason: 'Circuit OPEN during cooldown',
          retryAfterMs: remainingMs
        });

        return this._handleFallback(err, fallback);
      }
    }

    // Circuit is now CLOSED or HALF_OPEN
    this.metrics.totalRequests++;
    const controller = new AbortController();
    let timeoutId = null;
    let timedOut = false;

    try {
      const dispatchPromise = Promise.resolve().then(() => fn(controller.signal));

      let executionPromise = dispatchPromise;
      if (this.requestTimeout > 0) {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            timedOut = true;
            try {
              controller.abort();
            } catch {
              // Ignore abort error
            }
            const timeoutError = Object.assign(
              new Error(`Request timed out after ${this.requestTimeout}ms in Luxury Realms Concierge.`),
              {
                code: 'REQUEST_TIMEOUT',
                timeoutMs: this.requestTimeout
              }
            );
            reject(timeoutError);
          }, this.requestTimeout);
        });

        executionPromise = Promise.race([dispatchPromise, timeoutPromise]);
      }

      const result = await executionPromise;

      // SUCCESS PATH
      if (timeoutId) clearTimeout(timeoutId);

      this.metrics.successfulRequests++;
      this.lastSuccessTime = this.now();

      if (this.state === CIRCUIT_STATE.HALF_OPEN) {
        this.consecutiveSuccessCount++;
        this._recordEvent('CANARY_SUCCESS', {
          consecutiveSuccessCount: this.consecutiveSuccessCount,
          threshold: this.halfOpenSuccessThreshold
        });

        if (this.consecutiveSuccessCount >= this.halfOpenSuccessThreshold) {
          // Closed successfully!
          const prevState = this.state;
          this.state = CIRCUIT_STATE.CLOSED;
          this.failureCount = 0;
          this.consecutiveSuccessCount = 0;
          this.consecutiveTrips = 0;
          this.nextAttemptTime = 0;
          this.lastStateChange = this.now();

          const recoveredData = {
            from: prevState,
            to: CIRCUIT_STATE.CLOSED,
            reason: `Canary probe succeeded ${this.halfOpenSuccessThreshold} consecutive times. Circuit restored.`
          };
          this._recordEvent('RECOVERED', recoveredData);
          this.emit('stateChange', recoveredData);
        }
      } else {
        // CLOSED state
        this.failureCount = 0;
        this._recordEvent('SUCCESS', { state: this.state });
      }

      return result;

    } catch (error) {
      // FAILURE PATH
      if (timeoutId) clearTimeout(timeoutId);

      this.metrics.failedRequests++;
      if (timedOut) {
        this.metrics.timedOutRequests++;
      }
      this.lastFailureTime = this.now();
      this.failureCount++;

      this._recordEvent('FAILURE', {
        error: error.message,
        code: error.code || 'REQUEST_FAILED',
        state: this.state,
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });

      if (this.state === CIRCUIT_STATE.HALF_OPEN) {
        // Any failure in HALF_OPEN immediately trips back to OPEN
        this.trip(`Canary trial failed in HALF_OPEN: ${error.message}`);
      } else if (this.state === CIRCUIT_STATE.CLOSED && this.failureCount >= this.failureThreshold) {
        // Threshold breached
        this.trip(`Failure threshold of ${this.failureThreshold} reached (${this.failureCount} consecutive failures)`);
      }

      return this._handleFallback(error, fallback);
    }
  }

  /**
   * Execute fallback or rethrow error
   */
  async _handleFallback(error, fallback) {
    if (fallback !== null && fallback !== undefined) {
      this.metrics.fallbackCount++;
      this._recordEvent('FALLBACK_TRIGGERED', {
        error: error.message,
        fallbackType: typeof fallback === 'function' ? 'function' : 'static_value'
      });
      if (typeof fallback === 'function') {
        return await fallback(error);
      }
      return fallback;
    }
    throw error;
  }
}

// Global browser dashboard mount if running in browser DOM
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.LuxuryRealmsCircuitBreaker = LuxuryRealmsCircuitBreaker;
  window.CIRCUIT_STATE = CIRCUIT_STATE;

  document.addEventListener('DOMContentLoaded', () => {
    initLuxuryCircuitBreakerDashboard();
  });
}

/**
 * Initializes interactive dashboard controllers for circuit-breaker.html
 */
export function initLuxuryCircuitBreakerDashboard() {
  const root = document.querySelector('[data-luxury-circuit-breaker]');
  if (!root) return null;

  const breaker = new LuxuryRealmsCircuitBreaker({
    failureThreshold: 3,
    cooldownPeriod: 3500,
    halfOpenSuccessThreshold: 2,
    requestTimeout: 2000,
    exponentialBackoff: true,
    name: 'Luxury Realms Royal Concierge Gateway'
  });

  // UI Element bindings
  const lampClosed = root.querySelector('#lampClosed');
  const lampHalfOpen = root.querySelector('#lampHalfOpen');
  const lampOpen = root.querySelector('#lampOpen');
  const stateBadge = root.querySelector('#stateBadge');
  const stateDescription = root.querySelector('#stateDescription');
  const cooldownTimerEl = root.querySelector('#cooldownTimer');

  const metricTotal = root.querySelector('#metricTotal');
  const metricSuccess = root.querySelector('#metricSuccess');
  const metricFailed = root.querySelector('#metricFailed');
  const metricRejected = root.querySelector('#metricRejected');
  const metricFallback = root.querySelector('#metricFallback');
  const metricTrips = root.querySelector('#metricTrips');
  const metricRate = root.querySelector('#metricRate');

  const failureMeterBar = root.querySelector('#failureMeterBar');
  const failureMeterText = root.querySelector('#failureMeterText');
  const canaryMeterBar = root.querySelector('#canaryMeterBar');
  const canaryMeterText = root.querySelector('#canaryMeterText');

  const timelineStream = root.querySelector('#timelineStream');
  const fallbackNotice = root.querySelector('#fallbackNotice');
  const fallbackDetails = root.querySelector('#fallbackDetails');

  // Interactive buttons
  const btnSuccess = root.querySelector('#btnSimulateSuccess');
  const btnFailure = root.querySelector('#btnSimulateFailure');
  const btnTimeout = root.querySelector('#btnSimulateTimeout');
  const btnFlaky = root.querySelector('#btnSimulateFlaky');
  const btnSpike = root.querySelector('#btnSimulateSpike');
  const btnTrip = root.querySelector('#btnTripCircuit');
  const btnReset = root.querySelector('#btnResetCircuit');
  const btnClearTimeline = root.querySelector('#btnClearTimeline');
  const apiEndpointSelect = root.querySelector('#apiEndpointSelect');

  // Real-time render loop
  function updateUI() {
    const status = breaker.getStatus();

    // 1. Update Lamps
    if (lampClosed) lampClosed.className = `lamp lamp-closed ${status.state === 'CLOSED' ? 'active' : ''}`;
    if (lampHalfOpen) lampHalfOpen.className = `lamp lamp-half-open ${status.state === 'HALF_OPEN' ? 'active' : ''}`;
    if (lampOpen) lampOpen.className = `lamp lamp-open ${status.state === 'OPEN' ? 'active' : ''}`;

    // 2. Update Badge & Text
    if (stateBadge) {
      stateBadge.textContent = status.state;
      stateBadge.className = `status-pill pill-${status.state.toLowerCase()}`;
    }

    if (stateDescription) {
      if (status.state === 'CLOSED') {
        stateDescription.textContent = 'All estate concierge API endpoints operating normally with peak resilience.';
      } else if (status.state === 'HALF_OPEN') {
        stateDescription.textContent = `Canary probe active. Verified ${status.consecutiveSuccessCount}/${status.halfOpenSuccessThreshold} trial passes before closing.`;
      } else {
        stateDescription.textContent = `Backend shielded. Intercepting calls. Retry cooldown: ${status.remainingCooldownMs}ms remaining.`;
      }
    }

    if (cooldownTimerEl) {
      if (status.state === 'OPEN' && status.remainingCooldownMs > 0) {
        cooldownTimerEl.style.display = 'inline-block';
        cooldownTimerEl.textContent = `⏳ Probe in ${(status.remainingCooldownMs / 1000).toFixed(1)}s`;
      } else {
        cooldownTimerEl.style.display = 'none';
      }
    }

    // 3. Metrics
    if (metricTotal) metricTotal.textContent = status.metrics.totalRequests;
    if (metricSuccess) metricSuccess.textContent = status.metrics.successfulRequests;
    if (metricFailed) metricFailed.textContent = status.metrics.failedRequests;
    if (metricRejected) metricRejected.textContent = status.metrics.rejectedRequests;
    if (metricFallback) metricFallback.textContent = status.metrics.fallbackCount;
    if (metricTrips) metricTrips.textContent = status.metrics.trips;

    if (metricRate) {
      const total = status.metrics.totalRequests;
      const rate = total > 0 ? Math.round((status.metrics.successfulRequests / total) * 100) : 100;
      metricRate.textContent = `${rate}%`;
    }

    // 4. Progress Bars
    if (failureMeterBar) {
      const pct = Math.min(100, Math.round((status.failureCount / status.failureThreshold) * 100));
      failureMeterBar.style.width = `${pct}%`;
      failureMeterBar.className = `meter-fill ${pct >= 100 ? 'fill-crimson' : pct > 0 ? 'fill-amber' : 'fill-gold'}`;
    }
    if (failureMeterText) {
      failureMeterText.textContent = `${status.failureCount} / ${status.failureThreshold} Failures`;
    }

    if (canaryMeterBar) {
      const pct = Math.min(100, Math.round((status.consecutiveSuccessCount / status.halfOpenSuccessThreshold) * 100));
      canaryMeterBar.style.width = `${pct}%`;
    }
    if (canaryMeterText) {
      canaryMeterText.textContent = `${status.consecutiveSuccessCount} / ${status.halfOpenSuccessThreshold} Passes`;
    }
  }

  // Fallback handler for luxury concierge clients
  function conciergeVipFallback(error) {
    const fallbackPayload = {
      status: 'VIP_FALLBACK_ACTIVE',
      reservationId: `VIP-RES-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      conciergeNote: 'Estate request securely routed to 24/7 Mayfair Private Butler Desk for prioritized offline settlement.',
      originalError: error.message
    };

    if (fallbackNotice && fallbackDetails) {
      fallbackNotice.classList.add('visible');
      fallbackDetails.textContent = JSON.stringify(fallbackPayload, null, 2);
      setTimeout(() => {
        fallbackNotice.classList.remove('visible');
      }, 7000);
    }

    return fallbackPayload;
  }

  // Add timeline entry
  function renderTimelineEntry(entry) {
    if (!timelineStream) return;
    const item = document.createElement('div');
    item.className = `timeline-item type-${entry.type.toLowerCase()} state-${entry.state.toLowerCase()}`;

    const timeStr = new Date(entry.timestamp).toLocaleTimeString();
    const detailsStr = entry.details ? Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' | ') : '';

    item.innerHTML = `
      <div class="timeline-meta">
        <span class="timeline-time">${timeStr}</span>
        <span class="timeline-type status-pill pill-sm">${entry.type}</span>
      </div>
      <div class="timeline-content">
        <span class="timeline-state">[${entry.state}]</span>
        <span class="timeline-desc">${detailsStr}</span>
      </div>
    `;

    timelineStream.prepend(item);

    // Limit visible DOM items
    while (timelineStream.children.length > 25) {
      timelineStream.removeChild(timelineStream.lastChild);
    }
  }

  breaker.on('event', (entry) => {
    renderTimelineEntry(entry);
    updateUI();
  });

  breaker.onStateChange(() => {
    updateUI();
  });

  // Mock API runners
  async function dispatchMockApi(mode) {
    const endpoint = apiEndpointSelect ? apiEndpointSelect.value : 'Private Island Booking API';

    try {
      await breaker.execute(async (signal) => {
        if (mode === 'success') {
          await new Promise((r) => setTimeout(r, 120));
          if (signal.aborted) throw new Error('Client aborted request');
          return { ok: true, endpoint, confirmation: `CONF-${Date.now().toString(36).toUpperCase()}` };
        } else if (mode === 'failure') {
          await new Promise((r) => setTimeout(r, 150));
          throw new Error(`503 High-Volume Luxury Concierge Congestion at [${endpoint}]`);
        } else if (mode === 'timeout') {
          // Exceeds requestTimeout (2000ms)
          await new Promise((r) => setTimeout(r, 3500));
          return { ok: true };
        } else if (mode === 'flaky') {
          await new Promise((r) => setTimeout(r, 100));
          if (Math.random() > 0.5) {
            throw new Error(`500 Gateway Latency Spike at [${endpoint}]`);
          }
          return { ok: true, endpoint };
        }
      }, conciergeVipFallback);
    } catch (err) {
      // Handled or rethrown
    }
    updateUI();
  }

  // Button Listeners
  btnSuccess?.addEventListener('click', () => dispatchMockApi('success'));
  btnFailure?.addEventListener('click', () => dispatchMockApi('failure'));
  btnTimeout?.addEventListener('click', () => dispatchMockApi('timeout'));
  btnFlaky?.addEventListener('click', () => dispatchMockApi('flaky'));

  btnSpike?.addEventListener('click', async () => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => dispatchMockApi(i % 2 === 0 ? 'failure' : 'success'), i * 80);
    }
  });

  btnTrip?.addEventListener('click', () => {
    breaker.trip('Estate Security Officer manual trip');
    updateUI();
  });

  btnReset?.addEventListener('click', () => {
    breaker.reset();
    updateUI();
  });

  btnClearTimeline?.addEventListener('click', () => {
    if (timelineStream) timelineStream.innerHTML = '';
  });

  // Live timer tick for cooldown countdown display
  setInterval(() => {
    if (breaker.state === CIRCUIT_STATE.OPEN) {
      updateUI();
    }
  }, 250);

  updateUI();
  return breaker;
}
