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
    <div className="px-4 sm:px-6 md:px-12 py-8 max-w-7xl mx-auto w-full relative z-10">
      {/* Header */}
      <div className="mb-8 animate-blur-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2 uppercase tracking-wider">
          <Terminal size={14} />
          <span>// ISOLATED WEBSITE SHOWCASE DIRECTORY</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
          Open Source Projects &amp; Website Showcase
        </h1>
        <p className="text-gray-400 max-w-3xl text-sm sm:text-base leading-relaxed font-light">
          Explore isolated website project templates built under <code className="text-amber-300 bg-white/5 px-1.5 py-0.5 rounded font-mono">public/showcase/</code>. Preview live static sites, claim open issues, and submit PRs without altering core platform code.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-8 animate-blur-fade-up" style={{ animationDelay: '200ms' }}>
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tech stack, title, or keywords..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-md transition-colors"
          />
        </div>

        {/* Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            type="button"
            className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all bg-white text-black shadow-lg shadow-white/10"
          >
            All Projects ({projectsData.length})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {filteredProjects.map((project, index) => (
          <div
            key={project.id}
            className="liquid-glass rounded-2xl p-6 flex flex-col justify-between border border-white/10 hover:border-white/20 transition-all group animate-blur-fade-up"
            style={{ animationDelay: `${300 + index * 100}ms` }}
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between mb-4 gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  {project.categoryLabel}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors flex items-center gap-2">
                <Code2 size={20} className="text-amber-400" />
                {project.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed font-light">
                {project.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-5">
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
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-[11px] font-mono font-semibold text-amber-400 mb-3 tracking-wider flex items-center justify-between uppercase">
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} />
                    OPEN ISSUES ({project.activeIssuesCount} ACTIVE)
                  </span>
                </div>
                <ul className="space-y-2 text-xs">
                  {project.issues.map((issue) => (
                    <li
                      key={issue.id}
                      className="flex items-center justify-between gap-3 text-gray-300 bg-white/5 p-2 rounded-lg border border-white/5"
                    >
                      <span className="truncate font-mono">
                        <strong className="text-amber-300 font-semibold mr-1">{issue.id}</strong>
                        {issue.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border whitespace-nowrap ${issue.levelColor}`}
                      >
                        {issue.level}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 mt-5 border-t border-white/10">
              <a
                href={project.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 bg-amber-400 hover:bg-amber-300 text-black text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>View Live Preview</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 liquid-glass text-white hover:bg-white/10 text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer"
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


