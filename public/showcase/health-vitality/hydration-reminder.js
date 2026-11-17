const STORAGE_KEY = 'vitality-hydration-reminder';
const ALLOWED_INTERVALS = [30, 60, 90];

export function nextReminderAt(now, minutes) {
  if (!ALLOWED_INTERVALS.includes(minutes)) throw new RangeError('Unsupported reminder interval');
  return now + minutes * 60 * 1000;
}

function initHydrationReminder() {
  const toggle = document.getElementById('hydration-reminder-toggle');
  const interval = document.getElementById('hydration-reminder-interval');
  const preview = document.getElementById('hydration-reminder-preview');
  const status = document.getElementById('hydration-reminder-status');
  if (!toggle || !interval || !preview || !status) return;

  let audioContext;
  let timer;
  let dueAt = 0;

  function setStatus(message) { status.textContent = message; }

  function storePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: toggle.checked, minutes: Number(interval.value) }));
    } catch { /* The active tab still keeps the reminder running. */ }
  }

  async function unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      audioContext ||= new AudioContextClass();
      if (audioContext.state === 'suspended') await audioContext.resume();
      return audioContext.state === 'running';
    } catch { return false; }
  }

  async function playChime() {
    if (!(await unlockAudio())) return false;
    const start = audioContext.currentTime;
    [523.25, 659.25].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = start + index * 0.18;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.25);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.26);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
    return true;
  }

  function notify() {
    setStatus('Time for a water break. Log a glass when you are ready.');
    void playChime();
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try { new Notification('Water break', { body: 'Take a sip and log a glass in your tracker.' }); }
      catch { /* In-page and audio reminders remain available. */ }
    }
  }

  function armTimer() {
    clearTimeout(timer);
    if (!toggle.checked) return;
    timer = window.setTimeout(() => {
      if (!toggle.checked) return;
      notify();
      schedule();
    }, Math.max(0, dueAt - Date.now()));
  }

  function schedule() {
    dueAt = nextReminderAt(Date.now(), Number(interval.value));
    armTimer();
  }

  function checkOverdue() {
    if (toggle.checked && dueAt && Date.now() >= dueAt) {
      notify();
      schedule();
    }
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (ALLOWED_INTERVALS.includes(stored.minutes)) interval.value = String(stored.minutes);
    toggle.checked = stored.enabled === true;
  } catch { /* Use the default off state. */ }

  toggle.addEventListener('change', async () => {
    storePreference();
    if (!toggle.checked) {
      clearTimeout(timer);
      dueAt = 0;
      setStatus('Reminders are off.');
      return;
    }
    await unlockAudio();
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* Audio and in-page status still work. */ }
    }
    if (!toggle.checked) return;
    schedule();
    setStatus(`Reminder on every ${interval.value} minutes while this page is open.`);
  });

  interval.addEventListener('change', () => {
    storePreference();
    if (toggle.checked) {
      schedule();
      setStatus(`Reminder on every ${interval.value} minutes while this page is open.`);
    }
  });

  preview.addEventListener('click', async () => {
    setStatus(await playChime() ? 'Chime preview played.' : 'Audio is unavailable in this browser.');
  });

  document.addEventListener('visibilitychange', checkOverdue);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', () => {
    if (!toggle.checked) return;
    if (dueAt && Date.now() >= dueAt) checkOverdue();
    else if (dueAt) armTimer();
    else schedule();
  });
  if (toggle.checked) {
    schedule();
    setStatus(`Reminder on every ${interval.value} minutes while this page is open. Tap Test chime to enable sound.`);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHydrationReminder, { once: true });
  else initHydrationReminder();
}
