// Local training data only; no network telemetry or executable rule expressions.
export const EVENT_TYPES = Object.freeze({
  auth_failure: 'T1110 · Brute force',
  privilege_change: 'T1098 · Account manipulation',
  outbound_spike: 'T1041 · Exfiltration over C2',
});

export class Correlator {
  constructor() {
    this.now = 0;
    this.rules = [];
    this.events = [];
    this.incidents = [];
    this.active = new Set();
    this.seen = new Set();
    this.sequence = 0;
  }

  addRule(rule) {
    if (!rule || typeof rule.id !== 'string' || !rule.id || this.rules.some(r => r.id === rule.id)
        || typeof rule.name !== 'string' || !rule.name.trim() || rule.name.length > 80
        || !['AND', 'OR'].includes(rule.logic) || !['high', 'critical'].includes(rule.severity)
        || !Number.isInteger(rule.windowSeconds) || rule.windowSeconds < 1 || rule.windowSeconds > 300
        || !Array.isArray(rule.conditions) || rule.conditions.length < 1 || rule.conditions.length > 4
        || rule.conditions.some(c => !c || !Object.hasOwn(EVENT_TYPES, c.type)
          || !Number.isInteger(c.count) || c.count < 1 || c.count > 20)) {
      throw new Error('Use a name, AND/OR logic, a 1–300 second window and 1–4 conditions with counts of 1–20.');
    }
    if (this.rules.length >= 20) throw new Error('Remove a rule before adding more (maximum 20).');
    this.rules.push({ ...rule, name: rule.name.trim(), conditions: rule.conditions.map(c => ({ ...c })) });
    this.evaluate();
  }

  removeRule(id) {
    this.rules = this.rules.filter(r => r.id !== id);
    this.evaluate();
  }

  advance(now) {
    if (!Number.isFinite(now) || now < this.now) throw new Error('Simulation time must move forward.');
    this.now = now;
    // Every supported window fits inside this bounded history.
    this.events = this.events.filter(e => e.at >= now - 300000);
    this.seen = new Set(this.events.map(e => e.id));
    this.evaluate();
  }

  ingest(event) {
    if (!event || typeof event.id !== 'string' || !event.id || event.id.length > 100
        || !Object.hasOwn(EVENT_TYPES, event.type) || typeof event.source !== 'string'
        || !event.source.trim() || event.source.length > 80
        || !Number.isFinite(event.at) || event.at < this.now) {
      throw new Error('An event needs a unique id, known type, source and current simulation timestamp.');
    }
    if (this.seen.has(event.id)) return;
    this.advance(event.at);
    // Refuse excess data instead of silently losing correlation evidence.
    if (this.events.length >= 1000) throw new Error('Event capacity reached; advance the clock to expire older events.');
    this.events.push({ ...event, source: event.source.trim() });
    this.seen.add(event.id);
    this.evaluate();
  }

  evaluate() {
    const matching = new Set();
    for (const rule of this.rules) {
      const sources = new Map();
      for (const event of this.events) {
        if (event.at < this.now - rule.windowSeconds * 1000) continue;
        if (!sources.has(event.source)) sources.set(event.source, []);
        sources.get(event.source).push(event);
      }
      for (const [source, events] of sources) {
        const checks = rule.conditions.map(c => events.filter(e => e.type === c.type).length >= c.count);
        if (!(rule.logic === 'AND' ? checks.every(Boolean) : checks.some(Boolean))) continue;
        const key = JSON.stringify([rule.id, source]);
        matching.add(key);
        if (this.active.has(key)) continue;
        const evidence = events.filter(e => rule.conditions.some(c => c.type === e.type));
        this.incidents.unshift({
          id: `incident-${++this.sequence}`, ruleId: rule.id, ruleName: rule.name,
          source, severity: rule.severity, at: this.now, status: 'open',
          evidence: evidence.map(e => ({ ...e })),
          tactics: [...new Set(evidence.map(e => EVENT_TYPES[e.type]))],
        });
        this.incidents = this.incidents.slice(0, 100);
      }
    }
    // One incident per continuously matching episode. Ack does not re-arm it.
    this.active = matching;
  }

  acknowledge(id) {
    const incident = this.incidents.find(i => i.id === id);
    if (incident && incident.status === 'open') {
      incident.status = 'acknowledged';
      incident.acknowledgedAt = this.now;
    }
  }
}
