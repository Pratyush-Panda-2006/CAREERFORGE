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

  // Add shareable anchors to article section headings.
  if (article) {
    const toast = document.createElement('div');
    toast.className = 'copy-link-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    article.querySelectorAll('h2, h3').forEach((heading) => {
      if (!heading.id) {
        heading.id = heading.textContent.trim().toLocaleLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      const link = document.createElement('a');
      link.className = 'heading-anchor';
      link.href = `#${heading.id}`;
      link.textContent = '#';
      link.setAttribute('aria-label', `Copy link to ${heading.textContent.trim()}`);
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
        try {
          await navigator.clipboard.writeText(url);
          toast.textContent = 'Section link copied';
        } catch {
          window.location.hash = heading.id;
          toast.textContent = 'Section link opened';
        }
        toast.classList.add('visible');
        window.setTimeout(() => toast.classList.remove('visible'), 1800);
      });
      heading.appendChild(link);
    });
  }

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

  // HTTP Status Codes Reference
  const statusSearch = document.getElementById('status-search');
  const statusCards = document.querySelectorAll('.status-card');
  const statusResult = document.getElementById('status-search-result');
  const statusEmpty = document.getElementById('status-empty');
  const statusDrawer = document.getElementById('status-reference-drawer');
  const statusDrawerToggle = document.getElementById('status-drawer-toggle');

  if (statusSearch && statusCards.length) {
    statusSearch.addEventListener('input', () => {
      const query = statusSearch.value.trim().toLowerCase();
      let visibleCount = 0;

      statusCards.forEach((card) => {
        const searchableText = card.dataset.status.toLowerCase();
        const matches = searchableText.includes(query);

        card.hidden = !matches;

        if (matches) {
          visibleCount += 1;
        }
      });

      if (statusResult) {
        if (query) {
          statusResult.textContent =
            `${visibleCount} status code${visibleCount === 1 ? '' : 's'} found`;
        } else {
          statusResult.textContent = '';
        }
      }

      if (statusEmpty) {
        statusEmpty.hidden = visibleCount !== 0;
      }
    });
  }

  if (statusDrawerToggle && statusDrawer) {
    statusDrawerToggle.addEventListener('click', () => {
      const isExpanded =
        statusDrawerToggle.getAttribute('aria-expanded') === 'true';

      statusDrawerToggle.setAttribute(
        'aria-expanded',
        String(!isExpanded)
      );

      statusDrawer.hidden = isExpanded;

      const label = statusDrawerToggle.querySelector('span');

      if (label) {
        label.textContent = isExpanded
          ? 'Show reference'
          : 'Hide reference';
      }

      statusDrawerToggle.lastElementChild.textContent =
        isExpanded ? '⌄' : '⌃';
    });
  }

  document.querySelectorAll('.copy-status-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const payload = button.dataset.copy;
      const originalText = button.textContent;

      try {
        await navigator.clipboard.writeText(payload);
        button.textContent = 'Copied!';
      } catch {
        window.copySnippet(payload);
        button.textContent = 'Copied!';
      }

      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1600);
    });
  });

  // Initialize
  calculateReadTime();
  updateReadingProgress();
  initCopyCodeButtons();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    calculateReadTime();
    updateReadingProgress();
  }, { passive: true });
});

// --- Global Snippet Copy Helper ---
window.copySnippet = function copySnippet(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`Copied to clipboard:\n${text}`);
  }).catch(() => {
    prompt('Copy snippet:', text);
  });
};

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

// =========================================================================
// Issue #22: Copy Code Snippet Button with Toast & Checkmark Feedback
// =========================================================================
function initCopyCodeButtons() {
  const preBlocks = document.querySelectorAll('pre');
  if (!preBlocks || preBlocks.length === 0) return;

  // Retrieve or create toast feedback element
  let toast = document.querySelector('.copy-link-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'copy-link-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('visible');
    }, 2000);
  }

  preBlocks.forEach((pre) => {
    // Avoid double injection if already present
    if (pre.querySelector('.copy-code-btn')) return;

    pre.classList.add('has-copy-btn');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-code-btn';
    btn.setAttribute('aria-label', 'Copy code snippet to clipboard');
    btn.setAttribute('title', 'Copy code snippet');

    const icon = document.createElement('span');
    icon.className = 'copy-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📋';

    const label = document.createElement('span');
    label.className = 'copy-label';
    label.textContent = 'Copy';

    btn.appendChild(icon);
    btn.appendChild(label);

    let resetTimer = null;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const codeEl = pre.querySelector('code');
      const textToCopy = (codeEl ? codeEl.textContent : pre.textContent) || '';
      const cleanedText = textToCopy.replace(/\r\n/g, '\n').trimEnd();

      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(cleanedText);
        } else {
          // Fallback selection copy
          const textarea = document.createElement('textarea');
          textarea.value = cleanedText;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }

        btn.classList.add('copied');
        icon.textContent = '✓';
        label.textContent = 'Copied!';
        showToast('Code snippet copied to clipboard');

        if (resetTimer) window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          btn.classList.remove('copied');
          icon.textContent = '📋';
          label.textContent = 'Copy';
        }, 2000);
      } catch {
        showToast('Failed to copy to clipboard');
      }
    });

    pre.appendChild(btn);
  });
}

window.initCopyCodeButtons = initCopyCodeButtons;


