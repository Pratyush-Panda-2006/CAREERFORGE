import fs from 'fs';
import path from 'path';

const projects = [
  { slug: 'ecommerce-store', name: 'E-Commerce Store' },
  { slug: 'agency-studio', name: 'Agency Studio' },
  { slug: 'festival-hub', name: 'Festival Hub' },
  { slug: 'saas-launchpad', name: 'SaaS Launchpad' },
  { slug: 'developer-portfolio', name: 'Developer Portfolio' },
  { slug: 'docs-portal', name: 'Docs Portal' },
  { slug: 'culinary-bistro', name: 'Culinary Bistro' },
  { slug: 'real-estate-luxe', name: 'Real Estate Luxe' },
  { slug: 'fintech-vault', name: 'Fintech Vault' },
  { slug: 'gaming-esports-hub', name: 'Gaming Esports Hub' },
  { slug: 'health-vitality', name: 'Health Vitality' },
  { slug: 'travel-odyssey', name: 'Travel Odyssey' },
  { slug: 'edtech-academy', name: 'Edtech Academy' },
  { slug: 'podcast-audio-stream', name: 'Podcast Audio Stream' },
  { slug: 'nonprofit-impact', name: 'Nonprofit Impact' },
  { slug: 'automotive-hypercar', name: 'Automotive Hypercar' },
  { slug: 'ai-voice-studio', name: 'AI Voice Studio' },
  { slug: 'cybersecurity-sentinel', name: 'Cybersecurity Sentinel' },
  { slug: 'luxury-realms', name: 'Luxury Realms' },
  { slug: 'crypto-exchange-pro', name: 'Crypto Exchange Pro' },
  { slug: 'aerospace-orbiter', name: 'Aerospace Orbiter' },
  { slug: 'quantum-forge', name: 'Quantum Forge' },
  { slug: 'biotech-genomics', name: 'Biotech Genomics' },
  { slug: 'smart-iot-nexus', name: 'Smart IoT Nexus' },
  { slug: 'defi-yield-matrix', name: 'DeFi Yield Matrix' },
  { slug: 'virtual-museum-3d', name: 'Virtual Museum 3D' },
  { slug: 'renewable-microgrid', name: 'Renewable Microgrid' },
  { slug: 'vr-metaverse-hub', name: 'VR Metaverse Hub' },
  { slug: 'supply-chain-logistics', name: 'Supply Chain Logistics' },
  { slug: 'robotics-automata', name: 'Robotics Automata' },
  { slug: 'neurotech-interface', name: 'Neurotech Interface' },
  { slug: 'weather-radar-atlas', name: 'Weather Radar Atlas' },
  { slug: 'streaming-cinema-hub', name: 'Streaming Cinema Hub' },
  { slug: 'fitness-crossfit-pro', name: 'Fitness Crossfit Pro' },
  { slug: 'charity-microloans', name: 'Charity Microloans' },
  { slug: 'drone-delivery-skyway', name: 'Drone Delivery Skyway' },
  { slug: 'music-daw-studio', name: 'Music DAW Studio' },
  { slug: 'pet-adoption-haven', name: 'Pet Adoption Haven' },
  { slug: 'legal-smart-contracts', name: 'Legal Smart Contracts' },
  { slug: 'agritech-precision-farming', name: 'Agritech Precision Farming' }
];

