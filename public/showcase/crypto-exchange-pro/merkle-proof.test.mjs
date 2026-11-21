import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CryptoExchangeProMerkleTree } from './merkle-proof.js';

const records = [
  { account: 'alice', balance: '1.25' },
  { account: 'bob', balance: '8.50' },
  { account: 'carol', balance: '0.75' },
];

test('produces a stable SHA-256 commitment for the same ordered records', async () => {
  const first = new CryptoExchangeProMerkleTree();
  const second = new CryptoExchangeProMerkleTree();
  assert.match(await first.buildTree(records), /^[0-9a-f]{64}$/);
  assert.equal(await second.buildTree(records), first.getRoot());
  assert.notEqual(await second.buildTree([...records].reverse()), first.getRoot());
});

test('single-leaf root matches an independent domain-separated SHA-256 digest', async () => {
  const tree = new CryptoExchangeProMerkleTree();
  await tree.buildTree(records.slice(0, 1));
  const expected = createHash('sha256')
    .update(Buffer.concat([Buffer.from([0]), Buffer.from(JSON.stringify(records[0]))]))
    .digest('hex');
  assert.equal(tree.getRoot(), expected);
});

test('generates valid proofs for every leaf in odd and even trees', async () => {
  for (const leaves of [records.slice(0, 2), records]) {
    const tree = new CryptoExchangeProMerkleTree();
    await tree.buildTree(leaves);
    for (const [index, leaf] of leaves.entries()) {
      assert.equal(await tree.verifyProof(leaf, tree.generateProof(index), tree.getRoot()), true);
    }
  }
});

test('rejects changed balances, sibling hashes, and sibling order', async () => {
  const tree = new CryptoExchangeProMerkleTree();
  await tree.buildTree(records);
  const proof = tree.generateProof(1);
  assert.equal(await tree.verifyProof({ account: 'bob', balance: '8.51' }, proof, tree.getRoot()), false);
  assert.equal(await tree.verifyProof(records[1], [{ ...proof[0], hash: '0'.repeat(64) }, ...proof.slice(1)], tree.getRoot()), false);
  assert.equal(await tree.verifyProof(records[1], [{ ...proof[0], position: 'right' }, ...proof.slice(1)], tree.getRoot()), false);
  assert.equal(await tree.verifyProof(records[1], proof, '0'.repeat(64)), false);
});

test('handles one leaf and rejects invalid inputs and indexes', async () => {
  const tree = new CryptoExchangeProMerkleTree();
  await assert.rejects(tree.buildTree([]), /at least one/);
  await assert.rejects(tree.buildTree([{ account: 'alice', balance: '-1' }]), /nonnegative/);
  await tree.buildTree(records.slice(0, 1));
  const previousRoot = tree.getRoot();
  await assert.rejects(tree.buildTree([{ account: 'alice', balance: 'broken' }]), /nonnegative/);
  assert.equal(tree.getRoot(), previousRoot);
  assert.deepEqual(tree.generateProof(0), []);
  assert.equal(await tree.verifyProof(records[0], [], tree.getRoot()), true);
  assert.throws(() => tree.generateProof(1), RangeError);
});
