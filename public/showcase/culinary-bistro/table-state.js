export const TABLES = [
  // Zone 1: Main Dining Hall (area: 'main')
  { id: 'T1', capacity: 2, minParty: 1, zone: 'Main Dining Hall', area: 'main', x: 95, y: 95 },
  { id: 'T2', capacity: 4, minParty: 1, zone: 'Main Dining Hall', area: 'main', x: 245, y: 95 },
  { id: 'T3', capacity: 8, minParty: 1, zone: 'Main Dining Hall', area: 'main', x: 170, y: 165 },

  // Zone 2: Window Booths (area: 'main')
  { id: 'T4', capacity: 2, minParty: 1, zone: 'Window Booths', area: 'main', x: 445, y: 95 },
  { id: 'T5', capacity: 4, minParty: 1, zone: 'Window Booths', area: 'main', x: 600, y: 95 },
  { id: 'T6', capacity: 6, minParty: 1, zone: 'Window Booths', area: 'main', x: 520, y: 165 },

  // Zone 3: Garden Terrace (area: 'terrace')
  { id: 'T7', capacity: 2, minParty: 1, zone: 'Garden Terrace', area: 'terrace', x: 95, y: 295 },
  { id: 'T8', capacity: 4, minParty: 1, zone: 'Garden Terrace', area: 'terrace', x: 245, y: 295 },
  { id: 'T9', capacity: 6, minParty: 1, zone: 'Garden Terrace', area: 'terrace', x: 170, y: 365 },

  // Zone 4: Chef's Counter (area: 'counter')
  { id: 'T10', capacity: 2, minParty: 1, zone: "Chef's Counter", area: 'counter', x: 445, y: 295 },
  { id: 'T11', capacity: 4, minParty: 1, zone: "Chef's Counter", area: 'counter', x: 600, y: 295 },
  { id: 'T12', capacity: 8, minParty: 1, zone: "Chef's Counter", area: 'counter', x: 520, y: 365 }
];

const SEATING_MS = 2 * 60 * 60 * 1000;
export const HOLD_MS = 5 * 60 * 1000;
export const STORAGE_KEY = 'bistro_floorplan_reservations';
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

export function validatePartySize(tableId, party) {
  const table = TABLES.find(t => t.id === tableId);
  if (!table) return { valid: false, reason: 'Unknown table.' };
  if (!Number.isInteger(party) || party < 1 || party > 8) {
    return { valid: false, reason: 'Choose a party of 1 to 8 guests.' };
  }
  const min = table.minParty || 1;
  const max = table.maxParty || table.capacity;
  if (party > max) return { valid: false, reason: `Party exceeds maximum capacity of ${max}` };
  if (party < min) return { valid: false, reason: `Party does not meet minimum seating limit of ${min}` };
  return { valid: true };
}

export class SeatingPlan {
  constructor({ demo = true, storage = (typeof localStorage !== 'undefined' ? localStorage : null) } = {}) {
    this.demo = demo;
    this.storage = storage;
    this.holds = new Map();
    this.bookings = [];
    this.sequence = 0;
    this.loadStorage();
  }

  loadStorage() {
    if (!this.storage) return;
    try {
      const saved = this.storage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.bookings = parsed;
        }
      }
    } catch {
      // storage unavailable
    }
  }

  persistStorage() {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.bookings));
    } catch {
      // storage quota or error
    }
  }

  clearBookings() {
    this.bookings = [];
    if (this.storage) {
      try { this.storage.removeItem(STORAGE_KEY); } catch {}
    }
  }

  prune(now) {
    for (const [id, hold] of this.holds) if (hold.expires <= now || hold.start <= now) this.holds.delete(id);
    const initialLen = this.bookings.length;
    this.bookings = this.bookings.filter(booking => booking.end > now);
    if (this.bookings.length !== initialLen) {
      this.persistStorage();
    }
  }

  samples(date) {
    if (!this.demo) return [];
    return [['T2', '18:00'], ['T5', '19:00']].map(([tableId, time]) => {
      const start = new Date(`${date}T${time}`).getTime();
      return { tableId, start, end: start + SEATING_MS };
    });
  }

  isCollision(tableId, interval) {
    const tableBookings = [...this.bookings, ...this.samples(new Date(interval.start).toISOString().split('T')[0])];
    return tableBookings.some(b => b.tableId === tableId && overlaps(interval, b));
  }

  availability(tableId, context, ownHold = null, now = Date.now()) {
    const interval = seatingInterval(context, now);
    const table = TABLES.find(t => t.id === tableId);
    if (!table) throw new Error('Unknown table.');
    this.prune(now);
    if (table.capacity < context.party) return 'too-small';
    if (table.minParty && context.party < table.minParty) return 'party-below-min';
    const conflict = [...this.bookings, ...this.samples(context.date)].find(booking => booking.tableId === tableId && overlaps(interval, booking));
    if (conflict) return conflict.start <= now && now < conflict.end ? 'occupied' : 'reserved';
    for (const [id, hold] of this.holds) {
      if (hold.tableId === tableId && overlaps(interval, hold) && id !== ownHold) return 'held';
    }
    return 'available';
  }

  getAvailableTables(context, now = Date.now()) {
    try {
      seatingInterval(context, now);
    } catch {
      return [];
    }
    return TABLES.filter(table => this.availability(table.id, context, null, now) === 'available');
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
    this.bookings.push(booking);
    this.holds.delete(id);
    this.persistStorage();
    return { ...booking };
  }

  release(id) { return this.holds.delete(id); }
}