function toPascal(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

// Level 1 Templates (3 Points - Beginner / Quick-Wins)
const level1Templates = [
  {
    featureFile: "theme-palette",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    codeRequirement: "Minimum 40+ lines of clean, structured code across dedicated HTML, CSS, and JS files.",
    theme: "Custom Color Palette & Dynamic Theme Switcher",
    desc: (p) => `Build an isolated client-side theme customizer and color palette switcher for ${p.name} that lets users preview accessible UI accent colors, test contrast ratios, and persist active preferences in localStorage.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/theme-palette.html\` with interactive color swatch pickers, contrast preview cards, and active theme badge (~15 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/theme-palette.css\` with smooth CSS variable theme transitions, swatch hover glow rings, and responsive preview layout (~20 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/theme-palette.js\` implementing class \`${toPascal(p.slug)}ThemePalette\` with \`setAccentColor(hex)\`, \`getStoredTheme()\`, and \`calculateContrast(hex)\` (~25 lines).`
    ]
  },
  {
    featureFile: "quick-faq",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    codeRequirement: "Minimum 40+ lines of clean, structured code across dedicated HTML, CSS, and JS files.",
    theme: "Interactive Searchable FAQ & Collapsible Accordion Drawer",
    desc: (p) => `Build a lightweight, self-contained FAQ search panel and accessible accordion drawer for ${p.name} that provides real-time keyword filtering, smooth expand/collapse transitions, and full ARIA keyboard navigation.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/quick-faq.html\` with instant search query input, collapsible FAQ item accordions, and category pill filters (~15 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/quick-faq.css\` with animated chevron rotations, slide-down panel disclosure, and clean typography (~20 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/quick-faq.js\` implementing class \`${toPascal(p.slug)}QuickFAQ\` with \`filterQuestions(query)\`, \`toggleAccordion(id)\`, and \`highlightMatches(term)\` (~25 lines).`
    ]
  },
  {
    featureFile: "shortcut-cheatsheet",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    codeRequirement: "Minimum 40+ lines of clean, structured code across dedicated HTML, CSS, and JS files.",
    theme: "Keyboard Shortcut Cheat-Sheet & Command Reference Overlay",
    desc: (p) => `Build an accessible in-browser shortcut reference dialog and interactive hotkey cheat-sheet for ${p.name} that displays categorized keybindings with instant clipboard copying and keypress simulation.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/shortcut-cheatsheet.html\` with search filter bar, grouped shortcut badge cards, and modal backdrop container (~15 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/shortcut-cheatsheet.css\` with realistic keyboard keycap styling (\`<kbd>\`), active press effects, and smooth backdrop blur (~20 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/shortcut-cheatsheet.js\` implementing class \`${toPascal(p.slug)}ShortcutGuide\` with \`searchShortcuts(query)\`, \`listenForHotkey(event)\`, and \`copyKeyCombo(id)\` (~25 lines).`
    ]
  }
];

// Level 2 Templates (5 Points - Intermediate / UI & Tools)
const level2Templates = [
  {
    featureFile: "roi-calculator",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    codeRequirement: "Minimum 60+ lines of clean, structured code across dedicated HTML, CSS, and JS files.",
    theme: "Interactive Metric ROI & Cost-Savings Forecaster",
    desc: (p) => `Build an interactive return-on-investment (ROI) and cost-efficiency forecaster for ${p.name} that models projected annual savings, efficiency gains, and break-even timelines based on dynamic user parameter inputs.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/roi-calculator.html\` with numerical sliders (team size, hours saved, hourly cost), summary metrics banner, and projected savings breakdown (~20 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/roi-calculator.css\` with gradient progress meters, tabular data cards, and currency highlight badges (~25 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/roi-calculator.js\` implementing class \`${toPascal(p.slug)}RoiEngine\` with \`calculateAnnualSavings(inputs)\`, \`computeBreakEvenMonths(investment)\`, and \`formatCurrency(amount)\` (~35 lines).`
    ]
  },
  {
    featureFile: "csv-importer",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    codeRequirement: "Minimum 60+ lines of clean, structured code across dedicated HTML, CSS, and JS files.",
    theme: "Client-Side CSV Data Importer & Tabular Previewer",
    desc: (p) => `Build a browser-native drag-and-drop CSV parser and tabular data inspector for ${p.name} that detects delimiters, validates row schemas, sorts columns, and exports sanitized JSON data.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/csv-importer.html\` with drag-and-drop dropzone, parsed data preview table, and export JSON button (~20 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/csv-importer.css\` with drag-over pulse animation, zebra-striped table rows, and column sort indicator arrows (~25 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/csv-importer.js\` implementing class \`${toPascal(p.slug)}CsvImporter\` with \`parseCSV(text)\`, \`detectDelimiter(sample)\`, and \`sortColumn(colIndex, asc)\` (~35 lines).`
    ]
  },
  {
    featureFile: "qr-generator",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    codeRequirement: "Minimum 60+ lines of clean, structured code across dedicated HTML, CSS, and JS files.",
    theme: "Interactive QR Code & Deep-Link Matrix Generator",
    desc: (p) => `Build a standalone deep-link URL encoder and procedural SVG QR code generator for ${p.name} that allows custom payload inputs, error-correction level selection, and instant 1-click SVG/PNG downloads.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/qr-generator.html\` with URL/payload input field, error-correction level selector, SVG QR preview stage, and download triggers (~20 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/qr-generator.css\` with sharp SVG pixel rendering, responsive container bounds, and modern action button styling (~25 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/qr-generator.js\` implementing class \`${toPascal(p.slug)}QrGenerator\` with \`generateQrMatrix(data, ecLevel)\`, \`renderSVG(matrix)\`, and \`downloadAsset(format)\` (~35 lines).`
    ]
  }
];