// ==========================================================================
// OpenAPI 3.0 / Swagger JSON Specification Parser Engine (Issue #400)
// Ingests schema JSON, builds endpoint models, parameter tables & simulators
// ==========================================================================
function initOpenApiExplorer() {
  const container = document.getElementById('openapiEndpointsContainer');
  const presetSelect = document.getElementById('openapiPresetSelect');
  const searchInput = document.getElementById('openapiSearchInput');
  const customToggleBtn = document.getElementById('openapiCustomToggleBtn');
  const customDrawer = document.getElementById('openapiCustomDrawer');
  const customTextarea = document.getElementById('openapiCustomJsonText');
  const parseCustomBtn = document.getElementById('openapiParseCustomBtn');
  const fileInput = document.getElementById('openapiFileInput');
  const parseError = document.getElementById('openapiParseError');
  const specTitle = document.getElementById('specTitle');
  const specVersion = document.getElementById('specVersion');
  const specDescription = document.getElementById('specDescription');

  if (!container || !presetSelect) return;

  const SAMPLE_SPECS = {
    'prisma-core': {
      openapi: '3.0.3',
      info: {
        title: 'Prisma Core Agent Orchestration API',
        version: 'v3.0.0',
        description: 'High-throughput agentic execution endpoints, streaming dispatchers, and stateful sessions.'
      },
      paths: {
        '/v1/agents/dispatch': {
          post: {
            summary: 'Dispatch an autonomous agent execution',
            description: 'Initiates a stateful multi-step agent workload across isolated worker sandbox containers.',
            parameters: [
              { name: 'X-Workspace-ID', in: 'header', required: true, schema: { type: 'string' }, description: 'Target workspace GUID' }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string', description: 'Registered agent worker identifier' },
                      prompt: { type: 'string', description: 'Execution instruction prompt' },
                      max_depth: { type: 'integer', description: 'Recursion execution step boundary' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': { description: 'Agent dispatch job queued successfully' },
              '400': { description: 'Malformed prompt payload or invalid parameters' },
              '429': { description: 'Workspace concurrency ceiling exceeded' }
            }
          }
        },
        '/v1/agents/{agent_id}/status': {
          get: {
            summary: 'Retrieve live agent status and metrics',
            description: 'Returns real-time execution telemetry, token consumption counters, and memory heap logs.',
            parameters: [
              { name: 'agent_id', in: 'path', required: true, schema: { type: 'string' }, description: 'Target agent UUID' },
              { name: 'verbose', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Include stack traces' }
            ],
            responses: {
              '200': { description: 'Live agent telemetry payload returned' },
              '404': { description: 'Agent worker ID not found' }
            }
          }
        },
        '/v1/agents/{agent_id}': {
          delete: {
            summary: 'Terminate running agent process',
            description: 'Gracefully halts the container execution and revokes ephemeral sandbox tokens.',
            parameters: [
              { name: 'agent_id', in: 'path', required: true, schema: { type: 'string' }, description: 'Target agent UUID' }
            ],
            responses: {
              '200': { description: 'Agent container successfully terminated' },
              '404': { description: 'Target agent not found' }
            }
          }
        }
      }
    },
    'auth-users': {
      openapi: '3.0.3',
      info: {
        title: 'Identity & Key Management API',
        version: 'v1.4.2',
        description: 'Generate scoped API tokens, revoke keys, and manage machine-to-machine service credentials.'
      },
      paths: {
        '/v1/auth/tokens': {
          post: {
            summary: 'Generate scoped JWT bearer token',
            description: 'Exchanges client secret credentials for an ephemeral cryptographic JWT token.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      client_id: { type: 'string', description: 'OAuth2 client ID' },
                      scope: { type: 'string', description: 'Requested permissions' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': { description: 'JWT bearer token successfully issued' },
              '401': { description: 'Invalid client credentials' }
            }
          }
        },
        '/v1/auth/keys': {
          get: {
            summary: 'List active API keys',
            description: 'Retrieves metadata for all active developer keys in the current workspace.',
            parameters: [
              { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max keys returned' }
            ],
            responses: {
              '200': { description: 'List of active API key records' }
            }
          }
        }
      }
    },
    'webhooks': {
      openapi: '3.0.3',
      info: {
        title: 'Webhook Events & Subscriptions API',
        version: 'v2.1.0',
        description: 'Configure real-time event webhooks with HMAC-SHA256 payload signatures.'
      },
      paths: {
        '/v1/webhooks/subscriptions': {
          get: {
            summary: 'List event webhook subscriptions',
            description: 'Returns active webhook destinations, status codes, and retry configurations.',
            responses: {
              '200': { description: 'Active webhook subscriptions' }
            }
          },
          post: {
            summary: 'Register webhook endpoint',
            description: 'Registers a new HTTPS endpoint to receive asynchronous system notifications.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      target_url: { type: 'string', description: 'HTTPS callback URL' },
                      events: { type: 'string', description: 'Comma-separated event topics' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': { description: 'Webhook registered successfully' },
              '400': { description: 'Insecure URL or missing parameters' }
            }
          }
        }
      }
    }
  };

  let currentSpec = SAMPLE_SPECS['prisma-core'];
  let currentSearch = '';

  function renderSpec(spec) {
    if (!spec || !spec.paths) {
      container.innerHTML = '<div style="color:#ef4444; padding:20px;">Invalid OpenAPI 3.0 specification: missing paths definition.</div>';
      return;
    }

    if (specTitle) specTitle.textContent = spec.info?.title || 'OpenAPI Specification';
    if (specVersion) specVersion.textContent = spec.info?.version || 'v3.0.0';
    if (specDescription) specDescription.textContent = spec.info?.description || 'Parsed schema documentation.';

    container.innerHTML = '';
    const query = currentSearch.trim().toLowerCase();

    const paths = Object.keys(spec.paths);
    let renderedCount = 0;

    paths.forEach(pathKey => {
      const pathObj = spec.paths[pathKey];
      const methods = Object.keys(pathObj).filter(m => ['get', 'post', 'put', 'delete', 'patch'].includes(m.toLowerCase()));

      methods.forEach(method => {
        const op = pathObj[method];
        const methodUpper = method.toUpperCase();

        // Search filtering
        if (query) {
          const matchPath = pathKey.toLowerCase().includes(query);
          const matchMethod = methodUpper.toLowerCase().includes(query);
          const matchSummary = (op.summary || '').toLowerCase().includes(query);
          if (!matchPath && !matchMethod && !matchSummary) return;
        }

        renderedCount++;
        const card = document.createElement('div');
        card.className = 'endpoint-card';

        // Header
        const header = document.createElement('div');
        header.className = 'endpoint-card-header';
        header.innerHTML = `
          <div class="endpoint-header-left">
            <span class="method-badge ${method.toLowerCase()}">${methodUpper}</span>
            <span class="endpoint-path">${pathKey}</span>
            <span class="endpoint-summary">${op.summary || ''}</span>
          </div>
          <span class="endpoint-expand-icon">▼</span>
        `;

        // Body
        const body = document.createElement('div');
        body.className = 'endpoint-card-body';
        body.hidden = true;

        let bodyHtml = `<p style="margin:0 0 12px; font-size:0.84rem; color:#94a3b8;">${op.description || ''}</p>`;

        // Parameters Table
        if (op.parameters && op.parameters.length > 0) {
          bodyHtml += `
            <div class="endpoint-detail-section">
              <h4>Parameters</h4>
              <table class="openapi-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>In</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${op.parameters.map(p => `
                    <tr>
                      <td><span class="param-name">${p.name}</span><span class="param-badge ${p.required ? 'required' : 'optional'}">${p.required ? 'required' : 'optional'}</span></td>
                      <td><code>${p.in}</code></td>
                      <td><span class="param-type">${p.schema?.type || 'string'}</span></td>
                      <td>${p.description || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Request Body Schema
        if (op.requestBody) {
          const schemaObj = op.requestBody.content?.['application/json']?.schema;
          const props = schemaObj?.properties || {};
          bodyHtml += `
            <div class="endpoint-detail-section">
              <h4>Request Body (application/json)</h4>
              <div style="background:#090e1a; border:1px solid #1e293b; border-radius:6px; padding:10px; font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:#38bdf8;">
                ${Object.keys(props).map(k => `<div><span style="color:#f1f5f9;">"${k}"</span>: <span style="color:#a855f7;">${props[k].type}</span> <span style="color:#64748b;">// ${props[k].description || ''}</span></div>`).join('')}
              </div>
            </div>
          `;
        }

        // Responses Table
        if (op.responses) {
          bodyHtml += `
            <div class="endpoint-detail-section">
              <h4>Responses</h4>
              <table class="openapi-table">
                <thead>
                  <tr><th>Status</th><th>Description</th></tr>
                </thead>
                <tbody>
                  ${Object.keys(op.responses).map(code => {
                    const cls = code.startsWith('2') ? 's2xx' : code.startsWith('4') ? 's4xx' : 's5xx';
                    return `<tr><td><span class="status-code-pill ${cls}">${code}</span></td><td>${op.responses[code].description || ''}</td></tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Interactive Simulator
        bodyHtml += `
          <div class="endpoint-detail-section">
            <h4>Live Request Simulator</h4>
            <div class="openapi-simulator-box">
              <div class="simulator-actions">
                <button type="button" class="openapi-tool-btn primary sim-send-btn">▶ Send Simulated Request</button>
                <span class="sim-url" style="font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:#64748b;">${methodUpper} https://api.prisma.io${pathKey}</span>
              </div>
              <div class="simulator-result-box" style="display:none;"></div>
            </div>
          </div>
        `;

        body.innerHTML = bodyHtml;

        // Toggle Expand
        header.addEventListener('click', () => {
          const isExpanded = !body.hidden;
          body.hidden = isExpanded;
          card.classList.toggle('expanded', !isExpanded);
        });

        // Wire simulator send button
        const simSendBtn = body.querySelector('.sim-send-btn');
        const simResultBox = body.querySelector('.simulator-result-box');
        if (simSendBtn && simResultBox) {
          simSendBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            simResultBox.style.display = 'block';
            simResultBox.textContent = 'Simulating HTTP roundtrip...';
            setTimeout(() => {
              const mockData = {
                status: 200,
                statusText: 'OK',
                latency_ms: Math.floor(Math.random() * 40) + 15,
                timestamp: new Date().toISOString(),
                endpoint: pathKey,
                method: methodUpper,
                data: {
                  job_id: 'job_' + Math.random().toString(36).substring(2, 9),
                  status: 'COMPLETED',
                  tokens_processed: 842,
                  worker_node: 'worker-us-east-04'
                }
              };
              simResultBox.textContent = JSON.stringify(mockData, null, 2);
            }, 300);
          });
        }

        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
      });
    });

    if (renderedCount === 0) {
      container.innerHTML = '<div style="color:#94a3b8; font-size:0.85rem; padding:30px; text-align:center;">No endpoints match the filter criteria.</div>';
    }
  }

  // Preset selector
  presetSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (SAMPLE_SPECS[val]) {
      currentSpec = SAMPLE_SPECS[val];
      renderSpec(currentSpec);
      if (parseError) parseError.hidden = true;
    }
  });

  // Filter input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderSpec(currentSpec);
    });
  }

  // Custom drawer toggle
  if (customToggleBtn && customDrawer) {
    customToggleBtn.addEventListener('click', () => {
      customDrawer.hidden = !customDrawer.hidden;
      if (!customDrawer.hidden) {
        customTextarea.value = JSON.stringify(currentSpec, null, 2);
      }
    });
  }

  // Parse custom JSON button
  if (parseCustomBtn) {
    parseCustomBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(customTextarea.value);
        if (!parsed.paths) {
          throw new Error("Invalid OpenAPI schema: Root object must include a 'paths' dictionary.");
        }
        currentSpec = parsed;
        renderSpec(currentSpec);
        if (parseError) parseError.hidden = true;
        customDrawer.hidden = true;
      } catch (err) {
        if (parseError) {
          parseError.textContent = `Parse Error: ${err.message}`;
          parseError.hidden = false;
        }
      }
    });
  }

  // File upload input
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed.paths) {
            throw new Error("Uploaded file is not a valid OpenAPI spec (missing 'paths').");
          }
          currentSpec = parsed;
          renderSpec(currentSpec);
          if (parseError) parseError.hidden = true;
        } catch (err) {
          if (parseError) {
            parseError.textContent = `File Error: ${err.message}`;
            parseError.hidden = false;
          }
        }
      };
      reader.readAsText(file);
    });
  }

  // Initial render
  renderSpec(currentSpec);
}

window.initOpenApiExplorer = initOpenApiExplorer;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOpenApiExplorer);
} else {
  initOpenApiExplorer();
}

/* ==========================================================
   Full-Text Client-Side Documentation Search Engine (Issue #337)
   ========================================================== */

class DocsSearchEngine {
  constructor() {
    this.index = [];
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeRegExp(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  buildIndex() {
    this.index = [];
    const sections = document.querySelectorAll ? document.querySelectorAll('.doc-section') : [];
    sections.forEach((sec) => {
      const secId = sec.id || '';
      // Find section title from h1 or h2
      const mainHeading = sec.querySelector ? sec.querySelector('h1, h2') : null;
      const sectionTitle = mainHeading ? mainHeading.textContent.replace(/#/g, '').trim() : secId;

      // 1. Index Headings (h1, h2, h3, h4)
      if (sec.querySelectorAll) {
        sec.querySelectorAll('h1, h2, h3, h4').forEach((h) => {
          const text = h.textContent.replace(/#/g, '').trim();
          if (!text) return;
          this.index.push({
            type: 'heading',
            sectionId: secId,
            sectionTitle,
            title: text,
            content: text,
            anchorId: h.id || secId,
            tag: (h.tagName || 'h2').toLowerCase()
          });
        });

        // 2. Index Paragraphs & Callouts
        sec.querySelectorAll('p, .callout-body').forEach((p) => {
          const text = p.textContent.trim();
          if (text.length < 15) return;
          this.index.push({
            type: 'text',
            sectionId: secId,
            sectionTitle,
            title: sectionTitle,
            content: text,
            anchorId: secId,
            tag: 'p'
          });
        });

        // 3. Index Code Snippets
        sec.querySelectorAll('pre code, pre.code-block').forEach((codeBlock) => {
          const text = codeBlock.textContent.trim();
          if (text.length < 10) return;
          this.index.push({
            type: 'code',
            sectionId: secId,
            sectionTitle,
            title: `${sectionTitle} (Code)`,
            content: text,
            anchorId: secId,
            tag: 'code'
          });
        });
      }
    });

    return this.index;
  }

  search(rawQuery, maxResults = 12) {
    const query = String(rawQuery || '').trim().toLowerCase();
    if (!query) return [];

    const queryTokens = query.split(/\s+/).filter(Boolean);
    const results = [];

    for (const item of this.index) {
      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const sectionLower = item.sectionTitle.toLowerCase();

      let score = 0;
      const matchedIndices = [];

      // Exact title match
      if (titleLower === query) {
        score += 150;
      } else if (titleLower.startsWith(query)) {
        score += 90;
      } else if (titleLower.includes(query)) {
        score += 60;
      }

      // Exact content substring match
      const fullContentIndex = contentLower.indexOf(query);
      if (fullContentIndex !== -1) {
        score += 40;
        matchedIndices.push(fullContentIndex);
      }

      // Check tokens
      let tokenMatches = 0;
      for (const token of queryTokens) {
        let tokenFound = false;
        if (titleLower.includes(token)) {
          score += 25;
          tokenFound = true;
        }
        if (sectionLower.includes(token)) {
          score += 15;
          tokenFound = true;
        }
        const idx = contentLower.indexOf(token);
        if (idx !== -1) {
          score += 15;
          tokenFound = true;
          matchedIndices.push(idx);
        }
        if (tokenFound) tokenMatches++;
      }

      // All tokens matched bonus
      if (tokenMatches > 0 && tokenMatches === queryTokens.length) {
        score += 30;
      }

      // Fuzzy subsequence test if no score yet and query length >= 3
      if (score === 0 && query.length >= 3) {
        if (this.fuzzyMatch(query, titleLower)) {
          score += 20;
        } else if (this.fuzzyMatch(query, sectionLower)) {
          score += 15;
        }
      }

      // Type weighting (only applied when an actual match occurred)
      if (score > 0) {
        if (item.type === 'heading') score += 15;
        if (item.type === 'code') score += 5;

        results.push({
          item,
          score,
          matchedIndex: matchedIndices.length > 0 ? Math.min(...matchedIndices) : -1
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults).map(({ item, score, matchedIndex }) => ({
      ...item,
      score,
      highlightedTitle: this.highlightMatches(item.title, queryTokens),
      snippet: this.generateSnippet(item.content, matchedIndex, queryTokens),
      isCode: item.type === 'code'
    }));
  }

  fuzzyMatch(needle, haystack) {
    let nIdx = 0;
    let hIdx = 0;
    while (nIdx < needle.length && hIdx < haystack.length) {
      if (needle[nIdx] === haystack[hIdx]) {
        nIdx++;
      }
      hIdx++;
    }
    return nIdx === needle.length;
  }

  generateSnippet(content, matchIndex, tokens, snippetLength = 140) {
    if (!content) return '';
    let start = 0;
    if (matchIndex > 40) {
      start = Math.max(0, matchIndex - 35);
    }
    const end = Math.min(content.length, start + snippetLength);
    let snippet = content.substring(start, end).replace(/\s+/g, ' ');
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return this.highlightMatches(snippet, tokens);
  }

  highlightMatches(text, tokens) {
    if (!tokens || tokens.length === 0) return this.escapeHtml(text);

    const pattern = tokens
      .filter(t => t.length > 0)
      .map(t => this.escapeRegExp(t))
      .join('|');

    if (!pattern) return this.escapeHtml(text);

    const regex = new RegExp(`(${pattern})`, 'gi');
    const escaped = this.escapeHtml(text);
    return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
  }
}

function initDocsSearch() {
  const engine = new DocsSearchEngine();
  engine.buildIndex();

  const backdrop = document.getElementById('searchModalBackdrop');
  const input = document.getElementById('docsSearchInput');
  const resultsContainer = document.getElementById('docsSearchResults');
  const countLabel = document.getElementById('searchResultsCount');
  const closeBtn = document.getElementById('searchModalClose');
  const triggerBtn = document.getElementById('docsSearchTrigger');

  let selectedIndex = 0;
  let currentResults = [];

  function openSearch() {
    if (!backdrop || !input) return;
    backdrop.hidden = false;
    input.value = '';
    selectedIndex = 0;
    currentResults = [];
    renderResults([]);
    input.focus();
    if (document.body && document.body.style) {
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSearch() {
    if (!backdrop) return;
    backdrop.hidden = true;
    if (document.body && document.body.style) {
      document.body.style.overflow = '';
    }
    if (triggerBtn && typeof triggerBtn.focus === 'function') {
      triggerBtn.focus();
    }
  }

  function navigateTo(anchorId) {
    closeSearch();
    if (!anchorId) return;
    const target = document.getElementById(anchorId) || (document.querySelector ? document.querySelector(`[id="${anchorId}"]`) : null);
    if (target) {
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (target.classList) {
        target.classList.add('search-target-highlight');
      }
      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState(null, '', `#${anchorId}`);
      }
      setTimeout(() => {
        if (target.classList) {
          target.classList.remove('search-target-highlight');
        }
      }, 2500);
    }
  }

  function renderResults(results) {
    currentResults = results;
    if (!resultsContainer || !countLabel) return;

    if (!input.value.trim()) {
      countLabel.textContent = 'Type to search documentation';
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          <div class="search-empty-icon">⚡</div>
          <div class="search-empty-title">Instant Full-Text Search</div>
          <p>Search across guides, API endpoints, error specs, and code blocks.</p>
        </div>
      `;
      return;
    }

    if (results.length === 0) {
      countLabel.textContent = '0 results';
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          <div class="search-empty-icon">🔍</div>
          <div class="search-empty-title">No matching documentation</div>
          <p>No results found for "${engine.escapeHtml(input.value)}". Try searching for keywords like "stream", "agent", "rate", or "token".</p>
        </div>
      `;
      return;
    }

    countLabel.textContent = `${results.length} result${results.length > 1 ? 's' : ''}`;
    resultsContainer.innerHTML = results.map((res, idx) => `
      <div
        class="search-result-item ${idx === selectedIndex ? 'selected' : ''}"
        role="option"
        id="search-res-${idx}"
        aria-selected="${idx === selectedIndex}"
        data-anchor="${engine.escapeHtml(res.anchorId)}"
        data-index="${idx}"
      >
        <div class="search-result-header">
          <div class="search-result-title">${res.highlightedTitle}</div>
          <span class="search-breadcrumb-chip">${engine.escapeHtml(res.sectionTitle)}</span>
        </div>
        <div class="search-result-snippet ${res.isCode ? 'search-result-code' : ''}">
          ${res.snippet}
        </div>
      </div>
    `).join('');

    // Attach click listeners to result items
    resultsContainer.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const anchor = item.getAttribute('data-anchor');
        navigateTo(anchor);
      });
      item.addEventListener('mouseenter', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          selectedIndex = idx;
          updateSelectedVisual();
        }
      });
    });
  }

  function updateSelectedVisual() {
    if (!resultsContainer) return;
    const items = resultsContainer.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      const isSel = idx === selectedIndex;
      item.classList.toggle('selected', isSel);
      item.setAttribute('aria-selected', String(isSel));
      if (isSel && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  if (input) {
    input.addEventListener('input', () => {
      const q = input.value.trim();
      selectedIndex = 0;
      const res = engine.search(q);
      renderResults(res);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentResults.length > 0) {
          selectedIndex = (selectedIndex + 1) % currentResults.length;
          updateSelectedVisual();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentResults.length > 0) {
          selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
          updateSelectedVisual();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentResults.length > 0 && currentResults[selectedIndex]) {
          navigateTo(currentResults[selectedIndex].anchorId);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      }
    });
  }

  if (triggerBtn) {
    triggerBtn.addEventListener('click', openSearch);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeSearch);
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeSearch();
    });
  }

  // Global keyboard shortcut: Cmd+K / Ctrl+K & Escape
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop && !backdrop.hidden) {
        closeSearch();
      } else {
        openSearch();
      }
    } else if (e.key === 'Escape' && backdrop && !backdrop.hidden) {
      e.preventDefault();
      closeSearch();
    }
  });

  return { engine, openSearch, closeSearch, navigateTo };
}

