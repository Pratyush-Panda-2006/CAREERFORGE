/**
 * Culinary Bistro Circuit Breaker & API Resilience Simulator
 * Fault-tolerant tri-state circuit breaker (CLOSED, OPEN, HALF_OPEN)
 * with exponential cooldown backoff, graceful culinary & wine cellar fallback,
 * request timeout interception, and real-time kitchen telemetry metrics.
 * 
 * Part of Lumière Culinary Bistro Showcase (NSoC 2026).
 */

export const CIRCUIT_STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
});

export class CulinaryBistroCircuitBreaker {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.failureThreshold=3] Consecutive failures required to trip the circuit
   * @param {number} [options.cooldownPeriod=3000] Base cooldown duration in ms before canary probe (alias: cooldownMs)
   * @param {number} [options.cooldownMs]
   * @param {number} [options.halfOpenSuccessThreshold=2] Consecutive canary successes required in HALF_OPEN to close circuit
   * @param {number} [options.requestTimeout=2000] Max duration in ms before request is timed out (0 to disable) (alias: timeoutMs)
   * @param {number} [options.timeoutMs]
   * @param {number} [options.maxCooldownPeriod=30000] Upper limit in ms for exponential backoff (alias: maxCooldownMs)
   * @param {number} [options.maxCooldownMs]
   * @param {boolean} [options.exponentialBackoff=true] Whether cooldown period doubles with each successive trip
   * @param {Function} [options.now=() => Date.now()] Custom timestamp provider
   * @param {string} [options.name='Lumière Bistro Kitchen & Reservation Sentinel'] Service identifier label
   */
  constructor(options = {}) {
    this.failureThreshold = Number.isInteger(options.failureThreshold) && options.failureThreshold > 0
      ? options.failureThreshold
      : 3;

    const baseCooldown = options.cooldownPeriod ?? options.cooldownMs ?? 3000;
    this.cooldownPeriod = typeof baseCooldown === 'number' && baseCooldown >= 0 ? baseCooldown : 3000;

    this.halfOpenSuccessThreshold = Number.isInteger(options.halfOpenSuccessThreshold) && options.halfOpenSuccessThreshold > 0
      ? options.halfOpenSuccessThreshold
      : 2;

    const baseTimeout = options.requestTimeout ?? options.timeoutMs ?? 2000;
    this.requestTimeout = typeof baseTimeout === 'number' && baseTimeout >= 0 ? baseTimeout : 2000;

    const baseMaxCooldown = options.maxCooldownPeriod ?? options.maxCooldownMs ?? 30000;
    this.maxCooldownPeriod = typeof baseMaxCooldown === 'number' && baseMaxCooldown >= this.cooldownPeriod
      ? baseMaxCooldown
      : Math.max(this.cooldownPeriod, 30000);

    this.exponentialBackoff = options.exponentialBackoff !== false;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.name = options.name || 'Lumière Bistro Kitchen & Reservation Sentinel';

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
      timeouts: 0,
      fallbackCount: 0,
      fallbackExecutions: 0,
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

  get isClosed() {
    return this.state === CIRCUIT_STATE.CLOSED;
  }

  get isOpen() {
    return this.state === CIRCUIT_STATE.OPEN;
  }

  get isHalfOpen() {
    return this.state === CIRCUIT_STATE.HALF_OPEN;
  }

  get failures() {
    return this.failureCount;
  }

  /**
   * Internal event history recorder
   */
  _recordEvent(type, details = {}) {
    const entry = {
      id: `bistro_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
   * @returns {Function} Unsubscribe callback
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
   * Emit event to registered listeners
   */
  emit(event, data) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      for (const fn of handlers) {
        try {
          fn(data);
        } catch {
          // Guard against subscriber callback errors
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
      failures: this.failureCount,
      failureThreshold: this.failureThreshold,
      consecutiveSuccessCount: this.consecutiveSuccessCount,
      halfOpenSuccessThreshold: this.halfOpenSuccessThreshold,
      cooldownPeriod: this.cooldownPeriod,
      effectiveCooldownMs: this.getEffectiveCooldown(),
      maxCooldownPeriod: this.maxCooldownPeriod,
      requestTimeout: this.requestTimeout,
      nextAttemptTime: this.nextAttemptTime,
      remainingCooldownMs,
      retryAfterMs: remainingCooldownMs,
      consecutiveTrips: this.consecutiveTrips,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
      metrics: {
        totalRequests: this.metrics.totalRequests,
        total: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        success: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        failed: this.metrics.failedRequests,
        rejectedRequests: this.metrics.rejectedRequests,
        rejected: this.metrics.rejectedRequests,
        timedOutRequests: this.metrics.timedOutRequests,
        timeouts: this.metrics.timeouts,
        fallbackCount: this.metrics.fallbackCount,
        fallbackExecutions: this.metrics.fallbackExecutions,
        fallback: this.metrics.fallbackCount,
        trips: this.metrics.trips,
        resets: this.metrics.resets
      },
      history: [...this.history],
      events: [...this.history]
    };
  }

  /**
   * Alias for getStatus()
   */
  snapshot() {
    return this.getStatus();
  }

  /**
   * Returns copy of telemetry metrics
   */
  getMetrics() {
    return { ...this.getStatus().metrics };
  }

  /**
   * Returns copy of history timeline
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Manually or automatically trip circuit into OPEN state
   * @param {string} [reason='Manual bistro kitchen intervention']
   */
  trip(reason = 'Manual bistro kitchen intervention') {
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
      reason: 'Manual or automated culinary reset'
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
   * @param {Function|*} [fallback=null] Optional fallback function (error => result) or static value
   */
  async execute(fn, fallback = null) {
    if (typeof fn !== 'function') {
      const err = new TypeError('CulinaryBistroCircuitBreaker.execute expects a callable request function.');
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
          reason: 'Cooldown period elapsed; initiating canary trial request'
        };
        this._recordEvent('STATE_CHANGE', canaryData);
        this.emit('stateChange', canaryData);
      } else {
        // Circuit is still OPEN during cooldown period
        this.metrics.totalRequests++;
        this.metrics.rejectedRequests++;

        const remainingMs = Math.max(0, Math.ceil(this.nextAttemptTime - currentTime));
        const err = Object.assign(
          new Error(`Culinary Bistro Circuit is OPEN. Kitchen & order requests paused. Retry after ${remainingMs}ms.`),
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
              // Ignore abort errors
            }
            const timeoutError = Object.assign(
              new Error(`Request timed out after ${this.requestTimeout}ms in Lumière Bistro Gateway.`),
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
            reason: `Canary trial succeeded ${this.halfOpenSuccessThreshold} consecutive times. Normal culinary operations restored.`
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
        this.metrics.timeouts++;
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
      this.metrics.fallbackExecutions++;
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
  window.CulinaryBistroCircuitBreaker = CulinaryBistroCircuitBreaker;
  window.CIRCUIT_STATE = CIRCUIT_STATE;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCulinaryBistroCircuitBreakerDashboard();
    });
  } else {
    initCulinaryBistroCircuitBreakerDashboard();
  }
}

/**
 * Initializes interactive dashboard controllers for circuit-breaker.html
 */
export function initCulinaryBistroCircuitBreakerDashboard() {
  const root = document.querySelector('[data-culinary-bistro-circuit-breaker]');
  if (!root) return null;

  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 3,
    cooldownPeriod: 3000,
    halfOpenSuccessThreshold: 2,
    requestTimeout: 2000,
    exponentialBackoff: true,
    name: 'Lumière Bistro Kitchen & Reservation Sentinel'
  });

  // UI Element bindings
  const lampClosed = root.querySelector('#lampClosed');
  const lampHalfOpen = root.querySelector('#lampHalfOpen');
  const lampOpen = root.querySelector('#lampOpen');
  const stateBadge = root.querySelector('#stateBadge');
  const stateDescription = root.querySelector('#stateDescription');
  const cooldownTimer = root.querySelector('#cooldownTimer');

  const failureMeterText = root.querySelector('#failureMeterText');
  const failureMeterBar = root.querySelector('#failureMeterBar');
  const canaryMeterText = root.querySelector('#canaryMeterText');
  const canaryMeterBar = root.querySelector('#canaryMeterBar');

  const metricTotal = root.querySelector('#metricTotal');
  const metricSuccess = root.querySelector('#metricSuccess');
  const metricFailed = root.querySelector('#metricFailed');
  const metricRejected = root.querySelector('#metricRejected');
  const metricFallback = root.querySelector('#metricFallback');
  const metricTrips = root.querySelector('#metricTrips');
  const metricRate = root.querySelector('#metricRate');

  const fallbackNotice = root.querySelector('#fallbackNotice');
  const fallbackDetails = root.querySelector('#fallbackDetails');
  const timelineStream = root.querySelector('#timelineStream');
  const apiEndpointSelect = root.querySelector('#apiEndpointSelect');

  let countdownInterval = null;

  function updateLamps(state) {
    if (lampClosed) lampClosed.classList.toggle('active', state === CIRCUIT_STATE.CLOSED);
    if (lampHalfOpen) lampHalfOpen.classList.toggle('active', state === CIRCUIT_STATE.HALF_OPEN);
    if (lampOpen) lampOpen.classList.toggle('active', state === CIRCUIT_STATE.OPEN);
  }

  function updateStatusUI() {
    const status = breaker.getStatus();

    updateLamps(status.state);

    if (stateBadge) {
      stateBadge.textContent = status.state;
      stateBadge.className = `status-pill pill-${status.state.toLowerCase().replace('_', '-')}`;
    }

    if (stateDescription) {
      if (status.state === CIRCUIT_STATE.CLOSED) {
        stateDescription.textContent = 'All kitchen & dining microservices healthy. Live orders, payment transactions, and cellar inquiries processed smoothly.';
      } else if (status.state === CIRCUIT_STATE.HALF_OPEN) {
        stateDescription.textContent = `Trial canary recovery active. Testing service recovery (${status.consecutiveSuccessCount}/${status.halfOpenSuccessThreshold} successful canary requests required to restore normal operations).`;
      } else {
        stateDescription.textContent = `Circuit OPEN & protecting kitchen infrastructure. Order traffic diverted to local cellar cache and offline guest voucher store.`;
      }
    }

    // Gauges
    if (failureMeterText) {
      failureMeterText.textContent = `${status.failureCount} / ${status.failureThreshold} Failures`;
    }
    if (failureMeterBar) {
      const pct = Math.min(100, (status.failureCount / status.failureThreshold) * 100);
      failureMeterBar.style.width = `${pct}%`;
    }

    if (canaryMeterText) {
      canaryMeterText.textContent = `${status.consecutiveSuccessCount} / ${status.halfOpenSuccessThreshold} Passes`;
    }
    if (canaryMeterBar) {
      const pct = Math.min(100, (status.consecutiveSuccessCount / status.halfOpenSuccessThreshold) * 100);
      canaryMeterBar.style.width = `${pct}%`;
    }

    // Telemetry Cards
    if (metricTotal) metricTotal.textContent = String(status.metrics.totalRequests);
    if (metricSuccess) metricSuccess.textContent = String(status.metrics.successfulRequests);
    if (metricFailed) metricFailed.textContent = String(status.metrics.failedRequests);
    if (metricRejected) metricRejected.textContent = String(status.metrics.rejectedRequests);
    if (metricFallback) metricFallback.textContent = String(status.metrics.fallbackCount);
    if (metricTrips) metricTrips.textContent = String(status.metrics.trips);

    if (metricRate) {
      const totalResolved = status.metrics.successfulRequests + status.metrics.failedRequests + status.metrics.rejectedRequests;
      if (totalResolved === 0) {
        metricRate.textContent = '100%';
        metricRate.className = 'metric-value success';
      } else {
        const rate = Math.round((status.metrics.successfulRequests / totalResolved) * 100);
        metricRate.textContent = `${rate}%`;
        metricRate.className = `metric-value ${rate >= 75 ? 'success' : rate >= 40 ? 'warning' : 'danger'}`;
      }
    }

    // Cooldown countdown
    if (status.state === CIRCUIT_STATE.OPEN) {
      if (cooldownTimer) {
        cooldownTimer.style.display = 'inline-block';
        const remSec = (status.remainingCooldownMs / 1000).toFixed(1);
        cooldownTimer.textContent = `⏳ Canary probe in ${remSec}s`;
      }
    } else {
      if (cooldownTimer) {
        cooldownTimer.style.display = 'none';
      }
    }
  }

  // Periodic timer for smooth cooldown countdown display
  countdownInterval = setInterval(() => {
    if (breaker.isOpen) {
      updateStatusUI();
    }
  }, 200);

  function renderTimelineEvent(event) {
    if (!timelineStream) return;
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const timeStr = new Date(event.timestamp).toLocaleTimeString();
    const stateClass = event.state ? event.state.toLowerCase().replace('_', '-') : 'closed';

    let detailStr = '';
    if (event.details) {
      if (typeof event.details === 'string') {
        detailStr = event.details;
      } else {
        detailStr = Object.entries(event.details)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' | ');
      }
    }

    item.innerHTML = `
      <div class="timeline-meta">
        <span class="timeline-time">${timeStr}</span>
        <span class="timeline-pill pill-${stateClass}">${event.state}</span>
        <strong class="timeline-type">${event.type}</strong>
      </div>
      <div class="timeline-desc">${detailStr || 'Status event recorded'}</div>
    `;

    timelineStream.insertBefore(item, timelineStream.firstChild);

    // Limit visible DOM timeline entries to 40
    while (timelineStream.children.length > 40) {
      timelineStream.removeChild(timelineStream.lastChild);
    }
  }

  // Event telemetry hooks
  breaker.on('event', (entry) => {
    renderTimelineEvent(entry);
    updateStatusUI();
  });

  breaker.onStateChange(() => {
    updateStatusUI();
  });

  // Mock Culinary Endpoints
  const mockEndpoints = {
    cellarSync: {
      name: '🍷 French Cellar Wine Inventory Check (Healthy Kitchen API)',
      run: async (signal) => {
        await new Promise((r) => setTimeout(r, 90));
        if (signal.aborted) throw new Error('Aborted');
        return {
          status: 200,
          service: 'French Cellar Wine Stock Sync',
          cellarInventory: [
            { vintage: '2015 Château Margaux', stock: 14, bin: 'B-12' },
            { vintage: '2018 Domaine de la Romanée-Conti', stock: 6, bin: 'A-01' },
            { vintage: '2016 Dom Pérignon Brut', stock: 22, bin: 'C-04' }
          ],
          syncTimestamp: new Date().toISOString()
        };
      }
    },
    paymentGateway: {
      name: '💳 Gourmet POS & Stripe Payment Gateway (Flaky Payment Gateway)',
      run: async (signal) => {
        await new Promise((r) => setTimeout(r, 140));
        if (signal.aborted) throw new Error('Aborted');
        if (Math.random() < 0.5) {
          const err = new Error('502 Bad Gateway: Stripe POS connection dropped');
          err.code = 'PAYMENT_GATEWAY_FLAKY';
          throw err;
        }
        return {
          status: 200,
          service: 'Gourmet POS Stripe Payment Gateway',
          transactionId: `TXN_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          authorizedAmount: '€184.50',
          currency: 'EUR',
          authCode: 'AUTH_OK'
        };
      }
    },
    downInventory: {
      name: '🥩 Wagyu & Caviar Supplier Inventory Service (Down Inventory Service)',
      run: async (signal) => {
        await new Promise((r) => setTimeout(r, 110));
        if (signal.aborted) throw new Error('Aborted');
        const err = new Error('503 Service Unavailable: Artisanal Supplier API is down for scheduled re-stocking');
        err.code = 'SUPPLIER_OUTAGE_503';
        throw err;
      }
    },
    timeoutSim: {
      name: '⏱️ POS Kitchen Display & Expediter Ticket Dispatch (Timeout Sim)',
      run: async (signal) => {
        // Exceeds the 2000ms timeout
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 3800);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('KDS Ticket Dispatch aborted'));
          });
        });
        return { status: 200, message: 'Ticket printed delayed' };
      }
    },
    vipBooking: {
      name: '🍽️ VIP Chef Table Reservation Gateway (Healthy VIP)',
      run: async (signal) => {
        await new Promise((r) => setTimeout(r, 60));
        if (signal.aborted) throw new Error('Aborted');
        return {
          status: 200,
          service: 'VIP Chef Table Reservation Gateway',
          reservationId: `RES-VIP-${Math.floor(1000 + Math.random() * 9000)}`,
          guestName: 'Madame DuPont (VIP)',
          covers: 4,
          table: 'Chef Suite Alcove 1'
        };
      }
    }
  };

  // Graceful Fallback Provider
  function getCulinaryFallback(endpointKey, error) {
    return {
      fallback: true,
      serviceDegraded: true,
      timestamp: new Date().toISOString(),
      interceptedError: error.message,
      errorCode: error.code || 'CIRCUIT_OPEN',
      circuitNotice: 'Lumière Bistro Fault-Tolerant Contingency Active',
      cachedData: {
        offlineTastingMenu: 'Chef Laurent 5-Course Winter Truffle Degustation (Pre-cached)',
        offlineCellarVouchers: 'Cellar contingency allocation: 10 bottles Bordeaux reserved',
        guestOrderReceipt: 'Order saved to local SQLite POS queue. Will auto-sync once circuit Closes.'
      }
    };
  }

  function showFallbackNotice(result) {
    if (fallbackNotice && fallbackDetails) {
      fallbackNotice.classList.add('visible');
      fallbackDetails.textContent = JSON.stringify(result, null, 2);
    }
  }

  function hideFallbackNotice() {
    if (fallbackNotice) {
      fallbackNotice.classList.remove('visible');
    }
  }

  async function executeSimulatorRequest(mockKey) {
    const endpoint = mockEndpoints[mockKey] || mockEndpoints.cellarSync;
    hideFallbackNotice();

    try {
      const result = await breaker.execute(
        endpoint.run,
        (error) => {
          const fallbackData = getCulinaryFallback(mockKey, error);
          showFallbackNotice(fallbackData);
          return fallbackData;
        }
      );

      if (!result.fallback) {
        hideFallbackNotice();
      }
    } catch (err) {
      // Unhandled or no fallback error
      console.warn('[CulinaryBistro Breaker] Request error:', err);
    } finally {
      updateStatusUI();
    }
  }

  // Interactive Button Listeners
  const btnSuccess = root.querySelector('#btnSimulateSuccess');
  if (btnSuccess) {
    btnSuccess.addEventListener('click', () => executeSimulatorRequest('cellarSync'));
  }

  const btnFailure = root.querySelector('#btnSimulateFailure');
  if (btnFailure) {
    btnFailure.addEventListener('click', () => executeSimulatorRequest('downInventory'));
  }

  const btnTimeout = root.querySelector('#btnSimulateTimeout');
  if (btnTimeout) {
    btnTimeout.addEventListener('click', () => executeSimulatorRequest('timeoutSim'));
  }

  const btnFlaky = root.querySelector('#btnSimulateFlaky');
  if (btnFlaky) {
    btnFlaky.addEventListener('click', () => executeSimulatorRequest('paymentGateway'));
  }

  const btnSpike = root.querySelector('#btnSimulateSpike');
  if (btnSpike) {
    btnSpike.addEventListener('click', async () => {
      hideFallbackNotice();
      const requests = [
        executeSimulatorRequest('cellarSync'),
        executeSimulatorRequest('paymentGateway'),
        executeSimulatorRequest('downInventory'),
        executeSimulatorRequest('vipBooking'),
        executeSimulatorRequest('paymentGateway')
      ];
      await Promise.allSettled(requests);
      updateStatusUI();
    });
  }

  const btnTrip = root.querySelector('#btnTripCircuit');
  if (btnTrip) {
    btnTrip.addEventListener('click', () => {
      breaker.trip('Emergency manual kitchen safety lockout initiated by Head Chef');
      updateStatusUI();
    });
  }

  const btnReset = root.querySelector('#btnResetCircuit');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      breaker.reset();
      hideFallbackNotice();
      updateStatusUI();
    });
  }

  const btnClearTimeline = root.querySelector('#btnClearTimeline');
  if (btnClearTimeline && timelineStream) {
    btnClearTimeline.addEventListener('click', () => {
      timelineStream.innerHTML = '';
    });
  }

  // Initial draw
  updateStatusUI();

  return breaker;
}
