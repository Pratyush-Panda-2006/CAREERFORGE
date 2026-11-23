/**
 * TerraInitia & Nonprofit Impact - Fault-Tolerant Circuit Breaker & API Resilience Simulator
 * Issue #2851 - NSoC 2026 Humanitarian Infrastructure
 * 
 * Production-grade tri-state circuit breaker (CLOSED, OPEN, HALF_OPEN) with:
 * - Configurable failureThreshold, cooldownPeriod, halfOpenSuccessThreshold, requestTimeout
 * - Exponential backoff with configurable ceiling
 * - Graceful humanitarian aid fallback & contingency ledger routing
 * - Request timeout interception with AbortSignal cancellation
 * - Real-time telemetry metrics, event emission, and audit timeline tracking
 */

export const CIRCUIT_STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
});

export class NonprofitImpactCircuitBreaker {
  /**
   * @param {Object} [options={}] Configuration options
   * @param {number} [options.failureThreshold=3] Consecutive failures before tripping to OPEN
   * @param {number} [options.cooldownPeriod=2000] Cooldown in ms before canary trial (alias: cooldownMs)
   * @param {number} [options.cooldownMs]
   * @param {number} [options.halfOpenSuccessThreshold=2] Successes required in HALF_OPEN to close circuit (alias: halfOpenTrials)
   * @param {number} [options.halfOpenTrials]
   * @param {number} [options.requestTimeout=3000] Per-request timeout in ms (0 to disable) (alias: timeoutMs, timeout)
   * @param {number} [options.timeoutMs]
   * @param {number} [options.timeout]
   * @param {number} [options.maxCooldownPeriod=30000] Maximum cooldown cap for exponential backoff (alias: maxCooldownMs)
   * @param {number} [options.maxCooldownMs]
   * @param {boolean} [options.exponentialBackoff=true] Whether to double cooldown on repeated trips
   * @param {Function} [options.now=() => Date.now()] Clock provider function
   * @param {string} [options.name='Humanitarian Aid Gateway API'] Microservice name
   */
  constructor(options = {}) {
    // Validate and assign failureThreshold
    if (options.failureThreshold !== undefined && (!Number.isInteger(options.failureThreshold) || options.failureThreshold <= 0)) {
      throw new RangeError('failureThreshold must be a positive integer.');
    }
    this.failureThreshold = options.failureThreshold ?? 3;

    // Validate and assign cooldownPeriod
    const rawCooldown = options.cooldownPeriod ?? options.cooldownMs ?? 2000;
    if (typeof rawCooldown !== 'number' || rawCooldown < 0 || !Number.isFinite(rawCooldown)) {
      throw new RangeError('cooldownPeriod must be a non-negative number.');
    }
    this.cooldownPeriod = rawCooldown;

    // Validate and assign halfOpenSuccessThreshold
    const rawHalfOpen = options.halfOpenSuccessThreshold ?? options.halfOpenTrials ?? 2;
    if (!Number.isInteger(rawHalfOpen) || rawHalfOpen <= 0) {
      throw new RangeError('halfOpenSuccessThreshold must be a positive integer.');
    }
    this.halfOpenSuccessThreshold = rawHalfOpen;

    // Validate and assign requestTimeout
    const rawTimeout = options.requestTimeout ?? options.timeoutMs ?? options.timeout ?? 3000;
    if (typeof rawTimeout !== 'number' || rawTimeout < 0 || !Number.isFinite(rawTimeout)) {
      throw new RangeError('requestTimeout must be a non-negative number.');
    }
    this.requestTimeout = rawTimeout;

    // Validate and assign maxCooldownPeriod
    const rawMaxCooldown = options.maxCooldownPeriod ?? options.maxCooldownMs ?? 30000;
    if (typeof rawMaxCooldown !== 'number' || rawMaxCooldown < this.cooldownPeriod || !Number.isFinite(rawMaxCooldown)) {
      throw new RangeError('maxCooldownPeriod must be at least equal to cooldownPeriod.');
    }
    this.maxCooldownPeriod = rawMaxCooldown;

    // Backoff and clock
    this.exponentialBackoff = options.exponentialBackoff !== false;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.name = options.name || 'Humanitarian Aid Gateway API';

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
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
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
   * Emit event to registered listeners safely
   */
  emit(event, data) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      for (const fn of handlers) {
        try {
          fn(data);
        } catch {
          // Prevent listener errors from interfering with breaker execution
        }
      }
    }
  }

  /**
   * Convenience listener for state changes
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
   */
  onStateChange(handler) {
    return this.on('stateChange', handler);
  }

  /**
   * Calculates current effective cooldown taking exponential backoff into account
   * @returns {number} Cooldown in milliseconds
   */
  getEffectiveCooldown() {
    if (!this.exponentialBackoff || this.consecutiveTrips <= 1) {
      return this.cooldownPeriod;
    }
    const multiplier = Math.pow(2, Math.min(this.consecutiveTrips - 1, 8));
    return Math.min(this.maxCooldownPeriod, this.cooldownPeriod * multiplier);
  }

  /**
   * Returns a complete defensive status snapshot of the circuit breaker
   * @returns {Object} Snapshot of current state and metrics
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
      history: this.history.map(item => ({ ...item, details: { ...item.details } }))
    };
  }

  /**
   * Manually or automatically trip the circuit into OPEN state
   * @param {string} [reason='Manual intervention']
   * @returns {Object} Current status snapshot
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
   * @returns {Object} Current status snapshot
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
   * @returns {Promise<*>}
   */
  async execute(fn, fallback = null) {
    if (typeof fn !== 'function') {
      const err = new TypeError('NonprofitImpactCircuitBreaker.execute expects a callable request function.');
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
          new Error(`Nonprofit Impact Circuit is OPEN. Relief request blocked to protect aid systems. Retry after ${remainingMs}ms.`),
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
              new Error(`Request timed out after ${this.requestTimeout}ms in Humanitarian Aid Gateway.`),
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
            reason: `Canary probe succeeded ${this.halfOpenSuccessThreshold} consecutive times. Relief gateway restored.`
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
      this._recordEvent('FALLBACK', {
        error: error.message,
        code: error.code
      });
      if (typeof fallback === 'function') {
        return await fallback(error);
      }
      return fallback;
    }
    throw error;
  }
}

