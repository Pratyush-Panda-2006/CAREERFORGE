import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ECOLOGY as defaults, simulateEcology, equilibrium } from './ecology-model.js';
test('default trajectory is deterministic, positive and spans 120 months',()=>{
  const a=simulateEcology(defaults),b=simulateEcology(defaults);
  assert.deepEqual(a,b);assert.equal(a.complete,true);assert.equal(a.samples.length,121);
  assert.equal(a.samples.at(-1).year,10);assert.ok(a.samples.every(p=>p.flora>=0&&p.wildlife>=0));
});
test('coexistence equilibrium remains fixed',()=>{
  const eq=equilibrium(defaults);assert.deepEqual(eq,{flora:40,wildlife:40});
  const result=simulateEcology({...defaults,...eq});
  assert.ok(result.samples.every(p=>Math.abs(p.flora-40)<1e-10&&Math.abs(p.wildlife-40)<1e-10));
});
test('zero populations remain absent; uncoupled growth/decay match analytical solutions',()=>{
  const empty=simulateEcology({...defaults,flora:0,wildlife:0});assert.ok(empty.samples.every(p=>p.flora===0&&p.wildlife===0));
  const plants=simulateEcology({...defaults,wildlife:0},{months:12}).samples.at(-1);
  assert.ok(Math.abs(plants.flora-65*Math.exp(.8))<1e-7);assert.equal(plants.wildlife,0);
  const animals=simulateEcology({...defaults,flora:0},{months:12}).samples.at(-1);
  assert.ok(Math.abs(animals.wildlife-25*Math.exp(-.4))<1e-7);assert.equal(animals.flora,0);
});
test('step refinement converges and the classical invariant stays close',()=>{
  const coarse=simulateEcology(defaults,{stepsPerMonth:10}).samples.at(-1);
  const fine=simulateEcology(defaults,{stepsPerMonth:20}).samples.at(-1);
  const ref=simulateEcology(defaults,{stepsPerMonth:40}).samples.at(-1);
  const error=p=>Math.hypot(p.flora-ref.flora,p.wildlife-ref.wildlife);
  assert.ok(error(fine)<error(coarse));
  const invariant=p=>defaults.conversion*p.flora-defaults.mortality*Math.log(p.flora)+defaults.grazing*p.wildlife-defaults.growth*Math.log(p.wildlife);
  const initial=invariant(defaults);
  assert.ok(simulateEcology(defaults).samples.every(p=>Math.abs(invariant(p)-initial)<1e-7));
});
test('invalid input/resolution is rejected and oversized trajectories are reported, not clipped',()=>{
  for(const value of [NaN,Infinity,-1,151])assert.throws(()=>simulateEcology({...defaults,flora:value}),RangeError);
  assert.throws(()=>simulateEcology(defaults,{stepsPerMonth:0}),RangeError);
  const result=simulateEcology({...defaults,flora:150,wildlife:0,growth:1.5});
  assert.equal(result.complete,false);assert.ok(result.samples.at(-1).year<10);assert.match(result.reason,/stops/);
  assert.equal(equilibrium({...defaults,grazing:0}),null);
});
