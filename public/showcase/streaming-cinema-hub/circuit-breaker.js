/**
 * Streaming Cinema Hub - Fault-Tolerant Circuit Breaker & API Resilience Simulator
 * Issue #2892 - NSoC '26 Level 3 Feature
 * 
 * Provides an autonomous client-side tri-state circuit breaker (Closed, Open, Half-Open)
 * with exponential backoff, request timeout interception, and real-time telemetry streaming.
 */

export const CircuitState = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
});

export class StreamingCinemaHubCircuitBreaker {
  /**
   * @param {Object} options Configuration parameters
   * @param {number} [options.threshold=3] Failure threshold before tripping to OPEN
   * @param {number} [options.failureThreshold=3] Alias for threshold
   * @param {number} [options.cooldown=2000] Cooldown duration in ms before probing in HALF_OPEN
   * @param {number} [options.cooldownPeriod=2000] Alias for cooldown
   * @param {number} [options.timeout=1000] Max execution duration in ms before timeout abort
   * @param {number} [options.requestTimeout=1000] Alias for timeout
   * @param {number} [options.halfOpenTrials=2] Required consecutive successes in HALF_OPEN to CLOSE
   * @param {number} [options.halfOpenSuccessThreshold=2] Alias for halfOpenTrials
   * @param {number} [options.backoffMultiplier=2] Exponential backoff factor on repeated trips
   * @param {number} [options.maxCooldown=60000] Maximum cooldown backoff cap in ms
   * @param {Function} [options.onStateChange] Optional listener for state transitions
   */
  constructor(options = {}) {
    this.failureThreshold = Number(options.failureThreshold ?? options.threshold ?? 3);
    this.cooldownPeriod = Number(options.cooldownPeriod ?? options.cooldownMs ?? options.cooldown ?? 2000);
    this.requestTimeout = Number(options.requestTimeout ?? options.timeout ?? options.requestTimeoutMs ?? 1000);
    this.halfOpenSuccessThreshold = Number(options.halfOpenSuccessThreshold ?? options.halfOpenTrials ?? options.trials ?? 2);
    this.backoffMultiplier = Number(options.backoffMultiplier ?? 2);
    this.maxCooldown = Number(options.maxCooldown ?? 60000);

    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenSuccesses = 0;
    this.tripCount = 0;
    this.nextAttempt = 0;
    this.effectiveCooldown = this.cooldownPeriod;
    this.lastStateChange = Date.now();
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.lastError = null;

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      timeouts: 0,
      trips: 0
    };

