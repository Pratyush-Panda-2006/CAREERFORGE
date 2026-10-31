// Aetheria Agency Studio
// Case Studies Modal Drawer & Project Scope Estimator

document.addEventListener('DOMContentLoaded', () => {
  initCaseStudyDrawer();
  initEstimator();
});

// ---------------------------------------------------------------
// Case Studies Dataset & Sliding Modal Drawer Engine
// ---------------------------------------------------------------
const CASE_STUDIES = {
  'solana-pay': {
    id: 'solana-pay',
    category: 'Web3 Fintech',
    date: 'Q2 2026 • 8 Weeks',
    title: 'Solana Pay Mobile Web3 App',
    tagline: 'Frictionless micropayments architecture & high-throughput mobile wallet experience.',
    tags: ['UI/UX Design', 'Solana Web3', 'React Native', 'Micro-Animations', 'Sub-Second Settlement'],
    challenge: 'Traditional crypto checkout experiences suffered from high transaction latency, confusing gas price estimations, and an alarming 42% user abandonment rate during retail checkout flows.',
    solution: 'We engineered an instant-scan QR payment interface directly integrated with Solana Pay. Combining biometric wallet authorization, instant optimistic UI state confirmation, and real-time fiat conversion, we eliminated checkout friction entirely.',
    metrics: [
      { number: '+340%', label: 'Mobile Checkout' },
      { number: '0.4s', label: 'Settlement Time' },
      { number: '500k+', label: 'Daily Transacting' }
    ],
    quote: 'Aetheria completely revolutionized our mobile payment funnel. The design feels as instant and natural as Apple Pay, yet executes entirely on-chain.',
    author: {
      name: 'Elena Rostova',
      role: 'Head of Product, Solana Pay Ecosystem',
      avatar: '👩‍💼'
    },
    slides: [
      {
        icon: '📱',
        title: 'Instant QR Checkout Screen',
        subtitle: 'Sub-400ms contactless point-of-sale scanning with biometric fingerprint authentication.',
        caption: 'Slide 1: Point-of-Sale Mobile Interface with Sub-400ms Confirmation'
      },
      {
        icon: '⚡',
        title: 'Micro-Payment Routing Architecture',
        subtitle: 'High-throughput payment channels settling 65,000 TPS with zero network congestion.',
        caption: 'Slide 2: Dynamic Payment Routing Engine & Gasless Merchant Infrastructure'
      },
      {
        icon: '🎨',
        title: 'Design System & Component Kit',
        subtitle: 'Tailored dark-mode glassmorphic components crafted for maximum visual clarity on OLED screens.',
        caption: 'Slide 3: Comprehensive Multi-Platform Design System & Token Hierarchy'
      }
    ],
    estimatorType: 'webapp'
  },

  'vortex-ai': {
    id: 'vortex-ai',
    category: 'AI SaaS',
    date: 'Q1 2026 • 12 Weeks',
    title: 'Vortex AI Neural Interface',
    tagline: 'Spatial node-based model training studio and 60fps WebGL particle visualizer powering generative synthesis.',
    tags: ['Design System', 'Three.js WebGL', 'Next.js 14', 'Real-Time DSP', 'Audio Synthesis'],
    challenge: 'Complex neural audio models had dense, intimidating parameter matrices and nested configuration trees that alienated non-technical audio producers and sound designers.',
    solution: 'Designed an intuitive, modular graph workspace featuring draggable visual nodes, real-time harmonic waveform visualizers, and GPU-accelerated WebGL shaders providing zero-latency auditory feedback.',
    metrics: [
      { number: '42ms', label: 'DSP Latency' },
      { number: '60fps', label: 'Canvas Rendering' },
      { number: '+215%', label: 'Session Duration' }
    ],
    quote: 'The spatial node interface Aetheria built for Vortex turned deep learning audio generation into an artistic playground. It immediately won Site of the Day on Awwwards.',
    author: {
      name: 'Dr. David Chen',
      role: 'Chief Scientist, Vortex AI Labs',
      avatar: '👨‍🔬'
    },
    slides: [
      {
        icon: '🧠',
        title: 'Spatial Neural Graph Canvas',
        subtitle: 'Interactive node graph connecting audio stems, diffusion models, and filter effects.',
        caption: 'Slide 1: Infinite Canvas Node Editor with Real-Time Wire Physics'
      },
      {
        icon: '🌊',
        title: '60fps WebGL Particle Spectrogram',
        subtitle: 'Hardware-accelerated audio visualization reacting to harmonic frequency modulation.',
        caption: 'Slide 2: Multi-Layer Particle Shader Reacting to Sound Frequencies'
      },
      {
        icon: '🎛️',
        title: 'Harmonic Synthesis Tuner',
        subtitle: 'Tactile range controls and preset sliders for shaping fundamental acoustics.',
        caption: 'Slide 3: High-Precision Parametric Equalizer & Neural Formant Modeler'
      }
    ],
    estimatorType: 'webapp'
  },

  'krypton-protocol': {
    id: 'krypton-protocol',
    category: 'DeFi Analytics',
    date: 'Q4 2025 • 10 Weeks',
    title: 'Krypton Hyper-Yield Protocol',
    tagline: 'Institutional decentralized liquidity vault management platform with real-time risk hedging telemetry.',
    tags: ['Liquidity Engine', 'Smart Contracts', 'Financial Analytics', 'Trading Terminal'],
    challenge: 'Institutional liquidity providers required granular, sub-second visibility into impermanent loss, protocol utilization, and slippage risk before allocating capital.',
    solution: 'Architected a high-density, dark-mode institutional trading desk with live WebSocket order feeds, visual depth charts, and automated vault rebalancing triggers.',
    metrics: [
      { number: '$180M+', label: 'TVL Managed' },
      { number: '99.99%', label: 'Uptime Reliability' },
      { number: '-78%', label: 'Impermanent Risk' }
    ],
    quote: 'The institutional interface Aetheria designed enabled us to close $180M in total value locked within our first 45 days after mainnet launch.',
    author: {
      name: 'Julian Vance',
      role: 'Managing Partner, Krypton Capital',
      avatar: '👨‍💼'
    },
    slides: [
      {
        icon: '📊',
        title: 'Institutional Depth & Order Flow',
        subtitle: 'High-density terminal view tracking multi-pool arbitrage and automated liquidation limits.',
        caption: 'Slide 1: High-Density Order Flow Matrix & Liquidity Heatmap'
      },
      {
        icon: '🛡️',
        title: 'Automated Risk Telemetry',
        subtitle: 'Predictive machine-learning risk indicators forecasting volatility spikes in real time.',
        caption: 'Slide 2: Live Impermanent Loss & Volatility Hedging Monitor'
      },
      {
        icon: '💎',
        title: 'Vault Rebalancing Cockpit',
        subtitle: 'One-click cross-chain yield optimization executing automated flash-hedges.',
        caption: 'Slide 3: Cross-Chain Liquidity Rebalancer & Yield Maximizer'
      }
    ],
    estimatorType: 'uiux'
  },

  'chronos-atelier': {
    id: 'chronos-atelier',
    category: 'Luxury Brand',
    date: 'Q3 2025 • 6 Weeks',
    title: 'Chronos Luxury Watch Atelier',
    tagline: 'Bespoke Swiss horology e-commerce experience featuring interactive 360° complication customizer.',
    tags: ['Brand Identity', '3D Configurator', 'Shopify Plus', 'WebGL Luxury'],
    challenge: 'High-net-worth collectors hesitated to order bespoke $50k+ timepieces online without feeling the tactile luxury, dial finishes, and intricate hand-wound movements.',
    solution: 'Constructed an ultra-high-definition interactive 3D configurator with photorealistic metallic reflections, engraved guilloché textures, and smooth camera transitions.',
    metrics: [
      { number: '4.9 ★', label: 'Collector Rating' },
      { number: '+190%', label: 'Avg Order Value' },
      { number: '3.8x', label: 'Engagement Time' }
    ],
    quote: 'Aetheria captured the soul of Swiss watchmaking in the digital realm. Our bespoke customization orders doubled in the first quarter.',
    author: {
      name: 'Madeleine Lefevre',
      role: 'Creative Director, Chronos Atelier Geneva',
      avatar: '👩‍🎨'
    },
    slides: [
      {
        icon: '⌚',
        title: '360° Photorealistic Bezel Studio',
        subtitle: 'Physical-based rendering shaders displaying brushed titanium, rose gold, and sapphire crystal.',
        caption: 'Slide 1: Interactive 3D Watch Customizer with Dynamic Lighting'
      },
      {
        icon: '⚙️',
        title: 'Tourbillon Movement Exploded View',
        subtitle: 'Interactive micro-mechanical exploded visualizer unveiling 342 hand-polished components.',
        caption: 'Slide 2: Exploded Mechanical Movement View with Zoom Telemetry'
      },
      {
        icon: '📦',
        title: 'Bespoke Atelier Packaging & Delivery',
        subtitle: 'VIP client portal tracking hand-engraving progress and courier armored transport.',
        caption: 'Slide 3: VIP Client Concierge Portal & Certificate of Authenticity'
      }
    ],
    estimatorType: 'branding'
  }
};

