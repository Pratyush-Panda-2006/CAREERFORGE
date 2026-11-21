import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroSocketEmulator } from './mock-websocket.js';

describe('CulinaryBistroSocketEmulator (Issue #1050)', () => {
  it('initializes with default endpoint and disconnected state', () => {
    const socket = new CulinaryBistroSocketEmulator();
    assert.equal(socket.endpoint, 'wss://stream.culinarybistro.internal/v1/kitchen');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new CulinaryBistroSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new CulinaryBistroSocketEmulator();
    socket.connect();

    const ticketEvents = [];
    const floorEvents = [];

    const unsubTickets = socket.subscribe('kitchen/tickets', (pkt) => {
      ticketEvents.push(pkt);
    });

    socket.subscribe('floor/tables', (pkt) => {
      floorEvents.push(pkt);
    });

    socket.publish('kitchen/tickets', { orderId: 'ord_1050', table: 5, dish: 'Risotto' });
    socket.publish('floor/tables', { table: 5, status: 'OCCUPIED' });

    assert.equal(ticketEvents.length, 1);
    assert.equal(floorEvents.length, 1);
    assert.equal(ticketEvents[0].payload.dish, 'Risotto');

    // Unsubscribe tickets and publish again
    unsubTickets();
    socket.publish('kitchen/tickets', { orderId: 'ord_1051', table: 2 });
    assert.equal(ticketEvents.length, 1); // Not incremented

    socket.disconnect();
  });

  it('tracks dropped packets when publishing in disconnected state', () => {
    const socket = new CulinaryBistroSocketEmulator();
    const sent = socket.publish('bar/cocktails', { cocktail: 'Negroni' });
    assert.equal(sent, false);
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry updates and latency calculations', () => {
    const socket = new CulinaryBistroSocketEmulator({ heartbeatIntervalMs: 0 });
    socket.connect();
    assert.equal(socket.metrics.heartbeatsCompleted, 0);

    socket.simulateHeartbeat();
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    assert.ok(socket.metrics.lastLatencyMs >= 9 && socket.metrics.lastLatencyMs <= 25);
    socket.disconnect();
  });

  it('simulates connection dropout and reconnection backoff transitions', async () => {
    const socket = new CulinaryBistroSocketEmulator({ heartbeatIntervalMs: 0 });
    socket.connect();
    assert.equal(socket.state, 'CONNECTED');

    socket.simulateDropout(50);
    assert.equal(socket.state, 'RECONNECTING');
    assert.equal(socket.metrics.reconnectCount, 1);

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(socket.state, 'CONNECTED');
    socket.disconnect();
  });

  it('validates handler type during subscription and handles callback exceptions gracefully', () => {
    const socket = new CulinaryBistroSocketEmulator();
    socket.connect();

    assert.throws(() => {
      socket.subscribe('invalid/channel', null);
    }, TypeError);

    // Faulty subscriber that throws
    socket.subscribe('error/test', () => {
      throw new Error('Simulation fault');
    });

    const published = socket.publish('error/test', { test: true });
    assert.ok(published);
    assert.equal(socket.metrics.packetsDropped, 1);

    socket.disconnect();
  });
});
