import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dAuditChain } from './audit-trail.js';

test('VirtualMuseum3dAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new VirtualMuseum3dAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('VirtualMuseum3dAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new VirtualMuseum3dAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('ARTIFACT_3D_SCAN_INGEST', { val: 42 });
  const b2 = chain.recordEvent('MESH_LOD_OPTIMIZE', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('VirtualMuseum3dAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new VirtualMuseum3dAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('ARTIFACT_3D_SCAN_INGEST', { val: 30 });
  const b2 = chain.recordEvent('MESH_LOD_OPTIMIZE', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('VirtualMuseum3dAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new VirtualMuseum3dAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('ARTIFACT_3D_SCAN_INGEST', { id: 1 });
  chain.recordEvent('MESH_LOD_OPTIMIZE', { id: 2 });
  chain.recordEvent('ARTIFACT_3D_SCAN_INGEST', { id: 3 });

  const filtered = chain.getChain('ARTIFACT_3D_SCAN_INGEST');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'ARTIFACT_3D_SCAN_INGEST');
  assert.equal(filtered[1].action, 'ARTIFACT_3D_SCAN_INGEST');
});

test('VirtualMuseum3dAuditChain - clearChain resets chain to new genesis block', () => {
  const chain = new VirtualMuseum3dAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('ARTIFACT_3D_SCAN_INGEST', { id: 101 });
  assert.equal(chain.getChain().length, 2);

  chain.clearChain();
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
  assert.equal(chain.verifyChainIntegrity().isValid, true);
});
