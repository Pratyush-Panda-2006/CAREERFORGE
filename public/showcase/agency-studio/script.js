// Aetheria Agency Studio
// Case Studies Modal Drawer & Project Scope Estimator

document.addEventListener('DOMContentLoaded', () => {
  initAwardsShowcase();
  initCaseStudyDrawer();
  initEstimator();
  initInteractiveScopeEstimator();
  initReviewModal();
  initFaqAccordion();
  initBrandMoodboard();
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
// Project scope estimator & ROI Configurator (Issue #267)
// ---------------------------------------------------------------
const PROJECT_TYPES = [
  { id: 'branding', label: 'Branding & Identity', base: 6000, weeks: 4, note: 'Logo, palette, type system', baseLift: 0.12 },
  { id: 'webapp', label: 'Full-Stack Web App', base: 18000, weeks: 10, note: 'Design plus full-stack build', baseLift: 0.28 },
  { id: 'uiux', label: 'UI/UX Design System', base: 9000, weeks: 6, note: 'Research, flows, hi-fi screens', baseLift: 0.20 }
];

const SENIORITY_LEVELS = [
  { id: 'mid', label: 'Mid-Level Squad', rate: 1.0, pace: 1.0, note: '1.0x · Core product squad' },
  { id: 'senior', label: 'Senior Product Leads', rate: 1.35, pace: 0.85, note: '1.35x · Top-tier tech & design leads' },
  { id: 'principal', label: 'Principal & Director', rate: 1.75, pace: 0.7, note: '1.75x · Executive design & architecture' }
];

const URGENCY = [
  { label: 'Relaxed', price: 0.9, pace: 1.3, hint: 'Flexible schedule: 10% discount, about 30% longer.' },
  { label: 'Standard', price: 1, pace: 1, hint: 'Our normal delivery pace, no adjustment.' },
  { label: 'Fast', price: 1.25, pace: 0.75, hint: 'Parallel teams: 25% rush fee, about 25% quicker.' },
  { label: 'Rush', price: 1.5, pace: 0.6, hint: 'All hands on deck: 50% rush fee, about 40% quicker.' }
];

const ADDONS = [
  { id: 'guidelines', label: 'Brand guidelines & assets', cost: 1200, weeks: 1, lift: 0.04 },
  { id: 'design-system', label: 'Design System & Component Library', cost: 4500, weeks: 2, lift: 0.16 },
  { id: 'cms', label: 'Headless CMS integration', cost: 3500, weeks: 2, lift: 0.08 },
  { id: 'motion', label: '3D Interactive & WebGL Motion', cost: 3800, weeks: 2, lift: 0.14 },
  { id: 'funnel-opt', label: 'Conversion Funnel Optimization', cost: 4200, weeks: 1, lift: 0.22 },
  { id: 'seo', label: 'Technical SEO & Performance Audit', cost: 1800, weeks: 1, lift: 0.10 },
  { id: 'analytics', label: 'Executive Analytics & Attribution', cost: 2400, weeks: 1, lift: 0.06 }
];

const RANGE_LOW = 0.9;
const RANGE_HIGH = 1.15;

const estState = {
  type: 'webapp',
  seniority: 'senior',
  urgency: 1,
  addons: new Set(),
  monthlyRev: 50000,
  convRate: 2.5
};
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function roundTo100(n) { return Math.round(n / 100) * 100; }

function calculateEstimate(state) {
  const type = PROJECT_TYPES.find((t) => t.id === state.type) || PROJECT_TYPES[1];
  const seniority = SENIORITY_LEVELS.find((s) => s.id === state.seniority) || SENIORITY_LEVELS[1];
  const urgency = URGENCY[state.urgency] || URGENCY[1];
  const addons = ADDONS.filter((a) => state.addons.has(a.id));
  const addonCost = addons.reduce((sum, a) => sum + a.cost, 0);
  const addonWeeks = addons.reduce((sum, a) => sum + a.weeks, 0);

  const baseWithSeniority = Math.round(type.base * seniority.rate);
  const subtotal = Math.round((type.base + addonCost) * seniority.rate);
  const total = Math.round(subtotal * urgency.price);
  const adjustment = total - subtotal;
  const weeks = Math.round((type.weeks + addonWeeks) * urgency.pace * seniority.pace);

  // ROI Modeling calculations
  const rawLift = type.baseLift + addons.reduce((sum, a) => sum + (a.lift || 0), 0);
  const seniorityBoost = seniority.id === 'principal' ? 1.25 : (seniority.id === 'senior' ? 1.12 : 1.0);
  const liftPct = Math.min(0.85, rawLift * seniorityBoost);
  const annualRev = (state.monthlyRev || 50000) * 12;
  const annualUplift = Math.round(annualRev * liftPct);
  const monthlyUplift = annualUplift / 12;
  const paybackMonths = monthlyUplift > 0 ? (total / monthlyUplift).toFixed(1) : 'N/A';
  const roiMultiplier = total > 0 ? ((annualUplift * 3) / total).toFixed(1) : '0.0';

  return {
    type, seniority, urgency, addons, subtotal, adjustment, total,
    baseWithSeniority,
    liftPct, annualUplift, paybackMonths, roiMultiplier,
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
  if (types) {
    types.replaceChildren();
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
  }

  const seniorityBox = document.getElementById('seniorityOptions');
  if (seniorityBox) {
    seniorityBox.replaceChildren();
    SENIORITY_LEVELS.forEach((s) => {
      const input = estEl('input', {
        type: 'radio',
        name: 'estSeniority',
        value: s.id
      });
      if (s.id === estState.seniority) input.checked = true;
      input.addEventListener('change', () => {
        estState.seniority = s.id;
        renderEstimate();
      });
      seniorityBox.append(buildPill(input, s.label, s.note));
    });
  }

  const addons = document.getElementById('addonOptions');
  if (addons) {
    addons.replaceChildren();
    ADDONS.forEach((a) => {
      const input = estEl('input', {
        type: 'checkbox',
        name: 'estAddon',
        value: a.id
      });
      if (estState.addons.has(a.id)) input.checked = true;
      input.addEventListener('change', () => {
        if (input.checked) estState.addons.add(a.id);
        else estState.addons.delete(a.id);
        renderEstimate();
      });
      addons.append(buildPill(input, a.label, `+${usd.format(a.cost)} / +${a.weeks} wk${a.weeks > 1 ? 's' : ''}`));
    });
  }

  const ticks = document.getElementById('urgencyTicks');
  if (ticks) {
    ticks.replaceChildren();
    URGENCY.forEach((u) => ticks.append(estEl('span', { text: u.label })));
  }

  const urgencySlider = document.getElementById('urgency');
  if (urgencySlider) {
    urgencySlider.addEventListener('input', (event) => {
      estState.urgency = Number(event.target.value);
      renderEstimate();
    });
  }

  // Baseline ROI inputs
  const monthlyRevInput = document.getElementById('roiMonthlyRev');
  if (monthlyRevInput) {
    monthlyRevInput.addEventListener('input', (event) => {
      const val = parseFloat(event.target.value) || 0;
      estState.monthlyRev = Math.max(0, val);
      renderEstimate();
    });
  }

  const convRateInput = document.getElementById('roiConvRate');
  if (convRateInput) {
    convRateInput.addEventListener('input', (event) => {
      const val = parseFloat(event.target.value) || 0;
      estState.convRate = Math.max(0, val);
      renderEstimate();
    });
  }
}

function addRow(tbody, label, value, cls) {
  const tr = estEl('tr', cls ? { class: cls } : {}, estEl('th', { scope: 'row', text: label }), estEl('td', { text: value }));
  tbody.append(tr);
}

function renderEstimate() {
  const e = calculateEstimate(estState);
  const slider = document.getElementById('urgency');
  if (slider) {
    slider.setAttribute('aria-valuetext', e.urgency.label);
    const urgencyLabel = document.getElementById('urgencyLabel');
    if (urgencyLabel) urgencyLabel.textContent = e.urgency.label;
    const urgencyHint = document.getElementById('urgencyHint');
    if (urgencyHint) urgencyHint.textContent = e.urgency.hint;
  }

  const invRange = document.getElementById('invRange');
  if (invRange) invRange.textContent = `${usd.format(e.low)} to ${usd.format(e.high)}`;

  const invWeeks = document.getElementById('invWeeks');
  if (invWeeks) invWeeks.textContent = `Estimated delivery: ${e.weeksLow} to ${e.weeksHigh} weeks`;

  const rows = document.getElementById('invRows');
  if (rows) {
    rows.replaceChildren();
    addRow(rows, `${e.type.label} (${e.seniority.label})`, usd.format(e.baseWithSeniority));
    e.addons.forEach((a) => addRow(rows, a.label, `+${usd.format(Math.round(a.cost * e.seniority.rate))}`));
    addRow(rows, 'Subtotal', usd.format(e.subtotal), 'sub');
    const sign = e.adjustment < 0 ? '-' : '+';
    addRow(rows, `${e.urgency.label} timeline (x${e.urgency.price})`, `${sign}${usd.format(Math.abs(e.adjustment))}`);
  }

  const invTotal = document.getElementById('invTotal');
  if (invTotal) invTotal.textContent = usd.format(e.total);

  // Update ROI Projection Card
  const roiMultiplierBadge = document.getElementById('roiMultiplierBadge');
  if (roiMultiplierBadge) roiMultiplierBadge.textContent = `${e.roiMultiplier}x ROI`;

  const roiLiftVal = document.getElementById('roiLiftVal');
  if (roiLiftVal) roiLiftVal.textContent = `+${Math.round(e.liftPct * 100)}%`;

  const roiAnnualUplift = document.getElementById('roiAnnualUplift');
  if (roiAnnualUplift) roiAnnualUplift.textContent = usd.format(e.annualUplift);

  const roiPaybackVal = document.getElementById('roiPaybackVal');
  if (roiPaybackVal) roiPaybackVal.textContent = `${e.paybackMonths} mos`;

  const roiVisFill = document.getElementById('roiVisFill');
  if (roiVisFill) {
    const meterPct = Math.min(100, Math.max(10, Math.round(e.liftPct * 100 * 1.6)));
    roiVisFill.style.width = `${meterPct}%`;
  }

  return e;
}

function specSummary(e) {
  const addons = e.addons.length ? e.addons.map((a) => a.label).join(', ') : 'no add-ons';
  return `${e.type.label} (${e.seniority.label}), ${e.urgency.label.toLowerCase()} timeline, ${addons}: ${usd.format(e.low)} to ${usd.format(e.high)} over ${e.weeksLow} to ${e.weeksHigh} weeks. Projected ROI: ${e.roiMultiplier}x with +${Math.round(e.liftPct * 100)}% conversion lift.`;
}

function initEstimator() {
  if (!document.getElementById('estForm')) return;
  buildEstimatorControls();
  renderEstimate();

  const btn = document.getElementById('quoteBtn');
  const box = document.getElementById('quoteBox');
  if (btn && box) {
    btn.addEventListener('click', () => {
      const open = box.hidden;
      box.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) document.getElementById('quoteEmail').focus();
    });
  }

  const exportBtn = document.getElementById('exportBriefBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const e = calculateEstimate(estState);
      const briefData = {
        title: "Aetheria Studio — Project Scope & ROI Brief",
        generatedAt: new Date().toISOString(),
        configuration: {
          projectType: e.type.label,
          teamSeniority: e.seniority.label,
          timelinePace: e.urgency.label,
          deliverables: e.addons.map((a) => a.label)
        },
        financials: {
          investmentRange: `${usd.format(e.low)} - ${usd.format(e.high)}`,
          finalEstimate: usd.format(e.total),
          deliveryWeeks: `${e.weeksLow} - ${e.weeksHigh} weeks`
        },
        roiProjections: {
          projectedConversionLift: `+${Math.round(e.liftPct * 100)}%`,
          projectedAnnualRevenueUplift: usd.format(e.annualUplift),
          estimatedPaybackPeriod: `${e.paybackMonths} months`,
          threeYearRoiMultiplier: `${e.roiMultiplier}x`
        }
      };

      const blob = new Blob([JSON.stringify(briefData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Aetheria_Project_Scope_Brief.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const originalText = exportBtn.innerHTML;
      exportBtn.innerHTML = '<span style="color:#86efac">✓ Brief Exported!</span>';
      setTimeout(() => {
        exportBtn.innerHTML = originalText;
      }, 2200);
    });
  }

  const quoteForm = document.getElementById('quoteForm');
  if (quoteForm) {
    quoteForm.addEventListener('submit', (event) => {
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
}

/*CLIENT REVIEW SUBMISSION MODAL */

function initReviewModal() {
  const overlay = document.getElementById('reviewModalOverlay');
  const modal = document.getElementById('reviewModal');
  const openBtn = document.getElementById('openReviewModal');
  const closeBtn = document.getElementById('closeReviewModal');
  const cancelBtn = document.getElementById('cancelReviewBtn');

  const form = document.getElementById('reviewForm');
  const nameInput = document.getElementById('reviewClientName');
  const titleInput = document.getElementById('reviewTitle');
  const messageInput = document.getElementById('reviewMessage');

  const starSelector = document.getElementById('starSelector');
  const ratingLabel = document.getElementById('ratingLabel');

  const tagSelector = document.getElementById('reviewTagSelector');

  const charCount = document.getElementById('reviewCharCount');
  const formMessage = document.getElementById('reviewFormMessage');

  const reviewsGrid = document.getElementById('reviewsGrid');
  const averageRating = document.getElementById('averageRating');
  const reviewCount = document.getElementById('reviewCount');

  const STORAGE_KEY = 'aetheriaClientReviews';

  if (!overlay || !modal || !form) return;

  let selectedRating = 0;
  let selectedTags = [];
  let previousFocus = null;

  const ratingTexts = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };


  // Load saved reviews safely
  function getSavedReviews() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      if (!Array.isArray(saved)) return [];

      return saved.filter(review =>
        review &&
        typeof review.name === 'string' &&
        typeof review.title === 'string' &&
        typeof review.message === 'string' &&
        Number.isInteger(review.rating) &&
        review.rating >= 1 &&
        review.rating <= 5 &&
        Array.isArray(review.tags)
      );
    } catch (error) {
      console.error('Could not load saved reviews:', error);
      return [];
    }
  }


  // Save reviews
  function saveReviews(reviews) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
      return true;
    } catch (error) {
      console.error('Could not save reviews:', error);
      return false;
    }
  }


  // Open modal
  function openModal() {
    previousFocus = document.activeElement;

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    resetMessage();

    setTimeout(() => {
      nameInput.focus();
    }, 50);
  }


  // Close modal
  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';

    if (previousFocus) {
      previousFocus.focus();
    }
  }


  // Reset form messages
  function resetMessage() {
    formMessage.textContent = '';
    formMessage.classList.remove('success');
  }


  // Reset rating
  function resetRating() {
    selectedRating = 0;

    starSelector.querySelectorAll('.rating-star').forEach(star => {
      star.classList.remove('active', 'hovered');
      star.setAttribute('aria-pressed', 'false');
    });

    ratingLabel.textContent = 'Select a rating';
  }


  // Update star appearance
  function updateStars(rating) {
    starSelector.querySelectorAll('.rating-star').forEach(star => {
      const value = Number(star.dataset.rating);

      star.classList.toggle('active', value <= rating);
      star.setAttribute(
        'aria-pressed',
        String(value === selectedRating)
      );
    });
  }


  // Star selection
  starSelector.addEventListener('click', event => {
    const star = event.target.closest('.rating-star');

    if (!star) return;

    selectedRating = Number(star.dataset.rating);

    updateStars(selectedRating);

    ratingLabel.textContent = ratingTexts[selectedRating];
    resetMessage();
  });


  // Star hover preview
  starSelector.addEventListener('mouseover', event => {
    const star = event.target.closest('.rating-star');

    if (!star) return;

    const hoverRating = Number(star.dataset.rating);

    starSelector.querySelectorAll('.rating-star').forEach(item => {
      item.classList.toggle(
        'hovered',
        Number(item.dataset.rating) <= hoverRating
      );
    });
  });


  starSelector.addEventListener('mouseleave', () => {
    starSelector.querySelectorAll('.rating-star').forEach(star => {
      star.classList.remove('hovered');
    });

    updateStars(selectedRating);
  });


  // Tag selection
  tagSelector.addEventListener('click', event => {
    const tagButton = event.target.closest('.review-tag-option');

    if (!tagButton) return;

    const tag = tagButton.dataset.tag;

    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(item => item !== tag);
      tagButton.classList.remove('selected');
      tagButton.setAttribute('aria-pressed', 'false');
    } else {
      selectedTags.push(tag);
      tagButton.classList.add('selected');
      tagButton.setAttribute('aria-pressed', 'true');
    }

    resetMessage();
  });


  // Character counter
  messageInput.addEventListener('input', () => {
    charCount.textContent = messageInput.value.length;
  });


  // Generate initials
  function getInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }


  // Create a review card safely
  function createReviewCard(review) {
    const card = document.createElement('article');
    card.className = 'review-card';

    const top = document.createElement('div');
    top.className = 'review-card-top';

    const stars = document.createElement('span');
    stars.className = 'review-stars';
    stars.textContent = '★'.repeat(review.rating) +
      '☆'.repeat(5 - review.rating);

    const date = document.createElement('span');
    date.className = 'review-date';
    date.textContent = 'Just now';

    top.append(stars, date);

    const title = document.createElement('h3');
    title.textContent = review.title;

    const message = document.createElement('p');
    message.textContent = review.message;

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'review-tags';

    review.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });

    const author = document.createElement('div');
    author.className = 'review-author';

    const avatar = document.createElement('span');
    avatar.className = 'review-avatar';
    avatar.textContent = getInitials(review.name);

    const authorInfo = document.createElement('div');

    const authorName = document.createElement('strong');
    authorName.textContent = review.name;

    const project = document.createElement('span');
    project.textContent = 'Client Review';

    authorInfo.append(authorName, project);
    author.append(avatar, authorInfo);

    card.append(top, title, message, tagsContainer, author);

    return card;
  }


  // Display saved reviews
  function renderSavedReviews() {
    const reviews = getSavedReviews();

    reviews.forEach(review => {
      reviewsGrid.appendChild(createReviewCard(review));
    });

    updateReviewSummary(reviews);
  }


  // Update average rating and review count
  function updateReviewSummary(reviews) {
    const featuredCount = 4;
    const featuredAverage = 4.9;

    const totalCount = featuredCount + reviews.length;

    const totalRating =
      featuredAverage * featuredCount +
      reviews.reduce((sum, review) => sum + review.rating, 0);

    const average = totalRating / totalCount;

    averageRating.textContent = average.toFixed(1);

    reviewCount.textContent =
      `${totalCount} client reviews`;
  }


  // Submit review
  form.addEventListener('submit', event => {
    event.preventDefault();

    resetMessage();

    const name = nameInput.value.trim();
    const title = titleInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !title || !message) {
      formMessage.textContent = 'Please complete all required fields.';
      return;
    }

    if (selectedRating === 0) {
      formMessage.textContent = 'Please select a star rating.';
      return;
    }

    if (selectedTags.length === 0) {
      formMessage.textContent = 'Please select at least one project category.';
      return;
    }

    if (name.length > 50 || title.length > 70 || message.length > 500) {
      formMessage.textContent = 'Please check the maximum character limits.';
      return;
    }

    const newReview = {
      name,
      title,
      message,
      rating: selectedRating,
      tags: [...selectedTags],
      date: new Date().toISOString()
    };

    const reviews = getSavedReviews();

    reviews.push(newReview);

    if (!saveReviews(reviews)) {
      formMessage.textContent = 'Unable to save your review. Please try again.';
      return;
    }

    // Add the new card to the beginning
    reviewsGrid.prepend(createReviewCard(newReview));

    updateReviewSummary(reviews);

    formMessage.textContent = 'Your review has been submitted successfully!';
    formMessage.classList.add('success');

    // Reset form
    form.reset();
    selectedTags = [];

    tagSelector.querySelectorAll('.review-tag-option').forEach(tag => {
      tag.classList.remove('selected');
      tag.setAttribute('aria-pressed', 'false');
    });

    resetRating();
    charCount.textContent = '0';

    // Close modal after successful submission
    setTimeout(() => {
      closeModal();
      resetMessage();
    }, 1400);
  });


  // Open and close events
  openBtn.addEventListener('click', openModal);

  closeBtn.addEventListener('click', closeModal);

  cancelBtn.addEventListener('click', closeModal);


  // Close when clicking outside the modal
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeModal();
    }
  });


  // Escape key and basic focus management
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;

    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key === 'Tab') {
      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  });


  // Load existing reviews on page load
  renderSavedReviews();
}

