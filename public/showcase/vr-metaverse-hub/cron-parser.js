export class VrMetaverseHubCronParser {
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

  getNextExecutionDates(cronStr, count = 5, startDate = new Date()) {
    const parsed = this.parseExpression(cronStr);
    const results = [];
    let current = new Date(startDate.getTime());

    current.setSeconds(0, 0);
    current.setMinutes(current.getMinutes() + 1);

    const maxIterations = 50000;
    let iterations = 0;

    while (results.length < count && iterations < maxIterations) {
      iterations++;

      const mon = current.getMonth() + 1;
      if (!parsed.months.includes(mon)) {
        current.setMonth(current.getMonth() + 1, 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      const dom = current.getDate();
      const dow = current.getDay();
      if (!parsed.daysOfMonth.includes(dom) || !parsed.daysOfWeek.includes(dow)) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      const hour = current.getHours();
      if (!parsed.hours.includes(hour)) {
        current.setHours(current.getHours() + 1, 0, 0, 0);
        continue;
      }

      const min = current.getMinutes();
      if (!parsed.minutes.includes(min)) {
        current.setMinutes(current.getMinutes() + 1);
        continue;
      }

      results.push(new Date(current.getTime()));
      current.setMinutes(current.getMinutes() + 1);
    }

    return results;
  }
}

function mount() {
  const root = document.querySelector('[data-cron-lab]');
  if (!root) return;

  const parser = new VrMetaverseHubCronParser();
  const input = root.querySelector('#cron-input');
  const humanCard = root.querySelector('#cron-human');
  const scheduleList = root.querySelector('#cron-schedule');
  const errorBox = root.querySelector('#cron-error');

  function render() {
    const val = input.value.trim();
    try {
      const human = parser.toHumanReadable(val);
      const nextDates = parser.getNextExecutionDates(val, 5);

      humanCard.textContent = human;
      errorBox.textContent = '';
      errorBox.classList.add('hidden');

      scheduleList.innerHTML = '';
      nextDates.forEach((d, i) => {
        const li = document.createElement('li');
        li.className = 'cron-run-item';
        li.innerHTML = `<span class="run-index">#${i + 1}</span> <span class="run-date">${d.toLocaleString()}</span>`;
        scheduleList.appendChild(li);
      });
    } catch (err) {
      humanCard.textContent = 'Invalid expression';
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      scheduleList.innerHTML = '';
    }
  }

  input.addEventListener('input', render);
  root.querySelectorAll('.quick-cron-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.cron;
      render();
    });
  });

  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