    this.onStateChange = options.onStateChange || null;
    this.listeners = [];
  }

  /**
   * Retrieves the current circuit state, checking if cooldown has elapsed.
   * Automatically transitions from OPEN to HALF_OPEN when cooldown period expires.
   * @returns {'CLOSED'|'OPEN'|'HALF_OPEN'}
   */
  getState() {
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      this.transitionTo(CircuitState.HALF_OPEN, 'Cooldown period elapsed - trial phase initiated');
    }
    return this.state;
  }

  /**
   * Transitions the circuit breaker to a new state and notifies listeners.
   * @param {'CLOSED'|'OPEN'|'HALF_OPEN'} nextState
   * @param {string} [reason='']
   */
  transitionTo(nextState, reason = '') {
    if (this.state === nextState) return;
    const oldState = this.state;
    this.state = nextState;
    this.lastStateChange = Date.now();

    if (nextState === CircuitState.CLOSED) {
      this.consecutiveFailures = 0;
      this.halfOpenSuccesses = 0;
    } else if (nextState === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses = 0;
    }

    const payload = {
      type: 'STATE_CHANGE',
      oldState,
      newState: nextState,
      reason,
      timestamp: this.lastStateChange,
      status: this.getStatus()
    };

    if (typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(nextState, oldState, payload);
      } catch {
        // Safe execution
      }
    }

    this.emit('stateChange', payload);
  }

  /**
   * Forces or triggers the circuit breaker into the OPEN state.
   * Calculates exponential backoff based on tripCount.
   * @param {string} [reason='Failure threshold exceeded']
   * @returns {Object} Trip telemetry record
   */
  trip(reason = 'Failure threshold exceeded') {
    this.tripCount++;
    this.metrics.trips++;

    const exponent = Math.max(0, this.tripCount - 1);
    this.effectiveCooldown = Math.min(
      this.maxCooldown,
      Math.round(this.cooldownPeriod * Math.pow(this.backoffMultiplier, exponent))
    );
    this.nextAttempt = Date.now() + this.effectiveCooldown;

    this.transitionTo(CircuitState.OPEN, reason);

    const tripEvent = {
      type: 'CIRCUIT_TRIPPED',
      tripCount: this.tripCount,
      cooldown: this.effectiveCooldown,
      nextAttempt: this.nextAttempt,
      reason,
      timestamp: Date.now()
    };
    this.emit('trip', tripEvent);
    return tripEvent;
  }

  /**
   * Resets cooldown timer or updates timeout settings, permitting immediate retry.
   * @param {number|null} [newTimeoutMs=null] Optional new timeout in milliseconds
   * @returns {Object} Updated status object
   */
  resetTimeout(newTimeoutMs = null) {
    if (typeof newTimeoutMs === 'number' && newTimeoutMs >= 0) {
      this.requestTimeout = newTimeoutMs;
      this.cooldownPeriod = newTimeoutMs;
      this.effectiveCooldown = newTimeoutMs;
    }
    this.nextAttempt = Date.now();
    if (this.state === CircuitState.OPEN) {
      this.transitionTo(CircuitState.HALF_OPEN, 'Timeout reset - immediate trial permitted');
    }
    return {
      state: this.state,
      nextAttempt: this.nextAttempt,
      requestTimeout: this.requestTimeout,
      cooldownPeriod: this.cooldownPeriod,
      effectiveCooldown: this.effectiveCooldown
    };
  }

  /**
   * Completely resets the circuit breaker to its initial healthy CLOSED state.
   */
  reset() {
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenSuccesses = 0;
    this.tripCount = 0;
    this.nextAttempt = 0;
    this.effectiveCooldown = this.cooldownPeriod;
    this.lastError = null;
    this.transitionTo(CircuitState.CLOSED, 'Manual reset executed');
  }

  /**
   * Calculates remaining cooldown time in milliseconds if OPEN.
   * @returns {number}
   */
  getRemainingCooldown() {
    if (this.state !== CircuitState.OPEN) return 0;
    return Math.max(0, this.nextAttempt - Date.now());
  }

  /**
   * Executes a protected asynchronous function with timeout and fault monitoring.
   * @param {Function} fn The async/sync function to execute
   * @param {Function|*} [fallback=null] Fallback function or value if execution fails or is tripped
   * @returns {Promise<*>}
   */
  async execute(fn, fallback = null) {
    this.metrics.totalRequests++;
    const currentState = this.getState();

    // Fast-fail if circuit is OPEN
    if (currentState === CircuitState.OPEN) {
      this.metrics.rejectedRequests++;
      const remaining = this.getRemainingCooldown();
      const openErr = new Error(`Circuit breaker is OPEN. Fast-failing request (cooldown remaining: ${remaining}ms)`);
      openErr.code = 'CIRCUIT_OPEN';
      openErr.remainingCooldown = remaining;

      if (typeof fallback === 'function') {
        return await fallback(openErr);
      } else if (fallback !== null && fallback !== undefined) {
        return fallback;
      }
      throw openErr;
    }

    const timeoutMs = this.requestTimeout;
    let timerId = null;

    const timeoutPromise = new Promise((_, reject) => {
      if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
        timerId = setTimeout(() => {
          this.metrics.timeouts++;
          const timeoutErr = new Error(`Request execution timed out after ${timeoutMs}ms`);
          timeoutErr.code = 'EXECUTION_TIMEOUT';
          reject(timeoutErr);
        }, timeoutMs);
      }
    });

    try {
      if (typeof fn !== 'function') {
        throw new TypeError('execute() expects a callable function as its first argument');
      }

      const executionPromise = (async () => fn())();
      const result = await Promise.race([executionPromise, timeoutPromise]);
      if (timerId) clearTimeout(timerId);

      this.onSuccess();
      return result;
    } catch (err) {
      if (timerId) clearTimeout(timerId);
      this.onFailure(err);

      if (typeof fallback === 'function') {
        return await fallback(err);
      } else if (fallback !== null && fallback !== undefined) {
        return fallback;
      }
      throw err;
    }
  }

  /**
   * Internal handler called upon successful execution.
   */
  onSuccess() {
    this.metrics.successfulRequests++;
    this.consecutiveSuccesses++;
    this.lastSuccessTime = Date.now();

    const currentState = this.getState();
    if (currentState === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenSuccessThreshold) {
        this.tripCount = 0;
        this.effectiveCooldown = this.cooldownPeriod;
        this.transitionTo(
          CircuitState.CLOSED,
          `Half-Open trial succeeded (${this.halfOpenSuccesses}/${this.halfOpenSuccessThreshold} trials passed)`
        );
      }
    } else if (currentState === CircuitState.CLOSED) {
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Internal handler called upon execution failure or timeout.
   * @param {Error} err
   */
  onFailure(err) {
    this.metrics.failedRequests++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    this.lastError = err?.message || String(err);

    const currentState = this.state;
    if (currentState === CircuitState.HALF_OPEN) {
      this.trip(`Half-Open trial probe failed: ${this.lastError}`);
    } else if (currentState === CircuitState.CLOSED) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.trip(`Consecutive failure threshold reached (${this.consecutiveFailures}/${this.failureThreshold})`);
      }
    }
  }

  /**
   * Returns a snapshot of circuit breaker telemetry and configuration.
   * @returns {Object}
   */
  getStatus() {
    return {
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      halfOpenSuccesses: this.halfOpenSuccesses,
      failureThreshold: this.failureThreshold,
      halfOpenSuccessThreshold: this.halfOpenSuccessThreshold,
      cooldownPeriod: this.cooldownPeriod,
      effectiveCooldown: this.effectiveCooldown,
      requestTimeout: this.requestTimeout,
      tripCount: this.tripCount,
      remainingCooldown: this.getRemainingCooldown(),
      metrics: { ...this.metrics },
      lastError: this.lastError,
      lastStateChange: this.lastStateChange,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }

  /**
   * Returns a copy of the metrics counters.
   * @returns {Object}
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Subscribes to events.
   * @param {string} eventName
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  on(eventName, listener) {
    if (typeof listener === 'function') {
      this.listeners.push({ eventName, listener });
    }
    return () => {
      this.listeners = this.listeners.filter(l => l.listener !== listener);
    };
  }

  /**
   * Emits an event to registered listeners.
   * @param {string} eventName
   * @param {*} data
   */
  emit(eventName, data) {
    for (const { eventName: name, listener } of this.listeners) {
      if (name === eventName || name === '*') {
        try {
          listener(data);
        } catch {
          // Keep resilient
        }
      }
    }
  }
}

