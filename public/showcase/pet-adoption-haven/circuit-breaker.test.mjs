import test from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenCircuitBreaker as Breaker } from './circuit-breaker.js';
const rejected = () => Promise.reject(new Error('service failed'));
const fail = breaker => assert.rejects(breaker.execute(rejected), /service failed/);

test('validates thresholds, durations, clock and function inputs', async () => {
  for (const options of [{threshold:0},{threshold:11},{cooldownMs:0},{maxCooldownMs:5},{timeoutMs:Infinity},{now:7},{now:()=>NaN}]) assert.throws(()=>new Breaker(options));
  const breaker = new Breaker(); await assert.rejects(breaker.execute(null)); assert.equal(breaker.snapshot().failures,0);
});
test('closed requests return real function values and pass an AbortSignal', async () => {
  const breaker = new Breaker();
  assert.equal(await breaker.execute(signal => { assert.ok(signal instanceof AbortSignal); return 42; }),42);
  assert.equal(breaker.snapshot().state,'closed'); assert.equal(breaker.snapshot().activeRequests,0);
});
test('successful closed requests reset consecutive rather than lifetime failures', async () => {
  const breaker = new Breaker(); await fail(breaker); await fail(breaker);
  assert.equal(breaker.snapshot().failures,2); await breaker.execute(()=>true);
  await fail(breaker); assert.equal(breaker.snapshot().failures,1); assert.equal(breaker.snapshot().state,'closed');
});
test('threshold breach opens circuit and blocked calls never execute', async () => {
  const breaker = new Breaker({threshold:2}); await fail(breaker); await fail(breaker); let called=false;
  await assert.rejects(breaker.execute(()=>{called=true;}),error=>error.code==='OPEN'&&error.retryAfterMs>0);
  assert.equal(called,false); assert.equal(breaker.snapshot().failures,2); assert.equal(breaker.snapshot().state,'open');
});
test('one half-open trial is admitted and a successful trial resets backoff', async () => {
  let now=0, resolve; const breaker = new Breaker({threshold:1,now:()=>now}); await fail(breaker); now=800;
  const trial=breaker.execute(()=>new Promise(done=>{resolve=done;}));
  await assert.rejects(breaker.execute(()=>99),error=>error.code==='HALF_OPEN_BUSY');
  assert.equal(breaker.snapshot().state,'half-open'); resolve('recovered'); assert.equal(await trial,'recovered');
  assert.equal(breaker.snapshot().state,'closed'); assert.equal(breaker.snapshot().trips,0); assert.equal(breaker.snapshot().cooldownMs,800);
});
test('failed half-open trials double cooldown up to its cap', async () => {
  let now=0; const breaker=new Breaker({threshold:1,now:()=>now}); await fail(breaker);
  for (const delay of [1600,3200,6400,6400]) { now+=breaker.snapshot().retryAfterMs; await fail(breaker); assert.equal(breaker.snapshot().cooldownMs,delay); assert.equal(breaker.snapshot().state,'open'); }
});
test('request timeouts abort callbacks and release admission state', async () => {
  const breaker=new Breaker({timeoutMs:10}); let signal;
  await assert.rejects(breaker.execute(value=>{signal=value;return new Promise(()=>{});}),error=>error.code==='TIMEOUT');
  assert.equal(signal.aborted,true); assert.equal(breaker.snapshot().activeRequests,0); assert.equal(breaker.snapshot().failures,1);
});
test('old uncooperative success cannot close a circuit tripped by another request', async () => {
  const breaker=new Breaker({threshold:1}); let resolve;
  const old=breaker.execute(()=>new Promise(done=>{resolve=done;}));
  const cancelled=assert.rejects(old,error=>error.code==='CANCELLED'); await Promise.resolve();
  await fail(breaker); resolve('late success'); await cancelled;
  assert.equal(breaker.snapshot().state,'open'); assert.equal(breaker.snapshot().failures,1);
});
test('old failure cannot reopen a circuit after a newer successful recovery', async () => {
  let now=0, reject; const breaker=new Breaker({threshold:1,now:()=>now});
  const old=breaker.execute(()=>new Promise((_,fail)=>{reject=fail;})); const cancelled=assert.rejects(old,error=>error.code==='CANCELLED'); await Promise.resolve();
  await fail(breaker); await cancelled; now=800; await breaker.execute(()=>true); reject(new Error('late rejection')); await Promise.resolve();
  assert.equal(breaker.snapshot().state,'closed'); assert.equal(breaker.snapshot().failures,0);
});
test('manual trip is idempotent while open', () => {
  let now=0; const breaker=new Breaker({now:()=>now}); breaker.trip(); now=200; const before=breaker.snapshot(); breaker.trip();
  assert.equal(breaker.snapshot().retryAfterMs,before.retryAfterMs); assert.equal(breaker.snapshot().trips,1);
});
test('cooldown restart cannot bypass open state or erase exponential history', async () => {
  let now=0; const breaker=new Breaker({threshold:1,now:()=>now}); assert.throws(()=>breaker.resetTimeout()); await fail(breaker);
  now=800; await fail(breaker); now=1000; breaker.resetTimeout();
  assert.equal(breaker.snapshot().retryAfterMs,1600); assert.equal(breaker.snapshot().state,'open'); assert.equal(breaker.snapshot().trips,2);
});
test('disposal cancels in-flight work and prevents all future dispatches', async () => {
  const breaker=new Breaker(); const pending=breaker.execute(()=>new Promise(()=>{})); const cancelled=assert.rejects(pending,error=>error.code==='CANCELLED');
  breaker.dispose(); breaker.dispose(); await cancelled; await assert.rejects(breaker.execute(()=>1),error=>error.code==='DISPOSED');
  assert.equal(breaker.snapshot().activeRequests,0); assert.equal(breaker.snapshot().failures,0);
});
test('snapshot event records are independent', async () => {
  const breaker=new Breaker(); await breaker.execute(()=>1); const value=breaker.snapshot(); value.events[0].state='corrupt'; value.events.push({event:'fake'});
  assert.equal(breaker.snapshot().events.some(event=>event.state==='corrupt'||event.event==='fake'),false);
});
test('trip before the dispatch microtask prevents the callback from starting', async () => {
  const breaker=new Breaker(); let called=false;
  const pending=breaker.execute(()=>{called=true;return 1;}); const cancelled=assert.rejects(pending,error=>error.code==='CANCELLED');
  breaker.trip(); await cancelled; assert.equal(called,false); assert.equal(breaker.snapshot().state,'open');
});
test('concurrent admission has a bounded local ceiling', async () => {
  const breaker=new Breaker(), pending=Array.from({length:32},()=>breaker.execute(()=>new Promise(()=>{})));
  const settled=Promise.allSettled(pending); await assert.rejects(breaker.execute(()=>1),error=>error.code==='BUSY'); breaker.dispose();
  assert.ok((await settled).every(value=>value.status==='rejected')); assert.equal(breaker.snapshot().activeRequests,0);
});
test('event telemetry retains only the latest fifty events', async () => {
  const breaker=new Breaker(); for(let i=0;i<40;i++) await breaker.execute(()=>i);
  assert.equal(breaker.snapshot().events.length,50); assert.equal(breaker.snapshot().events.at(-1).event,'Request succeeded');
});
