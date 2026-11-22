/**
 * Unit Test Suite for NonprofitImpactCircuitBreaker
 * Uses node:test and node:assert/strict
 * Part of TerraInitia & Nonprofit Impact Humanitarian Infrastructure (NSoC 2026).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactCircuitBreaker, CIRCUIT_STATE } from './circuit-breaker.js';

test('NonprofitImpactCircuitBreaker - default configuration and initial state', () => {
  const breaker = new NonprofitImpactCircuitBreaker();
  const status = breaker.getStatus();

  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.failureThreshold, 3);
  assert.equal(status.cooldownPeriod, 2000);
  assert.equal(status.halfOpenSuccessThreshold, 2);
  assert.equal(status.requestTimeout, 3000);
  assert.equal(status.maxCooldownPeriod, 30000);
  assert.equal(status.failureCount, 0);
  assert.equal(status.consecutiveSuccessCount, 0);
  assert.equal(status.consecutiveTrips, 0);
  assert.equal(status.remainingCooldownMs, 0);
  assert.equal(status.metrics.totalRequests, 0);
  assert.equal(status.metrics.successfulRequests, 0);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.metrics.rejectedRequests, 0);
  assert.equal(status.metrics.timedOutRequests, 0);
  assert.equal(status.metrics.fallbackCount, 0);
  assert.equal(status.metrics.trips, 0);
  assert.equal(status.metrics.resets, 0);
  assert.equal(NonprofitImpactCircuitBreaker.STATES.CLOSED, 'CLOSED');
});

test('NonprofitImpactCircuitBreaker - custom options and parameter aliases', () => {
  let currentTime = 10000;
  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 5,
    cooldownMs: 4000,
    halfOpenTrials: 3,
    timeoutMs: 1500,
    maxCooldownMs: 20000,
    exponentialBackoff: false,
    now: () => currentTime,
    name: 'Disaster Relief Satellite Gateway'
  });

  const status = breaker.getStatus();
  assert.equal(status.name, 'Disaster Relief Satellite Gateway');
  assert.equal(status.failureThreshold, 5);
  assert.equal(status.cooldownPeriod, 4000);
  assert.equal(status.halfOpenSuccessThreshold, 3);
  assert.equal(status.requestTimeout, 1500);
  assert.equal(status.maxCooldownPeriod, 20000);
});

test('NonprofitImpactCircuitBreaker - validates option boundaries', () => {
  assert.throws(() => new NonprofitImpactCircuitBreaker({ failureThreshold: 0 }), RangeError);
  assert.throws(() => new NonprofitImpactCircuitBreaker({ failureThreshold: -1 }), RangeError);
  assert.throws(() => new NonprofitImpactCircuitBreaker({ cooldownPeriod: -50 }), RangeError);
  assert.throws(() => new NonprofitImpactCircuitBreaker({ halfOpenSuccessThreshold: 0 }), RangeError);
  assert.throws(() => new NonprofitImpactCircuitBreaker({ requestTimeout: -10 }), RangeError);
  assert.throws(() => new NonprofitImpactCircuitBreaker({ cooldownPeriod: 5000, maxCooldownPeriod: 2000 }), RangeError);
});

test('NonprofitImpactCircuitBreaker - successful execution in CLOSED state passing AbortSignal', async () => {
  const breaker = new NonprofitImpactCircuitBreaker();
  let receivedSignal = null;

  const result = await breaker.execute((signal) => {
    receivedSignal = signal;
    return { grantId: 'GRANT-42', confirmed: true };
  });

  assert.deepEqual(result, { grantId: 'GRANT-42', confirmed: true });
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.equal(receivedSignal.aborted, false);

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.metrics.totalRequests, 1);
  assert.equal(status.metrics.successfulRequests, 1);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.failureCount, 0);
});

test('NonprofitImpactCircuitBreaker - consecutive failures reset on intermediate success', async () => {
  const breaker = new NonprofitImpactCircuitBreaker({ failureThreshold: 3 });

  // 1st failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('500 Server Outage'))),
    /500 Server Outage/
  );
  assert.equal(breaker.getStatus().failureCount, 1);

  // 2nd failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('503 Service Unavailable'))),
    /503 Service Unavailable/
  );
  assert.equal(breaker.getStatus().failureCount, 2);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // Success resets consecutive failure count
  await breaker.execute(() => 'OK');
  assert.equal(breaker.getStatus().failureCount, 0);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});

test('NonprofitImpactCircuitBreaker - trips to OPEN when failureThreshold is reached', async () => {
  let currentTime = 1000;
  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 2,
    cooldownPeriod: 3000,
    now: () => currentTime
  });

  // 1st failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Drop 1'))),
    /Drop 1/
  );
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // 2nd failure trips to OPEN
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Drop 2'))),
    /Drop 2/
  );

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.OPEN);
  assert.equal(status.metrics.trips, 1);
  assert.equal(status.failureCount, 2);
  assert.equal(status.nextAttemptTime, 1000 + 3000);
  assert.equal(status.remainingCooldownMs, 3000);
});

test('NonprofitImpactCircuitBreaker - rejects calls while OPEN before cooldown expires', async () => {
  let currentTime = 1000;
  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2500,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Fatal'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Call immediately after trip - should block without calling function
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

test('NonprofitImpactCircuitBreaker - invokes fallback when OPEN', async () => {
  let currentTime = 1000;
  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Network Lost'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  const fallbackResult = await breaker.execute(
    () => Promise.reject(new Error('Never run')),
    (err) => ({
      status: 'FALLBACK_AID_BUFFERED',
      cachedGrant: 'AID-999',
      reason: err.message
    })
  );

  assert.equal(fallbackResult.status, 'FALLBACK_AID_BUFFERED');
  assert.equal(fallbackResult.cachedGrant, 'AID-999');
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
});

test('NonprofitImpactCircuitBreaker - invokes fallback when function throws', async () => {
  const breaker = new NonprofitImpactCircuitBreaker();

  const fallbackResult = await breaker.execute(
    () => Promise.reject(new Error('Field Outpost Disconnected')),
    (err) => ({
      status: 'LOCAL_LOG_DISPATCH',
      handled: true,
      errorMsg: err.message
    })
  );

  assert.equal(fallbackResult.status, 'LOCAL_LOG_DISPATCH');
  assert.equal(fallbackResult.handled, true);
  assert.equal(fallbackResult.errorMsg, 'Field Outpost Disconnected');
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
  assert.equal(breaker.getStatus().metrics.failedRequests, 1);
});

test('NonprofitImpactCircuitBreaker - supports static fallback values', async () => {
  const breaker = new NonprofitImpactCircuitBreaker({ failureThreshold: 1 });
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Failure'))));

  const fallbackVal = await breaker.execute(
    () => 'should fail',
    { offlineCache: true, defaultRations: 100 }
  );

  assert.deepEqual(fallbackVal, { offlineCache: true, defaultRations: 100 });
});

test('NonprofitImpactCircuitBreaker - automatic transition to HALF_OPEN after cooldown', async () => {
  let currentTime = 1000;
  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    halfOpenSuccessThreshold: 2,
    now: () => currentTime
  });

  // Trip to OPEN
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Down'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Advance time past cooldown
  currentTime = 3500;

  // Next execution probes canary
  const canaryResult = await breaker.execute(() => 'Canary 1 OK');
  assert.equal(canaryResult, 'Canary 1 OK');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);
});

test('NonprofitImpactCircuitBreaker - closes circuit after required HALF_OPEN successes', async () => {
  let currentTime = 1000;
  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    halfOpenSuccessThreshold: 2,
    now: () => currentTime
  });

  // Trip to OPEN
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Down'))));

  // Advance time
  currentTime = 4000;

  // Canary probe 1
  await breaker.execute(() => 'Probe 1');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);

  // Canary probe 2 restores to CLOSED
  await breaker.execute(() => 'Probe 2');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
  assert.equal(breaker.getStatus().failureCount, 0);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 0);
  assert.equal(breaker.getStatus().consecutiveTrips, 0);
});

test('NonprofitImpactCircuitBreaker - failure in HALF_OPEN immediately re-trips to OPEN', async () => {
  let currentTime = 1000;
  const breaker = new NonprofitImpactCircuitBreaker({
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
    breaker.execute(() => Promise.reject(new Error('Canary Failed'))),
    /Canary Failed/
  );

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.OPEN);
  assert.equal(status.metrics.trips, 2);
});

test('NonprofitImpactCircuitBreaker - exponential cooldown backoff doubles on repeated trips', async () => {
  let currentTime = 1000;
  const breaker = new NonprofitImpactCircuitBreaker({
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

test('NonprofitImpactCircuitBreaker - request timeout triggers abort and failure', async () => {
  const breaker = new NonprofitImpactCircuitBreaker({
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
  assert.equal(breaker.getStatus().metrics.failedRequests, 1);
  assert.equal(breaker.getStatus().failureCount, 1);
});

test('NonprofitImpactCircuitBreaker - manual trip() and reset()', () => {
  let currentTime = 5000;
  const breaker = new NonprofitImpactCircuitBreaker({
    cooldownPeriod: 3000,
    now: () => currentTime
  });

  // Manual trip
  const tripStatus = breaker.trip('Emergency manual aid lockdown');
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

test('NonprofitImpactCircuitBreaker - event subscription and stateChange notifications', async () => {
  const breaker = new NonprofitImpactCircuitBreaker({ failureThreshold: 1 });
  const events = [];
  const stateChanges = [];

  const unsubEvent = breaker.on('event', (e) => events.push(e));
  const unsubState = breaker.onStateChange((s) => stateChanges.push(s));

  await breaker.execute(() => 'Event test success');
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

test('NonprofitImpactCircuitBreaker - invalid request function triggers fallback or error', async () => {
  const breaker = new NonprofitImpactCircuitBreaker();

  await assert.rejects(
    breaker.execute('not a function'),
    TypeError
  );

  const fallbackVal = await breaker.execute(null, 'default_aid_payload');
  assert.equal(fallbackVal, 'default_aid_payload');
});

test('NonprofitImpactCircuitBreaker - getStatus snapshot defense protects internal state', async () => {
  const breaker = new NonprofitImpactCircuitBreaker();
  await breaker.execute(() => 'OK');

  const status = breaker.getStatus();
  status.metrics.totalRequests = 999;
  status.history.push({ fake: true });

  const freshStatus = breaker.getStatus();
  assert.equal(freshStatus.metrics.totalRequests, 1);
  assert.equal(freshStatus.history.some((h) => h.fake), false);
});

test('NonprofitImpactCircuitBreaker - concurrent request handling and volume stress', async () => {
  const breaker = new NonprofitImpactCircuitBreaker({
    failureThreshold: 10,
    cooldownPeriod: 5000
  });

  const promises = Array.from({ length: 20 }, (_, i) =>
    breaker.execute(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return `Aid Parcel #${i}`;
    })
  );

  const results = await Promise.all(promises);
  assert.equal(results.length, 20);
  assert.equal(breaker.getStatus().metrics.successfulRequests, 20);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});