if (typeof window !== 'undefined') {
  window.DocsSearchEngine = DocsSearchEngine;
  window.initDocsSearch = initDocsSearch;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDocsSearch);
} else {
  initDocsSearch();
}

// ==========================================================================
// Token Bucket Algorithm & Interactive 429 Throttle Simulator (Issue #443)
// ==========================================================================

class TokenBucket {
  constructor(capacity = 100, refillRate = 10, initialTokens = 60) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens replenished per second
    this.tokens = Math.min(capacity, initialTokens);
    this.lastRefill = Date.now();
    this.accepted = 0;
    this.throttled = 0;
  }

  refill(now = Date.now()) {
    const elapsed = Math.max(0, (now - this.lastRefill) / 1000);
    this.lastRefill = now;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    return this.tokens;
  }

  consume(cost = 1, now = Date.now()) {
    this.refill(now);
    if (this.tokens >= cost) {
      this.tokens -= cost;
      this.accepted++;
      return {
        success: true,
        status: 200,
        cost,
        remaining: Math.floor(this.tokens),
        capacity: this.capacity,
        resetSec: Math.max(1, Math.ceil((this.capacity - this.tokens) / (this.refillRate || 1))),
        retryAfter: 0
      };
    } else {
      this.throttled++;
      const deficit = cost - this.tokens;
      const retryAfter = Math.max(1, Math.ceil(deficit / (this.refillRate || 1)));
      return {
        success: false,
        status: 429,
        cost,
        remaining: Math.floor(this.tokens),
        capacity: this.capacity,
        resetSec: Math.max(1, Math.ceil((this.capacity - this.tokens) / (this.refillRate || 1))),
        retryAfter
      };
    }
  }

  setCapacity(newCapacity) {
    this.capacity = Number(newCapacity) || 100;
    this.tokens = Math.min(this.tokens, this.capacity);
  }

  setRefillRate(newRate) {
    this.refillRate = Number(newRate) || 10;
  }

  reset() {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

function initTokenBucketSimulator() {
  const lab = document.getElementById('tokenBucketLab');
  if (!lab) return null;

  const bucket = new TokenBucket(100, 10, 60);

  const el = {
    vessel: document.getElementById('bucketVessel'),
    liquid: document.getElementById('bucketLiquid'),
    capLabel: document.getElementById('bucketCapLabel'),
    currentTokens: document.getElementById('currentTokensDisplay'),
    capacityDenom: document.getElementById('capacityDenom'),
    statusTag: document.getElementById('bucketStatusTag'),
    capSelect: document.getElementById('bucketCapacitySelect'),
    capValDisplay: document.getElementById('capacityValDisplay'),
    rateSlider: document.getElementById('refillRateSlider'),
    rateDisplay: document.getElementById('refillRateDisplay'),
    btnSingle: document.getElementById('btnReqSingle'),
    btnBatch: document.getElementById('btnReqBatch'),
    btnBurst: document.getElementById('btnReqBurst'),
    btnSteady: document.getElementById('btnScenarioSteady'),
    btnDDoS: document.getElementById('btnScenarioDDoS'),
    btnReset: document.getElementById('btnResetBucket'),
    statusPill: document.getElementById('httpStatusPill'),
    headers: document.getElementById('bucketResponseHeaders'),
    accepted: document.getElementById('metricAccepted'),
    throttled: document.getElementById('metricThrottled'),
    fill: document.getElementById('metricFill'),
    banner: document.getElementById('throttleWarningBanner')
  };

  let steadyTimer = null;

  function render(lastResult = null) {
    const fillPercent = Math.min(100, Math.max(0, (bucket.tokens / bucket.capacity) * 100));
    if (el.liquid) {
      el.liquid.style.height = `${fillPercent.toFixed(1)}%`;
      if (fillPercent <= 15) {
        el.liquid.className = 'bucket-liquid depleted';
      } else if (fillPercent <= 40) {
        el.liquid.className = 'bucket-liquid warning';
      } else {
        el.liquid.className = 'bucket-liquid healthy';
      }
    }

    if (el.currentTokens) el.currentTokens.textContent = Math.floor(bucket.tokens);
    if (el.capacityDenom) el.capacityDenom.textContent = bucket.capacity;
    if (el.capLabel) el.capLabel.textContent = bucket.capacity;
    if (el.fill) el.fill.textContent = `${Math.round(fillPercent)}%`;
    if (el.accepted) el.accepted.textContent = bucket.accepted;
    if (el.throttled) el.throttled.textContent = bucket.throttled;

    if (el.statusTag) {
      if (fillPercent === 0) {
        el.statusTag.textContent = 'EXHAUSTED';
        el.statusTag.className = 'bucket-status-tag exhausted';
      } else if (fillPercent <= 25) {
        el.statusTag.textContent = 'RESTRICTED';
        el.statusTag.className = 'bucket-status-tag warning';
      } else {
        el.statusTag.textContent = 'HEALTHY';
        el.statusTag.className = 'bucket-status-tag healthy';
      }
    }

    if (lastResult) {
      if (el.statusPill) {
        if (lastResult.status === 200) {
          el.statusPill.textContent = '200 OK';
          el.statusPill.className = 'http-status-pill status-200';
        } else {
          el.statusPill.textContent = '429 Too Many Requests';
          el.statusPill.className = 'http-status-pill status-429';
        }
      }

      if (el.headers) {
        el.headers.textContent = [
          `HTTP/1.1 ${lastResult.status} ${lastResult.status === 200 ? 'OK' : 'Too Many Requests'}`,
          'Content-Type: application/json',
          `X-RateLimit-Limit: ${lastResult.capacity}`,
          `X-RateLimit-Remaining: ${lastResult.remaining}`,
          `X-RateLimit-Reset: ${lastResult.resetSec}s`,
          `Retry-After: ${lastResult.retryAfter}s`
        ].join('\n');
      }

      if (el.banner) {
        el.banner.hidden = lastResult.status === 200;
      }

      if (el.vessel && lastResult.status === 429) {
        el.vessel.classList.add('shake-vessel');
        setTimeout(() => el.vessel.classList.remove('shake-vessel'), 350);
      }
    }
  }

  function handleRequest(cost) {
    const res = bucket.consume(cost);
    render(res);
    return res;
  }

  // Hook event listeners
  if (el.btnSingle) el.btnSingle.addEventListener('click', () => handleRequest(1));
  if (el.btnBatch) el.btnBatch.addEventListener('click', () => handleRequest(5));
  if (el.btnBurst) el.btnBurst.addEventListener('click', () => handleRequest(25));

  if (el.capSelect) {
    el.capSelect.addEventListener('change', () => {
      bucket.setCapacity(Number(el.capSelect.value));
      if (el.capValDisplay) el.capValDisplay.textContent = `${bucket.capacity} tokens`;
      render();
    });
  }

  if (el.rateSlider) {
    el.rateSlider.addEventListener('input', () => {
      bucket.setRefillRate(Number(el.rateSlider.value));
      if (el.rateDisplay) el.rateDisplay.textContent = `${bucket.refillRate} tokens/sec`;
    });
  }

  if (el.btnSteady) {
    el.btnSteady.addEventListener('click', () => {
      if (steadyTimer) {
        clearInterval(steadyTimer);
        steadyTimer = null;
        el.btnSteady.classList.remove('active');
        el.btnSteady.textContent = 'Steady Stream (5/s)';
      } else {
        el.btnSteady.classList.add('active');
        el.btnSteady.textContent = 'Stop Steady Stream';
        steadyTimer = setInterval(() => {
          handleRequest(1);
        }, 200);
      }
    });
  }

  if (el.btnDDoS) {
    el.btnDDoS.addEventListener('click', () => {
      // Blast 120 requests in rapid succession
      for (let i = 0; i < 24; i++) {
        handleRequest(5);
      }
    });
  }

  if (el.btnReset) {
    el.btnReset.addEventListener('click', () => {
      bucket.reset();
      render({
        status: 200,
        capacity: bucket.capacity,
        remaining: bucket.capacity,
        resetSec: 0,
        retryAfter: 0
      });
    });
  }

  // Refill loop (updates every 100ms)
  const ticker = setInterval(() => {
    bucket.refill();
    render();
  }, 100);

  // Initial render
  render();

  return { bucket, ticker };
}

window.TokenBucket = TokenBucket;
window.initTokenBucketSimulator = initTokenBucketSimulator;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTokenBucketSimulator);
} else {
  initTokenBucketSimulator();
}


