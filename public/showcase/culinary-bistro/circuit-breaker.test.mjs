/**
 * Unit Test Suite for CulinaryBistroCircuitBreaker
 * Uses node:test and node:assert/strict
 * Part of Lumière Culinary Bistro Showcase (NSoC 2026).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroCircuitBreaker, CIRCUIT_STATE } from './circuit-breaker.js';

test('CulinaryBistroCircuitBreaker - default configuration and initial state', () => {
  const breaker = new CulinaryBistroCircuitBreaker();
  const status = breaker.getStatus();

  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.failureThreshold, 3);
  assert.equal(status.cooldownPeriod, 3000);
  assert.equal(status.halfOpenSuccessThreshold, 2);
  assert.equal(status.requestTimeout, 2000);
  assert.equal(status.maxCooldownPeriod, 30000);
  assert.equal(status.failureCount, 0);
  assert.equal(status.failures, 0);
  assert.equal(status.consecutiveSuccessCount, 0);
  assert.equal(status.remainingCooldownMs, 0);
  assert.equal(status.retryAfterMs, 0);

  // Boolean state getters
  assert.equal(breaker.isClosed, true);
  assert.equal(breaker.isOpen, false);
  assert.equal(breaker.isHalfOpen, false);
  assert.equal(breaker.failures, 0);

  // Static STATES getter
  assert.equal(CulinaryBistroCircuitBreaker.STATES.CLOSED, 'CLOSED');
  assert.equal(CulinaryBistroCircuitBreaker.STATES.OPEN, 'OPEN');
  assert.equal(CulinaryBistroCircuitBreaker.STATES.HALF_OPEN, 'HALF_OPEN');

  // Metrics
  assert.equal(status.metrics.totalRequests, 0);
  assert.equal(status.metrics.total, 0);
  assert.equal(status.metrics.successfulRequests, 0);
  assert.equal(status.metrics.success, 0);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.metrics.failed, 0);
  assert.equal(status.metrics.rejectedRequests, 0);
  assert.equal(status.metrics.rejected, 0);
  assert.equal(status.metrics.fallbackCount, 0);
  assert.equal(status.metrics.fallback, 0);
  assert.equal(status.metrics.trips, 0);
  assert.equal(status.metrics.resets, 0);
});

test('CulinaryBistroCircuitBreaker - custom options and aliases', () => {
  let currentTime = 10000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 5,
    cooldownMs: 4000,
    halfOpenSuccessThreshold: 3,
    timeoutMs: 1500,
    maxCooldownMs: 25000,
    exponentialBackoff: false,
    now: () => currentTime,
    name: 'Lumière Sommelier & Cellar Gateway'
  });

  const status = breaker.getStatus();
  assert.equal(status.name, 'Lumière Sommelier & Cellar Gateway');
  assert.equal(status.failureThreshold, 5);
  assert.equal(status.cooldownPeriod, 4000);
  assert.equal(status.halfOpenSuccessThreshold, 3);
  assert.equal(status.requestTimeout, 1500);
  assert.equal(status.maxCooldownPeriod, 25000);
  assert.equal(breaker.getEffectiveCooldown(), 4000);
});

test('CulinaryBistroCircuitBreaker - successful execution in CLOSED state', async () => {
  const breaker = new CulinaryBistroCircuitBreaker();
  let receivedSignal = null;

  const result = await breaker.execute((signal) => {
    receivedSignal = signal;
    return { dish: 'Seared Wagyu Ribeye', table: 12, status: 'Plated' };
  });

  assert.deepEqual(result, { dish: 'Seared Wagyu Ribeye', table: 12, status: 'Plated' });
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.equal(receivedSignal.aborted, false);

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.metrics.totalRequests, 1);
  assert.equal(status.metrics.total, 1);
  assert.equal(status.metrics.successfulRequests, 1);
  assert.equal(status.metrics.success, 1);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.failureCount, 0);
});

test('CulinaryBistroCircuitBreaker - consecutive failures reset on intermediate success', async () => {
  const breaker = new CulinaryBistroCircuitBreaker({ failureThreshold: 3 });

  // 1st failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('500 Kitchen Order Ingestion Failed'))),
    /500 Kitchen Order Ingestion Failed/
  );
  assert.equal(breaker.getStatus().failureCount, 1);

  // 2nd failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('503 Sommelier Cellar Gateway Timeout'))),
    /503 Sommelier Cellar Gateway Timeout/
  );
  assert.equal(breaker.getStatus().failureCount, 2);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // Intermediate success resets consecutive failure count
  const ok = await breaker.execute(() => 'Artisanal Bread Ingestion Healthy');
  assert.equal(ok, 'Artisanal Bread Ingestion Healthy');
  assert.equal(breaker.getStatus().failureCount, 0);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});

test('CulinaryBistroCircuitBreaker - trips to OPEN when failureThreshold is reached', async () => {
  let currentTime = 1000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 2,
    cooldownPeriod: 3000,
    now: () => currentTime
  });

  // 1st failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Kitchen POS network error 1'))),
    /Kitchen POS network error 1/
  );
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // 2nd failure triggers trip to OPEN
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Kitchen POS network error 2'))),
    /Kitchen POS network error 2/
  );

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.OPEN);
  assert.equal(breaker.isOpen, true);
  assert.equal(breaker.isClosed, false);
  assert.equal(status.metrics.trips, 1);
  assert.equal(status.failureCount, 2);
  assert.equal(status.nextAttemptTime, 1000 + 3000);
  assert.equal(status.remainingCooldownMs, 3000);
});

test('CulinaryBistroCircuitBreaker - rejects calls while OPEN before cooldown expires', async () => {
  let currentTime = 1000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2500,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Fatal kitchen outage'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Call immediately after trip before cooldown expires
  let called = false;
  await assert.rejects(
    breaker.execute(() => {
      called = true;
      return 'Should not run';
    }),
    (err) => {
      assert.equal(err.code, 'CIRCUIT_OPEN');
      assert.equal(err.circuitState, CIRCUIT_STATE.OPEN);
      assert.equal(err.retryAfterMs, 2500);
      return true;
    }
  );

  assert.equal(called, false);
  assert.equal(breaker.getStatus().metrics.rejectedRequests, 1);
  assert.equal(breaker.getStatus().metrics.rejected, 1);
});

test('CulinaryBistroCircuitBreaker - executes fallback function while OPEN', async () => {
  let currentTime = 1000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Fatal'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Fallback handler
  const fallbackResult = await breaker.execute(
    () => Promise.reject(new Error('Unreachable')),
    (err) => ({
      fallback: true,
      cachedTastingMenu: 'Chef Laurent Winter Tasting Menu',
      intercepted: err.code
    })
  );

  assert.deepEqual(fallbackResult, {
    fallback: true,
    cachedTastingMenu: 'Chef Laurent Winter Tasting Menu',
    intercepted: 'CIRCUIT_OPEN'
  });

  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
  assert.equal(breaker.getStatus().metrics.fallback, 1);
  assert.equal(breaker.getStatus().metrics.fallbackExecutions, 1);
});

test('CulinaryBistroCircuitBreaker - returns static fallback value while OPEN', async () => {
  const breaker = new CulinaryBistroCircuitBreaker({ failureThreshold: 1 });
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Trip'))));

  const staticFallback = { defaultVoucher: '€50 Cellar Voucher' };
  const result = await breaker.execute(() => 'unreachable', staticFallback);

  assert.deepEqual(result, staticFallback);
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
});

test('CulinaryBistroCircuitBreaker - executes fallback on service error in CLOSED state', async () => {
  const breaker = new CulinaryBistroCircuitBreaker({ failureThreshold: 3 });

  const fallbackResult = await breaker.execute(
    () => Promise.reject(new Error('Temporary caviar inventory glitch')),
    (err) => ({ recoveredFrom: err.message, emergencyStock: 5 })
  );

  assert.deepEqual(fallbackResult, {
    recoveredFrom: 'Temporary caviar inventory glitch',
    emergencyStock: 5
  });

  assert.equal(breaker.getStatus().failureCount, 1);
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});

test('CulinaryBistroCircuitBreaker - automatically transitions to HALF_OPEN after cooldown expires', async () => {
  let currentTime = 1000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Kitchen Outage'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Advance time past cooldown
  currentTime = 3000; // 1000 + 2000

  const canaryResult = await breaker.execute(() => 'Canary Kitchen Probe Succeeded');
  assert.equal(canaryResult, 'Canary Kitchen Probe Succeeded');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.isHalfOpen, true);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);
});

test('CulinaryBistroCircuitBreaker - failure in HALF_OPEN immediately re-trips to OPEN', async () => {
  let currentTime = 1000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 3,
    cooldownPeriod: 2000,
    halfOpenSuccessThreshold: 2,
    now: () => currentTime
  });

  // Trip to OPEN
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('F1'))));
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('F2'))));
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('F3'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Cooldown expires
  currentTime = 4000;

  // 1st canary success
  await breaker.execute(() => 'Canary 1 OK');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);

  // Canary failure re-trips to OPEN immediately without waiting for 3 failures
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Canary Outage in KDS'))),
    /Canary Outage in KDS/
  );

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.OPEN);
  assert.equal(status.metrics.trips, 2);
});

test('CulinaryBistroCircuitBreaker - consecutive successes in HALF_OPEN restore circuit to CLOSED', async () => {
  let currentTime = 1000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 1500,
    halfOpenSuccessThreshold: 2,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Trip'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Advance past cooldown
  currentTime = 2600;

  // 1st canary success
  await breaker.execute(() => 'Canary 1 Success');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);

  // 2nd canary success -> recovers circuit to CLOSED!
  await breaker.execute(() => 'Canary 2 Success');
  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(breaker.isClosed, true);
  assert.equal(status.failureCount, 0);
  assert.equal(status.consecutiveSuccessCount, 0);
  assert.equal(status.consecutiveTrips, 0);
});

test('CulinaryBistroCircuitBreaker - exponential backoff doubles cooldown on successive trips up to maxCooldownPeriod', async () => {
  let currentTime = 1000;
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    maxCooldownPeriod: 10000,
    exponentialBackoff: true,
    now: () => currentTime
  });

  // Trip 1
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Err 1'))));
  assert.equal(breaker.getEffectiveCooldown(), 2000); // 2000 * 2^0 = 2000

  // Cooldown 1 expires, trial in HALF_OPEN fails -> Trip 2
  currentTime += 2100;
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Err 2'))));
  assert.equal(breaker.getEffectiveCooldown(), 4000); // 2000 * 2^1 = 4000

  // Cooldown 2 expires, trial fails -> Trip 3
  currentTime += 4100;
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Err 3'))));
  assert.equal(breaker.getEffectiveCooldown(), 8000); // 2000 * 2^2 = 8000

  // Cooldown 3 expires, trial fails -> Trip 4 (capped at max 10000)
  currentTime += 8100;
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Err 4'))));
  assert.equal(breaker.getEffectiveCooldown(), 10000); // Capped at 10000
});

test('CulinaryBistroCircuitBreaker - per-request timeout triggers REQUEST_TIMEOUT and increments timeouts metrics', async () => {
  const breaker = new CulinaryBistroCircuitBreaker({
    failureThreshold: 3,
    requestTimeout: 100
  });

  await assert.rejects(
    breaker.execute((signal) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve('Too late'), 300);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Aborted by timeout controller'));
        });
      });
    }),
    (err) => {
      assert.equal(err.code, 'REQUEST_TIMEOUT');
      assert.equal(err.timeoutMs, 100);
      return true;
    }
  );

  const status = breaker.getStatus();
  assert.equal(status.metrics.timedOutRequests, 1);
  assert.equal(status.metrics.timeouts, 1);
  assert.equal(status.metrics.failedRequests, 1);
  assert.equal(status.failureCount, 1);
});

test('CulinaryBistroCircuitBreaker - manual trip() forces circuit to OPEN', () => {
  const breaker = new CulinaryBistroCircuitBreaker();
  assert.equal(breaker.isClosed, true);

  const snapshot = breaker.trip('Executive Chef safety lockout');
  assert.equal(snapshot.state, CIRCUIT_STATE.OPEN);
  assert.equal(breaker.isOpen, true);
  assert.equal(breaker.getStatus().metrics.trips, 1);
});

test('CulinaryBistroCircuitBreaker - manual reset() restores circuit to CLOSED and clears failures', async () => {
  const breaker = new CulinaryBistroCircuitBreaker({ failureThreshold: 1 });
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Fail'))));
  assert.equal(breaker.isOpen, true);

  const snapshot = breaker.reset();
  assert.equal(snapshot.state, CIRCUIT_STATE.CLOSED);
  assert.equal(breaker.isClosed, true);
  assert.equal(breaker.failures, 0);
  assert.equal(breaker.getStatus().metrics.resets, 1);
});

test('CulinaryBistroCircuitBreaker - event listeners on stateChange, trip, reset, and off', () => {
  const breaker = new CulinaryBistroCircuitBreaker();
  const stateChanges = [];
  const trips = [];
  const resets = [];

  const unsubState = breaker.onStateChange((data) => stateChanges.push(data));
  const unsubTrip = breaker.on('trip', (data) => trips.push(data));
  const unsubReset = breaker.on('reset', (data) => resets.push(data));

  breaker.trip('Emergency manual trip');
  assert.equal(stateChanges.length, 1);
  assert.equal(stateChanges[0].from, CIRCUIT_STATE.CLOSED);
  assert.equal(stateChanges[0].to, CIRCUIT_STATE.OPEN);
  assert.equal(trips.length, 1);

  breaker.reset();
  assert.equal(stateChanges.length, 2);
  assert.equal(stateChanges[1].from, CIRCUIT_STATE.OPEN);
  assert.equal(stateChanges[1].to, CIRCUIT_STATE.CLOSED);
  assert.equal(resets.length, 1);

  // Test unsubscribe
  unsubState();
  unsubTrip();
  unsubReset();

  breaker.trip('Second trip');
  assert.equal(stateChanges.length, 2); // No new events added
  assert.equal(trips.length, 1);
});

test('CulinaryBistroCircuitBreaker - handles non-function requests gracefully', async () => {
  const breaker = new CulinaryBistroCircuitBreaker();

  await assert.rejects(
    breaker.execute('not a function'),
    TypeError
  );

  // With fallback
  const result = await breaker.execute(null, { fallbackNotice: 'Handled null function' });
  assert.deepEqual(result, { fallbackNotice: 'Handled null function' });
});

test('CulinaryBistroCircuitBreaker - snapshot(), getMetrics(), and getHistory()', () => {
  const breaker = new CulinaryBistroCircuitBreaker();
  const snapshot = breaker.snapshot();
  const metrics = breaker.getMetrics();
  const history = breaker.getHistory();

  assert.equal(snapshot.state, CIRCUIT_STATE.CLOSED);
  assert.equal(typeof metrics, 'object');
  assert.equal(metrics.totalRequests, 0);
  assert.ok(Array.isArray(history));
  assert.ok(history.length >= 1);
  assert.equal(history[0].type, 'INITIALIZED');
});
