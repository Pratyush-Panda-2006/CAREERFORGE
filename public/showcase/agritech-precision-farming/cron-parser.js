export class AgritechPrecisionFarmingCronParser {
  #parseField(field, min, max, allowZeroSunday = false) {
    if (field === '*') {
      const all = [];
      for (let i = min; i <= max; i++) all.push(i);
      return all;
    }

    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2), 10);
      if (Number.isNaN(step) || step <= 0) {
        throw new Error(`Invalid step in field: ${field}`);
      }
      const values = [];
      for (let i = min; i <= max; i += step) values.push(i);
      return values;
    }

    const parts = field.split(',');
    const result = new Set();

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < min || end > max) {
          throw new Error(`Invalid range: ${part}`);
        }
        for (let i = start; i <= end; i++) result.add(i);
      } else {
        const val = parseInt(part, 10);
        if (Number.isNaN(val) || val < min || val > max) {
          if (allowZeroSunday && val === 7) {
            result.add(0);
          } else {
            throw new Error(`Value ${part} out of range [${min}, ${max}]`);
          }
        } else {
          result.add(val === 7 && allowZeroSunday ? 0 : val);
        }
      }
    }

    return Array.from(result).sort((a, b) => a - b);
  }

  parseExpression(cronStr) {
    if (typeof cronStr !== 'string') {
      throw new TypeError('Cron expression must be a string');
    }
    const tokens = cronStr.trim().split(/\s+/);
    if (tokens.length !== 5) {
      throw new Error(`Expected exactly 5 cron fields, received ${tokens.length}`);
    }

    const [minStr, hourStr, domStr, monStr, dowStr] = tokens;
    return {
      minutes: this.#parseField(minStr, 0, 59),
      hours: this.#parseField(hourStr, 0, 23),
      daysOfMonth: this.#parseField(domStr, 1, 31),
      months: this.#parseField(monStr, 1, 12),
      daysOfWeek: this.#parseField(dowStr, 0, 7, true),
      original: cronStr
    };
  }

  toHumanReadable(cronStr) {
    const parsed = this.parseExpression(cronStr);
    const tokens = cronStr.trim().split(/\s+/);
    const [min, hour, dom, mon, dow] = tokens;

    if (cronStr.trim() === '* * * * *') return 'Every minute of every day';
    if (cronStr.trim() === '0 * * * *') return 'Every hour, at minute 0';
    if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
      return `Every ${min.slice(2)} minutes`;
    }
    if (hour.startsWith('*/') && min === '0' && dom === '*' && mon === '*' && dow === '*') {
      return `Every ${hour.slice(2)} hours on the hour`;
    }

    const pad = n => String(n).padStart(2, '0');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let timeDesc = '';
    if (parsed.hours.length === 1 && parsed.minutes.length === 1) {
      timeDesc = `At ${pad(parsed.hours[0])}:${pad(parsed.minutes[0])}`;
    } else {
      timeDesc = `At minute(s) [${min}] during hour(s) [${hour}]`;
    }

    let dateDesc = '';
    if (dom !== '*' && mon !== '*') {
      dateDesc = ` on day ${dom} of month ${mon}`;
    } else if (dom !== '*') {
      dateDesc = ` on day ${dom} of the month`;
    } else if (dow !== '*') {
      const days = parsed.daysOfWeek.map(d => dayNames[d] || d).join(', ');
      dateDesc = ` on ${days}`;
    } else {
      dateDesc = ' every day';
    }

    return `${timeDesc}${dateDesc}`;
  }

  getNextExecutionDates(cronStr, count = 5, fromDate = new Date()) {
    const parsed = this.parseExpression(cronStr);
    const minSet = new Set(parsed.minutes);
    const hourSet = new Set(parsed.hours);
    const domSet = new Set(parsed.daysOfMonth);
    const monSet = new Set(parsed.months);
    const dowSet = new Set(parsed.daysOfWeek);

    const dates = [];
    const curr = new Date(fromDate.getTime());
    // Move to next minute boundary
    curr.setSeconds(0, 0);
    curr.setMinutes(curr.getMinutes() + 1);

    const maxIterations = 525600; // 1 full year of minutes max
    let iters = 0;

    while (dates.length < count && iters < maxIterations) {
      iters++;
      const m = curr.getMinutes();
      const h = curr.getHours();
      const dom = curr.getDate();
      const mon = curr.getMonth() + 1; // 1-indexed
      const dow = curr.getDay(); // 0 is Sunday

      if (
        monSet.has(mon) &&
        domSet.has(dom) &&
        dowSet.has(dow) &&
        hourSet.has(h) &&
        minSet.has(m)
      ) {
        dates.push(new Date(curr.getTime()));
      }

      curr.setMinutes(curr.getMinutes() + 1);
    }

    return dates;
  }
}

function mount() {
  const root = document.querySelector('[data-cron-lab]');
  if (!root) return;

  const parser = new AgritechPrecisionFarmingCronParser();
  const get = id => root.querySelector(`#${id}`);

  function buildExpression() {
    const min = get('cron-min').value.trim() || '*';
    const hour = get('cron-hour').value.trim() || '*';
    const dom = get('cron-dom').value.trim() || '*';
    const mon = get('cron-mon').value.trim() || '*';
    const dow = get('cron-dow').value.trim() || '*';
    return `${min} ${hour} ${dom} ${mon} ${dow}`;
  }

  function update() {
    const expr = buildExpression();
    get('raw-expression').textContent = expr;

    try {
      const readable = parser.toHumanReadable(expr);
      get('human-readable-desc').textContent = readable;
      get('error-banner').style.display = 'none';

      const nextRuns = parser.getNextExecutionDates(expr, 5);
      const runList = get('next-runs-list');
      if (runList) {
        runList.replaceChildren();
        nextRuns.forEach((date, idx) => {
          const item = document.createElement('div');
          item.className = 'next-run-item';
          item.innerHTML = `<span class="run-index">#${idx + 1}</span> <span class="run-date">${date.toUTCString()}</span>`;
          runList.appendChild(item);
        });
      }
    } catch (err) {
      get('error-banner').textContent = err.message;
      get('error-banner').style.display = 'block';
    }
  }

  ['cron-min', 'cron-hour', 'cron-dom', 'cron-mon', 'cron-dow'].forEach(id => {
    get(id)?.addEventListener('input', update);
  });

  // Preset buttons
  get('preset-irrigation')?.addEventListener('click', () => {
    get('cron-min').value = '0';
    get('cron-hour').value = '6';
    get('cron-dom').value = '*';
    get('cron-mon').value = '*';
    get('cron-dow').value = '*';
    update();
  });

  get('preset-drone-patrol')?.addEventListener('click', () => {
    get('cron-min').value = '*/30';
    get('cron-hour').value = '8-18';
    get('cron-dom').value = '*';
    get('cron-mon').value = '*';
    get('cron-dow').value = '1-5';
    update();
  });

  get('preset-sensor-mesh')?.addEventListener('click', () => {
    get('cron-min').value = '*/15';
    get('cron-hour').value = '*';
    get('cron-dom').value = '*';
    get('cron-mon').value = '*';
    get('cron-dow').value = '*';
    update();
  });

  update();
}

if (typeof document !== 'undefined') mount();