// ============================================================================
// Issue #444: Interactive GraphQL Query Builder, AST Syntax Highlighter & Response Explorer
// ============================================================================

const GRAPHQL_MOCK_DATA = {
  users: [
    { id: 'usr_1', name: 'Alex Mercer', email: 'alex@prisma.io', role: 'Principal Architect', score: 2850, projectIds: ['prj_1', 'prj_2'] },
    { id: 'usr_2', name: 'Elena Rostova', email: 'elena@prisma.io', role: 'Staff DevOps Architect', score: 2420, projectIds: ['prj_1'] },
    { id: 'usr_3', name: 'Devon Vance', email: 'devon@prisma.io', role: 'Senior Security Specialist', score: 1980, projectIds: ['prj_2'] },
    { id: 'usr_4', name: 'Sara Chen', email: 'sara@prisma.io', role: 'Full Stack Engineer', score: 1750, projectIds: ['prj_3'] }
  ],
  projects: [
    { id: 'prj_1', name: 'CareerForge Core', key: 'CFC', repo: 'github.com/org/careerforge', status: 'active', issueIds: ['iss_102', 'iss_104', 'iss_105'] },
    { id: 'prj_2', name: 'Docs Portal Engine', key: 'DOCS', repo: 'github.com/org/docs-portal', status: 'active', issueIds: ['iss_101'] },
    { id: 'prj_3', name: 'Sentinel Security Mesh', key: 'SENT', repo: 'github.com/org/sentinel', status: 'maintenance', issueIds: ['iss_103'] }
  ],
  issues: [
    { id: 'iss_101', title: 'Implement GraphQL query resolver', status: 'in-progress', priority: 'high', points: 10, assigneeId: 'usr_1', projectId: 'prj_2' },
    { id: 'iss_102', title: 'Automate token bucket rate limiting', status: 'closed', priority: 'medium', points: 5, assigneeId: 'usr_2', projectId: 'prj_1' },
    { id: 'iss_103', title: 'Harden cryptographic key rotation', status: 'open', priority: 'critical', points: 10, assigneeId: 'usr_3', projectId: 'prj_3' },
    { id: 'iss_104', title: 'Multi-currency localized cart checkout', status: 'closed', priority: 'high', points: 10, assigneeId: 'usr_4', projectId: 'prj_1' },
    { id: 'iss_105', title: 'Virtual tape measure architectural annotator', status: 'closed', priority: 'high', points: 10, assigneeId: 'usr_1', projectId: 'prj_1' }
  ],
  leaderboard: [
    { rank: 1, userId: 'usr_1', score: 2850, badges: ['Champion', 'Top Contributor', 'Level 3 Master'] },
    { rank: 2, userId: 'usr_2', score: 2420, badges: ['Runner Up', 'Infra Wizard'] },
    { rank: 3, userId: 'usr_3', score: 1980, badges: ['Security Sentinel'] },
    { rank: 4, userId: 'usr_4', score: 1750, badges: ['Rising Star', 'Frontend Pro'] }
  ]
};