function initCaseStudyDrawer() {
  const overlay = document.getElementById('caseStudyDrawerOverlay');
  const drawer = document.getElementById('caseStudyDrawer');
  const closeBtn = document.getElementById('csDrawerCloseBtn');
  const closeFooterBtn = document.getElementById('csDrawerCloseFooterBtn');
  const estimateBtn = document.getElementById('csDrawerEstimateBtn');

  if (!overlay || !drawer) return;

  // Elements to populate
  const categoryEl = document.getElementById('csDrawerCategory');
  const dateEl = document.getElementById('csDrawerDate');
  const titleEl = document.getElementById('csDrawerTitle');
  const taglineEl = document.getElementById('csDrawerTagline');
  const tagsContainer = document.getElementById('csDrawerTags');
  const challengeEl = document.getElementById('csDrawerChallenge');
  const solutionEl = document.getElementById('csDrawerSolution');
  const metricsContainer = document.getElementById('csDrawerMetrics');
  const quoteEl = document.getElementById('csDrawerQuote');
  const authorAvatarEl = document.getElementById('csDrawerAuthorAvatar');
  const authorNameEl = document.getElementById('csDrawerAuthorName');
  const authorRoleEl = document.getElementById('csDrawerAuthorRole');

  // Carousel elements
  const viewport = document.getElementById('galleryViewport');
  const dotsContainer = document.getElementById('galleryDots');
  const captionEl = document.getElementById('galleryCaption');
  const prevBtn = document.getElementById('galleryPrevBtn');
  const nextBtn = document.getElementById('galleryNextBtn');

  let currentProject = null;
  let currentSlideIndex = 0;
  let lastFocusedElement = null;

  function renderCarousel(slides) {
    viewport.replaceChildren();
    dotsContainer.replaceChildren();

    slides.forEach((slide, idx) => {
      // Slide container
      const slideDiv = document.createElement('div');
      slideDiv.className = `gallery-slide ${idx === 0 ? 'active' : ''}`;
      slideDiv.setAttribute('data-slide-index', String(idx));
      slideDiv.setAttribute('role', 'tabpanel');

      slideDiv.innerHTML = `
        <div class="mockup-frame">
          <div class="mockup-header">
            <span class="mockup-dot red"></span>
            <span class="mockup-dot yellow"></span>
            <span class="mockup-dot green"></span>
            <span class="mockup-title">Aetheria Case System // Screen ${idx + 1}</span>
          </div>
          <div class="mockup-screen">
            <span class="screen-icon">${slide.icon}</span>
            <h4 class="screen-text">${slide.title}</h4>
            <p class="screen-sub">${slide.subtitle}</p>
          </div>
        </div>
      `;
      viewport.appendChild(slideDiv);

      // Dot button
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `gallery-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
      dot.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        setSlide(idx);
      });
      dotsContainer.appendChild(dot);
    });

    currentSlideIndex = 0;
    updateCarouselState();
  }

  function setSlide(index) {
    if (!currentProject) return;
    const slides = currentProject.slides;
    currentSlideIndex = (index + slides.length) % slides.length;
    updateCarouselState();
  }

  function updateCarouselState() {
    if (!currentProject) return;
    const slideElements = viewport.querySelectorAll('.gallery-slide');
    const dotElements = dotsContainer.querySelectorAll('.gallery-dot');

    slideElements.forEach((el, idx) => {
      el.classList.toggle('active', idx === currentSlideIndex);
    });

    dotElements.forEach((dot, idx) => {
      const isActive = idx === currentSlideIndex;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const activeSlide = currentProject.slides[currentSlideIndex];
    if (activeSlide) {
      captionEl.textContent = activeSlide.caption;
    }
  }

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setSlide(currentSlideIndex - 1);
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setSlide(currentSlideIndex + 1);
  });

  function openDrawer(projectId) {
    const data = CASE_STUDIES[projectId];
    if (!data) return;

    currentProject = data;
    lastFocusedElement = document.activeElement;

    // Populate metadata
    categoryEl.textContent = data.category;
    dateEl.textContent = data.date;
    titleEl.textContent = data.title;
    taglineEl.textContent = data.tagline;

    // Tags
    tagsContainer.replaceChildren();
    data.tags.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'drawer-tag';
      span.textContent = tag;
      tagsContainer.appendChild(span);
    });

    // Narrative
    challengeEl.textContent = data.challenge;
    solutionEl.textContent = data.solution;

    // Metrics
    metricsContainer.replaceChildren();
    data.metrics.forEach((m) => {
      const tile = document.createElement('div');
      tile.className = 'metric-tile';
      tile.innerHTML = `
        <span class="metric-number">${m.number}</span>
        <span class="metric-label">${m.label}</span>
      `;
      metricsContainer.appendChild(tile);
    });

    // Quote
    quoteEl.textContent = data.quote;
    authorAvatarEl.textContent = data.author.avatar;
    authorNameEl.textContent = data.author.name;
    authorRoleEl.textContent = data.author.role;

    // Carousel
    renderCarousel(data.slides);

    // Open overlay with smooth slide-in
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Trigger CSS slide-in transform
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      drawer.focus();
    });
  }

  function closeDrawer() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    setTimeout(() => {
      overlay.hidden = true;
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }, 350);
  }

  // Card click triggers
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach((card) => {
    card.addEventListener('click', () => {
      const pid = card.dataset.projectId;
      if (pid) openDrawer(pid);
    });

    const btn = card.querySelector('.view-case-study-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.dataset.project || card.dataset.projectId;
        if (pid) openDrawer(pid);
      });
    }
  });

  // Close triggers
  closeBtn.addEventListener('click', closeDrawer);
  closeFooterBtn.addEventListener('click', closeDrawer);

  overlay.addEventListener('click', (e) => {
    // Only close if clicking the backdrop overlay itself, not inside drawer
    if (e.target === overlay) {
      closeDrawer();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (!overlay.hidden && e.key === 'Escape') {
      closeDrawer();
    }
  });

  // Estimate Similar Project button in drawer footer
  estimateBtn.addEventListener('click', () => {
    const targetType = currentProject?.estimatorType || 'webapp';
    closeDrawer();

    setTimeout(() => {
      // Find radio input for targetType in the estimator
      const typeInput = document.querySelector(`input[name="estType"][value="${targetType}"]`);
      if (typeInput) {
        typeInput.checked = true;
        typeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const estimatorEl = document.getElementById('estimator');
      if (estimatorEl) {
        estimatorEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 380);
  });
}

// ---------------------------------------------------------------
// Project scope estimator
// ---------------------------------------------------------------
const PROJECT_TYPES = [
  { id: 'branding', label: 'Branding', base: 6000, weeks: 4, note: 'Logo, palette, type system' },
  { id: 'webapp', label: 'Web App', base: 18000, weeks: 10, note: 'Design plus full-stack build' },
  { id: 'uiux', label: 'UI/UX Design', base: 9000, weeks: 6, note: 'Research, flows, hi-fi screens' }
];

const URGENCY = [
  { label: 'Relaxed', price: 0.9, pace: 1.3, hint: 'Flexible schedule: 10% discount, about 30% longer.' },
  { label: 'Standard', price: 1, pace: 1, hint: 'Our normal delivery pace, no adjustment.' },
  { label: 'Fast', price: 1.25, pace: 0.75, hint: 'Parallel teams: 25% rush fee, about 25% quicker.' },
  { label: 'Rush', price: 1.5, pace: 0.6, hint: 'All hands on deck: 50% rush fee, about 40% quicker.' }
];

const ADDONS = [
  { id: 'guidelines', label: 'Brand guidelines', cost: 1200, weeks: 1 },
  { id: 'cms', label: 'CMS integration', cost: 3500, weeks: 2 },
  { id: 'motion', label: 'Motion design', cost: 2800, weeks: 2 },
  { id: 'seo', label: 'SEO setup', cost: 1500, weeks: 1 },
  { id: 'analytics', label: 'Analytics dashboard', cost: 2400, weeks: 1 }
];

const RANGE_LOW = 0.9;
const RANGE_HIGH = 1.15;

const estState = { type: 'webapp', urgency: 1, addons: new Set() };
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function roundTo100(n) { return Math.round(n / 100) * 100; }

function calculateEstimate(state) {
  const type = PROJECT_TYPES.find((t) => t.id === state.type);
  const urgency = URGENCY[state.urgency];
  const addons = ADDONS.filter((a) => state.addons.has(a.id));
  const addonCost = addons.reduce((sum, a) => sum + a.cost, 0);
  const addonWeeks = addons.reduce((sum, a) => sum + a.weeks, 0);
  const subtotal = type.base + addonCost;
  const total = Math.round(subtotal * urgency.price);
  const adjustment = total - subtotal;
  const weeks = (type.weeks + addonWeeks) * urgency.pace;
  return {
    type, urgency, addons, subtotal, adjustment, total,
    low: roundTo100(total * RANGE_LOW),
    high: roundTo100(total * RANGE_HIGH),
    weeksLow: Math.max(1, Math.ceil(weeks * 0.9)),
    weeksHigh: Math.max(1, Math.ceil(weeks * 1.2))
  };
}

function estEl(tag, props, ...children) {
  const node = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => {
    if (typeof c === 'string') node.append(document.createTextNode(c));
    else if (c) node.append(c);
  });
  return node;
}

function buildPill(input, title, sub) {
  const label = estEl('label', { class: 'pill' });
  const span = estEl('span', { class: 'pill-text' },
    estEl('span', { class: 'pill-title', text: title }),
    estEl('span', { class: 'pill-sub', text: sub })
  );
  label.append(input, span);
  return label;
}

function buildEstimatorControls() {
  const types = document.getElementById('typeOptions');
  PROJECT_TYPES.forEach((t) => {
    const input = estEl('input', {
      type: 'radio',
      name: 'estType',
      value: t.id
    });
    if (t.id === estState.type) input.checked = true;
    input.addEventListener('change', () => {
      estState.type = t.id;
      renderEstimate();
    });
    types.append(buildPill(input, t.label, `${usd.format(t.base)} · ${t.note}`));
  });

  const addons = document.getElementById('addonOptions');
  ADDONS.forEach((a) => {
    const input = estEl('input', {
      type: 'checkbox',
      name: 'estAddon',
      value: a.id
    });
    input.addEventListener('change', () => {
      if (input.checked) estState.addons.add(a.id);
      else estState.addons.delete(a.id);
      renderEstimate();
    });
    addons.append(buildPill(input, a.label, `+${usd.format(a.cost)} / +${a.weeks} wk${a.weeks > 1 ? 's' : ''}`));
  });

  const ticks = document.getElementById('urgencyTicks');
  URGENCY.forEach((u) => ticks.append(estEl('span', { text: u.label })));

  document.getElementById('urgency').addEventListener('input', (event) => {
    estState.urgency = Number(event.target.value);
    renderEstimate();
  });
}

function addRow(tbody, label, value, cls) {
  const tr = estEl('tr', cls ? { class: cls } : {}, estEl('th', { scope: 'row', text: label }), estEl('td', { text: value }));
  tbody.append(tr);
}

function renderEstimate() {
  const e = calculateEstimate(estState);
  const slider = document.getElementById('urgency');
  slider.setAttribute('aria-valuetext', e.urgency.label);
  document.getElementById('urgencyLabel').textContent = e.urgency.label;
  document.getElementById('urgencyHint').textContent = e.urgency.hint;

  document.getElementById('invRange').textContent = `${usd.format(e.low)} to ${usd.format(e.high)}`;
  document.getElementById('invWeeks').textContent = `Estimated delivery: ${e.weeksLow} to ${e.weeksHigh} weeks`;

  const rows = document.getElementById('invRows');
  rows.replaceChildren();
  addRow(rows, `${e.type.label} base`, usd.format(e.type.base));
  e.addons.forEach((a) => addRow(rows, a.label, `+${usd.format(a.cost)}`));
  addRow(rows, 'Subtotal', usd.format(e.subtotal), 'sub');
  const sign = e.adjustment < 0 ? '-' : '+';
  addRow(rows, `${e.urgency.label} timeline (x${e.urgency.price})`, `${sign}${usd.format(Math.abs(e.adjustment))}`);
  document.getElementById('invTotal').textContent = usd.format(e.total);
  return e;
}

function specSummary(e) {
  const addons = e.addons.length ? e.addons.map((a) => a.label).join(', ') : 'no add-ons';
  return `${e.type.label}, ${e.urgency.label.toLowerCase()} timeline, ${addons}: ${usd.format(e.low)} to ${usd.format(e.high)} over ${e.weeksLow} to ${e.weeksHigh} weeks.`;
}

function initEstimator() {
  if (!document.getElementById('estForm')) return;
  buildEstimatorControls();
  renderEstimate();

  const btn = document.getElementById('quoteBtn');
  const box = document.getElementById('quoteBox');
  btn.addEventListener('click', () => {
    const open = box.hidden;
    box.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) document.getElementById('quoteEmail').focus();
  });

  document.getElementById('quoteForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('quoteEmail');
    const msg = document.getElementById('quoteMsg');
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    msg.classList.toggle('error', !valid);
    if (!valid) {
      email.setAttribute('aria-invalid', 'true');
      msg.textContent = 'Enter a valid email address so we can reply.';
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');
    msg.textContent = `Request noted for ${email.value.trim()}. Spec: ${specSummary(calculateEstimate(estState))}`;
  });
}