// Browser Interactive UI Simulator
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const breaker = new StreamingCinemaHubCircuitBreaker({
      failureThreshold: 3,
      cooldownPeriod: 3000,
      requestTimeout: 1000,
      halfOpenSuccessThreshold: 2,
      backoffMultiplier: 2
    });

    const statePill = document.getElementById('statePill');
    const stateDesc = document.getElementById('stateDesc');
    const lampGreen = document.getElementById('lampGreen');
    const lampYellow = document.getElementById('lampYellow');
    const lampRed = document.getElementById('lampRed');
    const failureMeterBar = document.getElementById('failureMeterBar');
    const failureMeterText = document.getElementById('failureMeterText');
    const trialMeterBar = document.getElementById('trialMeterBar');
    const trialMeterText = document.getElementById('trialMeterText');
    const cooldownCounter = document.getElementById('cooldownCounter');
    const metricTotal = document.getElementById('metricTotal');
    const metricSuccess = document.getElementById('metricSuccess');
    const metricFailed = document.getElementById('metricFailed');
    const metricRejected = document.getElementById('metricRejected');
    const metricTimeouts = document.getElementById('metricTimeouts');
    const metricTrips = document.getElementById('metricTrips');
    const logContainer = document.getElementById('telemetryLogContainer');

    function addLogEntry(type, title, detail, latencyMs = null) {
      if (!logContainer) return;
      const entry = document.createElement('div');
      entry.className = `log-entry log-${type}`;

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

      entry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-badge badge-${type}">${type.toUpperCase()}</span>
        <span class="log-title">${title}</span>
        <span class="log-detail">${detail}</span>
        ${latencyMs !== null ? `<span class="log-latency">${latencyMs}ms</span>` : ''}
      `;
      logContainer.prepend(entry);

      // Keep maximum 50 entries
      while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
      }
    }

    function updateDashboard() {
      const status = breaker.getStatus();
      const state = status.state;

      // Update state pill and text
      if (statePill) {
        statePill.textContent = state;
        statePill.className = `state-pill state-${state.toLowerCase()}`;
      }

      // Update lamps
      if (lampGreen && lampYellow && lampRed) {
        lampGreen.classList.toggle('active', state === CircuitState.CLOSED);
        lampYellow.classList.toggle('active', state === CircuitState.HALF_OPEN);
        lampRed.classList.toggle('active', state === CircuitState.OPEN);
      }

      // Update description
      if (stateDesc) {
        if (state === CircuitState.CLOSED) {
          stateDesc.textContent = 'Circuit Closed: Healthy state. Traffic flows unimpeded.';
        } else if (state === CircuitState.OPEN) {
          stateDesc.textContent = `Circuit Tripped (Open): Fast-failing requests to protect upstream CDN. Backoff cooldown active.`;
        } else {
          stateDesc.textContent = `Circuit Half-Open: Testing service recovery with trial requests (${status.halfOpenSuccesses}/${status.halfOpenSuccessThreshold}).`;
        }
      }

      // Update failure meter
      if (failureMeterBar && failureMeterText) {
        const failPct = Math.min(100, (status.consecutiveFailures / status.failureThreshold) * 100);
        failureMeterBar.style.width = `${failPct}%`;
        failureMeterText.textContent = `${status.consecutiveFailures} / ${status.failureThreshold} Failures`;
      }

      // Update trial meter
      if (trialMeterBar && trialMeterText) {
        const trialPct = Math.min(100, (status.halfOpenSuccesses / status.halfOpenSuccessThreshold) * 100);
        trialMeterBar.style.width = `${trialPct}%`;
        trialMeterText.textContent = `${status.halfOpenSuccesses} / ${status.halfOpenSuccessThreshold} Trials`;
      }

      // Update cooldown display
      if (cooldownCounter) {
        const rem = status.remainingCooldown;
        if (rem > 0) {
          cooldownCounter.textContent = `${(rem / 1000).toFixed(1)}s remaining (Trip #${status.tripCount})`;
          cooldownCounter.className = 'cooldown-counter cooldown-active';
        } else {
          cooldownCounter.textContent = 'None (Ready)';
          cooldownCounter.className = 'cooldown-counter cooldown-idle';
        }
      }

      // Update metric badges
      if (metricTotal) metricTotal.textContent = status.metrics.totalRequests;
      if (metricSuccess) metricSuccess.textContent = status.metrics.successfulRequests;
      if (metricFailed) metricFailed.textContent = status.metrics.failedRequests;
      if (metricRejected) metricRejected.textContent = status.metrics.rejectedRequests;
      if (metricTimeouts) metricTimeouts.textContent = status.metrics.timeouts;
      if (metricTrips) metricTrips.textContent = status.metrics.trips;
    }

    // Timer interval to tick cooldown timer down smoothly
    setInterval(() => {
      if (breaker.state === CircuitState.OPEN) {
        updateDashboard();
      }
    }, 200);

    breaker.on('stateChange', (e) => {
      addLogEntry('state', `State: ${e.oldState} → ${e.newState}`, e.reason);
      updateDashboard();
    });

    breaker.on('trip', (e) => {
      addLogEntry('trip', `CIRCUIT TRIPPED (#${e.tripCount})`, `Cooldown backoff: ${e.cooldown}ms | ${e.reason}`);
      updateDashboard();
    });

    // Wire Buttons
    document.getElementById('btnSimulateSuccess')?.addEventListener('click', async () => {
      const start = performance.now();
      try {
        const res = await breaker.execute(async () => {
          await new Promise(r => setTimeout(r, 60));
          return { status: 200, message: 'CDN 4K Manifest 200 OK' };
        });
        const elapsed = Math.round(performance.now() - start);
        addLogEntry('success', 'Request Succeeded', res.message, elapsed);
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        addLogEntry('error', 'Request Blocked/Failed', err.message, elapsed);
      }
      updateDashboard();
    });

    document.getElementById('btnSimulateFail')?.addEventListener('click', async () => {
      const start = performance.now();
      try {
        await breaker.execute(async () => {
          await new Promise(r => setTimeout(r, 50));
          throw new Error('503 Service Unavailable: Video Gateway Overload');
        });
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        addLogEntry('error', 'Request Failed', err.message, elapsed);
      }
      updateDashboard();
    });

    document.getElementById('btnSimulateTimeout')?.addEventListener('click', async () => {
      const start = performance.now();
      try {
        await breaker.execute(async () => {
          // Sleep for 2500ms, exceeding the 1000ms timeout
          await new Promise(r => setTimeout(r, 2500));
          return 'Late Video Chunk';
        });
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        addLogEntry('timeout', 'Request Timed Out', err.message, elapsed);
      }
      updateDashboard();
    });

    document.getElementById('btnBurstFailures')?.addEventListener('click', async () => {
      addLogEntry('info', 'Burst Failure Simulation', 'Triggering 3 rapid consecutive upstream 500 errors...');
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error(`Upstream Error #${i + 1}`);
          });
        } catch {
          // Handled by breaker
        }
      }
      updateDashboard();
    });

    document.getElementById('btnBurstSuccesses')?.addEventListener('click', async () => {
      addLogEntry('info', 'Burst Success Simulation', 'Triggering 2 rapid successful requests...');
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            return `Success Chunk #${i + 1}`;
          });
        } catch {
          // Handled by breaker
        }
      }
      updateDashboard();
    });

    document.getElementById('btnManualTrip')?.addEventListener('click', () => {
      breaker.trip('Operator initiated manual emergency trip');
      updateDashboard();
    });

    document.getElementById('btnResetTimeout')?.addEventListener('click', () => {
      breaker.resetTimeout();
      addLogEntry('info', 'Cooldown Reset', 'Cooldown timer reset to 0. Probing trial permitted.');
      updateDashboard();
    });

    document.getElementById('btnResetCircuit')?.addEventListener('click', () => {
      breaker.reset();
      addLogEntry('info', 'Circuit Reset', 'Reset circuit breaker to CLOSED initial state.');
      updateDashboard();
    });

    document.getElementById('btnClearLogs')?.addEventListener('click', () => {
      if (logContainer) logContainer.innerHTML = '';
    });

    // Configuration Inputs
    const inputThreshold = document.getElementById('cfgThreshold');
    const inputCooldown = document.getElementById('cfgCooldown');
    const inputTimeout = document.getElementById('cfgTimeout');
    const inputTrials = document.getElementById('cfgTrials');

    function applyConfig() {
      if (inputThreshold) breaker.failureThreshold = Math.max(1, parseInt(inputThreshold.value, 10) || 3);
      if (inputCooldown) breaker.cooldownPeriod = Math.max(100, parseInt(inputCooldown.value, 10) || 2000);
      if (inputTimeout) breaker.requestTimeout = Math.max(50, parseInt(inputTimeout.value, 10) || 1000);
      if (inputTrials) breaker.halfOpenSuccessThreshold = Math.max(1, parseInt(inputTrials.value, 10) || 2);
      updateDashboard();
    }

    inputThreshold?.addEventListener('change', applyConfig);
    inputCooldown?.addEventListener('change', applyConfig);
    inputTimeout?.addEventListener('change', applyConfig);
    inputTrials?.addEventListener('change', applyConfig);

    updateDashboard();
    addLogEntry('info', 'Simulator Initialized', 'Circuit breaker ready in CLOSED state.');
  });
}