const GRAPHQL_SCHEMA = {
  types: {
    User: {
      description: 'A registered contributor or team member in the workspace',
      fields: {
        id: { type: 'ID!', description: 'Unique user identifier' },
        name: { type: 'String!', description: 'Full legal name or handle' },
        email: { type: 'String!', description: 'Verified work email address' },
        role: { type: 'String!', description: 'Engineering or organization role' },
        score: { type: 'Int!', description: 'Cumulative contribution score' },
        projects: { type: '[Project!]!', description: 'Projects this user contributes to' },
        issues: { type: '[Issue!]!', description: 'Issues assigned to this user' }
      }
    },
    Project: {
      description: 'A codebase project or showcase service within the organization',
      fields: {
        id: { type: 'ID!', description: 'Unique project identifier' },
        name: { type: 'String!', description: 'Display name of the project' },
        key: { type: 'String!', description: 'Short alphanumeric project key' },
        repo: { type: 'String!', description: 'GitHub repository path' },
        status: { type: 'String!', description: 'active | maintenance | archived' },
        issues: { type: '[Issue!]!', description: 'Issues associated with this project' }
      }
    },
    Issue: {
      description: 'A task, feature enhancement, or defect ticket',
      fields: {
        id: { type: 'ID!', description: 'Unique issue identifier' },
        title: { type: 'String!', description: 'Brief issue title' },
        status: { type: 'String!', description: 'open | in-progress | closed' },
        priority: { type: 'String!', description: 'low | medium | high | critical' },
        points: { type: 'Int!', description: 'Scored story points (e.g. 5, 10)' },
        assignee: { type: 'User', description: 'Assigned contributor' },
        project: { type: 'Project', description: 'Parent project' }
      }
    },
    Leaderboard: {
      description: 'Leaderboard ranking row for seasonal sprint',
      fields: {
        rank: { type: 'Int!', description: 'Numerical ranking on leaderboard' },
        score: { type: 'Int!', description: 'Current leaderboard points total' },
        badges: { type: '[String!]!', description: 'Awarded achievement badges' },
        user: { type: 'User!', description: 'Ranked user details' }
      }
    },
    Query: {
      description: 'Root query entrypoints',
      fields: {
        user: { type: 'User', args: { id: 'ID!' }, description: 'Find user by ID' },
        users: { type: '[User!]!', args: {}, description: 'List all contributors' },
        project: { type: 'Project', args: { id: 'ID!' }, description: 'Find project by ID' },
        projects: { type: '[Project!]!', args: { status: 'String' }, description: 'Filter projects by status' },
        issue: { type: 'Issue', args: { id: 'ID!' }, description: 'Find issue by ID' },
        issues: { type: '[Issue!]!', args: { status: 'String', priority: 'String' }, description: 'Filter issues' },
        leaderboard: { type: '[Leaderboard!]!', args: { limit: 'Int' }, description: 'Retrieve top ranked contributors' }
      }
    }
  }
};

function tokenizeGraphQL(source) {
  const tokens = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    if (/\s|,/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '#') {
      while (i < len && source[i] !== '\n') i++;
      continue;
    }

    if ('{}():!$=@'.includes(ch)) {
      tokens.push({ type: 'PUNCT', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === '"') {
      let str = '';
      i++;
      while (i < len && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < len) {
          str += source[i + 1];
          i += 2;
        } else {
          str += source[i];
          i++;
        }
      }
      i++;
      tokens.push({ type: 'STRING', value: str, pos: i });
      continue;
    }

    if (/[\d-]/.test(ch) && (i === 0 || /[\s,(:]/.test(source[i - 1]) || source[i - 1] === '[')) {
      let numStr = '';
      while (i < len && /[\d.-]/.test(source[i])) {
        numStr += source[i++];
      }
      tokens.push({ type: 'NUMBER', value: Number(numStr), pos: i });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let name = '';
      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) {
        name += source[i++];
      }
      tokens.push({ type: 'NAME', value: name, pos: i });
      continue;
    }

    i++;
  }

  tokens.push({ type: 'EOF', value: '', pos: len });
  return tokens;
}

function parseGraphQL(source) {
  const tokens = tokenizeGraphQL(source);
  let cursor = 0;

  function peek() {
    return tokens[cursor] || { type: 'EOF', value: '' };
  }

  function next() {
    return tokens[cursor++];
  }

  function expect(val) {
    const t = next();
    if (t.value !== val && t.type !== val) {
      throw new Error(`Expected "${val}" but got "${t.value || t.type}"`);
    }
    return t;
  }

  let operation = 'query';
  let opName = null;
  const variableDefinitions = [];

  if (peek().type === 'NAME' && (peek().value === 'query' || peek().value === 'mutation' || peek().value === 'subscription')) {
    operation = next().value;
    if (peek().type === 'NAME') {
      opName = next().value;
    }
    if (peek().value === '(') {
      next();
      while (peek().value !== ')' && peek().type !== 'EOF') {
        if (peek().value === '$') next();
        const varName = next().value;
        expect(':');
        const typeToken = next().value;
        let isRequired = false;
        if (peek().value === '!') {
          next();
          isRequired = true;
        }
        variableDefinitions.push({ variable: `$${varName}`, type: typeToken + (isRequired ? '!' : '') });
        if (peek().value === ',') next();
      }
      expect(')');
    }
  }

  function parseSelectionSet() {
    expect('{');
    const fields = [];
    while (peek().value !== '}' && peek().type !== 'EOF') {
      fields.push(parseField());
    }
    expect('}');
    return fields;
  }

  function parseField() {
    let name = expect('NAME').value;
    let alias = null;
    if (peek().value === ':') {
      next();
      alias = name;
      name = expect('NAME').value;
    }

    const args = {};
    if (peek().value === '(') {
      next();
      while (peek().value !== ')' && peek().type !== 'EOF') {
        const argName = expect('NAME').value;
        expect(':');
        let argVal;
        if (peek().value === '$') {
          next();
          argVal = `$${expect('NAME').value}`;
        } else if (peek().type === 'STRING' || peek().type === 'NUMBER') {
          argVal = next().value;
        } else if (peek().type === 'NAME') {
          const valName = next().value;
          if (valName === 'true') argVal = true;
          else if (valName === 'false') argVal = false;
          else if (valName === 'null') argVal = null;
          else argVal = valName;
        }
        args[argName] = argVal;
        if (peek().value === ',') next();
      }
      expect(')');
    }

    let subFields = null;
    if (peek().value === '{') {
      subFields = parseSelectionSet();
    }

    return {
      name,
      alias,
      arguments: args,
      selectionSet: subFields || []
    };
  }

  const selectionSet = parseSelectionSet();
  return {
    operation,
    name: opName,
    variableDefinitions,
    selectionSet
  };
}

