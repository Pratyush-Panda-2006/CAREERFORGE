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

// Copy only code text so controls never enter the clipboard payload.
(() => {
  document.querySelectorAll('pre').forEach((pre, index) => {
    const code = pre.querySelector('code');
    if (!code) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'snippet-wrapper';
    pre.before(wrapper);
    wrapper.append(pre);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'snippet-copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', `Copy code block ${index + 1}`);
    const status = document.createElement('span');
    status.className = 'snippet-status';
    status.setAttribute('role', 'status');
    wrapper.append(button, status);
    let resetTimer;
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      clearTimeout(resetTimer);
      button.disabled = true;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = 'Copied! ✓';
        status.textContent = 'Code copied.';
      } catch {
        button.textContent = 'Copy';
        status.textContent = 'Could not copy. Select the code and copy it manually.';
      } finally {
        button.disabled = false;
        resetTimer = setTimeout(() => { button.textContent = 'Copy'; status.textContent = ''; }, 2000);
      }
    });
  });
})();
