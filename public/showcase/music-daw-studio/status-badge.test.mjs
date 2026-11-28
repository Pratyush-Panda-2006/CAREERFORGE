import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MusicDawStudioStatusIndicator } from './status-badge.js';

test('pings move the state between operational and degraded', () => {
  const indicator = new MusicDawStudioStatusIndicator({ slowMs: 100 });
  assert.equal(indicator.recordPing(101), 'degraded');
  assert.equal(indicator.recordPing(100), 'operational');
  assert.equal(indicator.recordPing(null), 'degraded');
});

test('pings do not end maintenance', () => {
  const indicator = new MusicDawStudioStatusIndicator();
  indicator.setStatus('maintenance');
  assert.equal(indicator.recordPing(10), 'maintenance');
});

test('rejects unknown states and bad latencies', () => {
  const indicator = new MusicDawStudioStatusIndicator();
  assert.throws(() => indicator.setStatus('broken'), RangeError);
  for (const bad of [-1, NaN, undefined, '5']) assert.throws(() => indicator.recordPing(bad), RangeError);
  assert.equal(indicator.getUptimeStats().total, 0);
});

test('reports uptime and latency over the recent history', () => {
  const indicator = new MusicDawStudioStatusIndicator({ historySize: 3 });
  assert.deepEqual(indicator.getUptimeStats(), { total: 0, uptime: null, lastLatency: null, averageLatency: null });
  for (const latency of [999, 10, 20, null]) indicator.recordPing(latency);
  assert.deepEqual(indicator.getUptimeStats(), { total: 3, uptime: 66.7, lastLatency: null, averageLatency: 15 });
});
