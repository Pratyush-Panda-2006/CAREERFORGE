import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioSocketEmulator } from './mock-websocket.js';

describe('DeveloperPortfolioSocketEmulator (Issue #1042)', () => {
  it('initializes with default telemetry endpoint and disconnected state', () => {
    const socket = new DeveloperPortfolioSocketEmulator();
    assert.equal(socket.endpoint, 'wss://telemetry.developerportfolio.dev/v1/stream');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new DeveloperPortfolioSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new DeveloperPortfolioSocketEmulator();
    socket.connect();

    const commitEvents = [];
    const visitorEvents = [];

    const unsubCommits = socket.subscribe('github/commits', (pkt) => {
      commitEvents.push(pkt);
    });

    socket.subscribe('portfolio/visitors', (pkt) => {
      visitorEvents.push(pkt);
    });

    socket.publish('github/commits', { repo: 'careerforge', sha: 'a1b2c3d', message: 'feat: add socket' });
    socket.publish('portfolio/visitors', { ipHash: 'xyz99', page: '/projects', referrer: 'github' });

    assert.equal(commitEvents.length, 1);
    assert.equal(visitorEvents.length, 1);
    assert.equal(commitEvents[0].payload.sha, 'a1b2c3d');

    // Unsubscribe commits and publish again
    unsubCommits();
    socket.publish('github/commits', { repo: 'careerforge', sha: 'e4f5g6h' });
    assert.equal(commitEvents.length, 1); // Not incremented

    socket.disconnect();
  });

  it('tracks dropped packets when publishing in disconnected state', () => {
    const socket = new DeveloperPortfolioSocketEmulator();
    const sent = socket.publish('ci/deployments', { status: 'success' });
    assert.equal(sent, false);
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry updates and latency calculations', () => {
    const socket = new DeveloperPortfolioSocketEmulator({ heartbeatIntervalMs: 0 });
    socket.connect();
    assert.equal(socket.metrics.heartbeatsCompleted, 0);

    socket.simulateHeartbeat();
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    assert.ok(socket.metrics.lastLatencyMs >= 8 && socket.metrics.lastLatencyMs <= 24);
    socket.disconnect();
  });

  it('simulates connection dropout and reconnection backoff transitions', async () => {
    const socket = new DeveloperPortfolioSocketEmulator({ heartbeatIntervalMs: 0 });
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
    const socket = new DeveloperPortfolioSocketEmulator();
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
