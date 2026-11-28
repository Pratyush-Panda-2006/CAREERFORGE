export class MusicDawStudioReadingTracker {
  constructor({ onProgress = () => {} } = {}) {
    this.onProgress = onProgress;
    this.minutes = 0;
    this.progress = 0;
  }

  computeReadTime(text, wordsPerMinute = 200) {
    const speed = wordsPerMinute > 0 ? wordsPerMinute : 200;
    const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
    this.minutes = words / speed;
    return { words, minutes: Math.ceil(this.minutes) };
  }

  // A page too short to scroll counts as fully read.
  updateScrollProgress(scrollTop, maxScroll) {
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 1;
    this.progress = Math.min(1, Math.max(0, ratio || 0));
    const state = {
      percent: Math.round(this.progress * 100),
      minutesLeft: Math.ceil(this.minutes * (1 - this.progress)),
    };
    this.onProgress(state);
    return state;
  }

  // Reports once straight away, then at most once per frame. Returns a function that unbinds.
  bindScrollListener(view = window) {
    const root = view.document.documentElement;
    let queued = false;
    const measure = () => {
      queued = false;
      this.updateScrollProgress(view.scrollY, root.scrollHeight - view.innerHeight);
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      view.requestAnimationFrame(measure);
    };
    view.addEventListener('scroll', schedule, { passive: true });
    view.addEventListener('resize', schedule);
    measure();
    return () => {
      view.removeEventListener('scroll', schedule);
      view.removeEventListener('resize', schedule);
    };
  }
}

if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  let total = '';
  const tracker = new MusicDawStudioReadingTracker({
    onProgress: ({ percent, minutesLeft }) => {
      $('fill').style.transform = `scaleX(${percent / 100})`;
      $('bar').setAttribute('aria-valuenow', String(percent));
      $('estimate').textContent = percent === 100 ? `${total}, finished` : `${total}, ${minutesLeft} min left`;
    },
  });
  total = `${tracker.computeReadTime($('article').textContent).minutes} min read`;
  tracker.bindScrollListener();
}
