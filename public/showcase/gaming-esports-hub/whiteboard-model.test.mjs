import test from 'node:test';
import assert from 'node:assert/strict';
import { StrategyBoard, hitTest, toBoardPoint } from './whiteboard-model.js';

test('responsive pointer coordinates map to the same board position and clamp edges', () => {
  assert.deepEqual(toBoardPoint(235,150,{left:10,top:20,width:450,height:260}),{x:450,y:260});
  assert.deepEqual(toBoardPoint(-20,900,{left:10,top:20,width:450,height:260}),{x:0,y:520});
});
test('undo restores deletion, clear, and drag as independent edits', () => {
  const board = new StrategyBoard();
  const marker = {kind:'marker',x:10,y:20,label:'B1'};
  board.commit([marker]);
  board.commit([{...marker,x:90}]);
  board.commit([]);
  assert.equal(board.undo(),true);
  assert.equal(board.shapes[0].x,90);
  board.undo(); assert.equal(board.shapes[0].x,10);
  board.undo(); assert.deepEqual(board.shapes,[]);
  assert.equal(board.undo(),false);
});
test('history and stored points do not alias callers or later edits', () => {
  const board = new StrategyBoard();
  const shapes = [{kind:'pen',points:[{x:1,y:2}],width:4}];
  board.commit(shapes); shapes[0].points[0].x=99;
  assert.equal(board.shapes[0].points[0].x,1);
  board.commit([]); board.undo(); assert.equal(board.shapes[0].points[0].x,1);
});
test('eraser hits topmost marker, drawn segments and dots, but not blank map space', () => {
  const path={kind:'pen',points:[{x:10,y:20},{x:100,y:20}],width:4};
  assert.equal(hitTest([path],{x:50,y:25}),0);
  assert.equal(hitTest([path],{x:50,y:80}),-1);
  assert.equal(hitTest([path,{kind:'marker',x:50,y:20}],{x:50,y:20}),1);
  assert.equal(hitTest([{...path,points:[{x:20,y:30}]}],{x:20,y:30}),0);
});
test('empty edits do not consume undo and object/history limits are bounded', () => {
  const board=new StrategyBoard(); assert.equal(board.commit([]),false);
  for(let i=0;i<40;i++) board.commit([{kind:'marker',x:i,y:0}]);
  assert.equal(board.history.length,30);
  assert.equal(board.commit(Array.from({length:201},()=>({kind:'marker',x:0,y:0}))),false);
});
