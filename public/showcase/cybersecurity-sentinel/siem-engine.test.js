import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Correlator } from './siem-engine.js';
const rule = (overrides = {}) => ({ id: 'r', name: 'Correlate', logic: 'AND', severity: 'critical',
  windowSeconds: 60, conditions: [{ type: 'auth_failure', count: 2 }, { type: 'privilege_change', count: 1 }], ...overrides });
const send = (engine, id, type = 'auth_failure', source = 'host-a', at = engine.now) =>
  engine.ingest({ id, type, source, at });

test('AND requires every threshold for the same source, not unrelated hosts', () => {
  const e = new Correlator(); e.addRule(rule());
  send(e, '1'); send(e, '2'); send(e, '3', 'privilege_change', 'host-b');
  assert.equal(e.incidents.length, 0);
  send(e, '4', 'privilege_change');
  assert.equal(e.incidents.length, 1);
  assert.deepEqual(e.incidents[0].evidence.map(x => x.id), ['1', '2', '4']);
  assert.equal(e.incidents[0].source, 'host-a');
});
test('OR triggers on either condition and preserves rule severity and MITRE tags', () => {
  const e = new Correlator(); e.addRule(rule({ logic: 'OR', severity: 'high' }));
  send(e, '1', 'privilege_change');
  assert.equal(e.incidents[0].severity, 'high');
  assert.match(e.incidents[0].tactics[0], /T1098/);
});
test('window includes the exact boundary and expires evidence immediately afterward', () => {
  const e = new Correlator(); e.addRule(rule());
  send(e, '1'); send(e, '2'); send(e, '3', 'privilege_change', 'host-a', 60000);
  assert.equal(e.incidents.length, 1);
  e.advance(60001);
  assert.equal(e.active.size, 0);
  send(e, '4'); send(e, '5');
  assert.equal(e.incidents.length, 2);
});
test('replayed event ids cannot meet a count; ack and further matching events do not duplicate incidents', () => {
  const e = new Correlator(); e.addRule(rule());
  send(e, '1'); send(e, '1'); send(e, '3', 'privilege_change');
  assert.equal(e.incidents.length, 0);
  send(e, '2');
  e.acknowledge(e.incidents[0].id);
  send(e, '4'); e.advance(1000);
  assert.equal(e.incidents.length, 1);
  assert.equal(e.incidents[0].status, 'acknowledged');
  e.advance(61001); send(e, '5'); send(e, '6'); send(e, '7', 'privilege_change');
  assert.equal(e.incidents.length, 2);
});
test('rules and source episodes remain independent; deleting a rule preserves incident evidence', () => {
  const e = new Correlator(); e.addRule(rule()); e.addRule(rule({ id: 'other' }));
  send(e, '1'); send(e, '2'); send(e, '3', 'privilege_change');
  assert.equal(e.incidents.length, 2);
  e.removeRule('r');
  assert.equal(e.active.size, 1);
  assert.equal(e.incidents.length, 2);
  assert.equal(e.incidents[0].evidence.length, 3);
});
test('reject malformed rules and events, backward/nonfinite clocks and inherited event keys', () => {
  for (const patch of [{ logic: 'eval' }, { windowSeconds: 0 }, { windowSeconds: Infinity },
    { name: ' ' }, { severity: 'low' }, { conditions: [] },
    { conditions: [{ type: 'constructor', count: 1 }] },
    { conditions: [{ type: 'auth_failure', count: 0.5 }] }]) {
    assert.throws(() => new Correlator().addRule(rule(patch)));
  }
  const e = new Correlator(); e.addRule(rule());
  assert.throws(() => e.addRule(rule()));
  assert.throws(() => send(e, '1', 'constructor'));
  assert.throws(() => send(e, '1', 'auth_failure', ' '));
  e.advance(100);
  assert.throws(() => e.advance(99)); assert.throws(() => e.advance(NaN));
  assert.throws(() => send(e, '1', 'auth_failure', 'host', 0));
});
test('bounded history expires, enforces capacity without dropping evidence and snapshots inputs', () => {
  const e = new Correlator(); const r = rule(); e.addRule(r); r.conditions[0].count = 20;
  for (let i = 0; i < 1000; i++) send(e, String(i));
  assert.throws(() => send(e, 'overflow'), /capacity/);
  assert.equal(e.events.length, 1000);
  e.advance(300001);
  assert.equal(e.events.length, 0); assert.equal(e.seen.size, 0);
  send(e, 'new1'); send(e, 'new2'); send(e, 'new3', 'privilege_change');
  assert.equal(e.incidents.length, 1);
});