// Level 3 Templates (10 Points - Advanced / Engine & Testing)
const level3Templates = [
  {
    featureFile: "rbac-matrix",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    codeRequirement: "Minimum 100+ lines of clean, structured code across dedicated HTML, CSS, JS, and test file.",
    theme: "Role-Based Access Control (RBAC) Permission Matrix & Policy Guard",
    desc: (p) => `Build an isolated role-based access control (RBAC) authorization engine and interactive permission grid for ${p.name} that calculates bitmask permissions, validates user role inheritance, and evaluates dynamic access grants.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/rbac-matrix.html\` with role-to-permission matrix checkboxes, active simulation selector, and access evaluation badge (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/rbac-matrix.css\` with interactive matrix grid cells, green/red access permission pills, and policy editor drawer (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/rbac-matrix.js\` implementing class \`${toPascal(p.slug)}RbacEngine\` with \`assignRole(user, role)\`, \`checkPermission(role, action)\`, and \`evaluatePolicyBitmask(mask)\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/rbac-matrix.test.mjs\` asserting role inheritance resolution, wild-card action matching, and unauthorized privilege rejection with node:test (~25 lines).`
    ]
  },
  {
    featureFile: "bloom-filter",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    codeRequirement: "Minimum 100+ lines of clean, structured code across dedicated HTML, CSS, JS, and test file.",
    theme: "Probabilistic Bloom Filter & Membership Query Visualizer",
    desc: (p) => `Build an autonomous in-browser Bloom Filter probabilistic set engine and bit-array visualizer for ${p.name} that maps string hashes onto a fixed-size bit array, computes theoretical false-positive rates, and visually highlights hash collisions.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/bloom-filter.html\` with element insert input, membership probe query bar, and animated bit array memory grid (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/bloom-filter.css\` with high-contrast bit cell toggles (0 vs 1), hash collision glowing accents, and stats HUD panel (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/bloom-filter.js\` implementing class \`${toPascal(p.slug)}BloomFilter\` with \`insert(item)\`, \`contains(item)\`, and \`calculateFalsePositiveRate()\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/bloom-filter.test.mjs\` testing zero false-negatives guarantee, hash distribution uniformity, and false-positive upper bounds with node:test (~25 lines).`
    ]
  },
  {
    featureFile: "circuit-breaker",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    codeRequirement: "Minimum 100+ lines of clean, structured code across dedicated HTML, CSS, JS, and test file.",
    theme: "Fault-Tolerant Circuit Breaker & API Resilience Simulator",
    desc: (p) => `Build an autonomous client-side Circuit Breaker resilience engine for ${p.name} that manages tri-state failure recovery (Closed, Open, Half-Open), counts consecutive errors, executes exponential backoff, and protects application state from cascading service failures.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/circuit-breaker.html\` with interactive mock request dispatch buttons (Success, Fail, Timeout), tri-state status indicator, and telemetry event stream (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/circuit-breaker.css\` with state indicator lamps (Green, Red, Yellow), failure threshold meter, and real-time event log rows (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/circuit-breaker.js\` implementing class \`${toPascal(p.slug)}CircuitBreaker\` with \`execute(fn)\`, \`trip()\`, and \`resetTimeout()\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/circuit-breaker.test.mjs\` testing transition from Closed to Open on threshold breach, half-open trial executions, and fallback recovery with node:test (~25 lines).`
    ]
  },
  {
    featureFile: "event-sourcing",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    codeRequirement: "Minimum 100+ lines of clean, structured code across dedicated HTML, CSS, JS, and test file.",
    theme: "Event Sourcing Ledger & Temporal State Replay Engine",
    desc: (p) => `Build an in-memory event-sourcing ledger and temporal state replay engine for ${p.name} that stores state mutations as immutable append-only events, computes current snapshots, and offers forward/backward time-travel replay.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/event-sourcing.html\` with event submission controls, immutable append-only ledger table, and temporal timeline scrub bar (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/event-sourcing.css\` with event timeline chips, state snapshot comparison panels, and active playback controls (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/event-sourcing.js\` implementing class \`${toPascal(p.slug)}EventSourcingLedger\` with \`appendEvent(type, payload)\`, \`replayToTimestamp(ts)\`, and \`getMaterializedState()\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/event-sourcing.test.mjs\` testing event ledger immutability, deterministic state reconstruction, and historical rewind accuracy with node:test (~25 lines).`
    ]
  }
];

