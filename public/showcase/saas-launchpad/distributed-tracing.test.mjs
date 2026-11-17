import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedTracingEngine } from './distributed-tracing.js';

describe('DistributedTracingEngine', () => {
  const engine = new DistributedTracingEngine();

  it('should load default traces correctly', () => {
    const traces = engine.getAllTraces();
    assert.ok(traces.length >= 2);
    const trace = engine.getTrace('trace-8f4a21c9');
    assert.ok(trace);
    assert.equal(trace.spans.length, 6);
  });

  it('should calculate primary bottleneck service and duration percentage', () => {
    const bottleneck = engine.calculateBottleneck('trace-8f4a21c9');
    assert.equal(bottleneck.service, 'billing-engine');
    assert.ok(bottleneck.percentage > 50);
  });

  it('should filter spans based on service name or operation keyword', () => {
    const redisSpans = engine.filterSpans('trace-8f4a21c9', 'redis');
    assert.equal(redisSpans.length, 1);
    assert.equal(redisSpans[0].service, 'redis-cache');

    const allSpans = engine.filterSpans('trace-8f4a21c9', '');
    assert.equal(allSpans.length, 6);
  });

  it('should extract critical path spans accurately', () => {
    const criticalPath = engine.calculateCriticalPath('trace-8f4a21c9');
    assert.ok(criticalPath.length > 0);
    assert.ok(criticalPath.every(s => s.isCritical));
  });

  it('should export formatted JSON representation of the trace waterfall', () => {
    const json = engine.exportTraceJSON('trace-8f4a21c9');
    assert.ok(json.includes('Checkout Payment Authorization Flow'));
    const parsed = JSON.parse(json);
    assert.equal(parsed.id, 'trace-8f4a21c9');
  });
});
