import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsSocketEmulator } from './mock-websocket.js';

describe('LegalSmartContractsSocketEmulator', () => {
  it('connects and transitions to CONNECTED', () => {
    const socket = new LegalSmartContractsSocketEmulator();
    assert.equal(socket.state, 'DISCONNECTED');
    socket.connect();
    assert.equal(socket.state, 'CONNECTED');
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('publishes and receives messages on subscribed channel', () => {
    const socket = new LegalSmartContractsSocketEmulator();
    socket.connect();
    const received = [];
    const unsub = socket.subscribe('telemetry/mempool-blocks', (pkt) => received.push(pkt));
    socket.publish('telemetry/mempool-blocks', { ok: true });
    assert.equal(received.length, 1);
    unsub();
    socket.publish('telemetry/mempool-blocks', { ok: false });
    assert.equal(received.length, 1);
    socket.disconnect();
  });

  it('tracks dropped packets when disconnected', () => {
    const socket = new LegalSmartContractsSocketEmulator();
    socket.publish('ch', { test: 1 });
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry', () => {
    const socket = new LegalSmartContractsSocketEmulator();
    socket.connect();
    assert.ok(socket.simulateHeartbeat());
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    socket.disconnect();
  });
});
