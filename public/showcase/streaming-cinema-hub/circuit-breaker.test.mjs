import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubCircuitBreaker, CircuitState } from './circuit-breaker.js';

test('StreamingCinemaHubCircuitBreaker - default configuration and initial CLOSED state', () => {
  const breaker = new StreamingCinemaHubCircuitBreaker();

  assert.equal(breaker.getState(), CircuitState.CLOSED);
  assert.equal(breaker.failureThreshold, 3);
  assert.equal(breaker.cooldownPeriod, 2000);
  assert.equal(breaker.requestTimeout, 1000);
  assert.equal(breaker.halfOpenSuccessThreshold, 2);
  assert.equal(breaker.consecutiveFailures, 0);
  assert.equal(breaker.tripCount, 0);

  const status = breaker.getStatus();
  assert.equal(status.state, CircuitState.CLOSED);
  assert.equal(status.metrics.totalRequests, 0);
});

test('StreamingCinemaHubCircuitBreaker - successful execution in CLOSED state', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({ threshold: 3 });

  const result = await breaker.execute(async () => {
    return { data: '4k-stream-manifest-ok' };
  });

  assert.deepEqual(result, { data: '4k-stream-manifest-ok' });
  assert.equal(breaker.getState(), CircuitState.CLOSED);
  assert.equal(breaker.consecutiveFailures, 0);
  assert.equal(breaker.getMetrics().successfulRequests, 1);
  assert.equal(breaker.getMetrics().totalRequests, 1);
});

test('StreamingCinemaHubCircuitBreaker - failure counting below threshold retains CLOSED state', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({ threshold: 3 });

  await assert.rejects(
    breaker.execute(async () => {
      throw new Error('500 CDN Internal Error');
    }),
    /500 CDN Internal Error/
  );

  assert.equal(breaker.getState(), CircuitState.CLOSED);
  assert.equal(breaker.consecutiveFailures, 1);

  await assert.rejects(
    breaker.execute(async () => {
      throw new Error('503 Service Unavailable');
    }),
    /503 Service Unavailable/
  );

  assert.equal(breaker.getState(), CircuitState.CLOSED);
  assert.equal(breaker.consecutiveFailures, 2);
  assert.equal(breaker.getMetrics().failedRequests, 2);

  // Success resets consecutive failure counter
  await breaker.execute(() => 'recovered-transient');
  assert.equal(breaker.consecutiveFailures, 0);
  assert.equal(breaker.getState(), CircuitState.CLOSED);
});

test('StreamingCinemaHubCircuitBreaker - breaches threshold and trips to OPEN', async () => {
  let stateChangeEvent = null;
  const breaker = new StreamingCinemaHubCircuitBreaker({
    threshold: 2,
    cooldown: 500,
    onStateChange: (newState, oldState, ev) => {
      stateChangeEvent = { newState, oldState, ev };
    }
  });

  // 1st failure
  await assert.rejects(breaker.execute(() => { throw new Error('Err 1'); }));
  assert.equal(breaker.getState(), CircuitState.CLOSED);

  // 2nd failure breaches threshold (2)
  await assert.rejects(breaker.execute(() => { throw new Error('Err 2'); }));
  assert.equal(breaker.getState(), CircuitState.OPEN);
  assert.equal(breaker.tripCount, 1);
  assert.ok(stateChangeEvent);
  assert.equal(stateChangeEvent.newState, CircuitState.OPEN);
  assert.equal(stateChangeEvent.oldState, CircuitState.CLOSED);
});

