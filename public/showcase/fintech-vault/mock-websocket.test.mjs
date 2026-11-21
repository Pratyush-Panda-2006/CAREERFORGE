import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultSocketEmulator } from './mock-websocket.js';

describe('FintechVaultSocketEmulator (Issue #1058)', () => {
  it('initializes with default endpoint and disconnected state', () => {
    const socket = new FintechVaultSocketEmulator();
    assert.equal(socket.endpoint, 'wss://stream.fintechvault.io/v1/ledger');
    assert.equal(socket.state, 'DISCONNECTED');
    assert.equal(socket.metrics.packetsSent, 0);
  });

  it('connects and transitions state to CONNECTED with active heartbeat', () => {
    const socket = new FintechVaultSocketEmulator({ heartbeatIntervalMs: 1000 });
    const success = socket.connect();
    assert.ok(success);
    assert.equal(socket.state, 'CONNECTED');
    assert.ok(socket.metrics.connectedAt > 0);
    socket.disconnect();
    assert.equal(socket.state, 'DISCONNECTED');
  });

  it('handles multi-channel pub/sub multiplexing and clean unsubscription', () => {
    const socket = new FintechVaultSocketEmulator();
    socket.connect();

    const settlementEvents = [];
    const multiSigEvents = [];

    const unsubSettlements = socket.subscribe('ledger/settlements', (pkt) => {
      settlementEvents.push(pkt);
    });

    socket.subscribe('vault/multisig', (pkt) => {
      multiSigEvents.push(pkt);
    });

    socket.publish('ledger/settlements', { txId: 'tx_1058', amount: 150000, asset: 'USDC' });
    socket.publish('vault/multisig', { vaultId: 'vlt_01', approvals: 3 });

    assert.equal(settlementEvents.length, 1);
    assert.equal(multiSigEvents.length, 1);
    assert.equal(settlementEvents[0].payload.asset, 'USDC');

    // Unsubscribe settlements and publish again
    unsubSettlements();
    socket.publish('ledger/settlements', { txId: 'tx_1059', amount: 50000 });
    assert.equal(settlementEvents.length, 1); // Not incremented

    socket.disconnect();
  });

  it('tracks dropped packets when publishing in disconnected state', () => {
    const socket = new FintechVaultSocketEmulator();
    const sent = socket.publish('forex/rates', { pair: 'EUR/USD', rate: 1.085 });
    assert.equal(sent, false);
    assert.equal(socket.metrics.packetsDropped, 1);
  });

  it('simulates heartbeat telemetry updates and latency calculations', () => {
    const socket = new FintechVaultSocketEmulator({ heartbeatIntervalMs: 0 });
    socket.connect();
    assert.equal(socket.metrics.heartbeatsCompleted, 0);

    socket.simulateHeartbeat();
    assert.equal(socket.metrics.heartbeatsCompleted, 1);
    assert.ok(socket.metrics.lastLatencyMs >= 8 && socket.metrics.lastLatencyMs <= 24);
    socket.disconnect();
  });

  it('simulates connection dropout and reconnection backoff transitions', async () => {
    const socket = new FintechVaultSocketEmulator({ heartbeatIntervalMs: 0 });
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
    const socket = new FintechVaultSocketEmulator();
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
