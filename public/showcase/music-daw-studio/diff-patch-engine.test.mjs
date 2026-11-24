import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioDiffPatchEngine } from './diff-patch-engine.js';
const engine = new MusicDawStudioDiffPatchEngine();
function roundtrip(a, b) { const diff = engine.computeDiff(a, b); const patch = engine.toUnifiedFormat(diff); assert.equal(engine.applyPatch(a, patch), b); return { diff, patch }; }
test('empty and identical text need no patch', () => {
  assert.deepEqual(engine.computeDiff('', ''), []); assert.equal(roundtrip('', '').patch, '');
  assert.equal(roundtrip('a\nb\n', 'a\nb\n').patch, '');
});
test('pure additions and deletions including empty file coordinates', () => {
  assert.match(roundtrip('', 'a\nb\n').patch, /@@ -0,0 \+1,2 @@/);
  assert.match(roundtrip('a\nb\n', '').patch, /@@ -1,2 \+0,0 @@/);
});
test('mixed edits and repeated lines round-trip with context', () => {
  const { diff } = roundtrip('A\nB\nA\nC\n', 'A\nD\nA\nE\nC\n');
  assert.equal(diff.filter(x => x.type !== 'context').length, 3);
});
test('final newline, blank lines, CRLF and Unicode preserve exact bytes', () => {
  for (const [a,b] of [['a','a\n'],['a\n','a'],['\n\n','\n'],['a\r\nb\r\n','a\r\nc\r\n'],['京都\n🏔️','京都\n旅\n🏔️'],['','\r'],['\r','\n']]) roundtrip(a,b);
});
test('missing newline markers are emitted and validated', () => {
  const { patch } = roundtrip('a', 'b'); assert.equal((patch.match(/No newline at end of file/g)||[]).length, 2);
  assert.throws(() => engine.applyPatch('a\n', patch), /Source does not match/);
});
test('mismatched source never receives a partial patch', () => {
  const { patch } = roundtrip('one\ntwo\n', 'one\nthree\n');
  assert.throws(() => engine.applyPatch('other\ntwo\n', patch), /Source does not match/);
});
test('bad headers, positions, counts, lines and truncation are rejected', () => {
  const { patch } = roundtrip('a\n', 'b\n');
  for (const value of [patch.replace('--- original','--- other'),patch.replace('-1,1','-2,1'),patch.replace('+1,1','+1,3'),patch+'@@ -1,1 +1,1 @@\n',patch.slice(0,-1),patch.replace('-a','?a'),patch+'\\ No newline at end of file\n\\ No newline at end of file\n']) assert.throws(() => engine.applyPatch('a\n',value));
  assert.equal(engine.applyPatch('a\n', patch+'\\ No newline at end of file\n'), 'b');
});
test('untrusted structured operations reject invalid shapes and missing interior newlines', () => {
  for (const diff of [null,{},[{type:'oops',value:'x'}],[{type:'add',value:''}],[{type:'add',value:'a\nb\n'}],[{type:'context',value:'a'},{type:'add',value:'b\n'}]]) assert.throws(() => engine.toUnifiedFormat(diff));
});
test('bounded input and edit distance fail explicitly rather than freezing', () => {
  assert.throws(() => engine.computeDiff('a'.repeat(20001),''), /20,000/);
  assert.throws(() => engine.computeDiff('\n'.repeat(401),''), /400 lines/);
  assert.throws(() => engine.computeDiff('a\n'.repeat(101),'b\n'.repeat(101)), /200 line edits/);
  assert.throws(() => engine.applyPatch('', 'x'.repeat(60001)), /60,000/);
});
test('maximum unchanged lines and exact edit boundary work', () => {
  roundtrip('a\n'.repeat(400),'a\n'.repeat(400)); roundtrip('a\n'.repeat(100),'b\n'.repeat(100));
});
test('all short binary line sequences match independent edit-distance oracle', () => {
  const seqs = ['']; for(let n=1;n<=4;n++)for(let mask=0;mask<2**n;mask++)seqs.push(Array.from({length:n},(_,i)=>(mask>>i&1)?'A\n':'B\n').join(''));
  for (const a of seqs) for (const b of seqs) {
    const left=a.match(/[^\n]*\n/g)||[],right=b.match(/[^\n]*\n/g)||[],dp=Array.from({length:left.length+1},()=>Array(right.length+1).fill(0));
    for(let i=0;i<=left.length;i++)dp[i][0]=i;for(let j=0;j<=right.length;j++)dp[0][j]=j;
    for(let i=1;i<=left.length;i++)for(let j=1;j<=right.length;j++)dp[i][j]=left[i-1]===right[j-1]?dp[i-1][j-1]:Math.min(dp[i-1][j],dp[i][j-1])+1;
    const {diff}=roundtrip(a,b);assert.equal(diff.filter(x=>x.type!=='context').length,dp[left.length][right.length]);
  }
});
