import test from 'node:test';
import assert from 'node:assert/strict';
import { RippleField } from './ripple-model.js';
const settings={frequency:6,amplitude:18,damping:3};
test('empty and zero-amplitude fields leave image coordinates unchanged',()=>{
  const field=new RippleField(); assert.deepEqual(field.sample(.2,.3,100,settings),{x:0,y:0});
  field.add(.5,.5,0); const p=field.sample(.2,.3,100,{...settings,amplitude:0});
  assert.equal(Math.abs(p.x)+Math.abs(p.y),0);
});
test('radial displacement is finite at the origin and bounded under overlapping input',()=>{
  const field=new RippleField(); for(let i=0;i<50;i++)field.add(.5,.5,0);
  assert.equal(field.waves.length,8); assert.deepEqual(field.sample(.5,.5,0,settings),{x:0,y:0});
  const p=field.sample(.4,.3,100,settings); assert.ok(Math.abs(p.x)<=18&&Math.abs(p.y)<=18);
});
test('damping settles waves and clear drops all state',()=>{
  const field=new RippleField();field.add(.5,.5,0);
  const early=field.sample(.3,.3,0,settings), late=field.sample(.3,.3,4000,settings);
  assert.ok(Math.hypot(late.x,late.y)<Math.hypot(early.x,early.y));
  assert.equal(field.prune(4000,3),false);field.add(.2,.2,4000);field.clear();assert.equal(field.waves.length,0);
});
test('input is clamped and frequency changes the wave shape',()=>{
  const field=new RippleField();field.add(-1,2,100);assert.deepEqual(field.waves[0],{x:0,y:1,time:100});
  assert.notDeepEqual(field.sample(.2,.4,200,settings),field.sample(.2,.4,200,{...settings,frequency:12}));
});
