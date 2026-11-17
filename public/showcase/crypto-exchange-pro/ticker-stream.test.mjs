import test from 'node:test';
import assert from 'node:assert/strict';
import { TickerStream, nextPrice, reconnectDelay } from './ticker-stream.js';
function setup() {
  let now = 0, id = 0; const tasks = new Map();
  const stream = new TickerStream({ btc: { base: 100, vol: 0.002 } }, {
    random: () => 0.5,
    schedule: (fn, ms) => { const key = ++id; tasks.set(key, { at: now + ms, fn }); return key; },
    cancel: key => tasks.delete(key),
  });
  const advance = ms => {
    const end = now + ms;
    while (true) {
      const next = [...tasks.entries()].filter(([,task]) => task.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      tasks.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = end;
  };
  return {stream, advance, tasks};
}
test('GBM stays positive; reconnect backoff caps at 16 seconds', () => {
  assert.ok(nextPrice(100, 0.01, () => 0.5) > 0);
  assert.deepEqual([0,1,2,3,4,10].map(reconnectDelay), [1000,2000,4000,8000,16000,16000]);
});
test('stream delivers jittered quotes and a bounded trade tape', () => {
  const {stream, advance} = setup(); const packets=[]; stream.on('packet', p=>packets.push(p));
  stream.start(); stream.start(); advance(120); assert.equal(packets.length,1);
  advance(40000); const p=packets.at(-1), m=p.markets.btc;
  assert.ok(p.latency>=15&&p.latency<=120); assert.ok(m.bid<m.price&&m.price<m.ask);
  assert.equal(m.trades.length,30); assert.equal(new Set(m.trades.map(t=>t.id)).size,30);
  p.markets.btc.price=0; assert.ok(stream.markets.btc.price>0);
});
test('dropped packet recovers by snapshot on the next sequence', () => {
  const {stream, advance} = setup(); const packets=[]; stream.on('packet',p=>packets.push(p));
  stream.start(); advance(120); stream.dropNext=true; advance(1100);
  assert.equal(packets.length,1); advance(1000);
  assert.equal(packets.at(-1).sequence,2); assert.equal(packets.at(-1).snapshot,true);
  assert.equal(packets.at(-1).recovered,1); assert.equal(packets.at(-1).markets.btc.trades.length,2);
});
test('outage retries exponentially then reconnects without duplicate pumps', () => {
  const {stream, advance} = setup(); const states=[]; stream.on('status',s=>states.push(s));
  stream.start(); advance(120); stream.outage(); advance(8000);
  assert.equal(stream.state,'connected');
  assert.deepEqual(states.filter(s=>s.state==='reconnecting').map(s=>s.delay),[1000,2000,4000]);
  const before=stream.sequence; advance(1100); assert.equal(stream.sequence,before+1);
});
test('stop cancels pending deliveries and reconnect timers; restart works', () => {
  const {stream, advance, tasks} = setup(); let packets=0; const off=stream.on('packet',()=>packets++);
  stream.start(); advance(1120); stream.stop(); advance(5000); assert.equal(packets,1); assert.equal(tasks.size,0);
  stream.start(); advance(120); assert.equal(packets,2); off(); stream.outage(); stream.stop(); advance(20000);
  assert.equal(packets,2); assert.equal(tasks.size,0);
});