// Generate 100 Issues across 40 projects
// We will assign:
// 30 Level 1 tasks
// 35 Level 2 tasks
// 35 Level 3 tasks
// Total = 100 tasks!
// Distribution: 20 projects get 3 tasks (60), 20 projects get 2 tasks (40) => 100 tasks.

const allIssues = [];
let issueCounter = 1201; // Continuous numbering starting from 1201!

// To ensure balanced distribution of levels:
// Projects 0 to 19 (20 projects): get 1 Level 1, 1 Level 2, 1 Level 3 = 20 L1, 20 L2, 20 L3 (60 tasks)
// Projects 20 to 29 (10 projects): get 1 Level 1, 1 Level 2 = 10 L1, 10 L2 (20 tasks)
// Projects 30 to 34 (5 projects): get 1 Level 2, 1 Level 3 = 5 L2, 5 L3 (10 tasks)
// Projects 35 to 39 (5 projects): get 2 Level 3 = 10 L3 (10 tasks)
// Total counts:
// Level 1: 20 + 10 = 30 tasks
// Level 2: 20 + 10 + 5 = 35 tasks
// Level 3: 20 + 5 + 10 = 35 tasks
// Total: 30 + 35 + 35 = 100 tasks!

let l1Idx = 0;
let l2Idx = 0;
let l3Idx = 0;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  const assignedTemplates = [];

  if (pIdx < 20) {
    // 3 tasks: L1, L2, L3
    assignedTemplates.push(level1Templates[l1Idx++ % level1Templates.length]);
    assignedTemplates.push(level2Templates[l2Idx++ % level2Templates.length]);
    assignedTemplates.push(level3Templates[l3Idx++ % level3Templates.length]);
  } else if (pIdx < 30) {
    // 2 tasks: L1, L2
    assignedTemplates.push(level1Templates[l1Idx++ % level1Templates.length]);
    assignedTemplates.push(level2Templates[l2Idx++ % level2Templates.length]);
  } else if (pIdx < 35) {
    // 2 tasks: L2, L3
    assignedTemplates.push(level2Templates[l2Idx++ % level2Templates.length]);
    assignedTemplates.push(level3Templates[l3Idx++ % level3Templates.length]);
  } else {
    // 2 tasks: L3, L3 (different templates)
    const tA = level3Templates[l3Idx++ % level3Templates.length];
    const tB = level3Templates[l3Idx++ % level3Templates.length];
    assignedTemplates.push(tA);
    assignedTemplates.push(tB);
  }

  for (const t of assignedTemplates) {
    const issueNum = issueCounter++;
    const filesList = t.level === "level3"
      ? `\`${t.featureFile}.html\`, \`${t.featureFile}.css\`, \`${t.featureFile}.js\`, \`${t.featureFile}.test.mjs\``
      : `\`${t.featureFile}.html\`, \`${t.featureFile}.css\`, \`${t.featureFile}.js\``;

    allIssues.push({
      id: issueNum,
      project: p.slug,
      projectName: p.name,
      level: t.level,
      points: t.points,
      labels: t.labels,
      title: `[${p.slug}] Implement ${t.theme.toLowerCase()} in dedicated modular files`,
      description: t.desc(p),
      featureFile: t.featureFile,
      suggestions: t.guide(p),
      zeroConflictGuarantee: `Zero-Merge-Conflict Guarantee: This task is implemented strictly in its own isolated files (${filesList}). Do not modify common files (index.html, styles.css, script.js) to guarantee 100% conflict-free merging!`,
      codeRequirement: t.codeRequirement
    });
  }
}

