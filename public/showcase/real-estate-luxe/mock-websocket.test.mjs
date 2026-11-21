import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeSocketEmulator } from './mock-websocket.js';

describe('RealEstateLuxeSocketEmulator (Issue #1054)', () => {
  it('initializes with default endpoint and disconnected state', () => {
    const socket = new RealEstateLuxeSocketEmulator();
    assert.equal(socket.endpoint, 'wss://stream.realestateluxe.com/v1/auctions');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new RealEstateLuxeSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new RealEstateLuxeSocketEmulator();
    socket.connect();

    const bidEvents = [];
    const viewerEvents = [];

    const unsubBids = socket.subscribe('auction/bids', (pkt) => {
      bidEvents.push(pkt);
    });

    socket.subscribe('tours/live-viewers', (pkt) => {
      viewerEvents.push(pkt);
    });

    socket.publish('auction/bids', { estateId: 'est_1054', bidder: 'Investor_4', bid: 6500000 });
    socket.publish('tours/live-viewers', { estateId: 'est_1054', activeCount: 42 });

    assert.equal(bidEvents.length, 1);
    assert.equal(viewerEvents.length, 1);
    assert.equal(bidEvents[0].payload.bid, 6500000);

    // Unsubscribe bids and publish again
    unsubBids();
    socket.publish('auction/bids', { estateId: 'est_1054', bidder: 'Investor_9', bid: 6600000 });
    assert.equal(bidEvents.length, 1); // Not incremented

    socket.disconnect();
  });

  it('tracks dropped packets when publishing in disconnected state', () => {
    const socket = new RealEstateLuxeSocketEmulator();
    const sent = socket.publish('market/valuation-feed', { capRate: 0.052 });
    assert.equal(sent, false);
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry updates and latency calculations', () => {
    const socket = new RealEstateLuxeSocketEmulator({ heartbeatIntervalMs: 0 });
    socket.connect();
    assert.equal(socket.metrics.heartbeatsCompleted, 0);

    socket.simulateHeartbeat();
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    assert.ok(socket.metrics.lastLatencyMs >= 10 && socket.metrics.lastLatencyMs <= 26);
    socket.disconnect();
  });

  it('simulates connection dropout and reconnection backoff transitions', async () => {
    const socket = new RealEstateLuxeSocketEmulator({ heartbeatIntervalMs: 0 });
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
    const socket = new RealEstateLuxeSocketEmulator();
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
