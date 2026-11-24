import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingStatusIndicator } from './status-badge.js';

test('AgritechPrecisionFarmingStatusIndicator - sets valid states and rejects invalid ones', () => {
  const indicator = new AgritechPrecisionFarmingStatusIndicator('operational');
  assert.equal(indicator.state, 'operational');

  indicator.setStatus('degraded');
  assert.equal(indicator.state, 'degraded');

  indicator.setStatus('maintenance');
  assert.equal(indicator.state, 'maintenance');

  assert.throws(() => indicator.setStatus('unknown-state'), /Invalid state/);
});

test('AgritechPrecisionFarmingStatusIndicator - records pings accurately with timestamp and state', () => {
  const indicator = new AgritechPrecisionFarmingStatusIndicator('operational');
  const entry = indicator.recordPing(45);

  assert.equal(entry.latencyMs, 45);
  assert.equal(entry.state, 'operational');
  assert.ok(typeof entry.timestamp === 'number');

  assert.throws(() => indicator.recordPing(-10), TypeError);
  assert.throws(() => indicator.recordPing('fast'), TypeError);
});

test('AgritechPrecisionFarmingStatusIndicator - computes uptime statistics correctly', () => {
  const indicator = new AgritechPrecisionFarmingStatusIndicator('operational');

  // Record 3 operational pings: 20ms, 30ms, 40ms
  indicator.recordPing(20);
  indicator.recordPing(30);
  indicator.recordPing(40);

  // Switch to degraded and record 1 ping: 110ms
  indicator.setStatus('degraded');
  indicator.recordPing(110);

  const stats = indicator.getUptimeStats();
  assert.equal(stats.totalPings, 4);
  assert.equal(stats.averageLatencyMs, 50);
  assert.equal(stats.minLatencyMs, 20);
  assert.equal(stats.maxLatencyMs, 110);
  assert.equal(stats.uptimePercentage, 75.0); // 3 of 4 operational
});

test('AgritechPrecisionFarmingStatusIndicator - returns default stats when no pings recorded', () => {
  const indicator = new AgritechPrecisionFarmingStatusIndicator('operational');
  const stats = indicator.getUptimeStats();

  assert.equal(stats.totalPings, 0);
  assert.equal(stats.averageLatencyMs, 0);
  assert.equal(stats.uptimePercentage, 100);
});