class GraphQLResolver {
  constructor(data = GRAPHQL_MOCK_DATA) {
    this.data = data;
  }

  resolve(ast, variables = {}) {
    const root = {};
    const errors = [];

    const evalArg = val => {
      if (typeof val === 'string' && val.startsWith('$')) {
        const varName = val.slice(1);
        return variables[varName] !== undefined ? variables[varName] : null;
      }
      return val;
    };

    const resolveFieldOnParent = (parent, parentType, fieldNode) => {
      const fieldName = fieldNode.name;
      if (parentType === 'User') {
        if (fieldName === 'projects') {
          return (parent.projectIds || []).map(pid => this.data.projects.find(p => p.id === pid)).filter(Boolean);
        }
        if (fieldName === 'issues') {
          return this.data.issues.filter(i => i.assigneeId === parent.id);
        }
      }
      if (parentType === 'Project') {
        if (fieldName === 'issues') {
          return this.data.issues.filter(i => i.projectId === parent.id);
        }
      }
      if (parentType === 'Issue') {
        if (fieldName === 'assignee') {
          return this.data.users.find(u => u.id === parent.assigneeId) || null;
        }
        if (fieldName === 'project') {
          return this.data.projects.find(p => p.id === parent.projectId) || null;
        }
      }
      if (parentType === 'Leaderboard') {
        if (fieldName === 'user') {
          return this.data.users.find(u => u.id === parent.userId) || null;
        }
      }
      return parent[fieldName];
    };

    const executeSelectionSet = (item, typeName, selectionSet) => {
      if (item === null || item === undefined) return null;
      const res = {};
      for (const field of selectionSet) {
        const key = field.alias || field.name;
        const val = resolveFieldOnParent(item, typeName, field);
        if (field.selectionSet && field.selectionSet.length > 0) {
          let nextType = 'Object';
          if (typeName === 'User' && (field.name === 'projects')) nextType = 'Project';
          else if (typeName === 'User' && (field.name === 'issues')) nextType = 'Issue';
          else if (typeName === 'Project' && (field.name === 'issues')) nextType = 'Issue';
          else if (typeName === 'Issue' && (field.name === 'assignee')) nextType = 'User';
          else if (typeName === 'Issue' && (field.name === 'project')) nextType = 'Project';
          else if (typeName === 'Leaderboard' && (field.name === 'user')) nextType = 'User';

          if (Array.isArray(val)) {
            res[key] = val.map(el => executeSelectionSet(el, nextType, field.selectionSet));
          } else {
            res[key] = executeSelectionSet(val, nextType, field.selectionSet);
          }
        } else {
          res[key] = val !== undefined ? val : null;
        }
      }
      return res;
    };

    for (const field of ast.selectionSet) {
      const outputKey = field.alias || field.name;
      const args = {};
      for (const [k, v] of Object.entries(field.arguments || {})) {
        args[k] = evalArg(v);
      }

      let rootValue = null;
      let targetType = 'Object';

      if (field.name === 'user') {
        targetType = 'User';
        rootValue = this.data.users.find(u => u.id === args.id) || null;
      } else if (field.name === 'users') {
        targetType = 'User';
        rootValue = this.data.users;
      } else if (field.name === 'project') {
        targetType = 'Project';
        rootValue = this.data.projects.find(p => p.id === args.id) || null;
      } else if (field.name === 'projects') {
        targetType = 'Project';
        let list = this.data.projects;
        if (args.status) list = list.filter(p => p.status === args.status);
        rootValue = list;
      } else if (field.name === 'issue') {
        targetType = 'Issue';
        rootValue = this.data.issues.find(i => i.id === args.id) || null;
      } else if (field.name === 'issues') {
        targetType = 'Issue';
        let list = this.data.issues;
        if (args.status) list = list.filter(i => i.status === args.status);
        if (args.priority) list = list.filter(i => i.priority === args.priority);
        rootValue = list;
      } else if (field.name === 'leaderboard') {
        targetType = 'Leaderboard';
        let list = this.data.leaderboard;
        if (typeof args.limit === 'number' && args.limit > 0) list = list.slice(0, args.limit);
        rootValue = list;
      } else {
        errors.push({ message: `Cannot query field "${field.name}" on type "Query".` });
        continue;
      }

      if (field.selectionSet && field.selectionSet.length > 0) {
        if (Array.isArray(rootValue)) {
          root[outputKey] = rootValue.map(item => executeSelectionSet(item, targetType, field.selectionSet));
        } else {
          root[outputKey] = executeSelectionSet(rootValue, targetType, field.selectionSet);
        }
      } else {
        root[outputKey] = rootValue;
      }
    }

    return {
      data: Object.keys(root).length > 0 ? root : null,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

function escapeGraphQLHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightGraphQL(source) {
  let out = '';
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    if (ch === '#') {
      const start = i;
      while (i < len && source[i] !== '\n') i++;
      out += `<span class="gql-comment">${escapeGraphQLHtml(source.slice(start, i))}</span>`;
      continue;
    }

    if (ch === '"') {
      const start = i++;
      while (i < len && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < len) i += 2;
        else i++;
      }
      if (i < len) i++;
      out += `<span class="gql-string">${escapeGraphQLHtml(source.slice(start, i))}</span>`;
      continue;
    }

    if (ch === '$') {
      const start = i++;
      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) i++;
      out += `<span class="gql-variable">${escapeGraphQLHtml(source.slice(start, i))}</span>`;
      continue;
    }

    if (ch === '@') {
      const start = i++;
      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) i++;
      out += `<span class="gql-directive">${escapeGraphQLHtml(source.slice(start, i))}</span>`;
      continue;
    }

    if (/[\d]/.test(ch) && (i === 0 || /[\s,(:]/.test(source[i - 1]) || source[i - 1] === '[')) {
      const start = i;
      while (i < len && /[\d.]/.test(source[i])) i++;
      out += `<span class="gql-number">${escapeGraphQLHtml(source.slice(start, i))}</span>`;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) i++;
      const word = source.slice(start, i);

      let lookahead = i;
      while (lookahead < len && /\s/.test(source[lookahead])) lookahead++;
      const isArg = lookahead < len && source[lookahead] === ':';

      if (['query', 'mutation', 'subscription', 'fragment', 'on', 'type', 'schema', 'true', 'false', 'null'].includes(word)) {
        out += `<span class="gql-keyword">${escapeGraphQLHtml(word)}</span>`;
      } else if (isArg) {
        out += `<span class="gql-argument">${escapeGraphQLHtml(word)}</span>`;
      } else if (['ID', 'String', 'Int', 'Float', 'Boolean', 'User', 'Project', 'Issue', 'Leaderboard'].includes(word)) {
        out += `<span class="gql-type">${escapeGraphQLHtml(word)}</span>`;
      } else {
        out += `<span class="gql-field">${escapeGraphQLHtml(word)}</span>`;
      }
      continue;
    }

    if ('{}():![]'.includes(ch)) {
      out += `<span class="gql-punct">${escapeGraphQLHtml(ch)}</span>`;
      i++;
      continue;
    }

    out += escapeGraphQLHtml(ch);
    i++;
  }

  return out;
}

