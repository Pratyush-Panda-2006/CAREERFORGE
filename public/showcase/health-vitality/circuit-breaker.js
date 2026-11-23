/**
 * Health Vitality Circuit Breaker & API Resilience Simulator
 * Fault-tolerant tri-state circuit breaker (CLOSED, OPEN, HALF_OPEN)
 * with exponential cooldown backoff, biometric fallback telemetry,
 * request timeout interception, and real-time clinical metrics.
 * 
 * Part of Health & Vitality Clinical Telehealth Infrastructure (NSoC 2026).
 */

export const CIRCUIT_STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
});

export class HealthVitalityCircuitBreaker {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.failureThreshold=3] Consecutive failures required to trip the circuit
   * @param {number} [options.cooldownPeriod=2000] Base cooldown duration in ms before canary probe (alias: cooldownMs)
   * @param {number} [options.cooldownMs]
   * @param {number} [options.halfOpenSuccessThreshold=2] Consecutive canary successes required in HALF_OPEN to close circuit
   * @param {number} [options.requestTimeout=3000] Max duration in ms before request is timed out (0 to disable) (alias: timeoutMs)
   * @param {number} [options.timeoutMs]
   * @param {number} [options.maxCooldownPeriod=30000] Upper limit in ms for exponential backoff (alias: maxCooldownMs)
   * @param {number} [options.maxCooldownMs]
   * @param {boolean} [options.exponentialBackoff=true] Whether cooldown period doubles with each successive trip
   * @param {Function} [options.now=() => Date.now()] Custom timestamp provider
   * @param {string} [options.name='Health Vitality Biometric Gateway'] Service identifier label
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
    this.name = options.name || 'Health Vitality Biometric Gateway';

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
      metrics: { ...this.metrics },
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
    return { ...this.metrics };
  }

  /**
   * Returns copy of history timeline
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Manually or automatically trip circuit into OPEN state
   * @param {string} [reason='Manual clinical intervention']
   */
  trip(reason = 'Manual clinical intervention') {
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
      reason: 'Manual or automated clinical reset'
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
   * @param {Function|*} [fallback=null] Optional fallback function (error => result) or fallback static value
   */
  async execute(fn, fallback = null) {
    if (typeof fn !== 'function') {
      const err = new TypeError('HealthVitalityCircuitBreaker.execute expects a callable request function.');
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
          reason: 'Cooldown expired; admitting canary recovery probe'
        };
        this._recordEvent('STATE_CHANGE', canaryData);
        this.emit('stateChange', canaryData);
      } else {
        // Circuit is still OPEN during cooldown
        this.metrics.totalRequests++;
        this.metrics.rejectedRequests++;

        const remainingMs = Math.max(0, Math.ceil(this.nextAttemptTime - currentTime));
        const err = Object.assign(
          new Error(`Health Vitality Circuit is OPEN. Request blocked for biometric safety. Retry after ${remainingMs}ms.`),
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
              new Error(`Request timed out after ${this.requestTimeout}ms in Health Vitality Biometric Gateway.`),
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
            reason: `Canary probe succeeded ${this.halfOpenSuccessThreshold} consecutive times. Biometric sync restored.`
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
        this.trip(`Canary probe failed in HALF_OPEN: ${error.message}`);
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
  window.HealthVitalityCircuitBreaker = HealthVitalityCircuitBreaker;
  window.CIRCUIT_STATE = CIRCUIT_STATE;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHealthVitalityCircuitBreakerDashboard();
    });
  } else {
    initHealthVitalityCircuitBreakerDashboard();
  }
}

/**
 * Initializes interactive dashboard controllers for circuit-breaker.html
 */
