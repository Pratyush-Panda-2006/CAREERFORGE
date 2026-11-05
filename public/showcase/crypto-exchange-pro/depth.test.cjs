const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { document: { addEventListener() {}, getElementById() { return null; } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8'), context);
const plain = value => JSON.parse(JSON.stringify(value));

test('bids accumulate from highest price outward without changing the input', () => {
  const rows = [{price:98,size:3},{price:100,size:1},{price:99,size:2}];
  const before = JSON.stringify(rows);
  assert.deepEqual(plain(context.cumulativeDepth(rows,true)), [
    {price:100,total:1},{price:99,total:3},{price:98,total:6}
  ]);
  assert.equal(JSON.stringify(rows),before);
});

test('asks accumulate from lowest price outward without changing the input', () => {
  const rows = [{price:103,size:3},{price:101,size:1},{price:102,size:2}];
  const before = JSON.stringify(rows);
  assert.deepEqual(plain(context.cumulativeDepth(rows,false)), [
    {price:101,total:1},{price:102,total:3},{price:103,total:6}
  ]);
  assert.equal(JSON.stringify(rows),before);
});

test('empty, single-level and fractional books preserve cumulative volume', () => {
  for(const side of [true,false]) {
    assert.deepEqual(plain(context.cumulativeDepth([],side)),[]);
    assert.deepEqual(plain(context.cumulativeDepth([{price:1,size:0.25}],side)),[{price:1,total:0.25}]);
    const result=context.cumulativeDepth([{price:1,size:0.1},{price:2,size:0.2}],side);
    assert.ok(Math.abs(result.at(-1).total-0.3)<1e-12);
  }
});