test('StreamingCinemaHubCircuitBreaker - fast-fails when OPEN without invoking target function', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({ threshold: 1, cooldown: 10000 });

  // Trip the breaker
  await assert.rejects(breaker.execute(() => { throw new Error('Trip error'); }));
  assert.equal(breaker.getState(), CircuitState.OPEN);

  let targetInvoked = false;
  await assert.rejects(
    breaker.execute(() => {
      targetInvoked = true;
      return 'should-never-run';
    }),
    (err) => {
      assert.equal(err.code, 'CIRCUIT_OPEN');
      assert.match(err.message, /Circuit breaker is OPEN/);
      return true;
    }
  );

  assert.equal(targetInvoked, false, 'Target function must not be invoked while circuit is OPEN');
  assert.equal(breaker.getMetrics().rejectedRequests, 1);
});

test('StreamingCinemaHubCircuitBreaker - fallback value and function support', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({ threshold: 1, cooldown: 5000 });

  // Fallback value on execution error
  const fallbackVal = await breaker.execute(
    () => { throw new Error('Failed'); },
    'cached-fallback-response'
  );
  assert.equal(fallbackVal, 'cached-fallback-response');
  assert.equal(breaker.getState(), CircuitState.OPEN);

  // Fallback callback function while circuit is OPEN
  const fallbackFnResult = await breaker.execute(
    () => 'wont-execute',
    (err) => ({ fallback: true, errorCause: err.code })
  );
  assert.deepEqual(fallbackFnResult, { fallback: true, errorCause: 'CIRCUIT_OPEN' });
});

test('StreamingCinemaHubCircuitBreaker - request execution timeout enforcement', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({
    threshold: 3,
    timeout: 100
  });

  await assert.rejects(
    breaker.execute(async () => {
      // Simulates hung upstream video segment fetch
      await new Promise(r => setTimeout(r, 300));
      return 'too-late';
    }),
    (err) => {
      assert.equal(err.code, 'EXECUTION_TIMEOUT');
      assert.match(err.message, /timed out after 100ms/);
      return true;
    }
  );

  assert.equal(breaker.getMetrics().timeouts, 1);
  assert.equal(breaker.consecutiveFailures, 1);
});

test('StreamingCinemaHubCircuitBreaker - manual trip() and exponential backoff cooldown', () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({
    cooldownPeriod: 1000,
    backoffMultiplier: 2,
    maxCooldown: 10000
  });

  // 1st trip: exponent 0 -> 1000 * (2^0) = 1000ms
  breaker.trip('1st trip');
  assert.equal(breaker.getState(), CircuitState.OPEN);
  assert.equal(breaker.tripCount, 1);
  assert.equal(breaker.effectiveCooldown, 1000);

  // 2nd trip: exponent 1 -> 1000 * (2^1) = 2000ms
  breaker.trip('2nd trip');
  assert.equal(breaker.tripCount, 2);
  assert.equal(breaker.effectiveCooldown, 2000);

  // 3rd trip: exponent 2 -> 1000 * (2^2) = 4000ms
  breaker.trip('3rd trip');
  assert.equal(breaker.tripCount, 3);
  assert.equal(breaker.effectiveCooldown, 4000);
});

test('StreamingCinemaHubCircuitBreaker - transitions from OPEN to HALF_OPEN after cooldown', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({
    threshold: 1,
    cooldownPeriod: 60
  });

  breaker.trip('Trip for cooldown test');
  assert.equal(breaker.state, CircuitState.OPEN);

  // Before cooldown expires
  assert.equal(breaker.getState(), CircuitState.OPEN);

  // Wait for cooldown to elapse
  await new Promise(r => setTimeout(r, 80));

  assert.equal(breaker.getState(), CircuitState.HALF_OPEN);
});