export function initHealthVitalityCircuitBreakerDashboard() {
  const root = document.querySelector('[data-health-vitality-circuit-breaker]');
  if (!root) return null;

  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 3,
    cooldownPeriod: 3500,
    halfOpenSuccessThreshold: 2,
    requestTimeout: 2000,
    exponentialBackoff: true,
    name: 'Health Vitality Clinical Biometric Gateway'
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

  // Render status update
  function updateUI() {
    const status = breaker.getStatus();

    // Lamps
    if (lampClosed) lampClosed.classList.toggle('active', status.state === CIRCUIT_STATE.CLOSED);
    if (lampHalfOpen) lampHalfOpen.classList.toggle('active', status.state === CIRCUIT_STATE.HALF_OPEN);
    if (lampOpen) lampOpen.classList.toggle('active', status.state === CIRCUIT_STATE.OPEN);

    // State Badge
    if (stateBadge) {
      stateBadge.textContent = status.state;
      stateBadge.className = `status-pill pill-${status.state.toLowerCase()}`;
    }

    // State Description
    if (stateDescription) {
      switch (status.state) {
        case CIRCUIT_STATE.CLOSED:
          stateDescription.textContent = 'All clinical endpoints operating normally. Real-time patient telemetry admitted without impediment.';
          break;
        case CIRCUIT_STATE.HALF_OPEN:
          stateDescription.textContent = `Canary probe active. Testing medical backend recovery (${status.consecutiveSuccessCount}/${status.halfOpenSuccessThreshold} passes).`;
          break;
        case CIRCUIT_STATE.OPEN:
          stateDescription.textContent = `Circuit TRIPPED. Protecting clinical EHR & infusion pumps against cascade failure. Local cached vitals served.`;
          break;
      }
    }

    // Cooldown countdown
    if (cooldownTimerEl) {
      if (status.state === CIRCUIT_STATE.OPEN && status.remainingCooldownMs > 0) {
        cooldownTimerEl.style.display = 'inline-block';
        cooldownTimerEl.textContent = `⏳ Canary probe in ${(status.remainingCooldownMs / 1000).toFixed(1)}s`;
      } else {
        cooldownTimerEl.style.display = 'none';
      }
    }

    // Metrics Meters
    const failurePct = Math.min(100, Math.round((status.failureCount / status.failureThreshold) * 100));
    if (failureMeterBar) failureMeterBar.style.width = `${failurePct}%`;
    if (failureMeterText) failureMeterText.textContent = `${status.failureCount} / ${status.failureThreshold} Failures`;

    const canaryPct = Math.min(100, Math.round((status.consecutiveSuccessCount / status.halfOpenSuccessThreshold) * 100));
    if (canaryMeterBar) canaryMeterBar.style.width = `${canaryPct}%`;
    if (canaryMeterText) canaryMeterText.textContent = `${status.consecutiveSuccessCount} / ${status.halfOpenSuccessThreshold} Passes`;

    // Metrics Cards
    if (metricTotal) metricTotal.textContent = status.metrics.totalRequests;
    if (metricSuccess) metricSuccess.textContent = status.metrics.successfulRequests;
    if (metricFailed) metricFailed.textContent = status.metrics.failedRequests;
    if (metricRejected) metricRejected.textContent = status.metrics.rejectedRequests;
    if (metricFallback) metricFallback.textContent = status.metrics.fallbackCount;
    if (metricTrips) metricTrips.textContent = status.metrics.trips;

    if (metricRate) {
      const settled = status.metrics.successfulRequests + status.metrics.failedRequests + status.metrics.rejectedRequests;
      const rate = settled > 0 ? Math.round((status.metrics.successfulRequests / settled) * 100) : 100;
      metricRate.textContent = `${rate}%`;
    }
  }

  // Prepend event to timeline stream
  function renderTimelineEvent(entry) {
    if (!timelineStream) return;
    const item = document.createElement('div');
    item.className = `timeline-item type-${entry.type.toLowerCase()}`;

    const timeStr = new Date(entry.timestamp).toLocaleTimeString();
    const badgeClass = `badge-${entry.type.toLowerCase()}`;

    let detailStr = '';
    if (entry.details) {
      if (entry.details.error) {
        detailStr = ` • <span class="tl-error">${entry.details.error}</span>`;
      } else if (entry.details.reason) {
        detailStr = ` • <em>${entry.details.reason}</em>`;
      } else if (entry.details.service) {
        detailStr = ` • <span>${entry.details.service}</span>`;
      }
    }

    item.innerHTML = `
      <div class="tl-header">
        <span class="tl-badge ${badgeClass}">${entry.type}</span>
        <span class="tl-time">${timeStr}</span>
        <span class="tl-state state-${entry.state.toLowerCase()}">[${entry.state}]</span>
      </div>
      <div class="tl-body">
        ${entry.type === 'INITIALIZED' ? 'Biometric resilience sentinel initialized' : detailStr || 'Telemetric audit event dispatched'}
      </div>
    `;

    timelineStream.prepend(item);

    // Limit displayed stream items to 40
    while (timelineStream.children.length > 40) {
      timelineStream.removeChild(timelineStream.lastChild);
    }
  }

  // Clinical Fallback Generator
  function getClinicalFallback(serviceName) {
    return (err) => {
      const fallbackPayload = {
        status: 'FALLBACK_OFFLINE_TELEMETRY',
        service: serviceName,
        patientId: 'PT-99824',
        timestamp: new Date().toISOString(),
        source: 'Encrypted Clinical Cache (Local Edge SQLite)',
        vitals: {
          heartRate: '72 bpm (Normal Sinus)',
          bloodPressure: '120/80 mmHg',
          oxygenSaturation: '98% SpO2',
          bloodGlucose: '98 mg/dL',
          sensorSignalStrength: 'Simulated Cache'
        },
        clinicalDirective: 'Emergency baseline vitals served due to circuit breaker trip or medical API outage. Alert triage coordinator.',
        interceptedError: err.message
      };

      if (fallbackNotice && fallbackDetails) {
        fallbackDetails.textContent = JSON.stringify(fallbackPayload, null, 2);
        fallbackNotice.classList.add('visible');
      }

      return fallbackPayload;
    };
  }

  // Helper to dispatch simulator requests
  async function dispatchSimulatedCall(type) {
    const service = apiEndpointSelect ? apiEndpointSelect.value : 'Continuous ECG Stream';
    const fallbackFn = getClinicalFallback(service);

    try {
      if (fallbackNotice) fallbackNotice.classList.remove('visible');

      await breaker.execute(async (signal) => {
        if (type === 'success') {
          await new Promise((r) => setTimeout(r, 80));
          if (signal.aborted) throw new Error('Clinical request aborted');
          return {
            status: 200,
            service,
            syncedAt: new Date().toISOString(),
            statusText: 'Clinical payload accepted and authenticated'
          };
        } else if (type === 'failure') {
          await new Promise((r) => setTimeout(r, 90));
          if (signal.aborted) throw new Error('Clinical request aborted');
          const err = new Error(`503 Service Unavailable: Remote EHR gateway for [${service}] failed to respond.`);
          err.code = 'EHR_OUTAGE';
          throw err;
        } else if (type === 'timeout') {
          // Delay longer than requestTimeout (2000ms)
          await new Promise((r) => setTimeout(r, 2600));
          return { status: 200, service, delayed: true };
        } else if (type === 'flaky') {
          await new Promise((r) => setTimeout(r, 70));
          if (Math.random() < 0.5) {
            const err = new Error(`500 Network Jitter: Dropped packets on [${service}] telemetry pipe.`);
            err.code = 'NETWORK_JITTER';
            throw err;
          }
          return { status: 200, service, result: 'Intermittent telemetry packet received' };
        }
      }, fallbackFn);

    } catch (err) {
      // Caught if no fallback or fallback re-threw
      console.warn('Circuit breaker intercepted error:', err);
    } finally {
      updateUI();
    }
  }

  // Hook event stream
  breaker.on('event', (entry) => {
    renderTimelineEvent(entry);
    updateUI();
  });

  // Attach button actions
  if (btnSuccess) btnSuccess.addEventListener('click', () => dispatchSimulatedCall('success'));
  if (btnFailure) btnFailure.addEventListener('click', () => dispatchSimulatedCall('failure'));
  if (btnTimeout) btnTimeout.addEventListener('click', () => dispatchSimulatedCall('timeout'));
  if (btnFlaky) btnFlaky.addEventListener('click', () => dispatchSimulatedCall('flaky'));

  if (btnSpike) {
    btnSpike.addEventListener('click', async () => {
      // Dispatch 5 concurrent calls with slight staggering
      const promises = [0, 1, 2, 3, 4].map(async (i) => {
        await new Promise((r) => setTimeout(r, i * 40));
        return dispatchSimulatedCall(i % 2 === 0 ? 'failure' : 'success');
      });
      await Promise.allSettled(promises);
    });
  }

  if (btnTrip) {
    btnTrip.addEventListener('click', () => {
      breaker.trip('Emergency manual physician lockout');
      updateUI();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      breaker.reset();
      if (fallbackNotice) fallbackNotice.classList.remove('visible');
      updateUI();
    });
  }

  if (btnClearTimeline && timelineStream) {
    btnClearTimeline.addEventListener('click', () => {
      timelineStream.innerHTML = '';
    });
  }

  // Periodic interval for countdown timer display
  const countdownInterval = setInterval(() => {
    if (breaker.state === CIRCUIT_STATE.OPEN) {
      updateUI();
    }
  }, 100);

  // Initialize display
  breaker.history.forEach(renderTimelineEvent);
  updateUI();

  return {
    breaker,
    destroy() {
      clearInterval(countdownInterval);
    }
  };
}
