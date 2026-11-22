import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadEventSourcingLedger as Ledger } from './event-sourcing.js';
const initial = { workspace: 'Demo workspace', seats: 1, plan: 'starter' };

test('empty ledger and any initial historical query return fresh genesis state', () => {
  const ledger=new Ledger(); assert.deepEqual(ledger.getEvents(),[]); assert.deepEqual(ledger.getMaterializedState(),initial);
  const past=ledger.replayToTimestamp(0); past.seats=999; assert.deepEqual(ledger.getMaterializedState(),initial);
});
test('ordered event mutations produce a deterministic current materialization', () => {
  const ledger=new Ledger({now:()=>100});
  ledger.appendEvent('WORKSPACE_RENAMED',{name:'Studio'}); ledger.appendEvent('SEATS_CHANGED',{delta:2}); ledger.appendEvent('PLAN_CHANGED',{plan:'team'});
  assert.deepEqual(ledger.getMaterializedState(),{workspace:'Studio',seats:3,plan:'team'});
  assert.deepEqual(ledger.getEvents().map(event=>event.sequence),[1,2,3]);
  assert.deepEqual(ledger.replayToTimestamp(102),ledger.getMaterializedState());
});
test('replay includes the exact timestamp and preserves earlier boundaries', () => {
  let now=100; const ledger=new Ledger({now:()=>now}); ledger.appendEvent('SEATS_CHANGED',{delta:2}); now=200; ledger.appendEvent('PLAN_CHANGED',{plan:'team'});
  assert.deepEqual(ledger.replayToTimestamp(99),initial); assert.deepEqual(ledger.replayToTimestamp(100),{...initial,seats:3});
  assert.deepEqual(ledger.replayToTimestamp(199),{...initial,seats:3}); assert.deepEqual(ledger.replayToTimestamp(200),{...initial,seats:3,plan:'team'});
  assert.deepEqual(ledger.replayToTimestamp(Number.MAX_SAFE_INTEGER),ledger.getMaterializedState());
});
test('same-time and backward clocks preserve strict local ordering', () => {
  let now=100; const ledger=new Ledger({now:()=>now}); ledger.appendEvent('SEATS_CHANGED',{delta:1}); ledger.appendEvent('SEATS_CHANGED',{delta:1}); now=80; ledger.appendEvent('SEATS_CHANGED',{delta:1});
  assert.deepEqual(ledger.getEvents().map(event=>event.timestamp),[100,101,102]);
});
test('rewinding never truncates history or changes the live append target', () => {
  const ledger=new Ledger({now:()=>100}); ledger.appendEvent('SEATS_CHANGED',{delta:4}); ledger.appendEvent('PLAN_CHANGED',{plan:'team'});
  assert.deepEqual(ledger.replayToTimestamp(0),initial); const before=ledger.getEvents(); ledger.appendEvent('SEATS_CHANGED',{delta:1});
  assert.deepEqual(ledger.getEvents().slice(0,2),before); assert.equal(ledger.getMaterializedState().seats,6); assert.equal(ledger.getEvents().length,3);
});
test('input payloads, returned events and exported ledger copies cannot edit stored events', () => {
  const ledger=new Ledger(), payload={name:'Safe'}; const returned=ledger.appendEvent('WORKSPACE_RENAMED',payload);
  payload.name='changed'; returned.payload.name='returned'; returned.sequence=999;
  const copy=ledger.getEvents(); copy[0].payload.name='exported'; copy.push({type:'fake'});
  assert.equal(ledger.getEvents()[0].payload.name,'Safe'); assert.equal(ledger.getEvents()[0].sequence,1); assert.equal(ledger.getEvents().length,1);
});
test('current and historical state copies remain isolated from later appends', () => {
  const ledger=new Ledger(); const old=ledger.getMaterializedState(); ledger.appendEvent('SEATS_CHANGED',{delta:2});
  const current=ledger.getMaterializedState(); current.plan='fake'; const past=ledger.replayToTimestamp(0); past.workspace='fake';
  assert.deepEqual(old,initial); assert.deepEqual(ledger.getMaterializedState(),{...initial,seats:3});
});
test('invalid types, fields, prototypes and non-JSON values leave all state intact', () => {
  const ledger=new Ledger(); ledger.appendEvent('SEATS_CHANGED',{delta:1}); const before=ledger.getEvents(), state=ledger.getMaterializedState();
  const bad=[['UNKNOWN',{}],['__proto__',{}],['WORKSPACE_RENAMED',null],['WORKSPACE_RENAMED',[]],['WORKSPACE_RENAMED',{name:''}],['WORKSPACE_RENAMED',{name:'a'.repeat(81)}],['WORKSPACE_RENAMED',{name:7}],['WORKSPACE_RENAMED',{name:'X',extra:true}],['PLAN_CHANGED',{plan:'free'}],['SEATS_CHANGED',{delta:'2'}],['SEATS_CHANGED',{delta:Infinity}],['SEATS_CHANGED',{delta:1.5}],['SEATS_CHANGED',{delta:0}],['WORKSPACE_RENAMED',Object.create({name:'X'})],['WORKSPACE_RENAMED',JSON.parse('{"__proto__":{"polluted":true}}')]];
  for(const [type,payload]of bad){assert.throws(()=>ledger.appendEvent(type,payload));assert.deepEqual(ledger.getEvents(),before);assert.deepEqual(ledger.getMaterializedState(),state);}
  assert.equal({}.polluted,undefined);
});
test('seat bounds reject underflow and overflow atomically', () => {
  const ledger=new Ledger(); assert.throws(()=>ledger.appendEvent('SEATS_CHANGED',{delta:-1}));
  ledger.appendEvent('SEATS_CHANGED',{delta:999}); assert.equal(ledger.getMaterializedState().seats,1000); const before=ledger.getEvents();
  assert.throws(()=>ledger.appendEvent('SEATS_CHANGED',{delta:1})); assert.deepEqual(ledger.getEvents(),before);
  ledger.appendEvent('SEATS_CHANGED',{delta:-999}); assert.equal(ledger.getMaterializedState().seats,1);
});
test('normalizes whitespace in names and rejects no-op mutations', () => {
  const ledger=new Ledger(); assert.equal(ledger.appendEvent('WORKSPACE_RENAMED',{name:' Studio '}).payload.name,'Studio');
  const before=ledger.getEvents(); assert.throws(()=>ledger.appendEvent('WORKSPACE_RENAMED',{name:'Studio'})); assert.throws(()=>ledger.appendEvent('PLAN_CHANGED',{plan:'starter'})); assert.deepEqual(ledger.getEvents(),before);
});
test('bad clocks and ordering overflow preserve the last valid event', () => {
  assert.throws(()=>new Ledger({now:1})); let now=100; const ledger=new Ledger({now:()=>now}); ledger.appendEvent('SEATS_CHANGED',{delta:1}); const before=ledger.getEvents();
  for(const value of[NaN,-1,Infinity,100.5]){now=value;assert.throws(()=>ledger.appendEvent('SEATS_CHANGED',{delta:1}));assert.deepEqual(ledger.getEvents(),before);}
  const limit=new Ledger({now:()=>Number.MAX_SAFE_INTEGER}); limit.appendEvent('SEATS_CHANGED',{delta:1}); assert.throws(()=>limit.appendEvent('SEATS_CHANGED',{delta:1})); assert.equal(limit.getEvents().length,1);
});
test('invalid replay timestamps cannot affect live state or history', () => {
  const ledger=new Ledger(); ledger.appendEvent('SEATS_CHANGED',{delta:1}); const before=ledger.getEvents();
  for(const value of[-1,NaN,Infinity,1.5,'100',null])assert.throws(()=>ledger.replayToTimestamp(value));
  assert.deepEqual(ledger.getEvents(),before); assert.equal(ledger.getMaterializedState().seats,2);
});
test('five hundred event ceiling preserves every accepted event and projection', () => {
  const ledger=new Ledger({now:()=>1});
  for(let i=0;i<500;i++)ledger.appendEvent('PLAN_CHANGED',{plan:i%2?'starter':'team'});
  const before=ledger.getEvents(); assert.throws(()=>ledger.appendEvent('PLAN_CHANGED',{plan:'enterprise'})); assert.deepEqual(ledger.getEvents(),before);
  assert.deepEqual(ledger.replayToTimestamp(500),ledger.getMaterializedState()); assert.equal(ledger.getEvents().length,500);
});
