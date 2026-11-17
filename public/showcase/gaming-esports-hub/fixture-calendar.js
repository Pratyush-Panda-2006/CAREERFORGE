const DAY_MS = 24 * 60 * 60 * 1000;

export function nextWeeklyFixture(now, utcWeekday, utcTime) {
  const [hour, minute] = utcTime.split(':').map(Number);
  if (!Number.isInteger(utcWeekday) || utcWeekday < 0 || utcWeekday > 6 ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError('Invalid fixture schedule');
  }
  const daysAhead = (utcWeekday - now.getUTCDay() + 7) % 7;
  let start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, hour, minute);
  if (start <= now.getTime()) start += 7 * DAY_MS;
  return new Date(start);
}

export function formatCountdown(milliseconds) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildFixtureIcs({ id, title, start, generatedAt }) {
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vortex Arena//Showcase Fixtures//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}-${icsDate(start)}@vortex-showcase.local`,
    `DTSTAMP:${icsDate(generatedAt)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`Vortex showcase: ${title}`)}`,
    'DESCRIPTION:Illustrative weekly esports fixture. Confirm any real tournament schedule with its organizer.',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

function initFixtureCalendar() {
  const fixtures = [...document.querySelectorAll('.match-card[data-fixture-id]')].map((card) => {
    const weekday = Number(card.dataset.fixtureDay) + 1;
    const title = card.getAttribute('aria-label').replace(/^Upcoming Match:\s*/, '');
    const id = card.dataset.fixtureId;
    const utcTime = card.dataset.startUtc;
    const startLabel = card.querySelector('.fixture-start');
    const countdown = card.querySelector('.match-countdown');
    const button = card.querySelector('.btn-calendar');
    return { weekday, title, id, utcTime, startLabel, countdown, button };
  });

  function nextStart(fixture) {
    return nextWeeklyFixture(new Date(), fixture.weekday, fixture.utcTime);
  }

  function render() {
    const now = Date.now();
    fixtures.forEach((fixture) => {
      const start = nextWeeklyFixture(new Date(now), fixture.weekday, fixture.utcTime);
      fixture.startLabel.dateTime = start.toISOString();
      fixture.startLabel.textContent = `${start.toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC`;
      fixture.countdown.textContent = `Starts in ${formatCountdown(start.getTime() - now)}`;
    });
  }

  fixtures.forEach((fixture) => fixture.button.addEventListener('click', () => {
    const start = nextStart(fixture);
    const contents = buildFixtureIcs({ ...fixture, start, generatedAt: new Date() });
    const href = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = `vortex-${fixture.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }));

  render();
  let timer = window.setInterval(render, 1000);
  document.addEventListener('visibilitychange', render);
  window.addEventListener('pagehide', () => { clearInterval(timer); timer = null; });
  window.addEventListener('pageshow', () => {
    render();
    if (timer === null) timer = window.setInterval(render, 1000);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFixtureCalendar, { once: true });
  else initFixtureCalendar();
}
