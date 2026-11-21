import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadSocketEmulator } from './mock-websocket.js';

describe('SaasLaunchpadSocketEmulator (Issue #1038)', () => {
  it('initializes with default endpoint and disconnected state', () => {
    const socket = new SaasLaunchpadSocketEmulator();
    assert.equal(socket.endpoint, 'wss://stream.saaslaunchpad.io/v2/events');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new SaasLaunchpadSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new SaasLaunchpadSocketEmulator();
    socket.connect();

    const clusterEvents = [];
    const trafficEvents = [];

    const unsubCluster = socket.subscribe('cluster/events', (pkt) => {
      clusterEvents.push(pkt);
    });

    socket.subscribe('ingress/traffic', (pkt) => {
      trafficEvents.push(pkt);
    });

    socket.publish('cluster/events', { node: 'node-01', status: 'online' });
    socket.publish('ingress/traffic', { rps: 12000 });

    assert.equal(clusterEvents.length, 1);
    assert.equal(trafficEvents.length, 1);
    assert.equal(clusterEvents[0].payload.node, 'node-01');

    // Unsubscribe cluster
    unsubCluster();
    socket.publish('cluster/events', { node: 'node-02', status: 'draining' });
    assert.equal(clusterEvents.length, 1); // Unsubscribed handler did not receive

    socket.disconnect();
  });

  it('drops packets gracefully and increments dropped counter when socket disconnected', () => {
    const socket = new SaasLaunchpadSocketEmulator();
    assert.equal(socket.state, 'DISCONNECTED');

    const res = socket.publish('cluster/nodes', { ping: true });
    assert.equal(res.success, false);
    assert.equal(res.reason, 'Socket not connected');
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat ping-pong latency calculation', () => {
    const socket = new SaasLaunchpadSocketEmulator();
    socket.connect();

    const pong = socket.simulateHeartbeat();
    assert.ok(pong);
    assert.equal(pong.type, 'heartbeat_pong');
    assert.ok(pong.latencyMs >= 10 && pong.latencyMs <= 30);
    assert.equal(socket.metrics.heartbeatsCompleted, 1);

    socket.disconnect();
  });

  it('simulates dropout and automatic fault-tolerant reconnection', async () => {
    const socket = new SaasLaunchpadSocketEmulator({ maxReconnectAttempts: 3 });
    socket.connect();

    const dropoutPromise = socket.simulateDropout(50);
    assert.equal(socket.state, 'RECONNECTING');
    assert.equal(socket.metrics.reconnectCount, 1);

    const result = await dropoutPromise;
    assert.equal(result.success, true);
    assert.equal(result.reconnected, true);
    assert.equal(socket.state, 'CONNECTED');

    socket.disconnect();
  });

  it('provides comprehensive streaming telemetry metrics report', () => {
    const socket = new SaasLaunchpadSocketEmulator();
    socket.connect();
    socket.subscribe('k8s/pods', () => {});
    socket.subscribe('k8s/services', () => {});
    socket.publish('k8s/pods', { id: 'pod-1' });

    const m = socket.getMetrics();
    assert.equal(m.state, 'CONNECTED');
    assert.equal(m.activeChannels.length, 2);
    assert.equal(m.packetsSent, 1);
    assert.equal(m.packetsReceived, 1);

    socket.disconnect();
  });
});
