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
