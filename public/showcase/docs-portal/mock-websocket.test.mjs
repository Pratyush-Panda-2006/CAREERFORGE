import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalSocketEmulator } from './mock-websocket.js';

describe('DocsPortalSocketEmulator (Issue #1046)', () => {
  it('initializes with default endpoint and disconnected state', () => {
    const socket = new DocsPortalSocketEmulator();
    assert.equal(socket.endpoint, 'wss://telemetry.docsportal.internal/v1/stream');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new DocsPortalSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new DocsPortalSocketEmulator();
    socket.connect();

    const indexEvents = [];
    const presenceEvents = [];

    const unsubIndex = socket.subscribe('docs/index-updates', (pkt) => {
      indexEvents.push(pkt);
    });

    socket.subscribe('users/presence', (pkt) => {
      presenceEvents.push(pkt);
    });

    socket.publish('docs/index-updates', { docId: 'api-guide', version: '2.4.0', status: 'INDEXED' });
    socket.publish('users/presence', { userId: 'usr_781', activeDoc: 'api-guide' });

    assert.equal(indexEvents.length, 1);
    assert.equal(presenceEvents.length, 1);
    assert.equal(indexEvents[0].payload.version, '2.4.0');

    // Unsubscribe index and publish again
    unsubIndex();
    socket.publish('docs/index-updates', { docId: 'cli-ref', version: '1.0.0' });
    assert.equal(indexEvents.length, 1); // Not incremented

    socket.disconnect();
  });

  it('tracks dropped packets when publishing in disconnected state', () => {
    const socket = new DocsPortalSocketEmulator();
    const sent = socket.publish('feedback/ratings', { rating: 5 });
    assert.equal(sent, false);
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry updates and latency calculations', () => {
    const socket = new DocsPortalSocketEmulator({ heartbeatIntervalMs: 0 });
    socket.connect();
    assert.equal(socket.metrics.heartbeatsCompleted, 0);

    socket.simulateHeartbeat();
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    assert.ok(socket.metrics.lastLatencyMs >= 10 && socket.metrics.lastLatencyMs <= 25);
    socket.disconnect();
  });

  it('simulates connection dropout and reconnection backoff transitions', async () => {
    const socket = new DocsPortalSocketEmulator({ heartbeatIntervalMs: 0 });
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
    const socket = new DocsPortalSocketEmulator();
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
