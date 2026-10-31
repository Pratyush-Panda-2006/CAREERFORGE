/**
 * Prisma API Documentation Portal
 * Live Interactive API Request Playground & Simulated Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Docs Portal script initialized');

  // Reading Progress Bar
  const progressBar = document.getElementById('scrollProgress') || document.querySelector('.scroll-progress');
  const readTimeBadge = document.getElementById('readTimeBadge') || document.querySelector('.read-time-badge');
  const article = document.getElementById('docArticle') || document.querySelector('.content');
  const navLinks = document.querySelectorAll('.doc-nav a');
  const sections = document.querySelectorAll('.doc-section');

  // 1. Calculate Estimated Read Time
  function calculateReadTime() {
    if (!article || !readTimeBadge) return;
    const text = article.innerText || article.textContent || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    // Technical documentation reading speed (accounting for code blocks and tables) is ~150 words per minute
    const readMinutes = Math.max(1, Math.ceil(words / 150));
    readTimeBadge.textContent = `⏱️ ${readMinutes} min read`;
    readTimeBadge.setAttribute('title', `Estimated reading time: ${readMinutes} minute${readMinutes > 1 ? 's' : ''} (${words} words)`);
  }

  // 2. Update Reading Progress Bar
  let ticking = false;

  function updateReadingProgress() {
    if (!progressBar) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;
    const scrollableDistance = scrollHeight - clientHeight;

    let progressPercent = 0;
    if (scrollableDistance > 0) {
      progressPercent = (scrollTop / scrollableDistance) * 100;
    }

    // Clamp value between 0% and 100%
    const clampedProgress = Math.min(100, Math.max(0, progressPercent));
    progressBar.style.width = `${clampedProgress}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(clampedProgress));

    // Update active nav link based on scroll position
    updateActiveNavLink(scrollTop);

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateReadingProgress);
      ticking = true;
    }
  }

  // 3. Highlight Current Section in Sidebar
  function updateActiveNavLink(currentScroll) {
    if (sections.length === 0 || navLinks.length === 0) return;

    let currentSectionId = '';
    const triggerOffset = 140; // Offset for sticky headers/comfort

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - triggerOffset;
      if (currentScroll >= sectionTop) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (currentSectionId) {
      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href === `#${currentSectionId}`) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  }

  // 4. Interactive Feedback Buttons
  const yesBtn = document.getElementById('helpfulYes');
  const noBtn = document.getElementById('helpfulNo');
  const feedbackBox = document.querySelector('.feedback-box');

  if (yesBtn && feedbackBox) {
    yesBtn.addEventListener('click', () => {
      feedbackBox.innerHTML = '<p style="color: #38bdf8; font-weight: 600;">✨ Thanks for your feedback! Glad it helped.</p>';
    });
  }

  if (noBtn && feedbackBox) {
    noBtn.addEventListener('click', () => {
      feedbackBox.innerHTML = '<p style="color: #9ca3af;">Thank you for the feedback. We will refine this guide.</p>';
    });
  }

  // Initialize
  calculateReadTime();
  updateReadingProgress();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    calculateReadTime();
    updateReadingProgress();
  }, { passive: true });
});

// --- Global Snippet Copy Helper ---
function copySnippet(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`Copied to clipboard:\n${text}`);
  }).catch(() => {
    prompt('Copy snippet:', text);
  });
}

// Filter navigation topics without changing the article or its anchors.
(() => {
  const input = document.getElementById('topic-filter');
  const nav = document.getElementById('doc-topic-nav');
  const status = document.getElementById('topic-filter-status');
  if (!input || !nav || !status) return;
  const links = [...nav.querySelectorAll('a.nav-link')];
  const headings = [...nav.querySelectorAll('.section-title')];
  const filter = () => {
    const query = input.value.trim().toLocaleLowerCase();
    links.forEach(link => { link.hidden = !link.textContent.toLocaleLowerCase().includes(query); });
    headings.forEach(heading => {
      let sibling = heading.nextElementSibling;
      let visible = false;
      while (sibling && !sibling.classList.contains('section-title')) {
        if (sibling.matches('a.nav-link') && !sibling.hidden) visible = true;
        sibling = sibling.nextElementSibling;
      }
      heading.hidden = !visible;
    });
    const count = links.filter(link => !link.hidden).length;
    status.textContent = !query ? '' : count ? `${count} topic${count === 1 ? '' : 's'} found.` : 'No topics found. Clear the filter to see all topics.';
  };
  input.addEventListener('input', filter);
  input.addEventListener('search', filter);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { input.value = ''; filter(); event.stopPropagation(); }
  });
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
    if (target instanceof Element && (target.closest('input, textarea, select, [contenteditable]'))) return;
    event.preventDefault();
    input.focus();
  });
})();

/* ===============================================================
   API Quota Status card (Issue #187)
   Simulated hourly request quota: ring gauge, status chip and a
   reset countdown. Nothing here talks to a real API.
=============================================================== */
(function initQuotaStatus() {
  'use strict';
  var card = document.getElementById('quota-card');
  if (!card) return;

  var LIMIT = 1000;
  var WINDOW_MS = 60 * 60 * 1000;
  var CIRCUMFERENCE = 326.73; // 2 * PI * r (r = 52 in the SVG)
  var START_USED = 842;
  var START_REMAINING_MS = (17 * 60 + 43) * 1000;

  var el = {
    gauge: document.getElementById('quota-gauge'),
    ring: document.getElementById('quota-ring-fill'),
    percent: document.getElementById('quota-percent'),
    used: document.getElementById('quota-used'),
    chip: document.getElementById('quota-chip'),
    chipText: document.getElementById('quota-chip-text'),
    chipIcon: card.querySelector('.quota-chip-icon'),
    countdown: document.getElementById('quota-countdown'),
    remaining: document.getElementById('quota-remaining'),
    pace: document.getElementById('quota-pace'),
    note: document.getElementById('quota-limit-note'),
    headers: document.getElementById('quota-headers'),
    event: document.getElementById('quota-event'),
    spike: document.getElementById('quota-spike'),
    pause: document.getElementById('quota-pause'),
    skip: document.getElementById('quota-skip')
  };
  if (!el.gauge || !el.ring || !el.countdown) return;

  var used = START_USED;
  var resetAt = Date.now() + START_REMAINING_MS;
  var live = true;
  var lastStatus = '';

  var STATUSES = {
    healthy: { text: 'Healthy', icon: '●' },
    warning: { text: 'Warning', icon: '▲' },
    critical: { text: 'Critical', icon: '■' },
    limit: { text: 'Limit reached', icon: '✕' }
  };

  function statusFor(n) {
    if (n >= LIMIT) return 'limit';
    var pct = (n / LIMIT) * 100;
    if (pct >= 90) return 'critical';
    if (pct >= 70) return 'warning';
    return 'healthy';
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function remainingMs() { return Math.max(0, resetAt - Date.now()); }

  function formatClock(ms) {
    var total = Math.ceil(ms / 1000);
    return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
  }

  function say(msg) { el.event.textContent = msg; }

  function render() {
    var ms = remainingMs();
    var secs = Math.ceil(ms / 1000);
    var pct = Math.round((used / LIMIT) * 100);
    var status = statusFor(used);
    var s = STATUSES[status];

    el.ring.style.strokeDashoffset = (CIRCUMFERENCE * (1 - used / LIMIT)).toFixed(2);
    el.percent.textContent = pct + '%';
    el.used.textContent = used.toLocaleString('en-US');
    el.remaining.textContent = (LIMIT - used).toLocaleString('en-US');

    var elapsedMin = Math.max(1, (WINDOW_MS - ms) / 60000);
    el.pace.textContent = Math.round(used / elapsedMin) + ' req/min';

    el.countdown.textContent = formatClock(ms);
    el.countdown.setAttribute('datetime', 'PT' + Math.floor(secs / 60) + 'M' + (secs % 60) + 'S');

    el.gauge.setAttribute('aria-valuenow', used);
    el.gauge.setAttribute('aria-valuetext', used.toLocaleString('en-US') + ' of ' + LIMIT.toLocaleString('en-US') + ' requests used, ' + pct + ' percent, ' + s.text.toLowerCase());

    el.headers.textContent = 'X-RateLimit-Limit: ' + LIMIT + '\nX-RateLimit-Remaining: ' + (LIMIT - used) + '\nX-RateLimit-Reset: ' + secs;
    el.note.hidden = status !== 'limit';
    // aria-disabled (not disabled) so keyboard focus stays on the button when the limit is hit.
    el.spike.setAttribute('aria-disabled', used >= LIMIT ? 'true' : 'false');

    // Only touch the chip when the status changes so the polite live region stays quiet.
    if (status !== lastStatus) {
      card.setAttribute('data-status', status);
      el.chip.className = 'quota-chip ' + status;
      el.chipText.textContent = s.text;
      el.chipIcon.textContent = s.icon;
      lastStatus = status;
    }
  }

  function resetWindow() {
    used = 0;
    resetAt = Date.now() + WINDOW_MS;
    say('Quota reset. 0 of ' + LIMIT.toLocaleString('en-US') + ' requests used, next reset in 60 minutes.');
    render();
  }

  function addRequests(n) {
    used = Math.min(LIMIT, used + n);
    render();
  }

  // One tick per second: check for reset, and add a little background traffic while live.
  function tick() {
    if (remainingMs() <= 0) { resetWindow(); return; }
    if (live && used < LIMIT && Math.random() < 0.35) addRequests(1 + Math.floor(Math.random() * 2));
    else render();
  }

  el.spike.addEventListener('click', function () {
    if (used >= LIMIT) { say('Quota is already used up. Skip to reset to try again.'); return; }
    var before = used;
    addRequests(75);
    say('Traffic spike simulated: ' + (used - before) + ' extra requests.');
  });

  el.pause.addEventListener('click', function () {
    live = !live;
    card.classList.toggle('is-paused', !live);
    el.pause.textContent = live ? 'Pause live traffic' : 'Resume live traffic';
    say(live ? 'Live traffic resumed.' : 'Live traffic paused. The reset countdown keeps running.');
  });

  el.skip.addEventListener('click', function () {
    resetAt = Date.now() + 5000;
    say('Skipped ahead, quota resets in 5 seconds.');
    render();
  });

  render();
  setInterval(tick, 1000);
})();