function initGraphQLPlayground() {
  const container = document.getElementById('graphql-playground');
  if (!container) return;

  const queryInput = document.getElementById('gqlQueryInput');
  const queryHighlight = document.getElementById('gqlQueryHighlight');
  const variablesInput = document.getElementById('gqlVariablesInput');
  const responseOutput = document.getElementById('gqlResponseOutput');
  const runBtn = document.getElementById('gqlRunBtn');
  const formatBtn = document.getElementById('gqlFormatBtn');
  const clearBtn = document.getElementById('gqlClearBtn');
  const presetSelect = document.getElementById('gqlPresetSelect');
  const copyBtn = document.getElementById('gqlCopyResponseBtn');
  const statusPill = document.getElementById('gqlStatusPill');
  const timePill = document.getElementById('gqlTimePill');
  const toggleVarsBtn = document.getElementById('gqlToggleVarsBtn');
  const varsDrawer = document.getElementById('gqlVarsDrawer');
  const pillsContainer = document.getElementById('gqlPillsContainer');

  const presets = {
    user: `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    role
    score
    projects {
      id
      name
      status
    }
    issues {
      id
      title
      status
      priority
    }
  }
}`,
    projects: `query GetActiveProjects($status: String) {
  projects(status: $status) {
    id
    name
    key
    repo
    status
    issues {
      id
      title
      priority
      points
    }
  }
}`,
    leaderboard: `query GetLeaderboard($limit: Int) {
  leaderboard(limit: $limit) {
    rank
    score
    badges
    user {
      id
      name
      role
    }
  }
}`,
    issues: `query GetIssues($status: String, $priority: String) {
  issues(status: $status, priority: $priority) {
    id
    title
    status
    priority
    points
    assignee {
      name
      email
    }
    project {
      name
      key
    }
  }
}`
  };

  const presetVariables = {
    user: '{\n  "id": "usr_1"\n}',
    projects: '{\n  "status": "active"\n}',
    leaderboard: '{\n  "limit": 3\n}',
    issues: '{\n  "status": "open",\n  "priority": "critical"\n}'
  };

  const resolver = new GraphQLResolver();

  function updateHighlight() {
    if (!queryInput || !queryHighlight) return;
    queryHighlight.innerHTML = highlightGraphQL(queryInput.value) + '\n';
    queryHighlight.scrollTop = queryInput.scrollTop;
    queryHighlight.scrollLeft = queryInput.scrollLeft;
  }

  function execute() {
    if (!queryInput || !responseOutput) return;
    const source = queryInput.value.trim();
    if (!source) {
      responseOutput.textContent = '// Enter a GraphQL query and click Run';
      return;
    }

    let variables = {};
    if (variablesInput && variablesInput.value.trim()) {
      try {
        variables = JSON.parse(variablesInput.value.trim());
      } catch (err) {
        if (statusPill) statusPill.textContent = '400 Bad Request';
        if (statusPill) statusPill.className = 'gql-status-badge error';
        responseOutput.textContent = JSON.stringify({
          errors: [{ message: `Variables JSON syntax error: ${err.message}` }]
        }, null, 2);
        return;
      }
    }

    const t0 = performance.now();
    try {
      const ast = parseGraphQL(source);
      const res = resolver.resolve(ast, variables);
      const latency = Math.max(8, Math.round(performance.now() - t0));

      if (statusPill) {
        statusPill.textContent = res.errors ? '200 OK (with errors)' : '200 OK';
        statusPill.className = res.errors ? 'gql-status-badge warn' : 'gql-status-badge success';
      }
      if (timePill) timePill.textContent = `${latency} ms`;

      responseOutput.textContent = JSON.stringify(res, null, 2);
    } catch (err) {
      const latency = Math.max(5, Math.round(performance.now() - t0));
      if (statusPill) {
        statusPill.textContent = '400 Syntax Error';
        statusPill.className = 'gql-status-badge error';
      }
      if (timePill) timePill.textContent = `${latency} ms`;
      responseOutput.textContent = JSON.stringify({
        errors: [{ message: err.message }]
      }, null, 2);
    }
  }

  if (queryInput) {
    queryInput.addEventListener('input', updateHighlight);
    queryInput.addEventListener('scroll', () => {
      if (queryHighlight) {
        queryHighlight.scrollTop = queryInput.scrollTop;
        queryHighlight.scrollLeft = queryInput.scrollLeft;
      }
    });
    queryInput.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        execute();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = queryInput.selectionStart;
        const end = queryInput.selectionEnd;
        queryInput.value = queryInput.value.substring(0, start) + '  ' + queryInput.value.substring(end);
        queryInput.selectionStart = queryInput.selectionEnd = start + 2;
        updateHighlight();
      }
    });
  }

  if (runBtn) runBtn.addEventListener('click', execute);

  if (formatBtn && queryInput) {
    formatBtn.addEventListener('click', () => {
      try {
        const ast = parseGraphQL(queryInput.value);
        // Simple prettifier from ast
        function formatSelection(fields, indent = '  ') {
          return fields.map(f => {
            const argsList = Object.entries(f.arguments || {}).map(([k, v]) => `${k}: ${typeof v === 'string' && !v.startsWith('$') ? `"${v}"` : v}`).join(', ');
            const argStr = argsList ? `(${argsList})` : '';
            const aliasStr = f.alias ? `${f.alias}: ` : '';
            if (f.selectionSet && f.selectionSet.length > 0) {
              return `${indent}${aliasStr}${f.name}${argStr} {\n${formatSelection(f.selectionSet, indent + '  ')}\n${indent}}`;
            }
            return `${indent}${aliasStr}${f.name}${argStr}`;
          }).join('\n');
        }

        const opStr = `${ast.operation}${ast.name ? ` ${ast.name}` : ''}`;
        const formatted = `${opStr} {\n${formatSelection(ast.selectionSet, '  ')}\n}`;
        queryInput.value = formatted;
        updateHighlight();
      } catch {
        // Leave intact if cannot parse
      }
    });
  }

  if (clearBtn && queryInput) {
    clearBtn.addEventListener('click', () => {
      queryInput.value = '';
      if (responseOutput) responseOutput.textContent = '// Query editor cleared';
      if (statusPill) statusPill.textContent = 'Idle';
      if (statusPill) statusPill.className = 'gql-status-badge';
      if (timePill) timePill.textContent = '0 ms';
      updateHighlight();
    });
  }

  if (presetSelect && queryInput) {
    presetSelect.addEventListener('change', () => {
      const key = presetSelect.value;
      if (presets[key]) {
        queryInput.value = presets[key];
        if (variablesInput && presetVariables[key]) {
          variablesInput.value = presetVariables[key];
        }
        updateHighlight();
        execute();
      }
    });
  }

  if (toggleVarsBtn && varsDrawer) {
    toggleVarsBtn.addEventListener('click', () => {
      varsDrawer.hidden = !varsDrawer.hidden;
      toggleVarsBtn.classList.toggle('active', !varsDrawer.hidden);
    });
  }

  if (copyBtn && responseOutput) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(responseOutput.textContent);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => { copyBtn.textContent = originalText; }, 1800);
      } catch {
        // Fallback
      }
    });
  }

  // Autocomplete pill clicks
  if (pillsContainer && queryInput) {
    pillsContainer.addEventListener('click', e => {
      const pill = e.target.closest('.gql-pill');
      if (!pill) return;
      const text = pill.dataset.insert || pill.textContent.trim();
      const pos = queryInput.selectionStart || queryInput.value.length;
      queryInput.value = queryInput.value.slice(0, pos) + text + ' ' + queryInput.value.slice(pos);
      queryInput.focus();
      queryInput.selectionStart = queryInput.selectionEnd = pos + text.length + 1;
      updateHighlight();
    });
  }

  // Set initial preset
  if (queryInput && !queryInput.value) {
    queryInput.value = presets.user;
    if (variablesInput) variablesInput.value = presetVariables.user;
    updateHighlight();
    execute();
  }
}

window.GRAPHQL_SCHEMA = GRAPHQL_SCHEMA;
window.GRAPHQL_MOCK_DATA = GRAPHQL_MOCK_DATA;
window.tokenizeGraphQL = tokenizeGraphQL;
window.parseGraphQL = parseGraphQL;
window.GraphQLResolver = GraphQLResolver;
window.highlightGraphQL = highlightGraphQL;
window.initGraphQLPlayground = initGraphQLPlayground;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGraphQLPlayground);
} else {
  initGraphQLPlayground();
}


