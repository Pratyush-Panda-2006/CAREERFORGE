/**
 * Unit Test Suite for HealthVitalityCircuitBreaker
 * Uses node:test and node:assert/strict
 * Part of Health & Vitality Clinical Telehealth Infrastructure (NSoC 2026).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityCircuitBreaker, CIRCUIT_STATE } from './circuit-breaker.js';

test('HealthVitalityCircuitBreaker - default configuration and initial state', () => {
  const breaker = new HealthVitalityCircuitBreaker();
  const status = breaker.getStatus();

  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.failureThreshold, 3);
  assert.equal(status.cooldownPeriod, 2000);
  assert.equal(status.halfOpenSuccessThreshold, 2);
  assert.equal(status.requestTimeout, 3000);
  assert.equal(status.maxCooldownPeriod, 30000);
  assert.equal(status.failureCount, 0);
  assert.equal(status.failures, 0);
  assert.equal(status.consecutiveSuccessCount, 0);
  assert.equal(status.remainingCooldownMs, 0);
  assert.equal(status.retryAfterMs, 0);

  // Boolean getters
  assert.equal(breaker.isClosed, true);
  assert.equal(breaker.isOpen, false);
  assert.equal(breaker.isHalfOpen, false);
  assert.equal(breaker.failures, 0);

  // Metrics
  assert.equal(status.metrics.totalRequests, 0);
  assert.equal(status.metrics.successfulRequests, 0);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.metrics.rejectedRequests, 0);
  assert.equal(status.metrics.fallbackCount, 0);
  assert.equal(status.metrics.fallbackExecutions, 0);
  assert.equal(status.metrics.trips, 0);
  assert.equal(status.metrics.resets, 0);
});

test('HealthVitalityCircuitBreaker - custom options and aliases', () => {
  let currentTime = 10000;
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 5,
    cooldownMs: 4000,
    halfOpenSuccessThreshold: 3,
    timeoutMs: 1500,
    maxCooldownMs: 25000,
    exponentialBackoff: false,
    now: () => currentTime,
    name: 'Hospital ICU EHR Gateway'
  });

  const status = breaker.getStatus();
  assert.equal(status.name, 'Hospital ICU EHR Gateway');
  assert.equal(status.failureThreshold, 5);
  assert.equal(status.cooldownPeriod, 4000);
  assert.equal(status.halfOpenSuccessThreshold, 3);
  assert.equal(status.requestTimeout, 1500);
  assert.equal(status.maxCooldownPeriod, 25000);
  assert.equal(breaker.getEffectiveCooldown(), 4000);
});

test('HealthVitalityCircuitBreaker - successful execution in CLOSED state', async () => {
  const breaker = new HealthVitalityCircuitBreaker();
  let receivedSignal = null;

  const result = await breaker.execute((signal) => {
    receivedSignal = signal;
    return { patientId: 'PT-1002', heartRate: 72, rhythm: 'Normal Sinus' };
  });

  assert.deepEqual(result, { patientId: 'PT-1002', heartRate: 72, rhythm: 'Normal Sinus' });
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.equal(receivedSignal.aborted, false);

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.metrics.totalRequests, 1);
  assert.equal(status.metrics.successfulRequests, 1);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.failureCount, 0);
});

test('HealthVitalityCircuitBreaker - consecutive failures reset on intermediate success', async () => {
  const breaker = new HealthVitalityCircuitBreaker({ failureThreshold: 3 });

  // 1st failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('500 Clinical Server Error'))),
    /500 Clinical Server Error/
  );
  assert.equal(breaker.getStatus().failureCount, 1);

  // 2nd failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('503 Service Unavailable'))),
    /503 Service Unavailable/
  );
  assert.equal(breaker.getStatus().failureCount, 2);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // Intermediate success resets consecutive failure count
  const ok = await breaker.execute(() => 'Biometric Sync Healthy');
  assert.equal(ok, 'Biometric Sync Healthy');
  assert.equal(breaker.getStatus().failureCount, 0);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});

test('HealthVitalityCircuitBreaker - trips to OPEN when failureThreshold is reached', async () => {
  let currentTime = 1000;
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 2,
    cooldownPeriod: 3000,
    now: () => currentTime
  });

  // 1st failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Sensor error 1'))),
    /Sensor error 1/
  );
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // 2nd failure triggers trip to OPEN
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Sensor error 2'))),
    /Sensor error 2/
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

test('HealthVitalityCircuitBreaker - rejects calls while OPEN before cooldown expires', async () => {
  let currentTime = 1000;
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2500,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Fatal sensor disconnect'))));
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
});

test('HealthVitalityCircuitBreaker - executes fallback function while OPEN', async () => {
  let currentTime = 1000;
  const breaker = new HealthVitalityCircuitBreaker({
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
      cachedHeartRate: 72,
      intercepted: err.code
    })
  );

  assert.deepEqual(fallbackResult, {
    fallback: true,
    cachedHeartRate: 72,
    intercepted: 'CIRCUIT_OPEN'
  });

  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
  assert.equal(breaker.getStatus().metrics.fallbackExecutions, 1);
});

test('HealthVitalityCircuitBreaker - returns static fallback value while OPEN', async () => {
  const breaker = new HealthVitalityCircuitBreaker({ failureThreshold: 1 });
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Trip'))));

  const staticFallback = { defaultVitals: '120/80 mmHg' };
  const result = await breaker.execute(() => 'unreachable', staticFallback);

  assert.deepEqual(result, staticFallback);
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
});

test('HealthVitalityCircuitBreaker - executes fallback on service error in CLOSED state', async () => {
  const breaker = new HealthVitalityCircuitBreaker({ failureThreshold: 3 });

  const fallbackResult = await breaker.execute(
    () => Promise.reject(new Error('Temporary sensor glitch')),
    (err) => ({ recoveredFrom: err.message, cachedValue: 98 })
  );

  assert.deepEqual(fallbackResult, {
    recoveredFrom: 'Temporary sensor glitch',
    cachedValue: 98
  });

  assert.equal(breaker.getStatus().failureCount, 1);
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});

test('HealthVitalityCircuitBreaker - automatically transitions to HALF_OPEN after cooldown expires', async () => {
  let currentTime = 1000;
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Crash'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Advance time past cooldown
  currentTime = 3000; // 1000 + 2000

  const canaryResult = await breaker.execute(() => 'Canary Probe Succeeded');
  assert.equal(canaryResult, 'Canary Probe Succeeded');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.isHalfOpen, true);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);
});

test('HealthVitalityCircuitBreaker - failure in HALF_OPEN immediately re-trips to OPEN', async () => {
  let currentTime = 1000;
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 2,
    cooldownPeriod: 2000,
    halfOpenSuccessThreshold: 2,
    now: () => currentTime
  });

  // Trip to OPEN
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('F1'))));
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('F2'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Cooldown expires
  currentTime = 4000;

  // 1st canary success
  await breaker.execute(() => 'OK');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);

  // Canary failure re-trips to OPEN immediately
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Canary Outage'))),
    /Canary Outage/
  );

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.OPEN);
  assert.equal(status.metrics.trips, 2);
});

test('HealthVitalityCircuitBreaker - consecutive successes in HALF_OPEN restore circuit to CLOSED', async () => {
  let currentTime = 1000;
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 1500,
    halfOpenSuccessThreshold: 2,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Trip'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Advance past cooldown
  currentTime = 3000;

  // 1st canary success
  await breaker.execute(() => 'Probe 1 Passed');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);

  // 2nd canary success reaches halfOpenSuccessThreshold -> closes circuit!
  await breaker.execute(() => 'Probe 2 Passed');
  const finalStatus = breaker.getStatus();
  assert.equal(finalStatus.state, CIRCUIT_STATE.CLOSED);
  assert.equal(breaker.isClosed, true);
  assert.equal(finalStatus.failureCount, 0);
  assert.equal(finalStatus.consecutiveSuccessCount, 0);
  assert.equal(finalStatus.nextAttemptTime, 0);
});

test('HealthVitalityCircuitBreaker - exponential cooldown backoff doubles on repeated trips', async () => {
  let currentTime = 1000;
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 1000,
    maxCooldownPeriod: 8000,
    exponentialBackoff: true,
    now: () => currentTime
  });

  // Trip 1 -> cooldown 1000
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('T1'))));
  assert.equal(breaker.getStatus().effectiveCooldownMs, 1000);

  // Advance past cooldown and fail in HALF_OPEN -> Trip 2 -> cooldown 2000
  currentTime += 1100;
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('T2'))));
  assert.equal(breaker.getStatus().effectiveCooldownMs, 2000);

  // Advance and fail again -> Trip 3 -> cooldown 4000
  currentTime += 2100;
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('T3'))));
  assert.equal(breaker.getStatus().effectiveCooldownMs, 4000);

  // Advance and fail again -> Trip 4 -> cooldown 8000 (capped at maxCooldownPeriod)
  currentTime += 4100;
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('T4'))));
  assert.equal(breaker.getStatus().effectiveCooldownMs, 8000);
});

test('HealthVitalityCircuitBreaker - request timeout triggers abort and failure', async () => {
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 2,
    requestTimeout: 40 // 40ms timeout
  });

  let receivedSignal = null;

  await assert.rejects(
    breaker.execute((signal) => {
      receivedSignal = signal;
      return new Promise((resolve) => setTimeout(resolve, 150));
    }),
    (err) => {
      assert.equal(err.code, 'REQUEST_TIMEOUT');
      return true;
    }
  );

  assert.ok(receivedSignal);
  assert.equal(receivedSignal.aborted, true);
  assert.equal(breaker.getStatus().metrics.timedOutRequests, 1);
  assert.equal(breaker.getStatus().metrics.timeouts, 1);
  assert.equal(breaker.getStatus().metrics.failedRequests, 1);
  assert.equal(breaker.getStatus().failureCount, 1);
});

test('HealthVitalityCircuitBreaker - manual trip() and reset()', () => {
  let currentTime = 5000;
  const breaker = new HealthVitalityCircuitBreaker({
    cooldownPeriod: 3000,
    now: () => currentTime
  });

  // Manual trip
  const tripStatus = breaker.trip('Emergency manual physician lockout');
  assert.equal(tripStatus.state, CIRCUIT_STATE.OPEN);
  assert.equal(tripStatus.metrics.trips, 1);
  assert.equal(tripStatus.nextAttemptTime, 8000);

  // Manual reset
  const resetStatus = breaker.reset();
  assert.equal(resetStatus.state, CIRCUIT_STATE.CLOSED);
  assert.equal(resetStatus.metrics.resets, 1);
  assert.equal(resetStatus.failureCount, 0);
  assert.equal(resetStatus.consecutiveSuccessCount, 0);
  assert.equal(resetStatus.nextAttemptTime, 0);
});

test('HealthVitalityCircuitBreaker - event subscription and stateChange notifications', async () => {
  const breaker = new HealthVitalityCircuitBreaker({ failureThreshold: 1 });
  const events = [];
  const stateChanges = [];

  const unsubEvent = breaker.on('event', (e) => events.push(e));
  const unsubState = breaker.onStateChange((s) => stateChanges.push(s));

  await breaker.execute(() => 'Biometric stream active');
  assert.ok(events.some((e) => e.type === 'SUCCESS'));

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Trip'))));
  assert.ok(stateChanges.some((s) => s.to === CIRCUIT_STATE.OPEN));

  // Test unsubscribe
  unsubEvent();
  unsubState();
  const countBefore = events.length;
  breaker.reset();
  assert.equal(events.length, countBefore);
});

test('HealthVitalityCircuitBreaker - invalid request function triggers fallback or error', async () => {
  const breaker = new HealthVitalityCircuitBreaker();

  await assert.rejects(
    breaker.execute('not a function'),
    TypeError
  );

  const fallbackVal = await breaker.execute(null, 'default_biometric_val');
  assert.equal(fallbackVal, 'default_biometric_val');
});

test('HealthVitalityCircuitBreaker - history audit timeline bounds and integrity', async () => {
  const breaker = new HealthVitalityCircuitBreaker();
  for (let i = 0; i < 15; i++) {
    await breaker.execute(() => `reading_${i}`);
  }

  const history = breaker.getHistory();
  assert.ok(history.length >= 15);
  assert.equal(history[0].type, 'SUCCESS');

  // Verify status snapshot has copy of history
  const status = breaker.getStatus();
  assert.ok(Array.isArray(status.history));
  assert.ok(Array.isArray(status.events));
  assert.equal(status.history.length, history.length);
});

test('HealthVitalityCircuitBreaker - snapshot() is an alias of getStatus()', () => {
  const breaker = new HealthVitalityCircuitBreaker();
  const s1 = breaker.getStatus();
  const s2 = breaker.snapshot();
  assert.deepEqual(s1, s2);
});

test('HealthVitalityCircuitBreaker - concurrent request execution under load', async () => {
  const breaker = new HealthVitalityCircuitBreaker({
    failureThreshold: 10,
    requestTimeout: 1000
  });

  const tasks = Array.from({ length: 20 }, (_, i) =>
    breaker.execute(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { packetId: i, verified: true };
    })
  );

  const results = await Promise.all(tasks);
  assert.equal(results.length, 20);
  assert.equal(breaker.getStatus().metrics.successfulRequests, 20);
  assert.equal(breaker.getStatus().metrics.totalRequests, 20);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});