/* =========================================
   CLIENT FAQ ACCORDION
   ======================================= */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isCurrentlyOpen =
        question.getAttribute('aria-expanded') === 'true';

      faqItems.forEach(faqItem => {
        const faqQuestion = faqItem.querySelector('.faq-question');
        const faqAnswer = faqItem.querySelector('.faq-answer');

        faqItem.classList.remove('active');
        faqQuestion.setAttribute('aria-expanded', 'false');
        faqAnswer.hidden = true;
      });

      if (!isCurrentlyOpen) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
      }
    });
  });
}

// =========================================================================
// Issue #106: Client Awards & Recognitions Showcase Ticker & Animated Counter
// =========================================================================

const AWARDS_DATA = [
  {
    id: 'awwwards-solana-pay',
    org: 'awwwards',
    orgName: 'Awwwards',
    badgeClass: 'badge-awwwards',
    icon: '🏆',
    year: '2026',
    title: 'Site of the Day & Developer Award',
    client: 'Solana Pay Mobile Web3 App',
    projectId: 'solana-pay',
    category: 'Web3 Fintech Architecture',
    citation: 'A benchmark in Web3 retail interaction. Flawless micro-interactions paired with sub-400ms cryptographic execution.',
    scores: [
      { label: 'Design', val: '8.9' },
      { label: 'Usability', val: '8.8' },
      { label: 'Creativity', val: '8.9' },
      { label: 'Content', val: '8.7' }
    ],
    overallScore: '8.84 / 10',
    honors: 'Site of the Day + Developer Award',
    platform: 'Global Mobile Web Application'
  },
  {
    id: 'fwa-vortex-ai',
    org: 'fwa',
    orgName: 'FWA',
    badgeClass: 'badge-fwa',
    icon: '⚡',
    year: '2026',
    title: 'FWA of the Month & 100pt Jury Score',
    client: 'Vortex AI Neural Interface',
    projectId: 'vortex-ai',
    category: 'AI SaaS & WebGL 3D',
    citation: 'Groundbreaking spatial node architecture running 60fps WebGL particle shaders directly in browser viewport.',
    scores: [
      { label: 'Originality', val: '98' },
      { label: 'Design', val: '96' },
      { label: 'Interaction', val: '97' },
      { label: 'Technology', val: '99' }
    ],
    overallScore: '96 / 100',
    honors: 'FWA of the Month',
    platform: 'Interactive WebGL Canvas System'
  },
  {
    id: 'reddot-krypton',
    org: 'reddot',
    orgName: 'Red Dot',
    badgeClass: 'badge-reddot',
    icon: '🔴',
    year: '2025',
    title: 'Red Dot: Best of the Best',
    client: 'Krypton Hyper-Yield Protocol',
    projectId: 'krypton-protocol',
    category: 'Financial UI & Communication Design',
    citation: 'Redefining institutional DeFi through high-density telemetry without cognitive overload. Masterclass in hierarchy.',
    scores: [
      { label: 'Innovation', val: '9.8' },
      { label: 'Ergonomics', val: '9.5' },
      { label: 'Form Quality', val: '9.9' },
      { label: 'Clarity', val: '9.7' }
    ],
    overallScore: 'Best of the Best',
    honors: 'Red Dot: Best of the Best',
    platform: 'Institutional Liquidity Telemetry Platform'
  },
  {
    id: 'webby-chronos',
    org: 'webby',
    orgName: 'Webby',
    badgeClass: 'badge-webby',
    icon: '👑',
    year: '2025',
    title: 'Webby Honoree: Best Visual Design',
    client: 'Chronos Luxury Watch Atelier',
    projectId: 'chronos-atelier',
    category: 'Websites — Luxury E-Commerce',
    citation: 'A tactile horology experience. The 3D complication customizer sets a new gold standard for online luxury retail.',
    scores: [
      { label: 'Aesthetics', val: '9.7' },
      { label: 'Experience', val: '9.6' },
      { label: 'Craft', val: '9.8' },
      { label: 'Engagement', val: '9.5' }
    ],
    overallScore: 'Nominee / Honoree',
    honors: 'Webby Honoree',
    platform: 'Luxury 3D Product Customizer'
  },
  {
    id: 'awwwards-studio',
    org: 'awwwards',
    orgName: 'Awwwards',
    badgeClass: 'badge-awwwards',
    icon: '⭐',
    year: '2025',
    title: 'Mobile Site of the Week Nominee',
    client: 'Aetheria Studio Brand Space',
    projectId: null,
    category: 'Agency Portfolio & Visual Identity',
    citation: 'Exceptional fluid typography and bespoke glassmorphic tokens that breathe life on both touch and desktop devices.',
    scores: [
      { label: 'Design', val: '9.1' },
      { label: 'Usability', val: '8.9' },
      { label: 'Creativity', val: '9.2' },
      { label: 'Content', val: '8.8' }
    ],
    overallScore: '8.92 / 10',
    honors: 'Site of the Week',
    platform: 'Liquid Responsive Studio Experience'
  },
  {
    id: 'fwa-helios',
    org: 'fwa',
    orgName: 'FWA',
    badgeClass: 'badge-fwa',
    icon: '🪐',
    year: '2025',
    title: 'FWA of the Day: WebGL Innovation',
    client: 'Helios Spatial Computing Portal',
    projectId: null,
    category: 'Experimental Web & Spatial Shaders',
    citation: 'Pioneering browser-native stereoscopic spatial shaders with dynamic physics and ambient illumination.',
    scores: [
      { label: 'Originality', val: '94' },
      { label: 'Design', val: '90' },
      { label: 'Interaction', val: '92' },
      { label: 'Technology', val: '96' }
    ],
    overallScore: '91 / 100',
    honors: 'FWA of the Day',
    platform: 'Experimental Browser Experience'
  },
  {
    id: 'reddot-aura',
    org: 'reddot',
    orgName: 'Red Dot',
    badgeClass: 'badge-reddot',
    icon: '🎖️',
    year: '2024',
    title: 'Red Dot Winner: Product Interface',
    client: 'Aura Intelligent Sleep System',
    projectId: null,
    category: 'Healthtech UI & Sensory Ergonomics',
    citation: 'Warm, restorative minimalism combined with predictive biometrics. Human-centered design at its finest.',
    scores: [
      { label: 'Functionality', val: '9.4' },
      { label: 'Emotional Appeal', val: '9.6' },
      { label: 'Design Quality', val: '9.5' },
      { label: 'Usability', val: '9.3' }
    ],
    overallScore: 'Red Dot Winner',
    honors: 'Red Dot Design Award',
    platform: 'Cross-Platform Sensory Dashboard'
  },
  {
    id: 'webby-nexus',
    org: 'webby',
    orgName: 'Webby',
    badgeClass: 'badge-webby',
    icon: '🌐',
    year: '2024',
    title: 'Webby Winner: Technical Achievement',
    client: 'Nexus Global Liquidity Network',
    projectId: null,
    category: 'Technical Achievement & Distributed Web',
    citation: 'Pioneering peer-to-peer visual execution telemetry, transforming obscure cross-chain routes into intuitive visual flow.',
    scores: [
      { label: 'Architecture', val: '9.9' },
      { label: 'Execution', val: '9.7' },
      { label: 'Clarity', val: '9.6' },
      { label: 'Impact', val: '9.8' }
    ],
    overallScore: 'Webby Winner',
    honors: 'Webby Award Winner',
    platform: 'Distributed Ledger Network'
  }
];

