const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] },
  { name: 'day of week', min: 0, max: 7, names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toNumber(token, field) {
  const named = field.names ? field.names.indexOf(token.toLowerCase()) : -1;
  if (named !== -1) return named + field.min;
  if (!/^\d+$/.test(token)) throw new Error(`Invalid ${field.name} value "${token}"`);
  const value = Number(token);
  if (value < field.min || value > field.max) {
    throw new Error(`${field.name} must be between ${field.min} and ${field.max}, got ${value}`);
  }
  return value;
}

function parseField(text, field) {
  const values = new Set();
  for (const part of text.split(',')) {
    const pieces = part.split('/');
    const [range, step] = pieces;
    if (pieces.length > 2 || (step !== undefined && !/^[1-9]\d*$/.test(step))) {
      throw new Error(`Invalid step in ${field.name}: "${part}"`);
    }
    let start = field.min;
    let end = field.max;
    if (range !== '*') {
      const bounds = range.split('-');
      if (bounds.length > 2) throw new Error(`Invalid range in ${field.name}: "${range}"`);
      start = toNumber(bounds[0], field);
      // "5/10" means "from 5 to the end, every 10".
      if (bounds.length === 2) end = toNumber(bounds[1], field);
      else if (step === undefined) end = start;
      if (end < start) throw new Error(`Range runs backwards in ${field.name}: "${range}"`);
    }
    for (let v = start; v <= end; v += Number(step ?? 1)) values.add(v);
  }
  return [...values].sort((a, b) => a - b);
}

function list(items) {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const pad = (n) => String(n).padStart(2, '0');

export class CryptoExchangeProCronParser {
  parseExpression(cronStr) {
    const parts = String(cronStr).trim().split(/\s+/);
    if (parts.length !== 5) throw new Error('A cron expression needs exactly 5 fields');
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.map((p, i) => parseField(p, FIELDS[i]));
    return {
      minute,
      hour,
      dayOfMonth,
      month,
      // 7 is a second name for Sunday.
      dayOfWeek: [...new Set(dayOfWeek.map((d) => d % 7))].sort((a, b) => a - b),
      anyDayOfMonth: parts[2].startsWith('*'),
      anyDayOfWeek: parts[4].startsWith('*'),
    };
  }

  matchesDay(cron, date) {
    if (!cron.month.includes(date.getMonth() + 1)) return false;
    const dom = cron.dayOfMonth.includes(date.getDate());
    const dow = cron.dayOfWeek.includes(date.getDay());
    // Standard cron: when both day fields are restricted, either one may match.
    if (!cron.anyDayOfMonth && !cron.anyDayOfWeek) return dom || dow;
    return dom && dow;
  }

  getNextExecutionDates(cronStr, count = 5, from = new Date()) {
    const cron = this.parseExpression(cronStr);
    const runs = [];
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    // Eight years covers "29 February" even across a skipped leap year.
    for (let i = 0; i < 366 * 8 && runs.length < count; i += 1) {
      if (this.matchesDay(cron, day)) {
        for (const h of cron.hour) {
          for (const m of cron.minute) {
            const run = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
            // A time skipped by a daylight-saving jump does not run that day.
            if (run.getHours() === h && run > from && runs.length < count) runs.push(run);
          }
        }
      }
      day.setDate(day.getDate() + 1);
    }
    return runs;
  }

  toHumanReadable(cronStr) {
    const cron = this.parseExpression(cronStr);
    const [minuteText, hourText] = String(cronStr).trim().split(/\s+/);
    let time;
    if (minuteText === '*' && hourText === '*') {
      time = 'Every minute';
    } else if (cron.hour.length * cron.minute.length <= 6) {
      time = `At ${list(cron.hour.flatMap((h) => cron.minute.map((m) => `${pad(h)}:${pad(m)}`)))}`;
    } else {
      const minutes = cron.minute.length === 60 ? 'every minute' : `minute ${list(cron.minute)}`;
      const hours = cron.hour.length === 24 ? 'every hour' : `hour ${list(cron.hour)}`;
      time = `At ${minutes} of ${hours}`;
    }
    const days = [];
    if (cron.dayOfMonth.length < 31) days.push(`on day ${list(cron.dayOfMonth)} of the month`);
    if (cron.dayOfWeek.length < 7) days.push(`on ${list(cron.dayOfWeek.map((d) => DAYS[d]))}`);
    const either = !cron.anyDayOfMonth && !cron.anyDayOfWeek;
    const parts = [time, days.join(either ? ' or ' : ' and ')];
    if (cron.month.length < 12) parts.push(`in ${list(cron.month.map((m) => MONTHS[m - 1]))}`);
    return parts.filter(Boolean).join(', ');
  }
}

if (typeof document !== 'undefined') {
  const parser = new CryptoExchangeProCronParser();
  const inputs = [...document.querySelectorAll('[data-field]')];
  const explanation = document.getElementById('explanation');
  const runs = document.getElementById('runs');
  const tokens = document.getElementById('tokens');

  const render = () => {
    const expression = inputs.map((input) => input.value.trim() || '*').join(' ');
    tokens.textContent = expression;
    runs.replaceChildren();
    try {
      explanation.textContent = parser.toHumanReadable(expression);
      explanation.classList.remove('error');
      const next = parser.getNextExecutionDates(expression, 5);
      for (const date of next) {
        const item = document.createElement('li');
        item.textContent = date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
        runs.append(item);
      }
      if (!next.length) runs.textContent = 'This schedule never runs.';
    } catch (error) {
      explanation.textContent = error.message;
      explanation.classList.add('error');
    }
  };

  inputs.forEach((input) => input.addEventListener('input', render));
  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      button.dataset.preset.split(' ').forEach((value, i) => { inputs[i].value = value; });
      render();
    });
  });
  render();
}
