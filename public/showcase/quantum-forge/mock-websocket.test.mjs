import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeSocketEmulator } from './mock-websocket.js';

describe('QuantumForgeSocketEmulator (Issue #1110)', () => {
  it('initializes with default endpoint and disconnected state', () => {
    const socket = new QuantumForgeSocketEmulator();
    assert.equal(socket.endpoint, 'wss://stream.quantum-forge.internal/v1/telemetry');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new QuantumForgeSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new QuantumForgeSocketEmulator();
    socket.connect();

    const channel1Events = [];
    const chName = 'telemetry/qubit-state';

    const unsub = socket.subscribe(chName, (pkt) => {
      channel1Events.push(pkt);
    });

    socket.publish(chName, { eventId: 'ev_1062', status: 'OK' });
    assert.equal(channel1Events.length, 1);
    assert.equal(channel1Events[0].payload.eventId, 'ev_1062');

    unsub();
    socket.publish(chName, { eventId: 'ev_1063', status: 'OK' });
    assert.equal(channel1Events.length, 1);

    socket.disconnect();
  });

  it('tracks dropped packets when publishing in disconnected state', () => {
    const socket = new QuantumForgeSocketEmulator();
    const sent = socket.publish('test/channel', { test: true });
    assert.equal(sent, false);
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry updates and latency calculations', () => {
    const socket = new QuantumForgeSocketEmulator();
    socket.connect();
    assert.ok(socket.simulateHeartbeat());
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    assert.ok(socket.metrics.lastLatencyMs >= 8);
    socket.disconnect();
  });
});
