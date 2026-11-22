/**
 * Unit Test Suite for LuxuryRealmsCircuitBreaker
 * Uses node:test and node:assert/strict
 * Part of Luxury Realms Estate Concierge Infrastructure (NSoC 2026).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsCircuitBreaker, CIRCUIT_STATE } from './circuit-breaker.js';

test('LuxuryRealmsCircuitBreaker - default configuration and initial state', () => {
  const breaker = new LuxuryRealmsCircuitBreaker();
  const status = breaker.getStatus();

  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.failureThreshold, 3);
  assert.equal(status.cooldownPeriod, 2000);
  assert.equal(status.halfOpenSuccessThreshold, 2);
  assert.equal(status.requestTimeout, 3000);
  assert.equal(status.failureCount, 0);
  assert.equal(status.consecutiveSuccessCount, 0);
  assert.equal(status.remainingCooldownMs, 0);
  assert.equal(status.metrics.totalRequests, 0);
  assert.equal(status.metrics.successfulRequests, 0);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.metrics.rejectedRequests, 0);
  assert.equal(status.metrics.fallbackCount, 0);
  assert.equal(status.metrics.trips, 0);
});

test('LuxuryRealmsCircuitBreaker - custom options and aliases', () => {
  let currentTime = 10000;
  const breaker = new LuxuryRealmsCircuitBreaker({
    failureThreshold: 5,
    cooldownMs: 4000,
    halfOpenSuccessThreshold: 3,
    timeoutMs: 1500,
    maxCooldownMs: 20000,
    exponentialBackoff: false,
    now: () => currentTime,
    name: 'Superyacht API Gateway'
  });

  const status = breaker.getStatus();
  assert.equal(status.name, 'Superyacht API Gateway');
  assert.equal(status.failureThreshold, 5);
  assert.equal(status.cooldownPeriod, 4000);
  assert.equal(status.halfOpenSuccessThreshold, 3);
  assert.equal(status.requestTimeout, 1500);
  assert.equal(status.maxCooldownPeriod, 20000);
});

test('LuxuryRealmsCircuitBreaker - successful execution in CLOSED state', async () => {
  const breaker = new LuxuryRealmsCircuitBreaker();
  let receivedSignal = null;

  const result = await breaker.execute((signal) => {
    receivedSignal = signal;
    return { bookingId: 'ESTATE-99', confirmed: true };
  });

  assert.deepEqual(result, { bookingId: 'ESTATE-99', confirmed: true });
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.equal(receivedSignal.aborted, false);

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.metrics.totalRequests, 1);
  assert.equal(status.metrics.successfulRequests, 1);
  assert.equal(status.metrics.failedRequests, 0);
  assert.equal(status.failureCount, 0);
});

test('LuxuryRealmsCircuitBreaker - consecutive failures reset on intermediate success', async () => {
  const breaker = new LuxuryRealmsCircuitBreaker({ failureThreshold: 3 });

  // First failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('500 Service Error'))),
    /500 Service Error/
  );
  assert.equal(breaker.getStatus().failureCount, 1);

  // Second failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('502 Bad Gateway'))),
    /502 Bad Gateway/
  );
  assert.equal(breaker.getStatus().failureCount, 2);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // Success resets consecutive failure count
  await breaker.execute(() => 'OK');
  assert.equal(breaker.getStatus().failureCount, 0);
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);
});

test('LuxuryRealmsCircuitBreaker - trips to OPEN when failureThreshold is reached', async () => {
  let currentTime = 1000;
  const breaker = new LuxuryRealmsCircuitBreaker({
    failureThreshold: 2,
    cooldownPeriod: 3000,
    now: () => currentTime
  });

  // 1st failure
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Fail 1'))),
    /Fail 1/
  );
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.CLOSED);

  // 2nd failure triggers trip to OPEN
  await assert.rejects(
    breaker.execute(() => Promise.reject(new Error('Fail 2'))),
    /Fail 2/
  );

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.OPEN);
  assert.equal(status.metrics.trips, 1);
  assert.equal(status.failureCount, 2);
  assert.equal(status.nextAttemptTime, 1000 + 3000);
  assert.equal(status.remainingCooldownMs, 3000);
});

test('LuxuryRealmsCircuitBreaker - rejects calls while OPEN before cooldown expires', async () => {
  let currentTime = 1000;
  const breaker = new LuxuryRealmsCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2500,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Fatal'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Call immediately after trip while still OPEN
  let fnCalled = false;
  await assert.rejects(
    breaker.execute(() => {
      fnCalled = true;
      return 'should not run';
    }),
    (err) => {
      assert.equal(err.code, 'CIRCUIT_OPEN');
      assert.equal(err.circuitState, CIRCUIT_STATE.OPEN);
      assert.equal(err.retryAfterMs, 2500);
      return true;
    }
  );

  assert.equal(fnCalled, false);
  const status = breaker.getStatus();
  assert.equal(status.metrics.rejectedRequests, 1);
});

test('LuxuryRealmsCircuitBreaker - executes fallback function when OPEN', async () => {
  let currentTime = 1000;
  const breaker = new LuxuryRealmsCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    now: () => currentTime
  });

  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Trip'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Execute with fallback function
  const fallbackResult = await breaker.execute(
    () => Promise.reject(new Error('Should not run')),
    (error) => {
      assert.equal(error.code, 'CIRCUIT_OPEN');
      return { fallbackActive: true, cached: 'VIP Concierge Offline Voucher' };
    }
  );

  assert.deepEqual(fallbackResult, {
    fallbackActive: true,
    cached: 'VIP Concierge Offline Voucher'
  });
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
});

test('LuxuryRealmsCircuitBreaker - executes fallback value when target fails in CLOSED', async () => {
  const breaker = new LuxuryRealmsCircuitBreaker({ failureThreshold: 3 });

  const result = await breaker.execute(
    () => Promise.reject(new Error('Immediate Service Outage')),
    { fallback: 'static_luxury_backup' }
  );

  assert.deepEqual(result, { fallback: 'static_luxury_backup' });
  assert.equal(breaker.getStatus().metrics.failedRequests, 1);
  assert.equal(breaker.getStatus().metrics.fallbackCount, 1);
});

test('LuxuryRealmsCircuitBreaker - transitions from OPEN to HALF_OPEN after cooldown and recovers to CLOSED', async () => {
  let currentTime = 1000;
  const breaker = new LuxuryRealmsCircuitBreaker({
    failureThreshold: 1,
    cooldownPeriod: 2000,
    halfOpenSuccessThreshold: 2,
    now: () => currentTime
  });

  // Trip to OPEN
  await assert.rejects(breaker.execute(() => Promise.reject(new Error('Trip'))));
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.OPEN);

  // Advance time past cooldown
  currentTime = 3500;

  // 1st canary trial passes
  const trial1 = await breaker.execute(() => 'Canary 1 Passed');
  assert.equal(trial1, 'Canary 1 Passed');
  assert.equal(breaker.getStatus().state, CIRCUIT_STATE.HALF_OPEN);
  assert.equal(breaker.getStatus().consecutiveSuccessCount, 1);

  // 2nd canary trial passes, meeting threshold of 2 -> CLOSED!
  const trial2 = await breaker.execute(() => 'Canary 2 Passed');
  assert.equal(trial2, 'Canary 2 Passed');

  const status = breaker.getStatus();
  assert.equal(status.state, CIRCUIT_STATE.CLOSED);
  assert.equal(status.failureCount, 0);
  assert.equal(status.consecutiveSuccessCount, 0);
  assert.equal(status.consecutiveTrips, 0);
});

test('LuxuryRealmsCircuitBreaker - failure in HALF_OPEN immediately re-trips to OPEN', async () => {
  let currentTime = 1000;
  const breaker = new LuxuryRealmsCircuitBreaker({
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

test('LuxuryRealmsCircuitBreaker - exponential cooldown backoff doubles on repeated trips', async () => {
  let currentTime = 1000;
  const breaker = new LuxuryRealmsCircuitBreaker({
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

test('LuxuryRealmsCircuitBreaker - request timeout triggers abort and failure', async () => {
  const breaker = new LuxuryRealmsCircuitBreaker({
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

test('LuxuryRealmsCircuitBreaker - manual trip() and reset()', () => {
  let currentTime = 5000;
  const breaker = new LuxuryRealmsCircuitBreaker({
    cooldownPeriod: 3000,
    now: () => currentTime
  });

  // Manual trip
  const tripStatus = breaker.trip('Emergency manual lockdown');
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

test('LuxuryRealmsCircuitBreaker - event subscription and stateChange notifications', async () => {
  const breaker = new LuxuryRealmsCircuitBreaker({ failureThreshold: 1 });
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

test('LuxuryRealmsCircuitBreaker - invalid request function triggers fallback or error', async () => {
  const breaker = new LuxuryRealmsCircuitBreaker();

  await assert.rejects(
    breaker.execute('not a function'),
    TypeError
  );

  const fallbackVal = await breaker.execute(null, 'default_luxury_val');
  assert.equal(fallbackVal, 'default_luxury_val');
});