function initAwardsShowcase() {
  const statsGrid = document.getElementById('awardsStatsGrid');
  const marqueeTrack = document.getElementById('awardsMarqueeTrack');
  const cardsGrid = document.getElementById('awardsCardsGrid');
  const emptyState = document.getElementById('awardsEmptyState');
  const filterPills = document.querySelectorAll('.award-filter-pill');
  const searchInput = document.getElementById('awardSearchInput');
  const tickerToggleBtn = document.getElementById('tickerToggleBtn');
  const tickerSpeedBtn = document.getElementById('tickerSpeedBtn');
  const speedLabel = document.getElementById('speedLabel');

  const modalOverlay = document.getElementById('awardModalOverlay');
  const modalCloseBtn = document.getElementById('awardModalCloseBtn');
  const modalCloseFooter = document.getElementById('modalCloseBtnFooter');
  const modalViewCaseStudyBtn = document.getElementById('modalViewCaseStudyBtn');

  let activeFilter = 'all';
  let searchQuery = '';
  let tickerPaused = false;
  let tickerFastSpeed = false;
  let selectedAward = null;

  // 1. Animated Key Statistics Counters
  function animateCounters() {
    const statNums = document.querySelectorAll('.stat-num');
    statNums.forEach(numEl => {
      const target = Number(numEl.getAttribute('data-target') || '0');
      const duration = 1600;
      const startTime = performance.now();

      function updateNumber(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: ease-out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeOut * target);
        numEl.textContent = String(currentVal);

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          numEl.textContent = String(target);
        }
      }
      requestAnimationFrame(updateNumber);
    });
  }

  // Trigger counters with IntersectionObserver
  if (statsGrid && 'IntersectionObserver' in window) {
    let countersAnimated = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
          countersAnimated = true;
          animateCounters();
          observer.unobserve(statsGrid);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(statsGrid);
  } else {
    animateCounters();
  }

  // 2. Continuous Marquee Ticker Setup
  function buildMarqueeItem(award) {
    const item = document.createElement('div');
    item.className = 'marquee-award-pill';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `${award.title} for ${award.client}`);

    item.innerHTML = `
      <span class="m-icon" aria-hidden="true">${award.icon}</span>
      <span class="m-org ${award.badgeClass}">${award.orgName}</span>
      <strong class="m-title">${award.title}</strong>
      <span class="m-dot" aria-hidden="true">•</span>
      <span class="m-client">${award.client}</span>
      <span class="m-year">${award.year}</span>
    `;

    item.addEventListener('click', () => {
      openAwardModal(award);
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAwardModal(award);
      }
    });

    return item;
  }

  function setupMarquee() {
    if (!marqueeTrack) return;
    marqueeTrack.innerHTML = '';

    // Render items twice for infinite loop continuity
    const itemsGroup1 = document.createElement('div');
    itemsGroup1.className = 'marquee-group';
    AWARDS_DATA.forEach(award => {
      itemsGroup1.appendChild(buildMarqueeItem(award));
    });

    const itemsGroup2 = itemsGroup1.cloneNode(true);
    itemsGroup2.setAttribute('aria-hidden', 'true');
    // Reattach click events for cloned items
    const clonedChildren = itemsGroup2.children;
    for (let i = 0; i < clonedChildren.length; i++) {
      const award = AWARDS_DATA[i];
      clonedChildren[i].addEventListener('click', () => openAwardModal(award));
    }

    marqueeTrack.appendChild(itemsGroup1);
    marqueeTrack.appendChild(itemsGroup2);
  }

  setupMarquee();

  // Marquee Controls: Pause/Resume & Speed
  if (tickerToggleBtn && marqueeTrack) {
    tickerToggleBtn.addEventListener('click', () => {
      tickerPaused = !tickerPaused;
      marqueeTrack.classList.toggle('is-paused', tickerPaused);
      tickerToggleBtn.classList.toggle('active', tickerPaused);
      tickerToggleBtn.querySelector('.btn-icon').textContent = tickerPaused ? '▶' : '⏸';
      tickerToggleBtn.querySelector('.btn-label').textContent = tickerPaused ? 'Resume' : 'Pause';
    });
  }

  if (tickerSpeedBtn && marqueeTrack) {
    tickerSpeedBtn.addEventListener('click', () => {
      tickerFastSpeed = !tickerFastSpeed;
      marqueeTrack.classList.toggle('is-fast', tickerFastSpeed);
      tickerSpeedBtn.classList.toggle('active', tickerFastSpeed);
      if (speedLabel) {
        speedLabel.textContent = tickerFastSpeed ? '2x Fast' : '1x Speed';
      }
    });
  }

  // 3. Render Awards Showcase Cards Grid
  function renderAwardCards() {
    if (!cardsGrid) return;
    cardsGrid.innerHTML = '';

    const filtered = AWARDS_DATA.filter(award => {
      const matchesFilter = activeFilter === 'all' || award.org === activeFilter;
      const matchesSearch = !searchQuery ||
        award.title.toLowerCase().includes(searchQuery) ||
        award.client.toLowerCase().includes(searchQuery) ||
        award.category.toLowerCase().includes(searchQuery) ||
        award.orgName.toLowerCase().includes(searchQuery);
      return matchesFilter && matchesSearch;
    });

    if (emptyState) {
      emptyState.hidden = filtered.length > 0;
    }

    filtered.forEach(award => {
      const card = document.createElement('article');
      card.className = `award-card ${award.badgeClass}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `View details for ${award.title}`);

      card.innerHTML = `
        <div class="award-card-glow" aria-hidden="true"></div>
        <div class="award-card-header">
          <div class="award-org-badge ${award.badgeClass}">${award.orgName}</div>
          <span class="award-year-tag">${award.year}</span>
        </div>

        <div class="award-card-hero">
          <div class="award-trophy-symbol" aria-hidden="true">${award.icon}</div>
          <div class="award-hero-meta">
            <span class="award-category">${award.category}</span>
            <h3 class="award-title">${award.title}</h3>
          </div>
        </div>

        <div class="award-client-row">
          <span class="client-label">Client System:</span>
          <strong class="client-name">${award.client}</strong>
        </div>

        <p class="award-citation">"${award.citation}"</p>

        <div class="award-card-footer">
          <span class="award-score-pill">★ ${award.overallScore}</span>
          <span class="award-inspect-action">Jury Details &amp; Case Study ↗</span>
        </div>
      `;

      card.addEventListener('click', () => {
        openAwardModal(award);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAwardModal(award);
        }
      });

      cardsGrid.appendChild(card);
    });
  }

  renderAwardCards();

  // Filter Pills Event Listeners
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      activeFilter = pill.getAttribute('data-filter') || 'all';
      renderAwardCards();
    });
  });

  // Search Input Event Listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').trim().toLowerCase();
      renderAwardCards();
    });
  }

  // 4. Modal Deep Dive
  function openAwardModal(award) {
    if (!modalOverlay) return;
    selectedAward = award;

    const modalOrgBadge = document.getElementById('modalOrgBadge');
    const modalIconWrap = document.getElementById('modalIconWrap');
    const modalYear = document.getElementById('modalYear');
    const modalTitle = document.getElementById('awardModalTitle');
    const modalClient = document.getElementById('modalClient');
    const modalCitation = document.getElementById('modalCitation');
    const modalScoresGrid = document.getElementById('modalScoresGrid');
    const modalCategory = document.getElementById('modalCategory');
    const modalHonors = document.getElementById('modalHonors');
    const modalPlatform = document.getElementById('modalPlatform');

    if (modalOrgBadge) {
      modalOrgBadge.textContent = award.orgName.toUpperCase();
      modalOrgBadge.className = `award-modal-badge ${award.badgeClass}`;
    }
    if (modalIconWrap) modalIconWrap.textContent = award.icon;
    if (modalYear) modalYear.textContent = `${award.year} Annual Distinction`;
    if (modalTitle) modalTitle.textContent = award.title;
    if (modalClient) modalClient.textContent = award.client;
    if (modalCitation) modalCitation.textContent = `"${award.citation}"`;
    if (modalCategory) modalCategory.textContent = award.category;
    if (modalHonors) modalHonors.textContent = award.honors;
    if (modalPlatform) modalPlatform.textContent = award.platform;

    if (modalScoresGrid) {
      modalScoresGrid.innerHTML = award.scores.map(s => `
        <div class="score-box">
          <span class="score-label">${s.label}</span>
          <strong class="score-val">${s.val}</strong>
        </div>
      `).join('');
    }

    if (modalViewCaseStudyBtn) {
      if (award.projectId && typeof CASE_STUDIES !== 'undefined' && CASE_STUDIES[award.projectId]) {
        modalViewCaseStudyBtn.hidden = false;
        modalViewCaseStudyBtn.textContent = `View ${award.client} Case Study ↗`;
      } else {
        modalViewCaseStudyBtn.hidden = true;
      }
    }

    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    const card = document.getElementById('awardModalCard');
    if (card) card.focus();
  }

  function closeAwardModal() {
    if (!modalOverlay) return;
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
    selectedAward = null;
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAwardModal);
  if (modalCloseFooter) modalCloseFooter.addEventListener('click', closeAwardModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeAwardModal();
    });
  }

  if (modalViewCaseStudyBtn) {
    modalViewCaseStudyBtn.addEventListener('click', () => {
      if (selectedAward && selectedAward.projectId) {
        closeAwardModal();
        const drawerOverlay = document.getElementById('caseStudyDrawerOverlay');
        if (typeof openCaseStudy === 'function') {
          openCaseStudy(selectedAward.projectId);
        } else if (drawerOverlay) {
          // Trigger click on matching project card
          const btn = document.querySelector(`[data-project="${selectedAward.projectId}"]`);
          if (btn) btn.click();
        }
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && !modalOverlay.hidden) {
      closeAwardModal();
    }
  });
}

window.AWARDS_DATA = AWARDS_DATA;
window.initAwardsShowcase = initAwardsShowcase;
window.CASE_STUDIES = CASE_STUDIES;

/* ===== BEGIN Issue #435: Interactive Project Scope & Budget Estimator ===== */
function initInteractiveScopeEstimator() {
  const section = document.getElementById('interactive-project-estimator');
  if (!section) return;

  const SERVICES = {
    'brand-identity': { id: 'brand-identity', label: 'Brand Identity', icon: '🎨', cost: 5500, baseWeeks: 2.5, milestone: 'Discovery, Identity System & Guidelines' },
    'web-dev': { id: 'web-dev', label: 'Web Development', icon: '⚡', cost: 14000, baseWeeks: 5.0, milestone: 'Full-Stack Architecture & Core Build' },
    '3d-motion': { id: '3d-motion', label: '3D Motion', icon: '🌀', cost: 6500, baseWeeks: 2.5, milestone: 'WebGL Shaders & Interactive Motion Choreography' },
    'design-systems': { id: 'design-systems', label: 'Design Systems', icon: '🧩', cost: 7500, baseWeeks: 3.0, milestone: 'Tokenized Component Library & Figma Sync' },
    seo: { id: 'seo', label: 'SEO', icon: '📈', cost: 3200, baseWeeks: 1.5, milestone: 'Core Web Vitals, Schema & Launch Optimization' }
  };

  const COMPLEXITY = {
    mvp: { label: 'Startup MVP', mult: 0.85 },
    scaleup: { label: 'Scaleup Standard', mult: 1.0 },
    enterprise: { label: 'Flagship Enterprise', mult: 1.45 }
  };

  const scopeState = {
    selected: new Set(['brand-identity', 'web-dev', 'design-systems']),
    complexity: 'scaleup',
    targetWeeks: 10
  };

  const chips = Array.from(section.querySelectorAll('.deliverable-chip'));
  const compButtons = Array.from(section.querySelectorAll('.complexity-chip'));
  const timelineSlider = document.getElementById('scopeTimelineSlider');
  const resetBtn = document.getElementById('scopeResetBtn');
  const lockBtn = document.getElementById('scopeLockEstimateBtn');

  function formatUsd(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  function renderScopeEstimate() {
    const activeServices = Object.values(SERVICES).filter((s) => scopeState.selected.has(s.id));
    const comp = COMPLEXITY[scopeState.complexity] || COMPLEXITY.scaleup;
    const baseCost = activeServices.reduce((sum, s) => sum + s.cost, 0);
    const recommendedWeeks = Math.max(4, Math.round(activeServices.reduce((sum, s) => sum + s.baseWeeks, 0) * (comp.mult >= 1.4 ? 1.15 : 1)));
    const targetWeeks = scopeState.targetWeeks;

    // Compression multiplier when timeline is squeezed below recommended sprint length
    let paceMultiplier = 1.0;
    let paceBadge = 'Standard Pace';
    let paceNote = 'Balanced delivery pace — optimal squad velocity with zero rush surcharge.';
    if (activeServices.length > 0 && targetWeeks < recommendedWeeks) {
      const compression = Math.min(0.45, (recommendedWeeks - targetWeeks) * 0.08);
      paceMultiplier = 1 + compression;
      paceBadge = `+${Math.round(compression * 100)}% Sprint Boost`;
      paceNote = `Parallel multi-pod sprint active (${targetWeeks} wks vs ${recommendedWeeks} wks recommended). Includes ${Math.round(compression * 100)}% acceleration capacity.`;
    } else if (targetWeeks >= recommendedWeeks + 4) {
      paceMultiplier = 0.94;
      paceBadge = '6% Phased Savings';
      paceNote = 'Extended multi-milestone cadence — unlocks 6% retainer efficiency discount.';
    }

    const totalBase = Math.round(baseCost * comp.mult * paceMultiplier);
    const budgetLow = Math.round((totalBase * 0.9) / 100) * 100;
    const budgetHigh = Math.round((totalBase * 1.15) / 100) * 100;
    const weeklyBurn = targetWeeks > 0 ? Math.round(totalBase / targetWeeks) : 0;

    // Update control labels
    const countPill = document.getElementById('scopeServiceCount');
    if (countPill) countPill.textContent = `${activeServices.length} selected`;

    const compPill = document.getElementById('scopeComplexityMultiplier');
    if (compPill) compPill.textContent = `${comp.mult}x · ${comp.label}`;

    const timelineValEl = document.getElementById('scopeTimelineValue');
    if (timelineValEl) timelineValEl.textContent = `${targetWeeks} Weeks`;

    const paceNoteEl = document.getElementById('scopePaceNote');
    if (paceNoteEl) paceNoteEl.textContent = activeServices.length ? paceNote : 'Toggle one or more deliverable chips above to generate an estimate.';

    // Summary Card KPIs
    const rangeEl = document.getElementById('scopeBudgetRange');
    if (rangeEl) rangeEl.textContent = activeServices.length ? `${formatUsd(budgetLow)} – ${formatUsd(budgetHigh)}` : '$0 – $0';

    const velEl = document.getElementById('scopeVelocityBadge');
    if (velEl) velEl.textContent = `${targetWeeks} Wk Target`;

    const burnEl = document.getElementById('scopeBurnBadge');
    if (burnEl) burnEl.textContent = `~${formatUsd(weeklyBurn)} / wk`;

    const sprintEl = document.getElementById('scopeSprintModeBadge');
    if (sprintEl) sprintEl.textContent = paceBadge;

    const totalMsEl = document.getElementById('scopeTotalMilestonesWeeks');
    if (totalMsEl) totalMsEl.textContent = `Weeks 1–${targetWeeks}`;

    // Selected Chips Preview
    const previewEl = document.getElementById('scopeSelectedChipsPreview');
    if (previewEl) {
      previewEl.innerHTML = activeServices.length
        ? activeServices.map((s) => `<span class="summary-chip-tag">${s.icon} ${s.label}</span>`).join('')
        : '<span class="summary-chip-tag">No deliverables selected</span>';
    }

    // Dynamic Timeline Milestones
    const milestonesEl = document.getElementById('scopeMilestonesList');
    if (milestonesEl) {
      if (activeServices.length === 0) {
        milestonesEl.innerHTML = '<li class="milestone-item"><div><strong>Awaiting Deliverable Selection</strong><small>Select services on the left to map project milestones.</small></div><span class="milestone-wk-badge">—</span></li>';
      } else {
        const w1End = Math.max(1, Math.round(targetWeeks * 0.2));
        const w2End = Math.max(w1End + 1, Math.round(targetWeeks * 0.48));
        const w3End = Math.max(w2End + 1, Math.round(targetWeeks * 0.82));

        const phases = [
          {
            title: 'Phase 1 · Discovery & Architecture',
            detail: activeServices.some((s) => s.id === 'brand-identity')
              ? 'Brand positioning, moodboards & technical scoping'
              : 'Requirements mapping, UX wireframes & sprint plan',
            weeks: `Wk 1–${w1End}`
          },
          {
            title: 'Phase 2 · Visual Systems & Prototyping',
            detail: activeServices.some((s) => s.id === 'design-systems')
              ? 'Component token library, interactive prototypes & QA'
              : 'High-fidelity art direction & responsive layouts',
            weeks: `Wk ${w1End + 1}–${w2End}`
          },
          {
            title: 'Phase 3 · Core Engineering & Motion',
            detail: activeServices
              .filter((s) => s.id === 'web-dev' || s.id === '3d-motion')
              .map((s) => s.label)
              .join(' + ') || 'Frontend polish & CMS integration',
            weeks: `Wk ${w2End + 1}–${w3End}`
          },
          {
            title: 'Phase 4 · Optimization, QA & Launch',
            detail: activeServices.some((s) => s.id === 'seo')
              ? 'Technical SEO audit, Lighthouse 99+ tuning & launch'
              : 'Cross-browser verification, staging sign-off & deploy',
            weeks: `Wk ${Math.min(targetWeeks, w3End + 1)}–${targetWeeks}`
          }
        ];

        milestonesEl.innerHTML = phases
          .map(
            (p) => `
            <li class="milestone-item">
              <div>
                <strong>${p.title}</strong>
                <small>${p.detail}</small>
              </div>
              <span class="milestone-wk-badge">${p.weeks}</span>
            </li>
          `
          )
          .join('');
      }
    }

    return { activeServices, comp, targetWeeks, budgetLow, budgetHigh };
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-service');
      if (scopeState.selected.has(id)) {
        scopeState.selected.delete(id);
        chip.classList.remove('active');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        scopeState.selected.add(id);
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
      }
      renderScopeEstimate();
    });
  });

  compButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      scopeState.complexity = btn.getAttribute('data-complexity');
      compButtons.forEach((b) => {
        const isOn = b === btn;
        b.classList.toggle('active', isOn);
        b.setAttribute('aria-pressed', String(isOn));
      });
      renderScopeEstimate();
    });
  });

  if (timelineSlider) {
    timelineSlider.addEventListener('input', () => {
      scopeState.targetWeeks = Number(timelineSlider.value);
      renderScopeEstimate();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      scopeState.selected = new Set(['brand-identity', 'web-dev', 'design-systems']);
      scopeState.complexity = 'scaleup';
      scopeState.targetWeeks = 10;
      chips.forEach((chip) => {
        const on = scopeState.selected.has(chip.getAttribute('data-service'));
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-pressed', String(on));
      });
      compButtons.forEach((b) => {
        const on = b.getAttribute('data-complexity') === 'scaleup';
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (timelineSlider) timelineSlider.value = '10';
      const status = document.getElementById('scopeCtaStatus');
      if (status) status.textContent = '';
      renderScopeEstimate();
    });
  }

  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      const res = renderScopeEstimate();
      const status = document.getElementById('scopeCtaStatus');
      if (status) {
        status.textContent = res.activeServices.length
          ? `Scope locked (${res.activeServices.length} deliverables · ${res.targetWeeks} wks). Ready for inquiry!`
          : 'Select at least one deliverable chip first.';
      }
      const quoteBtn = document.getElementById('quoteBtn');
      const quoteBox = document.getElementById('quoteBox');
      if (quoteBtn && quoteBox && quoteBox.hidden) {
        quoteBtn.click();
      }
    });
  }

  renderScopeEstimate();
}
/* ===== END Issue #435 ===== */


// ==========================================================================
// Issue #385: Interactive Client Brand Moodboard Builder & Palette Generator
// ==========================================================================
function initBrandMoodboard() {
  const section = document.getElementById('brandMoodboard');
  if (!section) return;

  const themeButtons = section.querySelectorAll('.theme-pill-btn');
  const cardsGrid = document.getElementById('moodboardCardsGrid');
  const harmonySelect = document.getElementById('paletteHarmonySelect');
  const harmonyTypeBadge = document.getElementById('paletteHarmonyType');
  const generateBtn = document.getElementById('btnGeneratePalette');
  const swatchesGrid = document.getElementById('paletteSwatchesGrid');
  const fontPairingSelect = document.getElementById('fontPairingSelect');
  const mockupHeadline = document.getElementById('mockupHeadline');
  const mockupBody = document.getElementById('mockupBody');
  const mockupBadge = document.getElementById('mockupBadge');
  const mockupFontTag = document.getElementById('mockupFontTag');
  const mockupPrimaryBtn = document.getElementById('mockupPrimaryBtn');
  const btnCopyBrief = document.getElementById('btnCopyBrief');
  const btnDownloadBrief = document.getElementById('btnDownloadBrief');
  const toast = document.getElementById('moodboardToast');

  // Theme cards presets
  const themePresets = {
    'minimal-luxe': {
      baseHue: 265,
      harmony: 'complementary',
      cards: [
        {
          visualClass: 'visual-luxe-1',
          tag: 'TEXTURE 01',
          title: 'Sculptural Geometry',
          desc: 'Architectural stone planes, matte obsidian reflections, high contrast chiaroscuro.'
        },
        {
          visualClass: 'visual-luxe-2',
          tag: 'LIGHTING 02',
          title: 'Atmospheric Mist',
          desc: 'Subtle iridescent gradients, brushed titanium borders, tactile micro-textures.'
        },
        {
          visualClass: 'visual-luxe-3',
          tag: 'FORM 03',
          title: 'Kinetic Typography',
          desc: 'Monospaced coordinate grids paired with sweeping high-contrast display headlines.'
        }
      ]
    },
    'cyber-neo': {
      baseHue: 185,
      harmony: 'triadic',
      cards: [
        {
          visualClass: 'visual-luxe-2',
          tag: 'NEON 01',
          title: 'Hyper-Density Grid',
          desc: 'Sub-pixel vector scanlines, holographic laser refraction, deep cyan luminescence.'
        },
        {
          visualClass: 'visual-luxe-1',
          tag: 'INTERFACE 02',
          title: 'Cybernetic Monolith',
          desc: 'Dark mode tactical UI with fluorescent violet accents and telemetry readouts.'
        },
        {
          visualClass: 'visual-luxe-3',
          tag: 'MOTION 03',
          title: 'Volumetric Pulse',
          desc: 'Glitched optical typography with high-speed horizontal inertia and chromatic dispersion.'
        }
      ]
    },
    'warm-editorial': {
      baseHue: 28,
      harmony: 'analogous',
      cards: [
        {
          visualClass: 'visual-luxe-1',
          tag: 'PRINT 01',
          title: 'Linen & Terracotta',
          desc: 'Organic woven paper fibers, sun-drenched ochre pigments, warm tactile grain.'
        },
        {
          visualClass: 'visual-luxe-2',
          tag: 'CRAFT 02',
          title: 'Serif Poetry',
          desc: 'Timeless high-contrast editorial typography with elegant swashes and spacious leadings.'
        },
        {
          visualClass: 'visual-luxe-3',
          tag: 'STUDIO 03',
          title: 'Sunlit Bronze',
          desc: 'Natural daylight casting sharp geometric window shadows on architectural ceramics.'
        }
      ]
    },
    'organic-modern': {
      baseHue: 155,
      harmony: 'monochrome',
      cards: [
        {
          visualClass: 'visual-luxe-2',
          tag: 'EARTH 01',
          title: 'Botanical Clay',
          desc: 'Raw mineral powders, desaturated moss greens, and unglazed ceramic textures.'
        },
        {
          visualClass: 'visual-luxe-1',
          tag: 'NATURE 02',
          title: 'Sage Minimal',
          desc: 'Balanced whitespace with soft curved silhouettes inspired by weathered river stones.'
        },
        {
          visualClass: 'visual-luxe-3',
          tag: 'SPACE 03',
          title: 'Nordic Oak & Steel',
          desc: 'Pale Scandinavian woods contrasting with precision-beveled architectural graphite.'
        }
      ]
    }
  };

  let activeTheme = 'minimal-luxe';

  // 5 Swatches state
  let swatches = [
    { role: 'Dominant', hex: '#6366F1', locked: false },
    { role: 'Primary', hex: '#8B5CF6', locked: false },
    { role: 'Accent', hex: '#EC4899', locked: false },
    { role: 'Neutral', hex: '#1E293B', locked: false },
    { role: 'Contrast', hex: '#38BDF8', locked: false }
  ];

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // HSL to HEX helper
  function hslToHex(h, s, l) {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`.toUpperCase();
  }

  function generateHarmonicPalette(userHue = null) {
    const harmony = harmonySelect ? harmonySelect.value : 'complementary';
    const baseH = userHue !== null ? userHue : Math.floor(Math.random() * 360);

    let colors = [];
    if (harmony === 'complementary') {
      colors = [
        hslToHex(baseH, 70, 50),
        hslToHex((baseH + 20) % 360, 65, 45),
        hslToHex((baseH + 180) % 360, 85, 60),
        hslToHex((baseH + 200) % 360, 25, 20),
        hslToHex((baseH + 180) % 360, 90, 75)
      ];
    } else if (harmony === 'analogous') {
      colors = [
        hslToHex(baseH, 75, 48),
        hslToHex((baseH + 30) % 360, 70, 54),
        hslToHex((baseH + 60) % 360, 80, 58),
        hslToHex((baseH + 330) % 360, 30, 22),
        hslToHex((baseH + 45) % 360, 90, 75)
      ];
    } else if (harmony === 'triadic') {
      colors = [
        hslToHex(baseH, 80, 52),
        hslToHex((baseH + 120) % 360, 75, 55),
        hslToHex((baseH + 240) % 360, 85, 60),
        hslToHex((baseH + 120) % 360, 20, 18),
        hslToHex((baseH + 60) % 360, 90, 70)
      ];
    } else {
      // Monochrome
      colors = [
        hslToHex(baseH, 65, 30),
        hslToHex(baseH, 70, 48),
        hslToHex(baseH, 85, 62),
        hslToHex(baseH, 20, 15),
        hslToHex(baseH, 50, 80)
      ];
    }

    swatches.forEach((swatch, idx) => {
      if (!swatch.locked && colors[idx]) {
        swatch.hex = colors[idx];
      }
    });

    renderSwatches();
    updateMockupPreview();
  }

  function renderSwatches() {
    if (!swatchesGrid) return;
    swatchesGrid.innerHTML = '';

    swatches.forEach((swatch, index) => {
      const card = document.createElement('div');
      card.className = 'swatch-card';
      card.setAttribute('draggable', 'true');
      card.dataset.index = String(index);

      // Color Preview & Native Picker
      const preview = document.createElement('div');
      preview.className = 'swatch-color-preview';
      preview.style.backgroundColor = swatch.hex;

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'swatch-native-picker';
      picker.value = swatch.hex;
      picker.setAttribute('aria-label', `Change ${swatch.role} color`);
      picker.addEventListener('input', (e) => {
        swatch.hex = e.target.value.toUpperCase();
        preview.style.backgroundColor = swatch.hex;
        hexBtn.querySelector('.hex-code').textContent = swatch.hex;
        updateMockupPreview();
      });

      const lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.className = `swatch-lock-btn ${swatch.locked ? 'locked' : ''}`;
      lockBtn.setAttribute('aria-label', swatch.locked ? 'Unlock color' : 'Lock color');
      lockBtn.textContent = swatch.locked ? '🔒' : '🔓';
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        swatch.locked = !swatch.locked;
        lockBtn.className = `swatch-lock-btn ${swatch.locked ? 'locked' : ''}`;
        lockBtn.textContent = swatch.locked ? '🔒' : '🔓';
        showToast(`${swatch.role} (${swatch.hex}) ${swatch.locked ? 'locked' : 'unlocked'}`);
      });

      preview.appendChild(picker);
      preview.appendChild(lockBtn);

      // Meta info
      const meta = document.createElement('div');
      meta.className = 'swatch-meta';

      const role = document.createElement('span');
      role.className = 'swatch-role';
      role.textContent = swatch.role;

      const hexBtn = document.createElement('button');
      hexBtn.type = 'button';
      hexBtn.className = 'swatch-hex-btn';
      hexBtn.title = 'Click to copy HEX code';

      const hexCodeSpan = document.createElement('span');
      hexCodeSpan.className = 'hex-code';
      hexCodeSpan.textContent = swatch.hex;

      const copyIcon = document.createElement('span');
      copyIcon.className = 'copy-icon';
      copyIcon.textContent = '📋';

      hexBtn.appendChild(hexCodeSpan);
      hexBtn.appendChild(copyIcon);

      hexBtn.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(swatch.hex);
        }
        showToast(`Copied ${swatch.hex} to clipboard!`);
      });

      meta.appendChild(role);
      meta.appendChild(hexBtn);

      card.appendChild(preview);
      card.appendChild(meta);

      // Drag and drop reordering
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(index));
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = index;
        if (fromIndex !== toIndex && !isNaN(fromIndex)) {
          const item = swatches.splice(fromIndex, 1)[0];
          swatches.splice(toIndex, 0, item);
          renderSwatches();
          updateMockupPreview();
          showToast('Palette swatch order updated');
        }
      });

      swatchesGrid.appendChild(card);
    });

    if (harmonyTypeBadge && harmonySelect) {
      harmonyTypeBadge.textContent = `${harmonySelect.options[harmonySelect.selectedIndex].text.toUpperCase()}`;
    }
  }

  function renderThemeCards(themeKey) {
    if (!cardsGrid) return;
    const preset = themePresets[themeKey];
    if (!preset) return;

    cardsGrid.innerHTML = '';
    preset.cards.forEach((c) => {
      const art = document.createElement('article');
      art.className = 'mood-card active';

      const vis = document.createElement('div');
      vis.className = `mood-card-visual ${c.visualClass}`;

      const tag = document.createElement('span');
      tag.className = 'mood-card-tag';
      tag.textContent = c.tag;
      vis.appendChild(tag);

      const cnt = document.createElement('div');
      cnt.className = 'mood-card-content';

      const h4 = document.createElement('h4');
      h4.textContent = c.title;

      const p = document.createElement('p');
      p.textContent = c.desc;

      cnt.appendChild(h4);
      cnt.appendChild(p);

      art.appendChild(vis);
      art.appendChild(cnt);

      cardsGrid.appendChild(art);
    });
  }

  function updateMockupPreview() {
    const fontMode = fontPairingSelect ? fontPairingSelect.value : 'editorial';

    if (fontMode === 'editorial') {
      if (mockupHeadline) mockupHeadline.style.fontFamily = "'Playfair Display', serif";
      if (mockupBody) mockupBody.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
      if (mockupFontTag) mockupFontTag.textContent = 'Playfair Display 700 • Plus Jakarta Sans 400';
    } else if (fontMode === 'neo-brutalist') {
      if (mockupHeadline) mockupHeadline.style.fontFamily = "'Space Grotesk', sans-serif";
      if (mockupBody) mockupBody.style.fontFamily = "'JetBrains Mono', monospace";
      if (mockupFontTag) mockupFontTag.textContent = 'Space Grotesk 700 • JetBrains Mono 400';
    } else {
      if (mockupHeadline) mockupHeadline.style.fontFamily = "'Inter', sans-serif";
      if (mockupBody) mockupBody.style.fontFamily = "'Space Mono', monospace";
      if (mockupFontTag) mockupFontTag.textContent = 'Inter 700 • Space Mono 400';
    }

    // Apply active palette accent to primary button and badge
    const accentColor = swatches[2] ? swatches[2].hex : '#EC4899';
    const primaryColor = swatches[1] ? swatches[1].hex : '#8B5CF6';

    if (mockupPrimaryBtn) {
      mockupPrimaryBtn.style.backgroundColor = accentColor;
      mockupPrimaryBtn.style.boxShadow = `0 4px 16px ${accentColor}4D`;
    }
    if (mockupBadge) {
      mockupBadge.style.color = primaryColor;
      mockupBadge.style.borderColor = `${primaryColor}66`;
      mockupBadge.style.backgroundColor = `${primaryColor}1A`;
    }
  }

  // Event listeners
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      themeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTheme = btn.dataset.theme;

      const preset = themePresets[activeTheme];
      if (preset) {
        if (harmonySelect) harmonySelect.value = preset.harmony;
        renderThemeCards(activeTheme);
        generateHarmonicPalette(preset.baseHue);
      }
    });
  });

  if (harmonySelect) {
    harmonySelect.addEventListener('change', () => {
      generateHarmonicPalette();
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      generateHarmonicPalette();
      showToast('Generated fresh harmonic color palette ✦');
    });
  }

  // Spacebar to randomize palette when not focused in an input
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      const rect = section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        e.preventDefault();
        generateHarmonicPalette();
        showToast('Generated new palette (Space)');
      }
    }
  });

  if (fontPairingSelect) {
    fontPairingSelect.addEventListener('change', () => {
      updateMockupPreview();
      showToast(`Switched typography pairing to ${fontPairingSelect.options[fontPairingSelect.selectedIndex].text}`);
    });
  }

  if (btnCopyBrief) {
    btnCopyBrief.addEventListener('click', () => {
      const fontText = fontPairingSelect ? fontPairingSelect.options[fontPairingSelect.selectedIndex].text : 'Editorial';
      const briefSummary = [
        `=== AETHERIA STUDIO // BRAND DESIGN BRIEF ===`,
        `Aesthetic Direction: ${activeTheme.toUpperCase()}`,
        `Typography Pairing: ${fontText}`,
        `Harmonic Palette:`,
        ...swatches.map((s) => `  - ${s.role}: ${s.hex}${s.locked ? ' [Locked]' : ''}`),
        `Generated on: ${new Date().toISOString()}`
      ].join('\n');

      if (navigator.clipboard) {
        navigator.clipboard.writeText(briefSummary);
      }
      showToast('Brand brief summary copied to clipboard!');
    });
  }

  if (btnDownloadBrief) {
    btnDownloadBrief.addEventListener('click', () => {
      const briefData = {
        project: 'Aetheria Client Brand Identity System',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        aestheticTheme: activeTheme,
        harmonyFormula: harmonySelect ? harmonySelect.value : 'complementary',
        typography: {
          pairing: fontPairingSelect ? fontPairingSelect.value : 'editorial',
          label: fontPairingSelect ? fontPairingSelect.options[fontPairingSelect.selectedIndex].text : 'Editorial Elegance'
        },
        palette: swatches.map((s) => ({
          role: s.role,
          hex: s.hex,
          locked: s.locked
        }))
      };

      const jsonStr = JSON.stringify(briefData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand-brief-${activeTheme}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast('Exported branded design brief JSON!');
    });
  }

  // Initial render
  renderThemeCards(activeTheme);
  generateHarmonicPalette(themePresets[activeTheme].baseHue);
}