const countL1 = allIssues.filter(i => i.level === 'level1').length;
const countL2 = allIssues.filter(i => i.level === 'level2').length;
const countL3 = allIssues.filter(i => i.level === 'level3').length;

console.log(`Generated ${allIssues.length} conflict-free issues successfully (IDs 1201-1300)!`);
console.log(`Distribution: Level 1 (${countL1}), Level 2 (${countL2}), Level 3 (${countL3})`);

// 1. Build BATCH17_ISSUES.md
let md = `# 🚀 CAREERFORGE Batch 17 Issues Catalog: 100 Multi-Level Contributor Tasks

**Repository:** \`Pratyush-Panda-2006/CAREERFORGE\`  
**Initiative:** Nexus Spring of Code 2026 (NSoC '26)  
**Batch Scope:** **Multi-Level Tasks Across All 40 Showcase Projects (Level 1, Level 2, and Level 3)**  
**Catalog Size:** 100 Handcrafted Showcase Enhancements (IDs #1201 to #1300)  
**Distribution:** **30 Level 1 Tasks (3 Points)** | **35 Level 2 Tasks (5 Points)** | **35 Level 3 Tasks (10 Points)**  
**Zero-Merge-Conflict Architecture:** Every single task operates in its own **dedicated, isolated files** (e.g. \`[feature].html\`, \`[feature].css\`, \`[feature].js\`, plus \`[feature].test.mjs\` for Level 3). Contributors **do not edit shared files** (\`index.html\`, \`styles.css\`, \`script.js\`), eliminating 100% of git merge conflicts!

---

## 📑 Table of Contents
1. [Multi-Level Scoring & Guidelines](#1-multi-level-scoring--guidelines)
2. [Batch 17 Distribution Matrix (40 Projects)](#2-batch-17-distribution-matrix-40-projects)
3. [Detailed Task Specifications (100 Issues: #1201 to #1300)](#3-detailed-task-specifications-100-issues)
4. [Automated Publishing & Dry-Run Guide](#4-automated-publishing--dry-run-guide)

---

## 1. Multi-Level Scoring & Guidelines

Batch 17 provides opportunities for contributors across all skill levels under Nexus Spring of Code 2026:

| Tier | Label | Points | Code Footprint | Conflict Prevention Strategy |
| :---: | :---: | :---: | :---: | :--- |
| **Level 1** | \`level1\` | **3 Points** | **≥ 40 lines** | **Isolated UI Sub-View:** Build in dedicated HTML/CSS/JS without touching shared files. |
| **Level 2** | \`level2\` | **5 Points** | **≥ 60 lines** | **Interactive Tool & Component:** Build dynamic calculator, parser, or generator in dedicated files. |
| **Level 3** | \`level3\` | **10 Points** | **≥ 100 lines** | **Isolated File Quartet:** Build complete engine with dedicated HTML, CSS, JS, and Unit Test. |

### 🛡️ Why Contributors Face ZERO Merge Conflicts:
- **No Shared File Contention:** Tasks do not modify existing shared files (\`index.html\`, \`styles.css\`, \`script.js\`).
- **Dedicated Unique Filenames:** Every task specifies its own dedicated files under \`public/showcase/[project-slug]/\`.
- **Instant Concurrent Merges:** Because each PR introduces new distinct files, dozens of contributors can submit and merge PRs concurrently with zero merge conflicts!

---

## 2. Batch 17 Distribution Matrix (40 Projects)

| # | Project Directory | Domain | Assigned Tasks |
|---|---|---|---|
`;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  const pIssues = allIssues.filter(i => i.project === p.slug);
  const l1 = pIssues.filter(i => i.level === 'level1').length;
  const l2 = pIssues.filter(i => i.level === 'level2').length;
  const l3 = pIssues.filter(i => i.level === 'level3').length;
  const details = [
    l1 ? `${l1} L1 (3 pts)` : null,
    l2 ? `${l2} L2 (5 pts)` : null,
    l3 ? `${l3} L3 (10 pts)` : null
  ].filter(Boolean).join(', ');
  md += `| ${pIdx + 1} | \`${p.slug}\` | ${p.name} | ${pIssues.length} Tasks (${details}) |\n`;
}