/* ===== BEGIN Issue #399: Multi-Language Code Snippet Converter ===== */
(function initSnippetConverterModule() {
  const STORAGE_KEY = 'docs_portal_active_lang';

  const SNIPPETS = {
    'dispatch-agent': {
      curl: `curl -X POST https://api.prisma.io/v1/agents/dispatch \\
  -H "Authorization: Bearer prisma_live_99a84b12c58e4d1f887201a09e" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "rag-worker-01",
    "prompt": "Analyze vector embeddings for chunk #92",
    "max_tokens": 1024,
    "temperature": 0.2,
    "stream": false,
    "metadata": {
      "tenant_id": "org_48921",
      "cost_center": "mlops-platform"
    }
  }'`,
      python: `import requests

url = "https://api.prisma.io/v1/agents/dispatch"
headers = {
    "Authorization": "Bearer prisma_live_99a84b12c58e4d1f887201a09e",
    "Content-Type": "application/json"
}
payload = {
    "agent_id": "rag-worker-01",
    "prompt": "Analyze vector embeddings for chunk #92",
    "max_tokens": 1024,
    "temperature": 0.2,
    "stream": False,
    "metadata": {
        "tenant_id": "org_48921",
        "cost_center": "mlops-platform"
    }
}

response = requests.post(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Result:", response.json())`,
      javascript: `// Node.js 18+ native fetch / browser fetch
const url = 'https://api.prisma.io/v1/agents/dispatch';

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer prisma_live_99a84b12c58e4d1f887201a09e',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: 'rag-worker-01',
    prompt: 'Analyze vector embeddings for chunk #92',
    max_tokens: 1024,
    temperature: 0.2,
    stream: false,
    metadata: {
      tenant_id: 'org_48921',
      cost_center: 'mlops-platform'
    }
  })
});

const data = await response.json();
console.log('Dispatched task:', data.task_id);`,
      go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "https://api.prisma.io/v1/agents/dispatch"

	payload := map[string]interface{}{
		"agent_id":    "rag-worker-01",
		"prompt":      "Analyze vector embeddings for chunk #92",
		"max_tokens":  1024,
		"temperature": 0.2,
		"stream":      false,
		"metadata": map[string]string{
			"tenant_id":   "org_48921",
			"cost_center": "mlops-platform",
		},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer prisma_live_99a84b12c58e4d1f887201a09e")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Println("Response Status:", resp.Status)
	fmt.Println("Body:", string(respBody))
}`
    },
    'list-models': {
      curl: `curl -X GET https://api.prisma.io/v1/models \\
  -H "Authorization: Bearer prisma_live_99a84b12c58e4d1f887201a09e" \\
  -H "Accept: application/json"`,
      python: `import requests

url = "https://api.prisma.io/v1/models"
headers = {
    "Authorization": "Bearer prisma_live_99a84b12c58e4d1f887201a09e",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)
models = response.json()
for model in models.get("data", []):
    print(f"{model['id']} - Latency: {model['p99_latency_ms']}ms")`,
      javascript: `// Query active model cluster status
const response = await fetch('https://api.prisma.io/v1/models', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer prisma_live_99a84b12c58e4d1f887201a09e',
    'Accept': 'application/json'
  }
});

const { data: models } = await response.json();
console.table(models);`,
      go: `package main

import (
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "https://api.prisma.io/v1/models"

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer prisma_live_99a84b12c58e4d1f887201a09e")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
    },
    'create-embeddings': {
      curl: `curl -X POST https://api.prisma.io/v1/embeddings \\
  -H "Authorization: Bearer prisma_live_99a84b12c58e4d1f887201a09e" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "prisma-dense-v3-1536",
    "input": ["Enterprise distributed consensus protocol benchmark"],
    "encoding_format": "float"
  }'`,
      python: `import requests

url = "https://api.prisma.io/v1/embeddings"
headers = {
    "Authorization": "Bearer prisma_live_99a84b12c58e4d1f887201a09e",
    "Content-Type": "application/json"
}
payload = {
    "model": "prisma-dense-v3-1536",
    "input": ["Enterprise distributed consensus protocol benchmark"],
    "encoding_format": "float"
}

response = requests.post(url, json=payload, headers=headers)
embedding_vector = response.json()["data"][0]["embedding"]
print(f"Dimension: {len(embedding_vector)}")`,
      javascript: `// Generate vector embeddings for vector search
const response = await fetch('https://api.prisma.io/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer prisma_live_99a84b12c58e4d1f887201a09e',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'prisma-dense-v3-1536',
    input: ['Enterprise distributed consensus protocol benchmark'],
    encoding_format: 'float'
  })
});

const result = await response.json();
console.log('Embedding dimension:', result.data[0].embedding.length);`,
      go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "https://api.prisma.io/v1/embeddings"
	payload := map[string]interface{}{
		"model":           "prisma-dense-v3-1536",
		"input":           []string{"Enterprise distributed consensus protocol benchmark"},
		"encoding_format": "float",
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer prisma_live_99a84b12c58e4d1f887201a09e")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	fmt.Println("Embeddings Response:", string(respData))
}`
    }
  };

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  function highlightSyntax(code, lang) {
    const escaped = escapeHtml(code);

    if (lang === 'curl') {
      return escaped
        .replace(/(curl)/g, '<span class="tok-kw">$1</span>')
        .replace(/(-X\s+[A-Z]+)/g, '<span class="tok-flag">$1</span>')
        .replace(/(-H\s+)/g, '<span class="tok-flag">$1</span>')
        .replace(/(-d\s+)/g, '<span class="tok-flag">$1</span>')
        .replace(/(https?:\/\/[^\s\\]+)/g, '<span class="tok-url">$1</span>')
        .replace(/(".*?")/g, '<span class="tok-str">$1</span>');
    }

    if (lang === 'python') {
      return escaped
        .replace(/(import|from|for|in|def|class|return)\b/g, '<span class="tok-kw">$1</span>')
        .replace(/(True|False|None)\b/g, '<span class="tok-bool">$1</span>')
        .replace(/(requests\.(?:post|get|put|delete)|print|len)\b/g, '<span class="tok-fn">$1</span>')
        .replace(/(#.*$)/gm, '<span class="tok-comment">$1</span>')
        .replace(/(f?".*?")/g, '<span class="tok-str">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
    }

    if (lang === 'javascript') {
      return escaped
        .replace(/(const|let|var|await|async|import|from|return|function)\b/g, '<span class="tok-kw">$1</span>')
        .replace(/(true|false|null|undefined)\b/g, '<span class="tok-bool">$1</span>')
        .replace(/(fetch|console\.(?:log|table)|JSON\.(?:stringify|parse))\b/g, '<span class="tok-fn">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="tok-comment">$1</span>')
        .replace(/('.*?'|".*?")/g, '<span class="tok-str">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
    }

    if (lang === 'go') {
      return escaped
        .replace(/(package|import|func|main|var|type|struct|return|panic|defer)\b/g, '<span class="tok-kw">$1</span>')
        .replace(/(true|false|nil)\b/g, '<span class="tok-bool">$1</span>')
        .replace(/(http\.(?:NewRequest|Client)|json\.(?:Marshal|Unmarshal)|fmt\.(?:Println|Printf)|io\.ReadAll)\b/g, '<span class="tok-fn">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="tok-comment">$1</span>')
        .replace(/(".*?")/g, '<span class="tok-str">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
    }

    return escaped;
  }

  function getActiveLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'curl';
    } catch {
      return 'curl';
    }
  }

  function setActiveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    renderAllBlocks(lang);
  }

  function renderBlock(blockEl, lang) {
    const endpointKey = blockEl.getAttribute('data-endpoint');
    const endpointData = SNIPPETS[endpointKey];
    if (!endpointData) return;

    const rawCode = endpointData[lang] || endpointData.curl;
    const lines = rawCode.split('\n');

    // Update tabs active state
    const tabs = blockEl.querySelectorAll('.snippet-tab-btn');
    tabs.forEach((tab) => {
      const isTarget = tab.getAttribute('data-lang') === lang;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Render line numbers
    const lineNumbersEl = blockEl.querySelector('.snippet-line-numbers');
    if (lineNumbersEl) {
      lineNumbersEl.innerHTML = lines.map((_, i) => `<span class="snippet-line-num">${i + 1}</span>`).join('');
    }

    // Render code
    const codeEl = blockEl.querySelector('.snippet-code');
    if (codeEl) {
      codeEl.innerHTML = highlightSyntax(rawCode, lang);
      codeEl.setAttribute('data-raw', rawCode);
    }
  }

  function renderAllBlocks(lang) {
    const blocks = document.querySelectorAll('.snippet-switcher-block');
    blocks.forEach((block) => renderBlock(block, lang));
  }

  function showToast(msg) {
    const toast = document.getElementById('snippetToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  window.copySnippetCode = function(buttonEl) {
    const block = buttonEl.closest('.snippet-switcher-block');
    if (!block) return;
    const codeEl = block.querySelector('.snippet-code');
    const raw = codeEl ? (codeEl.getAttribute('data-raw') || codeEl.textContent) : '';

    const langTab = block.querySelector('.snippet-tab-btn.active');
    const langName = langTab ? langTab.textContent.trim() : 'Code';

    navigator.clipboard.writeText(raw).then(() => {
      buttonEl.classList.add('copied');
      const label = buttonEl.querySelector('.copy-label') || buttonEl;
      const originalText = label.textContent;
      label.textContent = '✓ Copied!';
      showToast(`✓ Copied ${langName} snippet to clipboard!`);

      setTimeout(() => {
        buttonEl.classList.remove('copied');
        label.textContent = originalText;
      }, 2200);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);

      buttonEl.classList.add('copied');
      setTimeout(() => buttonEl.classList.remove('copied'), 2000);
      showToast(`✓ Copied ${langName} snippet to clipboard!`);
    });
  };

  function initListeners() {
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.snippet-tab-btn');
      if (tabBtn) {
        const lang = tabBtn.getAttribute('data-lang');
        if (lang) {
          setActiveLang(lang);
        }
      }
    });

    const initialLang = getActiveLang();
    renderAllBlocks(initialLang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initListeners);
  } else {
    initListeners();
  }
})();
/* ===== END Issue #399: Multi-Language Code Snippet Converter ===== */
