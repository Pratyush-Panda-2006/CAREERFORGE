import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeAuditChain, computeAuditHash } from './audit-trail.js';

describe('QuantumForgeAuditChain', () => {
  it('computes deterministic hashes from input strings', () => {
    const hash1 = computeAuditHash('quantum-circuit-gate-1');
    const hash2 = computeAuditHash('quantum-circuit-gate-1');
    const hash3 = computeAuditHash('quantum-circuit-gate-2');

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
  });

  it('initializes with a valid genesis quantum circuit root block', () => {
    const chain = new QuantumForgeAuditChain({ storageKey: 'test_quantum_audit_chain_1' });
    const blocks = chain.getChain();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].index, 0);
    assert.equal(blocks[0].action, 'GENESIS_QUANTUM_CIRCUIT_ROOT');
    assert.ok(blocks[0].hash.length > 0);

    const verification = chain.verifyChainIntegrity();
    assert.equal(verification.isValid, true);
    assert.equal(verification.blockCount, 1);
  });

  it('records quantum state mutations and chains hashes sequentially', () => {
    const chain = new QuantumForgeAuditChain({ storageKey: 'test_quantum_audit_chain_2' });
    const block1 = chain.recordEvent('HADAMARD_GATE_APPLIED', { qubit: 0, phase: 'pi/2' });
    const block2 = chain.recordEvent('CNOT_ENTANGLEMENT', { control: 0, target: 1 });

    const blocks = chain.getChain();
    assert.equal(blocks.length, 3);
    assert.equal(block1.index, 1);
    assert.equal(block2.index, 2);
    assert.equal(block1.previousHash, blocks[0].hash);
    assert.equal(block2.previousHash, block1.hash);

    const integrity = chain.verifyChainIntegrity();
    assert.equal(integrity.isValid, true);
    assert.equal(integrity.blockCount, 3);
  });

  it('detects tampering when state parameters or hash is corrupted', () => {
    const chain = new QuantumForgeAuditChain({ storageKey: 'test_quantum_audit_chain_3' });
    chain.recordEvent('PHASE_SHIFT', { angle: 0.785 });
    chain.recordEvent('MEASUREMENT_COLLAPSE', { outcome: '|1>' });

    assert.equal(chain.verifyChainIntegrity().isValid, true);

    // Tamper with intermediate block
    chain.chain[1].payload = { angle: 0.999, forged: true };
    const checkTampered = chain.verifyChainIntegrity();
    assert.equal(checkTampered.isValid, false);
    assert.equal(checkTampered.brokenBlockIndex, 1);
  });

  it('exports formatted audit trail JSON', () => {
    const chain = new QuantumForgeAuditChain({ storageKey: 'test_quantum_audit_chain_4' });
    chain.recordEvent('DECOHERENCE_CHECK', { t2TimeNs: 120 });

    const logJson = chain.exportAuditLog();
    const parsed = JSON.parse(logJson);
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.integrity.isValid, true);
    assert.equal(parsed.chain.length, 2);
  });
});
