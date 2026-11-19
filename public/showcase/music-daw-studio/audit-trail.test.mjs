import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAuditHash, MusicDawStudioAuditChain } from './audit-trail.js';

test('computeAuditHash produces stable, unique hashes', () => {
  const hash1 = computeAuditHash('music-daw-event-1');
  const hash2 = computeAuditHash('music-daw-event-1');
  const hash3 = computeAuditHash('music-daw-event-2');

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.equal(hash1.length, 64);
});

test('MusicDawStudioAuditChain initializes with genesis block', () => {
  const chain = new MusicDawStudioAuditChain({ storageKey: 'test_daw_key_1' });
  const blocks = chain.getChain();

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].index, 0);
  assert.equal(blocks[0].action, 'GENESIS_INIT');
  assert.equal(chain.verifyChainIntegrity().isValid, true);
});

test('MusicDawStudioAuditChain records and chains events securely', () => {
  const chain = new MusicDawStudioAuditChain({ storageKey: 'test_daw_key_2' });
  chain.recordEvent('TRACK_RECORD', { track: 'Vocal 01', gain: 0.8 });
  chain.recordEvent('PLUGIN_INSERT', { plugin: 'ReverbVerb', slot: 1 });

  const blocks = chain.getChain();
  assert.equal(blocks.length, 3);
  assert.equal(blocks[1].previousHash, blocks[0].hash);
  assert.equal(blocks[2].previousHash, blocks[1].hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('MusicDawStudioAuditChain detects tampering', () => {
  const chain = new MusicDawStudioAuditChain({ storageKey: 'test_daw_key_3' });
  chain.recordEvent('SAMPLE_LOAD', { sample: 'kick.wav' });

  assert.equal(chain.verifyChainIntegrity().isValid, true);

  // Tamper with payload
  chain.chain[1].payload.sample = 'corrupt.wav';
  assert.equal(chain.verifyChainIntegrity().isValid, false);
});
