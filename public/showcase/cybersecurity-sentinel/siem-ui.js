import { Correlator, EVENT_TYPES } from './siem-engine.js';

const root = document.querySelector('#siem-workspace');
const engine = new Correlator();
const byId = id => root.querySelector(`#siem-${id}`);
let nextId = 0;
let timer;
const id = prefix => `${prefix}-${++nextId}`;
const label = type => `${type.replaceAll('_', ' ')} (${EVENT_TYPES[type]})`;
const time = at => `${(at / 1000).toFixed(0)}s`;
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function options(select) {
  for (const type of Object.keys(EVENT_TYPES)) {
    const option = element('option', label(type));
    option.value = type;
    select.append(option);
  }
}
root.querySelectorAll('[data-siem-event-type]').forEach(options);
byId('condition-b').value = 'privilege_change';
byId('event-type').value = 'auth_failure';

function render() {
  byId('clock').textContent = time(engine.now);
  byId('rules').replaceChildren();
  for (const rule of engine.rules) {
    const item = element('li');
    item.append(element('strong', rule.name), element('p',
      `${rule.conditions.map(c => `${c.count} × ${label(c.type)}`).join(` ${rule.logic} `)} · ${rule.windowSeconds}s · ${rule.severity}`));
    const remove = element('button', 'Remove rule');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove rule ${rule.name}`);
    remove.addEventListener('click', () => { engine.removeRule(rule.id); render(); });
    item.append(remove);
    byId('rules').append(item);
  }
  byId('events').replaceChildren();
  for (const event of engine.events.slice(-20).reverse()) {
    byId('events').append(element('li', `${time(event.at)} · ${event.source} · ${label(event.type)}`));
  }
  byId('incidents').replaceChildren();
  for (const incident of engine.incidents) {
    const card = element('article', undefined, 'siem-incident');
    card.append(element('h4', incident.ruleName),
      element('p', `${incident.severity.toUpperCase()} · ${incident.source} · ${time(incident.at)} · ${incident.status}`),
      element('p', incident.tactics.join(' / '), 'siem-tactics'));
    const evidence = element('details');
    evidence.append(element('summary', `${incident.evidence.length} correlated events`));
    const list = element('ul');
    incident.evidence.forEach(e => list.append(element('li', `${time(e.at)} · ${label(e.type)}`)));
    evidence.append(list);
    card.append(evidence);
    const ack = element('button', incident.status === 'open' ? 'Acknowledge' : 'Acknowledged');
    ack.type = 'button';
    ack.disabled = incident.status !== 'open';
    ack.setAttribute('aria-label', `Acknowledge ${incident.ruleName} on ${incident.source} at ${time(incident.at)}`);
    ack.addEventListener('click', () => {
      engine.acknowledge(incident.id);
      byId('message').textContent = `Acknowledged ${incident.ruleName} on ${incident.source}.`;
      render();
    });
    card.append(ack);
    byId('incidents').append(card);
  }
  byId('empty').hidden = engine.incidents.length > 0;
  byId('event-empty').hidden = engine.events.length > 0;
  byId('count').textContent = `${engine.incidents.filter(i => i.status === 'open').length} open incidents · ${engine.incidents.length} retained`;
}
function act(action) {
  try {
    const previous = engine.sequence;
    action();
    byId('message').textContent = engine.sequence > previous
      ? `${engine.sequence - previous} new incident(s) correlated.` : 'Simulation updated.';
  } catch (error) {
    byId('message').textContent = error.message;
    stop();
  }
  render();
}
function event(type, source) {
  engine.ingest({ id: id('event'), type, source, at: engine.now });
}
byId('rule-form').addEventListener('submit', e => {
  e.preventDefault();
  act(() => engine.addRule({
    id: id('rule'), name: byId('name').value, logic: byId('logic').value,
    windowSeconds: Number(byId('window').value), severity: byId('severity').value,
    conditions: [
      { type: byId('condition-a').value, count: Number(byId('count-a').value) },
      { type: byId('condition-b').value, count: Number(byId('count-b').value) },
    ],
  }));
});
byId('event-form').addEventListener('submit', e => {
  e.preventDefault();
  act(() => event(byId('event-type').value, byId('source').value));
});
byId('scenario').addEventListener('click', () => act(() => {
  for (let i = 0; i < 5; i++) event('auth_failure', byId('source').value);
  event('privilege_change', byId('source').value);
}));
byId('advance').addEventListener('click', () => act(() => engine.advance(engine.now + 61000)));
function stop() {
  clearInterval(timer);
  timer = undefined;
  byId('stream').textContent = 'Start sample stream';
  byId('stream').setAttribute('aria-pressed', 'false');
}
byId('stream').addEventListener('click', () => {
  if (timer) { stop(); return; }
  byId('stream').textContent = 'Pause sample stream';
  byId('stream').setAttribute('aria-pressed', 'true');
  let step = 0;
  timer = setInterval(() => act(() => {
    engine.advance(engine.now + 2000);
    event(++step % 6 === 0 ? 'privilege_change' : 'auth_failure', byId('source').value);
  }), 2000);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
engine.addRule({ id: id('rule'), name: 'Brute force then privilege change', logic: 'AND',
  windowSeconds: 60, severity: 'critical',
  conditions: [{ type: 'auth_failure', count: 5 }, { type: 'privilege_change', count: 1 }] });
render();