/**
 * UI Mount & Interactive Controller for Browser Showcase
 */
export function initNonprofitCircuitBreaker() {
  if (typeof document === 'undefined') return null;

  const root = document.querySelector('[data-nonprofit-circuit-breaker]');
  if (!root) return null;

  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 3,
    cooldownPeriod: 2500,
    halfOpenSuccessThreshold: 2,
    requestTimeout: 2000,
    maxCooldownPeriod: 30000,
    exponentialBackoff: true,
    name: 'TerraInitia Humanitarian Aid & Donation Gateway'
  });

  // DOM Query Helpers
  const $ = (selector) => root.querySelector(selector);

  // Cockpit Elements
  const lampClosed = $('#lampClosed');
  const lampHalfOpen = $('#lampHalfOpen');
  const lampOpen = $('#lampOpen');
  const stateBadge = $('#stateBadge');
  const cooldownTimer = $('#cooldownTimer');
  const stateDescription = $('#stateDescription');

  // Gauge Elements
  const failureMeterBar = $('#failureMeterBar');
  const failureMeterText = $('#failureMeterText');
  const canaryMeterBar = $('#canaryMeterBar');
  const canaryMeterText = $('#canaryMeterText');

  // Metrics Elements
  const metricTotal = $('#metricTotal');
  const metricSuccess = $('#metricSuccess');
  const metricFailed = $('#metricFailed');
  const metricRejected = $('#metricRejected');
  const metricFallback = $('#metricFallback');
  const metricTrips = $('#metricTrips');
  const metricRate = $('#metricRate');

  // Control Elements
  const apiEndpointSelect = $('#apiEndpointSelect');
  const btnSuccess = $('#btnSimulateSuccess');
  const btnFailure = $('#btnSimulateFailure');
  const btnTimeout = $('#btnSimulateTimeout');
  const btnFlaky = $('#btnSimulateFlaky');
  const btnSpike = $('#btnSimulateSpike');
  const btnTrip = $('#btnTripCircuit');
  const btnReset = $('#btnResetCircuit');
  const btnClearTimeline = $('#btnClearTimeline');

  // Fallback Notice
  const fallbackNotice = $('#fallbackNotice');
  const fallbackDetails = $('#fallbackDetails');

  // Timeline Stream
  const timelineStream = $('#timelineStream');

  // Update UI Elements
  function updateUI() {
    const status = breaker.getStatus();

    // 1. Physical Tri-State Lamps (Emerald / Amber / Rose)
    if (lampClosed) lampClosed.className = `lamp lamp-closed ${status.state === CIRCUIT_STATE.CLOSED ? 'active' : ''}`;
    if (lampHalfOpen) lampHalfOpen.className = `lamp lamp-half-open ${status.state === CIRCUIT_STATE.HALF_OPEN ? 'active' : ''}`;
    if (lampOpen) lampOpen.className = `lamp lamp-open ${status.state === CIRCUIT_STATE.OPEN ? 'active' : ''}`;

    // 2. Status Badge & Description
    if (stateBadge) {
      stateBadge.textContent = status.state;
      stateBadge.className = `status-pill pill-${status.state.toLowerCase().replace('_', '-')}`;
    }

    if (cooldownTimer) {
      if (status.state === CIRCUIT_STATE.OPEN) {
        cooldownTimer.style.display = 'inline-block';
        if (status.remainingCooldownMs > 0) {
          cooldownTimer.textContent = `⏳ Cooldown: ${status.remainingCooldownMs}ms (Backoff: ${status.effectiveCooldownMs}ms)`;
        } else {
          cooldownTimer.textContent = '⚡ Cooldown expired: Ready for canary trial';
        }
      } else {
        cooldownTimer.style.display = 'none';
      }
    }

    if (stateDescription) {
      if (status.state === CIRCUIT_STATE.CLOSED) {
        stateDescription.textContent = 'All humanitarian aid endpoints and donation pipelines operating normally with peak resilience.';
      } else if (status.state === CIRCUIT_STATE.HALF_OPEN) {
        stateDescription.textContent = `Probing connectivity: Admitting canary trial request (${status.consecutiveSuccessCount}/${status.halfOpenSuccessThreshold} passed).`;
      } else {
        stateDescription.textContent = `Circuit OPEN: Downstream aid services protected. Offline cryptographic ledger handling donation failovers.`;
      }
    }

    // 3. Telemetry Metrics
    if (metricTotal) metricTotal.textContent = status.metrics.totalRequests;
    if (metricSuccess) metricSuccess.textContent = status.metrics.successfulRequests;
    if (metricFailed) metricFailed.textContent = status.metrics.failedRequests;
    if (metricRejected) metricRejected.textContent = status.metrics.rejectedRequests;
    if (metricFallback) metricFallback.textContent = status.metrics.fallbackCount;
    if (metricTrips) metricTrips.textContent = status.metrics.trips;

    if (metricRate) {
      const processed = status.metrics.successfulRequests + status.metrics.failedRequests;
      const rate = processed > 0
        ? Math.round((status.metrics.successfulRequests / processed) * 100)
        : 100;
      metricRate.textContent = `${rate}%`;
    }

    // 4. Progress Meters
    if (failureMeterBar) {
      const pct = Math.min(100, Math.round((status.failureCount / status.failureThreshold) * 100));
      failureMeterBar.style.width = `${pct}%`;
      failureMeterBar.className = `meter-fill ${pct >= 100 ? 'fill-rose' : pct > 0 ? 'fill-amber' : 'fill-emerald'}`;
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

  // Graceful Offline Aid Ledger Fallback Handler
  function humanitarianOfflineFallback(error) {
    const fallbackPayload = {
      status: 'OFFLINE_AID_LEDGER_BUFFERED',
      grantId: `AID-GRANT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      contingencyRoute: 'Local Cryptographic Field Vault (Encrypted SQLite/IndexedDB)',
      contingencyNote: 'Donation securely committed to offline storage. Queued for automatic batch sync once field uplink is restored.',
      originalError: error.message
    };

    if (fallbackNotice && fallbackDetails) {
      fallbackNotice.classList.add('visible');
      fallbackDetails.textContent = JSON.stringify(fallbackPayload, null, 2);
      setTimeout(() => {
        fallbackNotice.classList.remove('visible');
      }, 7500);
    }

    return fallbackPayload;
  }

  // Add Timeline Entry
  function renderTimelineEntry(entry) {
    if (!timelineStream) return;
    const item = document.createElement('div');
    const typeClass = entry.type.toLowerCase().replace('_', '-');
    const stateClass = entry.state.toLowerCase().replace('_', '-');
    item.className = `timeline-item type-${typeClass} state-${stateClass}`;

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

    // Keep up to 25 items in DOM
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

  // Mock API Dispatchers
  async function dispatchMockApi(mode) {
    const endpoint = apiEndpointSelect ? apiEndpointSelect.value : 'Emergency Disaster Relief Fund Gateway';

    try {
      await breaker.execute(async (signal) => {
        if (mode === 'success') {
          await new Promise((r) => setTimeout(r, 120));
          if (signal.aborted) throw new Error('Client aborted donation dispatch');
          return {
            ok: true,
            endpoint,
            donationId: `AID-${Date.now().toString(36).toUpperCase()}`,
            impact: '50 Emergency Medical Kits Dispatched'
          };
        } else if (mode === 'failure') {
          await new Promise((r) => setTimeout(r, 150));
          throw new Error(`503 Field Telemetry Blackout at [${endpoint}]`);
        } else if (mode === 'timeout') {
          // Exceeds requestTimeout (2000ms)
          await new Promise((r) => setTimeout(r, 3500));
          return { ok: true };
        } else if (mode === 'flaky') {
          await new Promise((r) => setTimeout(r, 100));
          if (Math.random() > 0.5) {
            throw new Error(`500 Satellite Link Degradation at [${endpoint}]`);
          }
          return { ok: true, endpoint, impact: '10 Reforestation Grants Allocated' };
        }
      }, humanitarianOfflineFallback);
    } catch {
      // Caught & tracked
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
    breaker.trip('Emergency Humanitarian Incident Commander Manual Lockdown');
    updateUI();
  });

  btnReset?.addEventListener('click', () => {
    breaker.reset();
    updateUI();
  });

  btnClearTimeline?.addEventListener('click', () => {
    if (timelineStream) timelineStream.innerHTML = '';
  });

  // Live countdown tick for OPEN state cooldown
  setInterval(() => {
    if (breaker.state === CIRCUIT_STATE.OPEN) {
      updateUI();
    }
  }, 250);

  updateUI();
  return breaker;
}

// Auto-mount in browser environments
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNonprofitCircuitBreaker);
  } else {
    initNonprofitCircuitBreaker();
  }
}
