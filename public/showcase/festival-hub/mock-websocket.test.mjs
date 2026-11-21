import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubSocketEmulator } from './mock-websocket.js';

describe('FestivalHubSocketEmulator (Issue #1034)', () => {
  it('initializes with default endpoint and disconnected state', () => {
    const socket = new FestivalHubSocketEmulator();
    assert.equal(socket.endpoint, 'wss://stream.festivalhub.live/v1/telemetry');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new FestivalHubSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new FestivalHubSocketEmulator();
    socket.connect();

    const audioMessages = [];
    const lightingMessages = [];

    const unsubAudio = socket.subscribe('stage/audio', (pkt) => {
      audioMessages.push(pkt);
    });

    socket.subscribe('stage/lighting', (pkt) => {
      lightingMessages.push(pkt);
    });

    socket.publish('stage/audio', { db: -3.5 });
    socket.publish('stage/lighting', { cue: 'STROBE_ALL' });

    assert.equal(audioMessages.length, 1);
    assert.equal(lightingMessages.length, 1);
    assert.equal(audioMessages[0].payload.db, -3.5);

    // Unsubscribe audio
    unsubAudio();
    socket.publish('stage/audio', { db: -10 });
    assert.equal(audioMessages.length, 1); // Not delivered to unsubscribed handler

    socket.disconnect();
  });

  it('drops packets gracefully and increments dropped counter when socket disconnected', () => {
    const socket = new FestivalHubSocketEmulator();
    assert.equal(socket.state, 'DISCONNECTED');

    const res = socket.publish('stage/test', { data: 123 });
    assert.equal(res.success, false);
    assert.equal(res.reason, 'Socket not connected');
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat ping-pong latency calculation', () => {
    const socket = new FestivalHubSocketEmulator();
    socket.connect();

    const pong = socket.simulateHeartbeat();
    assert.ok(pong);
    assert.equal(pong.type, 'heartbeat_pong');
    assert.ok(pong.latencyMs >= 12 && pong.latencyMs <= 35);
    assert.equal(socket.metrics.heartbeatsCompleted, 1);

    socket.disconnect();
  });

  it('simulates dropout and automatic fault-tolerant reconnection', async () => {
    const socket = new FestivalHubSocketEmulator({ maxReconnectAttempts: 3 });
    socket.connect();

    // Trigger fast 50ms dropout
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
    const socket = new FestivalHubSocketEmulator();
    socket.connect();
    socket.subscribe('topic/a', () => {});
    socket.subscribe('topic/b', () => {});
    socket.publish('topic/a', { val: 1 });

    const m = socket.getMetrics();
    assert.equal(m.state, 'CONNECTED');
    assert.equal(m.activeChannels.length, 2);
    assert.equal(m.packetsSent, 1);
    assert.equal(m.packetsReceived, 1);

    socket.disconnect();
  });
});