test('StreamingCinemaHubCircuitBreaker - HALF_OPEN trial executions recover circuit to CLOSED', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({
    threshold: 1,
    cooldownPeriod: 50,
    halfOpenTrials: 2
  });

  breaker.trip();
  await new Promise(r => setTimeout(r, 60));
  assert.equal(breaker.getState(), CircuitState.HALF_OPEN);

  // 1st trial success
  const trial1 = await breaker.execute(() => 'trial-1-success');
  assert.equal(trial1, 'trial-1-success');
  assert.equal(breaker.getState(), CircuitState.HALF_OPEN);
  assert.equal(breaker.halfOpenSuccesses, 1);

  // 2nd trial success reaches threshold (2) -> recovers to CLOSED
  const trial2 = await breaker.execute(() => 'trial-2-success');
  assert.equal(trial2, 'trial-2-success');
  assert.equal(breaker.getState(), CircuitState.CLOSED);
  assert.equal(breaker.tripCount, 0);
  assert.equal(breaker.consecutiveFailures, 0);
});

test('StreamingCinemaHubCircuitBreaker - failed trial in HALF_OPEN immediately re-trips to OPEN', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({
    threshold: 1,
    cooldownPeriod: 50,
    halfOpenTrials: 2
  });

  breaker.trip();
  await new Promise(r => setTimeout(r, 60));
  assert.equal(breaker.getState(), CircuitState.HALF_OPEN);

  // Failed trial
  await assert.rejects(
    breaker.execute(() => { throw new Error('Trial probe failed'); }),
    /Trial probe failed/
  );

  assert.equal(breaker.state, CircuitState.OPEN);
  assert.equal(breaker.tripCount, 2);
});

test('StreamingCinemaHubCircuitBreaker - resetTimeout() resets cooldown and allows immediate trial', () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({
    cooldownPeriod: 100000,
    requestTimeout: 2000
  });

  breaker.trip();
  assert.equal(breaker.state, CircuitState.OPEN);

  // Calling resetTimeout with new timeout value
  const resetRes = breaker.resetTimeout(500);
  assert.equal(resetRes.requestTimeout, 500);
  assert.equal(breaker.getState(), CircuitState.HALF_OPEN);
});

test('StreamingCinemaHubCircuitBreaker - reset() fully restores initial healthy state', () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({ threshold: 2 });

  breaker.trip();
  assert.equal(breaker.state, CircuitState.OPEN);
  assert.equal(breaker.tripCount, 1);

  breaker.reset();
  assert.equal(breaker.getState(), CircuitState.CLOSED);
  assert.equal(breaker.tripCount, 0);
  assert.equal(breaker.consecutiveFailures, 0);
  assert.equal(breaker.consecutiveSuccesses, 0);
});

test('StreamingCinemaHubCircuitBreaker - event emitter and state change telemetry', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({ threshold: 2, cooldown: 500 });
  const events = [];

  breaker.on('stateChange', ev => events.push(ev));
  breaker.on('trip', ev => events.push(ev));

  breaker.trip('Manual test trip');

  assert.ok(events.some(e => e.type === 'CIRCUIT_TRIPPED'));
  assert.ok(events.some(e => e.type === 'STATE_CHANGE' && e.newState === CircuitState.OPEN));
});

test('StreamingCinemaHubCircuitBreaker - comprehensive telemetry metrics tracking', async () => {
  const breaker = new StreamingCinemaHubCircuitBreaker({ threshold: 2, cooldown: 1000 });

  // 1 successful request
  await breaker.execute(() => 'success');

  // 1 failed request
  await assert.rejects(breaker.execute(() => { throw new Error('err'); }));

  // 2nd failed request trips breaker
  await assert.rejects(breaker.execute(() => { throw new Error('err'); }));

  // 1 rejected request while OPEN
  await assert.rejects(breaker.execute(() => 'blocked'));

  const metrics = breaker.getMetrics();
  assert.equal(metrics.totalRequests, 4);
  assert.equal(metrics.successfulRequests, 1);
  assert.equal(metrics.failedRequests, 2);
  assert.equal(metrics.rejectedRequests, 1);
  assert.equal(metrics.trips, 1);

  const status = breaker.getStatus();
  assert.equal(status.state, CircuitState.OPEN);
  assert.ok(status.remainingCooldown > 0);
  assert.equal(status.consecutiveFailures, 2);
});

