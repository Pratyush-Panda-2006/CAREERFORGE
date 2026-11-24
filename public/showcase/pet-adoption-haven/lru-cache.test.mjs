import test from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenLruCache as Cache } from './lru-cache.js';
const keys = cache => cache.entries().map(x => x.key);
function check(cache) {
  let previous=cache.head, count=0;
  for(let n=cache.head.next;n!==cache.tail;n=n.next){assert.equal(n.prev,previous);assert.equal(cache.nodes.get(n.key),n);previous=n;count++;assert(count<=50)}
  assert.equal(cache.tail.prev,previous);assert.equal(count,cache.nodes.size);assert(count<=cache.capacity);
}
test('reads move a retained node to head, eviction removes the true tail',()=>{
  const c=new Cache(2);c.put('a',1);c.put('b',2);const a=c.nodes.get('a');assert.equal(c.get('a'),1);assert.equal(c.nodes.get('a'),a);assert.deepEqual(keys(c),['a','b']);
  assert.deepEqual(c.put('c',3),{key:'b',value:2,reason:'capacity'});assert.equal(c.get('b'),undefined);assert.deepEqual(keys(c),['c','a']);check(c);
});
test('updating a key reuses its node without growth or eviction',()=>{
  const c=new Cache(2);c.put('a',1);c.put('b',2);const n=c.nodes.get('a');assert.equal(c.put('a',9),null);assert.equal(c.nodes.get('a'),n);assert.equal(c.get('a'),9);assert.equal(c.nodes.size,2);assert.equal(c.metrics.evictions,0);check(c);
});
test('miss leaves recency unchanged and metrics separate hits',()=>{const c=new Cache();c.put('a',1);assert.equal(c.get('missing'),undefined);assert.deepEqual(keys(c),['a']);assert.equal(c.metrics.misses,1);assert.equal(c.metrics.hits,0);c.get('a');assert.equal(c.metrics.hits,1)});
test('capacity one maintains both pointers through replace and clear',()=>{const c=new Cache(1);c.put('a',1);c.put('b',2);assert.deepEqual(keys(c),['b']);check(c);c.clear();assert.deepEqual(keys(c),[]);check(c);c.put('c',3);check(c)});
test('Map semantics support special, object, NaN and undefined keys/values',()=>{const c=new Cache(6),obj={};for(const k of ['__proto__','constructor',obj,NaN,undefined])c.put(k,undefined);for(const k of ['__proto__','constructor',obj,NaN,undefined]){assert(c.has(k));assert.equal(c.get(k),undefined)}assert.equal(c.metrics.hits,5);check(c)});
test('resize evicts in order and growth preserves nodes',()=>{const c=new Cache(4);for(const k of ['a','b','c','d'])c.put(k,k);c.get('a');c.resize(2);assert.deepEqual(keys(c),['a','d']);assert.deepEqual(c.getEvictedEntries().map(x=>x.key),['b','c']);assert(c.getEvictedEntries().every(x=>x.reason==='resize'));c.resize(5);assert.deepEqual(keys(c),['a','d']);check(c)});
test('invalid capacities leave existing state unchanged',()=>{for(const n of [0,-1,1.5,51,NaN,Infinity,'4'])assert.throws(()=>new Cache(n));const c=new Cache(2);c.put('a',1);assert.throws(()=>c.resize(0));assert.equal(c.capacity,2);assert.deepEqual(keys(c),['a']);check(c)});
test('clear removes entries, metrics and historical values but preserves budget',()=>{const c=new Cache(1);c.put('a',1);c.put('b',2);c.get('no');c.clear();assert.deepEqual(c.getEvictedEntries(),[]);assert.deepEqual(c.metrics,{hits:0,misses:0,writes:0,evictions:0});assert.equal(c.capacity,1);check(c)});
test('inspection cannot mutate retained nodes or eviction records',()=>{const c=new Cache(1);c.put('a',1);c.put('b',2);c.entries()[0].key='changed';c.getEvictedEntries()[0].key='changed';assert.deepEqual(keys(c),['b']);assert.equal(c.getEvictedEntries()[0].key,'a');check(c)});
test('history is bounded across a long run and DLL remains coherent',()=>{const c=new Cache(7);for(let i=0;i<1000;i++){c.put(i,i);if(i%3===0)c.get(i-1);if(i%17===0)c.resize(i%7+1);check(c)}assert.equal(c.getEvictedEntries().length,100);assert(c.metrics.evictions>100)});
test('mixed operations agree with a separate simple reference model',()=>{
 const c=new Cache(4),model=new Map();let seed=73;for(let i=0;i<500;i++){seed=(seed*1664525+1013904223)>>>0;const k=seed%11;
  if(seed&1){c.put(k,i);model.delete(k);model.set(k,i);while(model.size>4)model.delete(model.keys().next().value)}else{assert.equal(c.get(k),model.get(k));if(model.has(k)){const v=model.get(k);model.delete(k);model.set(k,v)}}
  assert.deepEqual(c.entries(),[...model].reverse().map(([key,value])=>({key,value})));check(c);
 }
});
