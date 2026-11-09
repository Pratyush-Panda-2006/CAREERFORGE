export const TABLES = [
  { id: 'T1', capacity: 2, zone: 'Main Dining Hall', area: 'main', x: 95, y: 95 },
  { id: 'T2', capacity: 4, zone: 'Main Dining Hall', area: 'main', x: 245, y: 95 },
  { id: 'T3', capacity: 8, zone: 'Main Dining Hall', area: 'main', x: 170, y: 165 },
  { id: 'T4', capacity: 2, zone: 'Window Booths', area: 'main', x: 445, y: 115 },
  { id: 'T5', capacity: 4, zone: 'Window Booths', area: 'main', x: 600, y: 115 },
  { id: 'T6', capacity: 4, zone: 'Garden Terrace', area: 'terrace', x: 105, y: 315 },
  { id: 'T7', capacity: 6, zone: 'Garden Terrace', area: 'terrace', x: 255, y: 315 },
  { id: 'T8', capacity: 2, zone: "Chef's Counter", area: 'counter', x: 520, y: 315 }
];
const SEATING_MS = 2 * 60 * 60 * 1000;
export const HOLD_MS = 5 * 60 * 1000;
const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export function seatingInterval({ date, time, party }, now = Date.now()) {
  if (!Number.isInteger(party) || party < 1 || party > 8) throw new Error('Choose a party of 1 to 8 guests.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Select a date and seating time first.');
  const local = new Date(`${date}T${time}`);
  const normalized = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
  const clock = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
  if (!Number.isFinite(local.getTime()) || normalized !== date || clock !== time || local.getTime() <= now) throw new Error('Choose a seating time in the future.');
  return { start: local.getTime(), end: local.getTime() + SEATING_MS, party };
}

export class SeatingPlan {
  constructor({ demo = true } = {}) { this.demo = demo; this.holds = new Map(); this.bookings = []; this.sequence = 0; }
  prune(now) {
    for (const [id, hold] of this.holds) if (hold.expires <= now || hold.start <= now) this.holds.delete(id);
    this.bookings = this.bookings.filter(booking => booking.end > now);
  }
  samples(date) {
    if (!this.demo) return [];
    return [['T2', '18:00'], ['T5', '19:00']].map(([tableId, time]) => {
      const start = new Date(`${date}T${time}`).getTime();
      return { tableId, start, end: start + SEATING_MS };
    });
  }
  availability(tableId, context, ownHold = null, now = Date.now()) {
    const interval = seatingInterval(context, now);
    const table = TABLES.find(table => table.id === tableId);
    if (!table) throw new Error('Unknown table.');
    this.prune(now);
    if (table.capacity < context.party) return 'too-small';
    const conflict = [...this.bookings, ...this.samples(context.date)].find(booking => booking.tableId === tableId && overlaps(interval, booking));
    if (conflict) return conflict.start <= now && now < conflict.end ? 'occupied' : 'reserved';
    for (const [id, hold] of this.holds) {
      if (hold.tableId === tableId && overlaps(interval, hold) && id !== ownHold) return 'held';
    }
    return 'available';
  }
  hold(tableId, context, now = Date.now(), previousId = null) {
    const interval = seatingInterval(context, now);
    if (this.availability(tableId, context, previousId, now) !== 'available') throw new Error('This table cannot accommodate the selected seating. Choose another table.');
    if (previousId) this.holds.delete(previousId);
    const id = `H${++this.sequence}`;
    const hold = { id, tableId, ...interval, expires: Math.min(now + HOLD_MS, interval.start) };
    this.holds.set(id, hold);
    return { ...hold };
  }
  valid(id, context, now = Date.now()) {
    this.prune(now);
    const hold = this.holds.get(id);
    if (!hold) return false;
    const interval = seatingInterval(context, now);
    return hold.start === interval.start && hold.end === interval.end && hold.party === context.party
      && this.availability(hold.tableId, context, id, now) === 'available';
  }
  confirm(id, context, now = Date.now()) {
    if (!this.valid(id, context, now)) throw new Error('Your table hold expired or no longer matches the seating. Choose a table again.');
    if (this.bookings.length >= 100) throw new Error('This demo session has reached its reservation limit. Reload to reset.');
    const hold = this.holds.get(id);
    const booking = { tableId: hold.tableId, start: hold.start, end: hold.end, party: hold.party };
    this.bookings.push(booking); this.holds.delete(id);
    return { ...booking };
  }
  release(id) { return this.holds.delete(id); }
}
