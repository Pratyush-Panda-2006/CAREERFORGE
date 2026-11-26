/**
 * DeFi Yield Matrix — human-readable cron expression parser and next-run visualizer.
 *
 * Supports standard five-part cron expressions:
 *   minute hour day-of-month month day-of-week
 *
 * Fields accept wildcards (*), lists (1,3,5), ranges (1-5), steps (* /15) and
 * optional three-letter month / weekday names (JAN, MON).
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const MONTH_ALIASES = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

const WEEKDAY_ALIASES = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6
};

const FIELD_DEFINITIONS = [
  { label: 'Minute', min: 0, max: 59 },
  { label: 'Hour', min: 0, max: 23 },
  { label: 'Day of month', min: 1, max: 31 },
  { label: 'Month', min: 1, max: 12, aliases: MONTH_ALIASES },
  { label: 'Weekday', min: 0, max: 7, aliases: WEEKDAY_ALIASES, sundayIsSeven: true }
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function joinList(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function ordinal(number) {
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  switch (number % 10) {
    case 1: return `${number}st`;
    case 2: return `${number}nd`;
    case 3: return `${number}rd`;
    default: return `${number}th`;
  }
}

function isContiguous(values) {
  return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
}

function formatTime(hour, minute) {
  return `${pad(hour)}:${pad(minute)}`;
}

export class DefiYieldMatrixCronParser {
  #splitExpression(cronStr) {
    if (typeof cronStr !== 'string') {
      throw new TypeError('Cron expression must be a string');
    }

    const trimmed = cronStr.trim();
    const tokens = trimmed === '' ? [] : trimmed.split(/\s+/);

    if (tokens.length !== 5) {
      throw new Error(`Expected exactly 5 cron fields, received ${tokens.length}`);
    }

    return tokens;
  }

  #toFieldValue(raw, config) {
    const text = String(raw).trim();
    const aliasKey = text.toUpperCase();

    if (config.aliases && Object.prototype.hasOwnProperty.call(config.aliases, aliasKey)) {
      return config.aliases[aliasKey];
    }

    if (!/^\d+$/.test(text)) {
      throw new Error(`Invalid value "${text}" in ${config.label} field`);
    }

    const value = Number(text);
    if (value < config.min || value > config.max) {
      throw new Error(`Value ${text} out of range [${config.min}, ${config.max}]`);
    }

    return value;
  }

  #normalizeValue(value, config) {
    return config.sundayIsSeven && value === 7 ? 0 : value;
  }

  #parseField(token, config) {
    const raw = String(token).trim();
    if (raw === '') {
      throw new Error(`${config.label} field cannot be empty`);
    }

    if (raw === '*') {
      const values = [];
      for (let value = config.min; value <= config.max; value += 1) {
        values.push(this.#normalizeValue(value, config));
      }
      return Array.from(new Set(values)).sort((a, b) => a - b);
    }

    const result = new Set();

    for (const chunk of raw.split(',')) {
      const part = chunk.trim();
      if (part === '') {
        throw new Error(`Invalid list in ${config.label} field: ${raw}`);
      }

      const stepParts = part.split('/');
      if (stepParts.length > 2) {
        throw new Error(`Invalid step syntax: ${part}`);
      }

      let step = 1;
      if (stepParts.length === 2) {
        if (!/^\d+$/.test(stepParts[1])) {
          throw new Error(`Invalid step in field: ${part}`);
        }
        step = Number(stepParts[1]);
        if (step < 1) {
          throw new Error(`Invalid step in field: ${part}`);
        }
      }

      const base = stepParts[0];
      if (base === '') {
        throw new Error(`Invalid step syntax: ${part}`);
      }

      let start;
      let end;

      if (base === '*') {
        start = config.min;
        end = config.max;
      } else if (base.includes('-')) {
        const bounds = base.split('-');
        if (bounds.length !== 2) {
          throw new Error(`Invalid range in ${config.label} field: ${base}`);
        }
        start = this.#toFieldValue(bounds[0], config);
        end = this.#toFieldValue(bounds[1], config);
        if (start > end) {
          throw new Error(`Invalid range in ${config.label} field: ${base}`);
        }
      } else {
        start = this.#toFieldValue(base, config);
        end = stepParts.length === 2 ? config.max : start;
      }

      for (let value = start; value <= end; value += step) {
        result.add(this.#normalizeValue(value, config));
      }
    }

    return Array.from(result).sort((a, b) => a - b);
  }

  parseExpression(cronStr) {
    const tokens = this.#splitExpression(cronStr);
    const [minute, hour, day, month, weekday] = tokens;

    const parse = (token, index) => {
      const config = FIELD_DEFINITIONS[index];
      try {
        return this.#parseField(token, config);
      } catch (error) {
        throw new Error(`${config.label} field: ${error.message}`);
      }
    };

    return {
      minutes: parse(minute, 0),
      hours: parse(hour, 1),
      daysOfMonth: parse(day, 2),
      months: parse(month, 3),
      daysOfWeek: parse(weekday, 4),
      original: cronStr
    };
  }

  toHumanReadable(cronStr) {
    const parsed = this.parseExpression(cronStr);
    const tokens = this.#splitExpression(cronStr);
    const raw = tokens.join(' ');

    if (raw === '* * * * *') return 'Every minute of every day';
    if (raw === '0 * * * *') return 'Every hour, at minute 0';

    const minuteStep = /^\*\/(\d+)$/.exec(tokens[0]);
    if (
      minuteStep &&
      tokens[1] === '*' &&
      tokens[2] === '*' &&
      tokens[3] === '*' &&
      tokens[4] === '*'
    ) {
      return `Every ${Number(minuteStep[1])} minutes`;
    }

    const timePhrase = this.#describeTime(parsed, tokens);
    const datePhrase = this.#describeDate(parsed, tokens, timePhrase);

    return datePhrase ? `${timePhrase} ${datePhrase}` : timePhrase;
  }

  #describeMinuteValues(minutes) {
    return minutes.length === 1
      ? `minute ${minutes[0]}`
      : `minutes ${joinList(minutes.map(String))}`;
  }

  #describeHourSpan(hours) {
    if (hours.length === 1) {
      return `the ${formatTime(hours[0], 0)} hour`;
    }

    if (hours.length >= 3 && isContiguous(hours)) {
      return `from ${formatTime(hours[0], 0)} to ${formatTime(hours[hours.length - 1], 0)}`;
    }

    return `hours ${joinList(hours.map(hour => formatTime(hour, 0)))}`;
  }

  #describeHoursDuring(hours) {
    const span = this.#describeHourSpan(hours);
    return span.startsWith('the ') ? `during ${span}` : span;
  }

  #describeTime(parsed, tokens) {
    const { minutes, hours } = parsed;
    const minutesWildcard = tokens[0] === '*';
    const hoursWildcard = tokens[1] === '*';
    const minuteStep = /^\*\/(\d+)$/.exec(tokens[0]);
    const hourStep = /^\*\/(\d+)$/.exec(tokens[1]);

    if (minutesWildcard && hoursWildcard) {
      return 'Every minute';
    }

    if (minuteStep && hoursWildcard) {
      return `Every ${Number(minuteStep[1])} minutes`;
    }

    if (minutesWildcard) {
      return `Every minute ${this.#describeHoursDuring(hours)}`;
    }

    if (hoursWildcard) {
      if (minutes.length === 1) {
        return minutes[0] === 0
          ? 'Every hour'
          : `At minute ${minutes[0]} of every hour`;
      }
      return `At ${this.#describeMinuteValues(minutes)} of every hour`;
    }

    if (minuteStep) {
      return `Every ${Number(minuteStep[1])} minutes ${this.#describeHoursDuring(hours)}`;
    }

    if (hourStep && minutes.length === 1 && minutes[0] === 0) {
      return `Every ${Number(hourStep[1])} hours`;
    }

    if (minutes.length === 1 && hours.length === 1) {
      return `At ${formatTime(hours[0], minutes[0])}`;
    }

    if (minutes.length * hours.length <= 8) {
      const times = [];
      for (const hour of hours) {
        for (const minute of minutes) {
          times.push(formatTime(hour, minute));
        }
      }
      return `At ${joinList(times)}`;
    }

    if (minutes.length === 1) {
      return `At minute ${minutes[0]} ${this.#describeHoursDuring(hours)}`;
    }

    return `At ${this.#describeMinuteValues(minutes)} ${this.#describeHoursDuring(hours)}`;
  }

  #describeDayNumbers(days) {
    if (days.length >= 3 && isContiguous(days)) {
      return `${ordinal(days[0])}–${ordinal(days[days.length - 1])}`;
    }
    return joinList(days.map(ordinal));
  }

  #describeWeekdays(days) {
    if (days.length === 5 && days.every(day => day >= 1 && day <= 5)) {
      return 'weekdays';
    }

    if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return 'weekends';
    }

    const names = days.map(day => `${WEEKDAY_NAMES[day]}s`);

    if (names.length >= 3 && isContiguous(days)) {
      return `${names[0]} through ${names[names.length - 1]}`;
    }

    return joinList(names);
  }

  #describeMonths(months) {
    if (months.length >= 3 && isContiguous(months)) {
      return `${MONTH_NAMES[months[0] - 1]} through ${MONTH_NAMES[months[months.length - 1] - 1]}`;
    }
    return joinList(months.map(month => MONTH_NAMES[month - 1]));
  }

  #describeDate(parsed, tokens, timePhrase) {
    const [, , dayToken, monthToken, weekdayToken] = tokens;
    const dayRestricted = dayToken !== '*';
    const monthRestricted = monthToken !== '*';
    const weekdayRestricted = weekdayToken !== '*';

    const dayCoversAll = parsed.daysOfMonth.length === 31;
    const weekdayCoversAll = parsed.daysOfWeek.length === 7;

    const daily =
      (!dayRestricted && !weekdayRestricted) ||
      (dayRestricted && dayCoversAll) ||
      (weekdayRestricted && weekdayCoversAll);

    if (daily) {
      const recursWithinDay = timePhrase.startsWith('Every ') || timePhrase.includes('of every hour');

      if (!monthRestricted) {
        return recursWithinDay ? '' : 'every day';
      }
      if (recursWithinDay) {
        return `in ${this.#describeMonths(parsed.months)}`;
      }
      return `every day in ${this.#describeMonths(parsed.months)}`;
    }

    if (dayRestricted && weekdayRestricted) {
      const base = `on the ${this.#describeDayNumbers(parsed.daysOfMonth)} of the month or on ${this.#describeWeekdays(parsed.daysOfWeek)}`;
      return monthRestricted ? `${base} in ${this.#describeMonths(parsed.months)}` : base;
    }

    if (dayRestricted) {
      const dayPart = `on the ${this.#describeDayNumbers(parsed.daysOfMonth)}`;
      return monthRestricted
        ? `${dayPart} of ${this.#describeMonths(parsed.months)}`
        : `${dayPart} of every month`;
    }

    const weekdayPart = `on ${this.#describeWeekdays(parsed.daysOfWeek)}`;
    return monthRestricted
      ? `${weekdayPart} in ${this.#describeMonths(parsed.months)}`
      : weekdayPart;
  }

  getNextExecutionDates(cronStr, count = 5, fromDate = new Date()) {
    const parsed = this.parseExpression(cronStr);
    const tokens = this.#splitExpression(cronStr);
    const requested = Number(count);

    if (!Number.isFinite(requested) || requested <= 0) return [];
    const limit = Math.floor(requested);

    const start = fromDate instanceof Date ? new Date(fromDate.getTime()) : new Date(fromDate);
    if (Number.isNaN(start.getTime())) {
      throw new TypeError('Start date must be a valid date');
    }

    const minuteSet = new Set(parsed.minutes);
    const hourSet = new Set(parsed.hours);
    const daySet = new Set(parsed.daysOfMonth);
    const monthSet = new Set(parsed.months);
    const weekdaySet = new Set(parsed.daysOfWeek);

    const dayRestricted = tokens[2] !== '*';
    const weekdayRestricted = tokens[4] !== '*';

    const cursor = new Date(start.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    const lastYear = start.getFullYear() + 8;
    const results = [];

    while (results.length < limit && cursor.getFullYear() <= lastYear) {
      if (!monthSet.has(cursor.getMonth() + 1)) {
        cursor.setDate(1);
        cursor.setHours(0, 0, 0, 0);
        cursor.setMonth(cursor.getMonth() + 1);
        continue;
      }

      const dayMatches = daySet.has(cursor.getDate());
      const weekdayMatches = weekdaySet.has(cursor.getDay());
      const dateMatches = dayRestricted && weekdayRestricted
        ? dayMatches || weekdayMatches
        : dayMatches && weekdayMatches;

      if (!dateMatches) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
        continue;
      }

      if (!hourSet.has(cursor.getHours())) {
        cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
        continue;
      }

      if (!minuteSet.has(cursor.getMinutes())) {
        cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
        continue;
      }

      results.push(new Date(cursor.getTime()));
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
    }

    return results;
  }
}

const DEFAULT_EXPRESSION = '0 6 * * 1-5';

const UI_FIELDS = [
  { id: 'cron-minute', label: 'Minute', short: 'Min' },
  { id: 'cron-hour', label: 'Hour', short: 'Hr' },
  { id: 'cron-day', label: 'Day of month', short: 'Day' },
  { id: 'cron-month', label: 'Month', short: 'Mon' },
  { id: 'cron-weekday', label: 'Weekday', short: 'Wk' }
];

function tokenKind(token) {
  if (token === '*') return 'wildcard';
  if (token.includes('/')) return 'step';
  if (token.includes(',')) return 'list';
  if (token.includes('-')) return 'range';
  if (/^\d+$/.test(token)) return 'fixed';
  return 'custom';
}

function formatRelative(date, now = new Date()) {
  const difference = date.getTime() - now.getTime();
  const magnitude = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (magnitude < 60_000) return formatter.format(Math.round(difference / 1_000), 'second');
  if (magnitude < 3_600_000) return formatter.format(Math.round(difference / 60_000), 'minute');
  if (magnitude < 86_400_000) return formatter.format(Math.round(difference / 3_600_000), 'hour');
  if (magnitude < 2_592_000_000) return formatter.format(Math.round(difference / 86_400_000), 'day');
  if (magnitude < 31_536_000_000) return formatter.format(Math.round(difference / 2_592_000_000), 'month');
  return formatter.format(Math.round(difference / 31_536_000_000), 'year');
}

function formatDuration(milliseconds) {
  const minutes = Math.round(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;

  const hours = milliseconds / 3_600_000;
  if (hours < 48) return `${Number(hours.toFixed(1))} hr`;

  const days = milliseconds / 86_400_000;
  if (days < 60) return `${Number(days.toFixed(1))} days`;

  return `${Number((days / 30.4375).toFixed(1))} months`;
}

function initCronParserUi() {
  const root = document.querySelector('[data-cron-builder]');
  if (!root) return;

  const parser = new DefiYieldMatrixCronParser();
  const fields = UI_FIELDS.map(field => ({
    ...field,
    input: root.querySelector(`#${field.id}`)
  }));

  if (fields.some(field => !field.input)) return;

  const rawExpression = root.querySelector('#raw-expression');
  const tokenRow = root.querySelector('#cron-tokens');
  const humanText = root.querySelector('#human-readable');
  const cadenceValue = root.querySelector('#cadence-value');
  const timezoneValue = root.querySelector('#timezone-value');
  const heroNextRun = root.querySelector('#hero-next-run');
  const heroNextRelative = root.querySelector('#hero-next-relative');
  const nextRunsList = root.querySelector('#next-runs');
  const runCount = root.querySelector('#run-count');
  const errorBanner = root.querySelector('#cron-error');
  const copyButton = root.querySelector('#copy-expression');
  const copyStatus = document.querySelector('#copy-status');
  const refreshButton = root.querySelector('#refresh-runs');
  const resetButton = root.querySelector('#reset-expression');
  const presetButtons = root.querySelectorAll('[data-cron]');
  const fieldCards = root.querySelectorAll('[data-field-card]');

  const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const heroFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  let upcomingRuns = [];

  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    timezoneValue.textContent = zone ? zone.replace(/_/g, ' ') : 'Local time';
  } catch {
    timezoneValue.textContent = 'Local time';
  }

  function buildExpression() {
    return fields.map(field => field.input.value.trim() || '*').join(' ');
  }

  function renderTokens(tokens) {
    tokenRow.replaceChildren();

    tokens.forEach((token, index) => {
      const field = fields[index];
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `cron-token token-${tokenKind(token)}`;
      pill.title = `Edit the ${field.label} field`;

      const label = document.createElement('span');
      label.className = 'token-field';
      label.textContent = field.short;

      const value = document.createElement('code');
      value.textContent = token;

      pill.append(label, value);
      pill.addEventListener('click', () => {
        field.input.focus();
        field.input.select();
      });

      tokenRow.append(pill);
    });
  }

  function showError(message) {
    errorBanner.textContent = message;
    errorBanner.hidden = false;

    fieldCards.forEach(card => {
      const prefix = `${card.dataset.fieldCard} field:`.toLowerCase();
      const isInvalid = message.toLowerCase().startsWith(prefix);
      card.classList.toggle('is-invalid', isInvalid);
      const input = card.querySelector('input');
      if (input) input.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
    });
  }

  function clearError() {
    errorBanner.textContent = '';
    errorBanner.hidden = true;
    fieldCards.forEach(card => {
      card.classList.remove('is-invalid');
      const input = card.querySelector('input');
      if (input) input.setAttribute('aria-invalid', 'false');
    });
  }

  function renderRuns(runs) {
    upcomingRuns = runs.slice();
    nextRunsList.replaceChildren();

    if (runs.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'run-empty';
      empty.textContent = 'No upcoming runs found within the next 8 years. Check the day and month combination.';
      nextRunsList.append(empty);
      return;
    }

    const now = new Date();

    runs.forEach((date, index) => {
      const item = document.createElement('li');
      item.className = `run-item${index === 0 ? ' is-next' : ''}`;
      item.style.setProperty('--run-delay', String(index * 55));

      const marker = document.createElement('span');
      marker.className = 'run-index';
      marker.textContent = String(index + 1).padStart(2, '0');

      const when = document.createElement('div');
      when.className = 'run-when';

      const weekday = document.createElement('span');
      weekday.className = 'run-weekday';
      weekday.textContent = weekdayFormatter.format(date);

      const day = document.createElement('span');
      day.className = 'run-date';
      day.textContent = dateFormatter.format(date);

      when.append(weekday, day);

      const time = document.createElement('time');
      time.className = 'run-time';
      time.dateTime = date.toISOString();
      time.textContent = timeFormatter.format(date);

      const relative = document.createElement('div');
      relative.className = 'run-relative';

      if (index === 0) {
        const tag = document.createElement('span');
        tag.className = 'run-next-tag';
        tag.textContent = 'Next';
        relative.append(tag);
      }

      const relativeText = document.createElement('span');
      relativeText.className = 'run-relative-text';
      relativeText.dataset.runTime = String(date.getTime());
      relativeText.textContent = formatRelative(date, now);
      relative.append(relativeText);

      item.append(marker, when, time, relative);
      nextRunsList.append(item);
    });
  }

  function updateSummary(runs) {
    if (runs.length === 0) {
      heroNextRun.textContent = 'No run found';
      heroNextRelative.textContent = 'Adjust the schedule';
      cadenceValue.textContent = '—';
      return;
    }

    heroNextRun.textContent = heroFormatter.format(runs[0]);
    heroNextRelative.textContent = formatRelative(runs[0]);
    cadenceValue.textContent = runs.length > 1
      ? formatDuration(runs[1].getTime() - runs[0].getTime())
      : 'Single run';
  }

  function render() {
    const expression = buildExpression();
    const tokens = expression.split(/\s+/);

    rawExpression.textContent = expression;
    renderTokens(tokens);

    try {
      const human = parser.toHumanReadable(expression);
      const runs = parser.getNextExecutionDates(expression, 5);

      humanText.textContent = human;
      runCount.textContent = `${runs.length} ${runs.length === 1 ? 'run' : 'runs'}`;
      clearError();
      renderRuns(runs);
      updateSummary(runs);
    } catch (error) {
      humanText.textContent = 'This schedule cannot be translated yet.';
      runCount.textContent = '0 runs';
      showError(error.message);
      renderRuns([]);
      updateSummary([]);
    }
  }

  function setExpression(expression) {
    const tokens = expression.trim().split(/\s+/);
    if (tokens.length !== 5) return;
    fields.forEach((field, index) => {
      field.input.value = tokens[index];
    });
    render();
  }

  fields.forEach(field => {
    field.input.addEventListener('input', render);
    field.input.addEventListener('paste', event => {
      const text = event.clipboardData?.getData('text')?.trim();
      if (text && text.split(/\s+/).length === 5) {
        event.preventDefault();
        setExpression(text);
      }
    });
  });

  presetButtons.forEach(button => {
    button.addEventListener('click', () => setExpression(button.dataset.cron));
  });

  resetButton?.addEventListener('click', () => setExpression(DEFAULT_EXPRESSION));
  refreshButton?.addEventListener('click', render);

  copyButton?.addEventListener('click', async () => {
    const expression = rawExpression.textContent;
    let copied = false;

    try {
      await navigator.clipboard.writeText(expression);
      copied = true;
    } catch {
      const helper = document.createElement('textarea');
      helper.value = expression;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.append(helper);
      helper.select();
      copied = document.execCommand('copy');
      helper.remove();
    }

    if (copied) {
      copyButton.textContent = 'Copied';
      copyButton.classList.add('is-copied');
      if (copyStatus) copyStatus.textContent = `Copied ${expression}`;
      setTimeout(() => {
        copyButton.textContent = 'Copy';
        copyButton.classList.remove('is-copied');
      }, 1_600);
    }
  });

  render();

  setInterval(() => {
    if (document.hidden || upcomingRuns.length === 0) return;

    const now = new Date();
    if (upcomingRuns[0].getTime() <= now.getTime()) {
      render();
      return;
    }

    const relativeLabels = nextRunsList.querySelectorAll('[data-run-time]');
    relativeLabels.forEach(label => {
      const date = new Date(Number(label.dataset.runTime));
      label.textContent = formatRelative(date, now);
    });
    heroNextRelative.textContent = formatRelative(upcomingRuns[0], now);
  }, 30_000);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCronParserUi);
  } else {
    initCronParserUi();
  }
}
