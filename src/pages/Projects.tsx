import { useState } from 'react';
import { Search, Code2, Tag, Layers, Terminal, ExternalLink, GitBranch } from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  level: string;
  levelColor: string;
}

interface Project {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string;
  tags: string[];
  activeIssuesCount: number;
  issues: Issue[];
  previewUrl: string;
  githubUrl: string;
}

const projectsData: Project[] = [
  {
    id: 'ecommerce-store',
    title: 'showcase/ecommerce-store',
    category: 'e-commerce',
    categoryLabel: 'E-COMMERCE',
    description:
      'Standalone glassmorphic tech gear e-commerce website template with interactive cart counter and product category filtering.',
    tags: ['HTML5', 'Vanilla CSS', 'JavaScript ES6'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/ecommerce-store/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#101', title: 'Add Cart Item Quantity Adjustment Controls', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#102', title: 'Implement Product Quick View Modal Dialog', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'agency-studio',
    title: 'showcase/agency-studio',
    category: 'agency',
    categoryLabel: 'AGENCY & PORTFOLIO',
    description:
      'Fluid design agency & creative studio landing page with portfolio showcase grids, smooth scroll, and dark glassmorphism.',
    tags: ['HTML5', 'CSS Variables', 'JavaScript ES6'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/agency-studio/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#201', title: 'Add Interactive Client Testimonials Carousel', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#202', title: 'Implement Contact Form Field Validation', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'festival-hub',
    title: 'showcase/festival-hub',
    category: 'event',
    categoryLabel: 'EVENT & FESTIVAL',
    description:
      'Immersive electronic cyber festival hub with artist line-up grid, live countdown timer, and ticket tier cards.',
    tags: ['HTML5', 'Cyberpunk CSS', 'JS Countdown'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/festival-hub/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#301', title: 'Add Dynamic Stage Filter Tabs for Lineup', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#302', title: 'Ticket Pass Selection Checkout Drawer', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'saas-launchpad',
    title: 'showcase/saas-launchpad',
    category: 'saas',
    categoryLabel: 'SAAS LANDING',
    description:
      'High-converting SaaS analytics landing page featuring observability metrics, pricing cards, and feature highlights.',
    tags: ['HTML5', 'Flexbox/Grid CSS', 'JavaScript'],
    activeIssuesCount: 4,
    previewUrl: '/showcase/saas-launchpad/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#401', title: 'Add Monthly / Annual Pricing Toggle Switcher', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#402', title: 'Interactive ROI Cost Calculator Widget', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'developer-portfolio',
    title: 'showcase/developer-portfolio',
    category: 'portfolio',
    categoryLabel: 'PORTFOLIO',
    description:
      'Terminal-inspired systems developer portfolio with interactive CLI profile headers and open-source project cards.',
    tags: ['HTML5', 'Terminal CSS', 'Fira Code'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/developer-portfolio/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#501', title: 'Add CLI Command Line Typing Simulator', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#502', title: 'Interactive Project Tech Filter Pills', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'docs-portal',
    title: 'showcase/docs-portal',
    category: 'docs',
    categoryLabel: 'DOCUMENTATION',
    description:
      'Clean developer API documentation portal with sidebar navigation, syntax-highlighted code blocks, and endpoint specs.',
    tags: ['HTML5', 'Sidebar Layout', 'Monospace CSS'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/docs-portal/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#601', title: 'Add One-Click Copy Button to Code Blocks', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#602', title: 'Live In-Page Search Filter for API Methods', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'culinary-bistro',
    title: 'showcase/culinary-bistro',
    category: 'hospitality',
    categoryLabel: 'HOSPITALITY',
    description:
      'Elegant French bistro website featuring tasting menu highlights, wine pairings, and online table reservations.',
    tags: ['HTML5', 'Typography CSS', 'JavaScript'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/culinary-bistro/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#701', title: 'Add Interactive Date & Time Table Picker Modal', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#702', title: 'Dietary Preference Filter (Vegan/GF)', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'real-estate-luxe',
    title: 'showcase/real-estate-luxe',
    category: 'real-estate',
    categoryLabel: 'REAL ESTATE',
    description:
      'Luxury architectural real estate showcase with property search cards, specs tags, and high-end property galleries.',
    tags: ['HTML5', 'Glassmorphism', 'JavaScript'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/real-estate-luxe/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#801', title: 'Add Property Price Range Filter Slider', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#802', title: 'Virtual 360 Tour Lightbox Overlay', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'fintech-vault',
    title: 'showcase/fintech-vault',
    category: 'fintech',
    categoryLabel: 'FINTECH & BANKING',
    description:
      'Decentralized wealth & banking platform with real-time portfolio metrics, APY calculators, and vault deposit workflows.',
    tags: ['HTML5', 'Emerald Glass', 'JetBrains Mono'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/fintech-vault/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#901', title: 'Add APY Yield Compound Calculator Modal', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#902', title: 'Multi-Asset Token Deposit Form Validation', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'gaming-esports-hub',
    title: 'showcase/gaming-esports-hub',
    category: 'gaming',
    categoryLabel: 'GAMING & ESPORTS',
    description:
      'Pro esports tournament hub featuring live Twitch stream launcher, match schedule grids, and prize pool counters.',
    tags: ['HTML5', 'Glitch CSS', 'Orbitron Font'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/gaming-esports-hub/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1001', title: 'Add Embedded Twitch Player Lightbox', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#1002', title: 'Interactive Tournament Bracket Visualizer', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'health-vitality',
    title: 'showcase/health-vitality',
    category: 'health',
    categoryLabel: 'HEALTH & BIOTECH',
    description:
      'AI-powered health longevity dashboard with continuous biomarker tracking cards, HRV scores, and sleep optimization.',
    tags: ['HTML5', 'Teal Glass', 'JavaScript'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/health-vitality/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1101', title: 'Add Interactive Sleep Stage Breakdown Chart', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#1102', title: 'Biomarker Scan Progress Bar Animation', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'travel-odyssey',
    title: 'showcase/travel-odyssey',
    category: 'travel',
    categoryLabel: 'EXPEDITION TRAVEL',
    description:
      'Curated expedition travel portal featuring hand-crafted eco-tours, destination search filters, and itinerary highlights.',
    tags: ['HTML5', 'Outfit Font', 'JavaScript'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/travel-odyssey/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1201', title: 'Add Interactive Destination Search Filtering', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#1202', title: 'Voyage Booking Request Modal Form', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'edtech-academy',
    title: 'showcase/edtech-academy',
    category: 'edtech',
    categoryLabel: 'EDTECH & AI',
    description:
      'Interactive AI & distributed systems academy featuring cohort enrollment, course roadmaps, and syllabus modules.',
    tags: ['HTML5', 'Indigo Theme', 'JavaScript'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/edtech-academy/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1301', title: 'Add Syllabus Accordion Module Viewer', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#1302', title: 'Interactive Cohort Registration Form', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'podcast-audio-stream',
    title: 'showcase/podcast-audio-stream',
    category: 'media',
    categoryLabel: 'MEDIA & PODCAST',
    description:
      'Deep tech podcast network featuring audio player triggers, episode archives, guest info, and platform streaming badges.',
    tags: ['HTML5', 'Pink Accent', 'Space Grotesk'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/podcast-audio-stream/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1401', title: 'Add Fixed Audio Player Sticky Control Bar', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#1402', title: 'Episode Search & Host Guest Filter', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'nonprofit-impact',
    title: 'showcase/nonprofit-impact',
    category: 'nonprofit',
    categoryLabel: 'CLIMATE NONPROFIT',
    description:
      'Reforestation & ocean climate alliance site with transparent satellite impact stats, tree counter, and donation popups.',
    tags: ['HTML5', 'Eco Green CSS', 'JavaScript'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/nonprofit-impact/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1501', title: 'Add Custom Tree Donation Tier Selector', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#1502', title: 'Live Satellite Rainforest Tracker Embed', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'automotive-hypercar',
    title: 'showcase/automotive-hypercar',
    category: 'automotive',
    categoryLabel: 'AUTOMOTIVE & EV',
    description:
      'All-electric hypercar concept portal featuring performance telemetry stats, carbon chassis specs, and pre-order reservation.',
    tags: ['HTML5', 'Crimson Red', 'Orbitron'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/automotive-hypercar/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1601', title: 'Add 3D Rotational Car Color Customizer', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#1602', title: 'Hypercar Reservation Deposit Modal', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'ai-voice-studio',
    title: 'showcase/ai-voice-studio',
    category: 'ai-voice',
    categoryLabel: 'AI VOICE STUDIO',
    description:
      'Realtime AI voice cloning studio featuring instant audio playback samples, model selector cards, and latency metrics.',
    tags: ['HTML5', 'Cyan Wave', 'JetBrains Mono'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/ai-voice-studio/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1701', title: 'Add Multi-Voice Sample Audio Switcher', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { id: '#1702', title: 'Text-to-Speech Realtime Waveform Animation', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'cybersecurity-sentinel',
    title: 'showcase/cybersecurity-sentinel',
    category: 'security',
    categoryLabel: 'CYBERSECURITY',
    description:
      'Zero-trust threat prevention platform with real-time packet inspection status, SIEM logs, and vulnerability scanner.',
    tags: ['HTML5', 'Emerald Terminal', 'Fira Code'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/cybersecurity-sentinel/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1801', title: 'Add Vulnerability Scan Terminal Output Log', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#1802', title: 'IP Blacklist Threat Feed Table Filter', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'luxury-realms',
    title: 'showcase/luxury-realms',
    category: 'luxury',
    categoryLabel: 'LUXURY CONCIERGE',
    description:
      'Bespoke private island & aviation concierge portal with private charter inquiry modals and destination galleries.',
    tags: ['HTML5', 'Amber Gold', 'Cinzel Font'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/luxury-realms/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#1901', title: 'Add Private Jet Flight Route Estimator', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#1902', title: 'VIP Island Booking Inquiry Form Validation', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'crypto-exchange-pro',
    title: 'showcase/crypto-exchange-pro',
    category: 'crypto',
    categoryLabel: 'CRYPTO & DEX',
    description:
      'Sub-millisecond crypto perpetual exchange featuring live price ticker cards, leverage indicators, and orderbook status.',
    tags: ['HTML5', 'Sky Blue', 'JetBrains Mono'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/crypto-exchange-pro/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2001', title: 'Add Live Orderbook Bid/Ask Spread Table', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2002', title: 'TradingView Lightweight Chart Widget Embed', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'aerospace-orbiter',
    title: 'showcase/aerospace-orbiter',
    category: 'aerospace',
    categoryLabel: 'AEROSPACE & SPACE',
    description:
      'High-precision orbital mechanics telemetry console with live launch countdown, multi-stage altitude calculation, and satellite orbital inclination tracking.',
    tags: ['HTML5', 'Orbital Mechanics', 'Telemetry'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/aerospace-orbiter/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2101', title: 'Implement Live Ground Track Orbit Projection Map', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2102', title: 'Telemetry Stage Delta-V Stage Burn Calculator', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'quantum-forge',
    title: 'showcase/quantum-forge',
    category: 'quantum',
    categoryLabel: 'QUANTUM COMPUTING',
    description:
      'Visual quantum computing circuit designer with draggable Hadamard, Pauli-X, CNOT gates, state-vector amplitude visualizer, and quantum superposition measurement.',
    tags: ['HTML5', 'Quantum Gates', 'Superposition'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/quantum-forge/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2201', title: 'Add Bloch Sphere 3D Vector Rotator', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#2202', title: 'Qubit Entanglement Bell State Verifier', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'biotech-genomics',
    title: 'showcase/biotech-genomics',
    category: 'biotech',
    categoryLabel: 'BIOTECHNOLOGY',
    description:
      'Interactive bioinformatics suite supporting DNA to mRNA transcription, codon translation into amino acids, CRISPR PAM motif detection, and point mutation simulation.',
    tags: ['HTML5', 'CRISPR-Cas9', 'Bioinformatics'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/biotech-genomics/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2301', title: 'Add Protein Secondary Structure Folding Visualizer', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#2302', title: 'Target Off-Target CRISPR Cleavage Risk Scorer', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'smart-iot-nexus',
    title: 'showcase/smart-iot-nexus',
    category: 'iot',
    categoryLabel: 'SMART IOT & FACTORY',
    description:
      'Industrial telemetric sensor hub monitoring real-time vibration, temperature, pressure, and flow rates with configurable trigger thresholds and automated fail-safe alerts.',
    tags: ['HTML5', 'IoT Telemetry', 'MQTT Stream'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/smart-iot-nexus/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2401', title: 'Live MQTT WebSocket Mock Data Stream Emulator', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2402', title: 'Automated Threshold Rule Action Dispatcher', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'defi-yield-matrix',
    title: 'showcase/defi-yield-matrix',
    category: 'defi',
    categoryLabel: 'DEFI & LIQUIDITY',
    description:
      'Algorithmic DeFi liquidity provision optimizer computing real-time APY compounding schedules, impermanent loss matrices across crypto pairs, and slippage protection.',
    tags: ['HTML5', 'Liquidity Pools', 'Yield APY'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/defi-yield-matrix/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2501', title: 'Interactive Multi-Pool Impermanent Loss Heatmap', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2502', title: 'Automated Yield Rebalancing Strategy Backtester', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'virtual-museum-3d',
    title: 'showcase/virtual-museum-3d',
    category: 'art',
    categoryLabel: 'ART & VIRTUAL MUSEUM',
    description:
      'Immersive digital museum and archaeological archive featuring high-DPI artifact inspection, curation audio tour narration, and historical era timeline mapping.',
    tags: ['HTML5', '3D Gallery', 'Canvas Zoom'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/virtual-museum-3d/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2601', title: 'Add Deep-Zoom Magnifying Canvas Loupe Lens', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2602', title: 'Historical Period Chronological Filter Strip', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'renewable-microgrid',
    title: 'showcase/renewable-microgrid',
    category: 'energy',
    categoryLabel: 'CLEAN ENERGY & GRID',
    description:
      'Smart autonomous power grid simulator balancing solar, wind, and battery storage against fluctuating city demand curves with carbon offset metrics.',
    tags: ['HTML5', 'Clean Energy', 'Grid Balancer'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/renewable-microgrid/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2701', title: 'Implement Battery Storage Degradation Curve Model', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2702', title: 'Live Peak-Demand Shaving Price Curve Calculator', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ],
  },
  {
    id: 'vr-metaverse-hub',
    title: 'showcase/vr-metaverse-hub',
    category: 'metaverse',
    categoryLabel: 'SPATIAL XR & METAVERSE',
    description:
      'Next-generation WebXR spatial computing hub with avatar identity customization, spatial 3D audio attenuation calculation, and multi-room portal navigation.',
    tags: ['HTML5', 'Spatial Audio', 'WebXR'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/vr-metaverse-hub/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2801', title: 'Add Spatial Proximity 3D Audio Visualizer Disc', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2802', title: 'Interactive Multi-Room World Teleport Drawer', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'supply-chain-logistics',
    title: 'showcase/supply-chain-logistics',
    category: 'logistics',
    categoryLabel: 'GLOBAL SUPPLY CHAIN',
    description:
      'Real-time intermodal freight dashboard computing container vessel route ETA, port dwell-time congestion indices, and fuel emission cost curves.',
    tags: ['HTML5', 'Freight Flow', 'Logistics Map'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/supply-chain-logistics/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#2901', title: 'Maritime Vessel Route Waypoint ETA Interpolator', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#2902', title: 'Customs Clearance Manifest Discrepancy Validator', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'robotics-automata',
    title: 'showcase/robotics-automata',
    category: 'robotics',
    categoryLabel: 'ROBOTICS & AUTOMATA',
    description:
      'Interactive 2D/3D planar robotic manipulator simulator with 3-link forward and inverse kinematics, end-effector reach envelopes, and waypoint interpolation.',
    tags: ['HTML5', 'Kinematics', 'Robotic Arm'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/robotics-automata/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3001', title: 'Implement FABRIK Inverse Kinematics Solver Engine', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#3002', title: 'Interactive Waypoint Path Playback & Loop Ticker', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'neurotech-interface',
    title: 'showcase/neurotech-interface',
    category: 'neurotech',
    categoryLabel: 'NEUROTECH & BCI',
    description:
      'Brain-Computer Interface dashboard streaming simulated multi-channel EEG frequency spectrums (Delta, Theta, Alpha, Beta) with real-time focus & engagement scorers.',
    tags: ['HTML5', 'EEG Waveforms', 'BCI Telemetry'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/neurotech-interface/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3101', title: 'Live Fast-Fourier-Transform (FFT) Power Band Canvas', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#3102', title: 'Blink & Motion Muscle Artifact Cancellation Filter', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'weather-radar-atlas',
    title: 'showcase/weather-radar-atlas',
    category: 'weather',
    categoryLabel: 'METEOROLOGY & RADAR',
    description:
      'Live atmospheric weather workstation displaying Doppler storm cell velocities, barometric pressure trend charts, humidity saturation, and storm advisories.',
    tags: ['HTML5', 'Doppler Radar', 'Atmospheric Map'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/weather-radar-atlas/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3201', title: 'Wind Particle Vector Streamline Canvas Simulation', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#3202', title: 'Severe Thunderstorm & Tornado Warning Alert Box', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'streaming-cinema-hub',
    title: 'showcase/streaming-cinema-hub',
    category: 'cinema',
    categoryLabel: 'CINEMA & ENTERTAINMENT',
    description:
      'Cinematic indie film festival platform featuring adaptive 4K video preview containers, real-time synchronized community watch parties, and audience ratings.',
    tags: ['HTML5', 'Indie Cinema', 'Watch Party'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/streaming-cinema-hub/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3301', title: 'Synchronized Playback Scrubbing & Room Host Controls', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#3302', title: 'Interactive Film Cast Trivia & Scene Marker Timeline', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'fitness-crossfit-pro',
    title: 'showcase/fitness-crossfit-pro',
    category: 'fitness',
    categoryLabel: 'FITNESS & ATHLETICS',
    description:
      'High-intensity interval training (HIIT) workout suite with customizable Tabata/EMOM countdown audio beepers, heart-rate zones, and MET calorie burns.',
    tags: ['HTML5', 'HIIT Timer', 'EMOM / WOD'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/fitness-crossfit-pro/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3401', title: 'Add Custom Interval Voice Cue Audio Synthesizer', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#3402', title: 'Target Heart Rate Zone Target Bar Graph', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'charity-microloans',
    title: 'showcase/charity-microloans',
    category: 'charity',
    categoryLabel: 'MICROFINANCE & IMPACT',
    description:
      'Crowdfunded microfinance portal connecting lenders with global entrepreneurs, featuring loan repayment amortization schedules and community impact metrics.',
    tags: ['HTML5', 'Microfinance', 'P2P Lending'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/charity-microloans/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3501', title: 'Amortization Repayment Schedule Interactive Matrix', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#3502', title: 'Global Entrepreneur Geo-Location Impact Map Embed', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'drone-delivery-skyway',
    title: 'showcase/drone-delivery-skyway',
    category: 'drones',
    categoryLabel: 'DRONES & AIR TRAFFIC',
    description:
      'Urban drone air-traffic management terminal with geofenced delivery altitude corridors, battery discharge curves, and automated weather dispatch clearance.',
    tags: ['HTML5', 'Air Corridors', 'Fleet Dispatch'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/drone-delivery-skyway/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3601', title: 'Add Dynamic 3D Geofence Airspace Altitude Corridor', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#3602', title: 'Drone Battery Reserve & Wind Headwind Calculator', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'music-daw-studio',
    title: 'showcase/music-daw-studio',
    category: 'audio',
    categoryLabel: 'MUSIC DAW & SYNTH',
    description:
      'Browser-based digital audio workstation with 16-step drum pattern matrix, real-time Web Audio API polyphonic oscillators, tempo BPM tap, and audio filters.',
    tags: ['HTML5', 'Web Audio API', 'Drum Sequencer'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/music-daw-studio/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3701', title: 'Polyphonic Synthesizer Envelope Filter ADSR Slider', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#3702', title: 'Midi Track Pattern JSON Import & Export Dialog', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'pet-adoption-haven',
    title: 'showcase/pet-adoption-haven',
    category: 'pets',
    categoryLabel: 'ANIMAL RESCUE & FOSTER',
    description:
      'Animal sanctuary adoption hub with interactive pet personality quiz, multi-attribute filter (age, size, energy level), foster application workflows, and bookmarking.',
    tags: ['HTML5', 'Pet Adoption', 'Personality Match'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/pet-adoption-haven/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3801', title: 'Interactive Lifestyle Pet Matchmaker Assessment Quiz', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      { id: '#3802', title: 'Foster Home Multi-Step Digital Application Modal', level: 'Beginner', levelColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ],
  },
  {
    id: 'legal-smart-contracts',
    title: 'showcase/legal-smart-contracts',
    category: 'legal',
    categoryLabel: 'LEGALTECH & ESCROW',
    description:
      'Modular legal agreement builder with automated clause variable parameterization, multi-party electronic signatures, and milestone-locked escrow disbursement simulator.',
    tags: ['HTML5', 'Smart Contracts', 'Escrow'],
    activeIssuesCount: 3,
    previewUrl: '/showcase/legal-smart-contracts/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#3901', title: 'Multi-Signature Milestone Escrow State Engine', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#3902', title: 'Clause Variable Dynamic Replacement Previewer', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
  {
    id: 'agritech-precision-farming',
    title: 'showcase/agritech-precision-farming',
    category: 'agritech',
    categoryLabel: 'PRECISION AGRI & CLIMATE',
    description:
      'Autonomous crop health monitoring portal computing NDVI vegetation health indices, automated soil moisture sensor alerts, smart irrigation schedules, and yield forecasts.',
    tags: ['HTML5', 'NDVI Index', 'Soil Telemetry'],
    activeIssuesCount: 2,
    previewUrl: '/showcase/agritech-precision-farming/index.html',
    githubUrl: 'https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues',
    issues: [
      { id: '#4001', title: 'NDVI False-Color Aerial Imagery Heatmap Canvas', level: 'Advanced', levelColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { id: '#4002', title: 'Automated Weather-Driven Irrigation Valve Scheduler', level: 'Intermediate', levelColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    ],
  },
];

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projectsData.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="px-4 sm:px-6 md:px-12 pt-4 sm:pt-8 pb-16 max-w-7xl mx-auto w-full relative z-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-blur-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2 uppercase tracking-wider">
          <Terminal size={14} />
          <span>// ISOLATED WEBSITE SHOWCASE DIRECTORY</span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3 break-words">
          Open Source Projects &amp; Website Showcase
        </h1>
        <p className="text-gray-400 max-w-3xl text-xs sm:text-sm md:text-base leading-relaxed font-light">
          Explore isolated website project templates built under <code className="text-amber-300 bg-white/5 px-1.5 py-0.5 rounded font-mono">public/showcase/</code>. Preview live static sites, claim open issues, and submit PRs without altering core platform code.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center mb-6 sm:mb-8 animate-blur-fade-up" style={{ animationDelay: '200ms' }}>
        {/* Search */}
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tech stack, title, or keywords..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-md transition-colors min-h-[42px]"
          />
        </div>

        {/* Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all bg-white text-black shadow-lg shadow-white/10 min-h-[36px]"
          >
            All Projects ({projectsData.length})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pb-12">
        {filteredProjects.map((project, index) => (
          <div
            key={project.id}
            className="liquid-glass rounded-2xl p-4 sm:p-6 flex flex-col justify-between border border-white/10 hover:border-white/20 transition-all group animate-blur-fade-up"
            style={{ animationDelay: `${300 + index * 100}ms` }}
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  {project.categoryLabel}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors flex items-center gap-2 break-words">
                <Code2 size={20} className="text-amber-400 flex-shrink-0" />
                <span>{project.title}</span>
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 leading-relaxed font-light">
                {project.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4 sm:mb-5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-md text-xs font-mono bg-white/5 text-gray-300 border border-white/10 flex items-center gap-1"
                  >
                    <Tag size={10} className="text-gray-400" />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Open Issues Box */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="text-[11px] font-mono font-semibold text-amber-400 mb-2.5 tracking-wider flex items-center justify-between uppercase">
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} />
                    OPEN ISSUES ({project.activeIssuesCount} ACTIVE)
                  </span>
                </div>
                <ul className="space-y-2 text-xs">
                  {project.issues.map((issue) => (
                    <li
                      key={issue.id}
                      className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 xs:gap-3 text-gray-300 bg-white/5 p-2 rounded-lg border border-white/5"
                    >
                      <span className="truncate font-mono">
                        <strong className="text-amber-300 font-semibold mr-1">{issue.id}</strong>
                        {issue.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border whitespace-nowrap self-start xs:self-center ${issue.levelColor}`}
                      >
                        {issue.level}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-4 mt-5 border-t border-white/10">
              <a
                href={project.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 bg-amber-400 hover:bg-amber-300 text-black text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer min-h-[42px]"
              >
                <span>View Live Preview</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 liquid-glass text-white hover:bg-white/10 text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer min-h-[42px]"
              >
                <span>Contribute / Submit PR</span>
                <GitBranch size={14} className="text-amber-400" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


