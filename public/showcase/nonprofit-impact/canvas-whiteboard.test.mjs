import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD, interpolatePoints, NonprofitImpactWhiteboardCanvas as Board } from './canvas-whiteboard.js';
const dot = (board, x = 100, y = 100) => { board.addPoint(x,y); return board.finishStroke(); };

test('interpolation includes the endpoint and bounds segment spacing for 200 varied pairs', () => {
  let seed=771;
  const random=limit=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.round(seed/0x100000000*limit*10)/10;};
  for(let n=0;n<200;n++){
    const a=[random(1000),random(625)],b=[random(1000),random(625)],before=JSON.stringify([a,b]),points=interpolatePoints(a,b);
    assert.equal(points.length,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4));assert.deepEqual(points.at(-1),b);let last=a;
    for(const p of points){assert.ok(Math.hypot(p[0]-last[0],p[1]-last[1])<=4.15);last=p;}
    assert.equal(JSON.stringify([a,b]),before);
  }
  assert.deepEqual(interpolatePoints([1,1],[1,1]),[]);
});
test('invalid geometry cannot allocate huge interpolation arrays or change a draft', () => {
  const b=new Board();b.addPoint(10,10);const before=b.getSummary();
  for(const p of [[NaN,1],[Infinity,0],['2',1],[null,3]])assert.throws(()=>b.addPoint(...p));
  assert.deepEqual(b.getSummary(),before);
  for(const args of [[[0,0],[1,1],0],[[0,0],[1,1],Infinity],[[0,0],[1000,625],.1],[[0],[1,1]],[[0,0],[1,1,2]]])assert.throws(()=>interpolatePoints(...args));
});
test('pen dots and smoothed paths serialize finite clamped coordinates', () => {
  const b=new Board();assert.equal(dot(b,-99,9999),true);assert.match(b.exportSVG(),/<circle cx="0" cy="625"/);
  b.addPoint(100,100);b.addPoint(120,100);b.addPoint(130,120);assert.equal(b.finishStroke(),true);
  const svg=b.exportSVG();assert.match(svg,/ Q /);assert.match(svg,/ L 130 120/);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.equal(b.getSummary().strokes,2);
});
test('line and rectangle previews retain exactly two endpoints with correct reverse bounds', () => {
  const b=new Board();b.setTool('line');b.addPoint(10,20);for(let i=0;i<500;i++)b.addPoint(400+i,300);assert.equal(b.getSummary().points,2);b.finishStroke();assert.match(b.exportSVG(),/d="M 10 20 L 899 300"/);
  b.setTool('rectangle');b.addPoint(350,300);b.addPoint(100,50);b.finishStroke();assert.match(b.exportSVG(),/<rect x="100" y="50" width="250" height="250"/);
});
test('settings reject unsafe values before cancelling a pending mark', () => {
  const b=new Board();b.addPoint(20,20);const before=b.getSummary();
  for(const color of ['red','#fff','url(x)','#000000" onload="x',null])assert.throws(()=>b.setColor(color));
  for(const width of [0,25,1.5,NaN,'4'])assert.throws(()=>b.setWidth(width));assert.throws(()=>b.setTool('script'));assert.deepEqual(b.getSummary(),before);
  b.setColor('#ABCDEF');assert.equal(b.getSummary().color,'#abcdef');assert.equal(b.getSummary().drawing,false);
});
test('undo/redo preserve exact SVG and a new mark branches history', () => {
  const b=new Board();dot(b);const one=b.exportSVG();dot(b,200,200);const two=b.exportSVG();assert.equal(b.undo(),true);assert.equal(b.exportSVG(),one);assert.equal(b.redo(),true);assert.equal(b.exportSVG(),two);
  b.undo();dot(b,300,300);assert.equal(b.getSummary().redo,0);assert.equal(b.redo(),false);assert.notEqual(b.exportSVG(),two);
});
test('undo during a preview cancels only that preview, and SVG excludes unfinished marks', () => {
  const b=new Board();dot(b);const saved=b.exportSVG();b.addPoint(300,300);assert.equal(b.exportSVG(),saved);assert.equal(b.undo(),true);assert.equal(b.getSummary().strokes,1);assert.equal(b.getSummary().drawing,false);assert.equal(b.exportSVG(),saved);
});
test('degenerate line/rectangle attempts do not discard the redo branch', () => {
  const b=new Board();dot(b);b.undo();b.setTool('line');b.addPoint(3,3);assert.equal(b.finishStroke(),false);assert.equal(b.getSummary().redo,1);
  b.setTool('rectangle');b.addPoint(10,10);b.addPoint(30,10);assert.equal(b.finishStroke(),false);assert.equal(b.getSummary().redo,1);assert.equal(b.redo(),true);
});
test('history rejects the 81st mark without silently dropping artwork', () => {
  const b=new Board();for(let i=0;i<BOARD.maxStrokes;i++)dot(b,i*2,20);const saved=b.exportSVG();b.addPoint(10,50);assert.throws(()=>b.finishStroke(),/80 marks/);assert.equal(b.getSummary().strokes,80);assert.equal(b.exportSVG(),saved);
  b.cancelStroke();b.undo();dot(b,900,500);assert.equal(b.getSummary().strokes,80);assert.equal(b.getSummary().redo,0);
});
test('the 1024-point boundary rejects a whole update atomically', () => {
  const b=new Board();b.addPoint(0,0);for(const x of [1000,0,1000,0,92])b.addPoint(x,0);assert.equal(b.getSummary().points,1024);
  assert.throws(()=>b.addPoint(96,0),/too long/);assert.equal(b.getSummary().points,1024);b.finishStroke();assert.equal(b.getSummary().strokes,1);
});
test('eraser masks affect older artwork while later marks remain outside the mask', () => {
  const b=new Board();dot(b);const original=b.exportSVG();b.setTool('eraser');b.addPoint(100,100);b.finishStroke();const erased=b.exportSVG();assert.match(erased,/<mask /);assert.match(erased,/mask-type="luminance"/);assert.match(erased,/<g mask="url\(#field-erase-1\)">/);
  b.setTool('pen');b.setColor('#2a6986');dot(b);const later=b.exportSVG();assert.ok(later.indexOf('fill="#2a6986"')>later.lastIndexOf('</g>'));b.undo();assert.equal(b.exportSVG(),erased);b.undo();assert.equal(b.exportSVG(),original);
});
test('clear removes undo/redo/draft but keeps brush settings', () => {
  const b=new Board();b.setWidth(20);b.setColor('#bb6949');dot(b);b.undo();b.addPoint(9,9);b.clear();assert.deepEqual(b.getSummary(),{tool:'pen',color:'#bb6949',width:20,strokes:0,redo:0,drawing:false,points:0});assert.equal(b.undo(),false);assert.equal(b.redo(),false);assert.match(b.exportSVG(),/fill="#f3f0e8"/);
});
test('maximum bounded geometry remains a portable SVG below 5 MiB', () => {
  const b=new Board();for(let i=0;i<80;i++){b.addPoint(0,0);for(const x of [1000,0,1000,0,92])b.addPoint(x,0);b.finishStroke();}
  assert.ok(new TextEncoder().encode(b.exportSVG()).length<5*1024*1024);assert.equal(b.getSummary().strokes,80);
});