md += `\n---\n\n## 3. Detailed Task Specifications (100 Issues: #1201 to #1300)\n\n`;

for (const item of allIssues) {
  const levelText = item.level === 'level1' ? 'Level 1 (3 Points)' : item.level === 'level2' ? 'Level 2 (5 Points)' : 'Level 3 (10 Points)';
  md += `#### ${item.id}. \`[${item.project}]\` ${item.title.replace(`[${item.project}] `, '')}\n`;
  md += `- **Labels:** \`${item.labels.join('`, `')}\`\n`;
  md += `- **Showcase Path:** \`public/showcase/${item.project}/\`\n`;
  md += `- **Points:** **${item.points}** (${levelText})\n`;
  md += `- **Code Requirement:** **${item.codeRequirement}**\n`;
  md += `- **Conflict-Free Guard:** ${item.zeroConflictGuarantee}\n`;
  md += `- **Description:** ${item.description}\n`;
  md += `- **Step-by-Step Implementation Guide:**\n`;
  for (const s of item.suggestions) {
    md += `  - ${s}\n`;
  }
  md += `\n`;
}

md += `---

## 4. Automated Publishing & Dry-Run Guide

Batch 17 issues can be previewed or published to GitHub via the companion script:

\`\`\`bash
# 1. Preview all 100 Batch 17 issues in dry-run mode
node scripts/create-batch17-issues.mjs --dry-run

# 2. Or using npm run script
npm run create-batch17-issues -- --dry-run

# 3. Publish directly to GitHub repository (via GitHub Actions or with GITHUB_TOKEN)
node scripts/create-batch17-issues.mjs
\`\`\`
`;

fs.writeFileSync(path.resolve('BATCH17_ISSUES.md'), md, 'utf-8');
console.log('Successfully written BATCH17_ISSUES.md!');

