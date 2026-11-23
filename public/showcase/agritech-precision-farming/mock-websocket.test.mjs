import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingSocketEmulator } from './mock-websocket.js';

describe('AgritechPrecisionFarmingSocketEmulator', () => {
  it('connects and transitions to CONNECTED', () => {
    const socket = new AgritechPrecisionFarmingSocketEmulator();
    assert.equal(socket.state, 'DISCONNECTED');
    socket.connect();
    assert.equal(socket.state, 'CONNECTED');
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('publishes and receives messages on subscribed channel', () => {
    const socket = new AgritechPrecisionFarmingSocketEmulator();
    socket.connect();
    const received = [];
    const unsub = socket.subscribe('telemetry/soil-irrigation', (pkt) => received.push(pkt));
    socket.publish('telemetry/soil-irrigation', { ok: true });
    assert.equal(received.length, 1);
    unsub();
    socket.publish('telemetry/soil-irrigation', { ok: false });
    assert.equal(received.length, 1);
    socket.disconnect();
  });

  it('tracks dropped packets when disconnected', () => {
    const socket = new AgritechPrecisionFarmingSocketEmulator();
    socket.publish('ch', { test: 1 });
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry', () => {
    const socket = new AgritechPrecisionFarmingSocketEmulator();
    socket.connect();
    assert.ok(socket.simulateHeartbeat());
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    socket.disconnect();
  });
});
