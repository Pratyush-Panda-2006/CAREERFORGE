import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeAnalyticsEngine } from './analytics-telemetry.js';

test('QuantumForgeAnalyticsEngine scrubs PII emails and passwords', () => {
  const engine = new QuantumForgeAnalyticsEngine();
  const rawPayload = {
    physicistEmail: 'dirac@quantum-forge.dev',
    apiKey: 'qbit-superconducting-key-99',
    phone: '+1 617-555-0143',
    circuitId: 'Grover-Search-8Qubit'
  };

  const event = engine.trackEvent('quantum_circuit_dispatch', rawPayload);
  assert.equal(event.data.physicistEmail, '[REDACTED_EMAIL]');
  assert.equal(event.data.apiKey, '[REDACTED_CREDENTIAL]');
  assert.equal(event.data.phone, '[REDACTED_PHONE]');
  assert.equal(event.data.circuitId, 'Grover-Search-8Qubit');
});

test('clamps scroll depth percentage strictly within [0, 100]', () => {
  const engine = new QuantumForgeAnalyticsEngine();
  assert.equal(engine.getScrollDepthPercentage(), 0);

  // Scroll halfway
  engine.updateScrollDepth(450, 1900, 1000);
  assert.equal(engine.getScrollDepthPercentage(), 50);

  // Scroll overshoot
  engine.updateScrollDepth(2500, 1900, 1000);
  assert.equal(engine.getScrollDepthPercentage(), 100);
});

test('computes clamped session duration without negative values', () => {
  const start = 1700000000000;
  const engine = new QuantumForgeAnalyticsEngine({ startTime: start });

  assert.equal(engine.computeSessionDuration(start + 6500), 6500);
  assert.equal(engine.computeSessionDuration(start - 800), 0);
});

test('exports serialized telemetry report containing all tracked interaction events', () => {
  const engine = new QuantumForgeAnalyticsEngine();
  engine.trackEvent('qubit_fidelity_check', { fidelity: 0.9984, decoherenceUs: 125 });
  engine.recordClick('button#run-qasm');

  const report = engine.exportReportJSON();
  const parsed = JSON.parse(report);

  assert.equal(parsed.totalEventsTracked, 2);
  assert.equal(parsed.totalClicksRecorded, 1);
  assert.equal(parsed.events[0].name, 'qubit_fidelity_check');
  assert.equal(parsed.events[1].data.target, 'button#run-qasm');
});