// 2. Build scripts/create-batch17-issues.mjs
const scriptCode = `import { execSync } from "child_process";

// Allow dry-run mode for local validation and previewing
const isDryRun = process.argv.includes("--dry-run");

let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token && !isDryRun) {
  try {
    token = execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    console.warn("⚠️ Could not retrieve token via \`gh auth token\`. Falling back to dry-run mode.");
    console.warn("   To publish issues to GitHub, ensure GITHUB_TOKEN is set or run \`gh auth login\`.");
  }
}

const repoEnv = process.env.GITHUB_REPOSITORY || "Pratyush-Panda-2006/CAREERFORGE";
const [owner, repo] = repoEnv.split("/");

export const issues = ${JSON.stringify(allIssues, null, 2)};

/**
 * Native fetch helper for publishing issues with rate limiting & error handling
 */
async function createGithubIssue(item, body) {
  const url = \`https://api.github.com/repos/\${owner}/\${repo}/issues\`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "CAREERFORGE-Batch17-Publisher",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: \`Bearer \${token}\`
    },
    body: JSON.stringify({
      title: item.title,
      body,
      labels: item.labels
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    const err = new Error(\`HTTP \${res.status}: \${errorText}\`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function formatBody(item) {
  const guide = item.suggestions.map((s, idx) => (idx + 1) + '. ' + s).join('\\n');
  const levelTitle = item.level === 'level1' ? 'Level 1 (Beginner / Quick-Wins)' : item.level === 'level2' ? 'Level 2 (Intermediate / UI & Tools)' : 'Level 3 (Advanced / Core Engine)';
  return '### 🌸 Nexus Spring of Code 2026 (NSoC \\'26) — Issue Specification\\n\\n' +
    '**Target Showcase Directory:** \`public/showcase/' + item.project + '/\`\\n' +
    '**Difficulty Tier:** **' + levelTitle + '**\\n' +
    '**Award Value:** **' + item.points + '**\\n' +
    '**Required Code Size:** **' + item.codeRequirement + '**\\n\\n' +
    '---\\n\\n' +
    '### 🛡️ Zero-Merge-Conflict Guarantee\\n' +
    item.zeroConflictGuarantee + '\\n\\n' +
    '---\\n\\n' +
    '### 📋 Task Overview\\n' +
    item.description + '\\n\\n' +
    '---\\n\\n' +
    '### 🛠️ Step-by-Step Implementation Guide\\n' +
    guide + '\\n\\n' +
    '---\\n\\n' +
    '### 🚨 Strict Contribution Guardrails\\n' +
    '- **Scope Restriction:** All code changes **MUST** reside exclusively inside \`public/showcase/' + item.project + '/\`.\\n' +
    '- **Zero Conflicts:** Create your feature in the dedicated files specified above without modifying shared files.\\n' +
    '- **Protected Core:** Never modify, reformat, or alter files in \`src/\`, \`package.json\`, \`.github/\`, or top-level configs.\\n' +
    '- **PR Description Keyword:** Ensure your PR description includes a closing keyword referencing this issue (e.g. \`Closes #<issue-id>\` or \`Fixes #<issue-id>\`).\\n' +
    '- **Claiming:** Reply with \`/claim\` to be assigned (3-day timer).\\n\\n' +
    'Happy Coding! 🚀';
}

async function run() {
  console.log(\`\\n======================================================\`);
  console.log(\`🚀 CAREERFORGE Batch 17 Issue Publisher (NSoC 2026)\`);
  console.log(\`   Total Issues in Batch: \${issues.length} (30 Level 1, 35 Level 2, 35 Level 3)\`);
  console.log(\`   Mode: \${isDryRun || !token ? "DRY-RUN (Preview Only)" : "LIVE PUBLISH"}\`);
  console.log(\`======================================================\\n\`);

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    const body = formatBody(item);

    if (isDryRun || !token) {
      console.log(\`[DRY-RUN] [\${i + 1}/\${issues.length}] \${item.title}\`);
      console.log(\`          Labels: \${item.labels.join(", ")} | Points: \${item.points} | Level: \${item.level}\`);
      console.log(\`          Path: public/showcase/\${item.project}/\`);
      console.log(\`------------------------------------------------------\`);
    } else {
      let success = false;
      let retries = 0;
      while (!success && retries < 3) {
        try {
          const created = await createGithubIssue(item, body);
          console.log(\`✅ [\${i + 1}/\${issues.length}] Created Issue #\${created.number}: \${item.title}\`);
          success = true;
          // Delay to respect rate limits
          await new Promise((r) => setTimeout(r, 1200));
        } catch (err) {
          retries++;
          console.error(\`⚠️ Attempt \${retries} failed for "\${item.title}": \${err.message}\`);
          if (err.status === 403 || err.status === 429) {
            console.log("⏳ Secondary rate limit detected, sleeping for 30 seconds before retry...");
            await new Promise((r) => setTimeout(r, 30000));
          } else {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      }
    }
  }

  console.log(\`\\n✨ Batch 17 Processing Completed (\${issues.length} Issues Processed)!\\n\`);
}

run();
`;

fs.writeFileSync(path.resolve('scripts', 'create-batch17-issues.mjs'), scriptCode, 'utf-8');
console.log('Successfully written scripts/create-batch17-issues.mjs!');
