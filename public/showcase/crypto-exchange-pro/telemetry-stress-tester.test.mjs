import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProStressBenchmarkEngine as Engine } from './telemetry-stress-tester.js';
const near = (a, b, epsilon = 1e-9) => assert(Math.abs(a - b) < epsilon, `${a} != ${b}`);
function clock(options = {}) {
  let id = 0, time = 0, workTime = 0, cancelled = 0;
  const pending = new Map();
  const engine = new Engine({ requestFrame(fn) { pending.set(++id, fn); return id; }, cancelFrame(key) { cancelled++; pending.delete(key); }, now: () => workTime,
    work() { workTime += 2; }, readHeap: () => 10 * 1048576, ...options });
  const step = (delta = 16) => { time += delta; const entry = pending.entries().next().value; assert(entry, 'no scheduled frame'); pending.delete(entry[0]); entry[1](time); };
  return { engine, pending, step, cancelled: () => cancelled };
}
test('jitter agrees with independently summed adjacent interval differences', () => {
  const e = new Engine(); near(e.measureFrameJitter([10, 20, 15, 15]), (10 + 5 + 0) / 3);
  assert.equal(e.measureFrameJitter([]), 0); assert.equal(e.measureFrameJitter([16]), 0); assert.equal(e.measureFrameJitter([16,16,16]), 0);
  let seed = 73;
  for (let n = 2; n < 80; n++) {
    const values = Array.from({ length: n }, () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return 1 + seed % 70; });
    const expected = values.slice(1).reduce((s, v, i) => s + Math.abs(v - values[i]), 0) / (n - 1); near(e.measureFrameJitter(values), expected);
  }
});
test('composite score has known endpoints and degrades monotonically with workload cost', () => {
  const e = new Engine(); assert.equal(e.computeCompositeScore(60,0,0),100); assert.equal(e.computeCompositeScore(120,0,0),100); assert.equal(e.computeCompositeScore(30,0,0),70);
  let prior = 100;
  for (let cost=0;cost<100;cost++) { const score=e.computeCompositeScore(60,cost,cost);assert(score>=0&&score<=100&&score<=prior);prior=score; }
  assert.equal(e.computeCompositeScore(0,1e9,1e9),0);
});
test('invalid and sparse measurements reject rather than inventing scores', () => {
  const e = new Engine(); for (const v of [null,NaN,Infinity,'5',-1]) {assert.throws(()=>e.computeCompositeScore(v,0,0));assert.throws(()=>e.computeCompositeScore(60,v,0));assert.throws(()=>e.measureFrameJitter([16,v]));}
  for(const values of [null,{},[0,16],new Array(2),Array(1201).fill(16)])assert.throws(()=>e.measureFrameJitter(values));
});
test('real callback timestamps, injected work cost and heap samples determine the report', async () => {
  const c=clock();const promise=c.engine.runStressTest(3);for(const d of[10,10,20,30])c.step(d);const r=await promise;
  assert.equal(r.status,'completed');assert.equal(r.frames,3);near(r.fps,50);near(r.jitterMs,10);near(r.layoutMs,2);assert.equal(r.heapMiB,10);assert.equal(r.heapChangeMiB,0);assert.equal(c.pending.size,0);assert.equal(c.engine.isRunning,false);
  const samples=c.engine.getFrameSamples();assert.deepEqual(samples.intervals,[10,20,30]);samples.intervals[0]=999;assert.equal(c.engine.getFrameSamples().intervals[0],10);r.score=-1;assert.notEqual(c.engine.getSummary().score,-1);
});
test('unsupported, invalid or throwing heap readers stay unavailable and never enter the score', async () => {
  for(const readHeap of[()=>null,()=>NaN,()=>-1,()=>{throw Error('denied')}]) {const c=clock({readHeap});const p=c.engine.runStressTest(2);c.step();c.step();c.step();const r=await p;assert.equal(r.heapMiB,null);assert.equal(r.heapChangeMiB,null);assert(Number.isFinite(r.score));}
});
test('heap collection can fall after garbage collection without being mistaken for an error', async () => {
  let reads=0;const c=clock({readHeap:()=> (++reads===1?12:10)*1048576});const p=c.engine.runStressTest(2);c.step();c.step();c.step();assert.equal((await p).heapChangeMiB,-2);
});
test('stopping cancels the queued callback and cannot complete a stale run', async () => {
  const c=clock();const p=c.engine.runStressTest(12);const late=c.pending.values().next().value;assert.equal(c.engine.stop(),true);const r=await p;assert.equal(r.status,'cancelled');assert.equal(r.frames,0);assert.equal(r.fps,null);assert.equal(r.score,null);assert.equal(c.pending.size,0);late(99);assert.equal(c.engine.getFrameSamples().intervals.length,0);assert.equal(c.engine.stop(),false);
  const next=c.engine.runStressTest(2);c.step();c.step();c.step();assert.equal((await next).status,'completed');
});
test('stop during progress callback resolves once and schedules no new work', async () => {
  const c=clock();let calls=0;const p=c.engine.runStressTest(12,{onProgress(){calls++;c.engine.stop();}});for(let i=0;i<7;i++)c.step();const r=await p;assert.equal(r.status,'cancelled');assert.equal(r.frames,6);assert.equal(calls,1);assert.equal(c.pending.size,0);
});
test('overlapping runs and out-of-bounds requests fail without altering the active run', async () => {
  const c=clock();for(const n of[1,601,2.5,'60',NaN,null])await assert.rejects(c.engine.runStressTest(n));assert.equal(c.pending.size,0);
  const p=c.engine.runStressTest(2);await assert.rejects(c.engine.runStressTest(2),/already/);c.step();c.step();c.step();assert.equal((await p).frames,2);
});
test('work, callback, scheduler and non-monotonic timestamp failures release running state', async () => {
  const c=clock({work(){throw Error('work failed')}});const p=c.engine.runStressTest(2);c.step();c.step();await assert.rejects(p,/work failed/);assert.equal(c.engine.isRunning,false);assert.equal(c.pending.size,0);
  const d=clock();const q=d.engine.runStressTest(6,{onProgress(){throw Error('progress failed')}});for(let i=0;i<7;i++)d.step();await assert.rejects(q,/progress failed/);assert.equal(d.engine.isRunning,false);assert.equal(d.pending.size,0);
  const e=new Engine({requestFrame(){throw Error('no scheduler')},cancelFrame(){}});await assert.rejects(e.runStressTest(2),/no scheduler/);assert.equal(e.isRunning,false);
  const f=clock();const r=f.engine.runStressTest(2);f.step();f.step(0);await assert.rejects(r,/finite/);assert.equal(f.engine.isRunning,false);
});
