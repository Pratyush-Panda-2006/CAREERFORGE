import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('./merkle-sum.js', import.meta.url), 'utf8');
const { parseAmount, formatAmount, buildTree, createProof, verifyProof } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const record = (account, balance = '0.00000001') => ({ account, balance });
test('exact decimal boundaries and rejected ambiguous values', () => {
  assert.equal(parseAmount('1.00000001'), 100000001n);
  assert.equal(formatAmount(parseAmount('12345678901234567890.12345678')), '12345678901234567890.12345678');
  for (const v of ['-1','+1','01','1e2',' 1','1.000000001','.1','1.',1,NaN,'9'.repeat(50)]) assert.throws(() => parseAmount(v));
});
test('independent SHA-256 leaf and branch vectors', async () => {
  const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
  const a = digest(['merkle-sum-v1','leaf','a','1']), b = digest(['merkle-sum-v1','leaf','b','2']);
  const t = await buildTree([record('a'),record('b','0.00000002')]);
  assert.deepEqual(t.root,{hash:digest(['merkle-sum-v1','branch',a,'1',b,'2']),sum:'3'});
});
test('singleton and odd nodes promote without double counting; all positions verify', async () => {
  for (let count = 1; count <= 33; count++) {
    const records = Array.from({length:count},(_,i)=>record(`a${i}`,formatAmount(BigInt(i+1))));
    const tree = await buildTree(records);
    assert.equal(BigInt(tree.root.sum),BigInt(count*(count+1)/2));
    for (let i=0;i<count;i++) assert.equal(await verifyProof(records[i],createProof(tree,i),tree.root),true);
  }
});
test('tampering with leaf, root sum, sibling sum/hash or proof structure fails', async () => {
  const records = [record('a'),record('b'),record('c')], tree = await buildTree(records), proof = createProof(tree,0);
  for (const field of ['sum','hash','side','level']) {
    const bad = structuredClone(proof); bad.steps[0][field] = {sum:'9',hash:'0'.repeat(64),side:'left',level:9}[field];
    assert.equal(await verifyProof(records[0],bad,tree.root),false);
  }
  assert.equal(await verifyProof(record('a','1'),proof,tree.root),false);
  assert.equal(await verifyProof(records[0],proof,{...tree.root,sum:'4'}),false);
  assert.equal(await verifyProof(records[0],{...proof,steps:[...proof.steps,proof.steps[0]]},tree.root),false);
  assert.equal(await verifyProof(records[0],{...proof,index:99},tree.root),false);
});
test('input limits, duplicate identities, leaf and aggregate overflow', async () => {
  await assert.rejects(buildTree([])); await assert.rejects(buildTree(Array(1025).fill(record('x'))));
  await assert.rejects(buildTree([record('x'),record(' x ')]));
  const maximum = formatAmount((1n<<128n)-1n);
  assert.equal(parseAmount(maximum),(1n<<128n)-1n);
  await assert.rejects(buildTree([record('x',maximum),record('y')]));
});
