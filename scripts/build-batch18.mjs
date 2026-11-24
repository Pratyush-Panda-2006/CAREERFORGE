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
    featureFile: "breadcrumbs-navigator",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    theme: "Dynamic Breadcrumbs Path Navigator & History Stack",
    desc: (p) => `Build an isolated client-side breadcrumb navigation trail and recent view history stack for ${p.name} that tracks hierarchical route depth, displays interactive navigation crumb links, and supports instant traversal back to previous parent nodes.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/breadcrumbs-navigator.html\` with interactive route segment trails, home icon anchor, and active page pill.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/breadcrumbs-navigator.css\` styling chevron separators, active state emphasis, and responsive wrapping for narrow screens.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/breadcrumbs-navigator.js\` implementing class \`${toPascal(p.slug)}BreadcrumbNav\` with \`pushRoute(segment, url)\`, \`popRoute()\`, and \`renderTrail()\`.`
    ]
  },
  {
    featureFile: "feedback-collector",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    theme: "Micro-Feedback Rating Widget & Sentiment Collector",
    desc: (p) => `Build a lightweight, self-contained micro-feedback rating widget for ${p.name} that captures user sentiment with interactive star / emoji scales, optional comment input, and local persistence of satisfaction ratings.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/feedback-collector.html\` with sentiment emoji buttons, optional feedback textarea, and submit acknowledgement banner.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/feedback-collector.css\` featuring smooth hover scale animations, active selection glows, and floating card presentation.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/feedback-collector.js\` implementing class \`${toPascal(p.slug)}FeedbackWidget\` with \`submitRating(score, comment)\`, \`getAverageRating()\`, and \`hasUserVoted()\`.`
    ]
  },
  {
    featureFile: "reading-progress",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    theme: "Reading Progress Bar & Article Read-Time Estimator",
    desc: (p) => `Build an accessible reading progress indicator and estimated reading time calculator for ${p.name} that monitors document scroll position, renders a dynamic progress bar at the top, and displays calculated remaining read time in minutes.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/reading-progress.html\` with top sticky progress bar, estimated read-time badge, and sample content viewport.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/reading-progress.css\` with smooth gradient fill transitions, sticky header pin styling, and unobtrusive typography.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/reading-progress.js\` implementing class \`${toPascal(p.slug)}ReadingTracker\` with \`computeReadTime(text, wordsPerMinute)\`, \`updateScrollProgress(scrollTop, maxScroll)\`, and \`bindScrollListener()\`.`
    ]
  },
  {
    featureFile: "status-badge",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    theme: "System Health Status Pill & Service Ping Indicator",
    desc: (p) => `Build a self-contained system health status pill and service heartbeat indicator for ${p.name} that visualizes operational readiness (Operational, Degraded, Maintenance), displays live uptime percentages, and simulates service pings.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/status-badge.html\` with pulsating status dot, service name label, and collapsible uptime metrics tooltip.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/status-badge.css\` styling color-coded status lamps (Green, Amber, Red), pulsing radial ping ring animations, and dark glass card frame.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/status-badge.js\` implementing class \`${toPascal(p.slug)}StatusIndicator\` with \`setStatus(state)\`, \`recordPing(latencyMs)\`, and \`getUptimeStats()\`.`
    ]
  },
  {
    featureFile: "copy-code-block",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "enhancement", "good-first-issue"],
    theme: "Syntax-Highlighted Code Snippet Box with One-Click Copy",
    desc: (p) => `Build a clean, accessible code display box with language badge and one-click clipboard copying for ${p.name} that formats code snippets, numbers lines, and provides instant visual copied feedback.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/copy-code-block.html\` with syntax container, language indicator pill, and interactive copy-to-clipboard button.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/copy-code-block.css\` with monospace code typography, line number gutters, and copy success tooltip transitions.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/copy-code-block.js\` implementing class \`${toPascal(p.slug)}CodeBlockWidget\` with \`copySnippet(codeText)\`, \`formatLineNumbers(text)\`, and \`triggerCopyFeedback()\`.`
    ]
  }
];

// Level 2 Templates (5 Points - Intermediate / UI & Tools)
const level2Templates = [
  {
    featureFile: "token-counter",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Client-Side Tokenizer & Text Byte Length Meter",
    desc: (p) => `Build an interactive client-side token counter and character/word/byte frequency inspector for ${p.name} that estimates LLM tokens using BPE-like heuristic rules, counts character distributions, and visualizes token density.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/token-counter.html\` with live text editor textarea, metric counters (Tokens, Words, Characters, Bytes), and tokenized pill view.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/token-counter.css\` with alternating token highlight badges, real-time metric counter cards, and warning color thresholds.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/token-counter.js\` implementing class \`${toPascal(p.slug)}TokenAnalyzer\` with \`estimateTokens(text)\`, \`getWordCount(text)\`, and \`calculateByteSize(text)\`.`
    ]
  },
  {
    featureFile: "json-schema-validator",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Interactive JSON Payload Schema Validator & Lint Inspector",
    desc: (p) => `Build a browser-based JSON schema validator and structure linter for ${p.name} that inspects nested JSON objects against required fields and type constraints, highlighting syntax errors and schema mismatches in real time.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/json-schema-validator.html\` with schema template selector, JSON payload input area, and validation report badge.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/json-schema-validator.css\` styling error line callouts, validation pass/fail pill badges, and split-pane layout.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/json-schema-validator.js\` implementing class \`${toPascal(p.slug)}SchemaValidator\` with \`validate(schema, payload)\`, \`checkTypes(expected, actual)\`, and \`formatValidationErrors()\`.`
    ]
  },
  {
    featureFile: "kanban-board",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Lightweight Drag-and-Drop Task Kanban Board with Column Reordering",
    desc: (p) => `Build an autonomous client-side Kanban task board for ${p.name} featuring multi-column workflow stages (Backlog, In Progress, Review, Done), HTML5 drag-and-drop card movement, and localStorage task synchronization.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/kanban-board.html\` with Kanban column lanes, new task creation modal, and draggable task cards.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/kanban-board.css\` with drag-over column highlights, card elevation drop-shadows, and priority color tags.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/kanban-board.js\` implementing class \`${toPascal(p.slug)}KanbanBoard\` with \`moveTask(taskId, targetColumn)\`, \`addTask(title, priority)\`, and \`saveBoardState()\`.`
    ]
  },
  {
    featureFile: "color-contrast-auditor",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "WCAG Compliant Color Contrast Matrix & Palette Verifier",
    desc: (p) => `Build an interactive WCAG 2.1 color contrast auditing tool for ${p.name} that evaluates foreground and background color pairings, computes luminance ratios, and tests compliance against AA (4.5:1) and AAA (7:1) standards.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/color-contrast-auditor.html\` with color pickers for background and text, live sample text preview, and AA/AAA compliance tags.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/color-contrast-auditor.css\` with contrast ratio gauges, pass/fail status indicator chips, and high-contrast preview frames.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/color-contrast-auditor.js\` implementing class \`${toPascal(p.slug)}ContrastAuditor\` with \`calculateRatio(fgHex, bgHex)\`, \`getLuminance(hex)\`, and \`evaluateWcagCompliance(ratio)\`.`
    ]
  },
  {
    featureFile: "cron-parser",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Human-Readable Cron Schedule Expression Builder & Next-Run Visualizer",
    desc: (p) => `Build an intuitive cron schedule expression parser and generator for ${p.name} that translates standard 5-part cron syntax into natural English explanations and calculates upcoming execution timestamps.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/cron-parser.html\` with 5-part cron input boxes (Minute, Hour, Day, Month, Weekday), human-readable explanation card, and next-runs list.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/cron-parser.css\` with field focus highlighting, cron token pills, and chronological upcoming run schedule styling.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/cron-parser.js\` implementing class \`${toPascal(p.slug)}CronParser\` with \`parseExpression(cronStr)\`, \`getNextExecutionDates(cronStr, count)\`, and \`toHumanReadable(cronStr)\`.`
    ]
  }
];

// Level 3 Templates (10 Points - Advanced / Engine & Testing)
const level3Templates = [
  {
    featureFile: "rate-limiter",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Token Bucket / Leaky Bucket Rate Limiter & Concurrency Throttler",
    desc: (p) => `Build an autonomous client-side Rate Limiter engine for ${p.name} implementing the Token Bucket algorithm with refill rate intervals, burst capacity limits, queue prioritization, and exhaustive automated unit tests.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/rate-limiter.html\` with request flood simulator buttons, bucket fill level progress meter, and rate-limited event log stream.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/rate-limiter.css\` with liquid bucket reservoir animation, accepted/throttled status badges, and request telemetry metrics.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/rate-limiter.js\` implementing class \`${toPascal(p.slug)}TokenBucketRateLimiter\` with \`tryConsume(tokens)\`, \`refill()\`, and \`getAvailableTokens()\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/rate-limiter.test.mjs\` testing burst capacity bounds, time-based token replenishment accuracy, and request rejection under exhaustion with node:test.`
    ]
  },
  {
    featureFile: "lru-cache",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Least-Recently-Used (LRU) In-Memory Cache with Eviction Visualizer",
    desc: (p) => `Build a doubly-linked-list and hash-map backed LRU (Least Recently Used) cache engine for ${p.name} that supports O(1) reads/writes, automatic eviction of oldest entries upon reaching capacity, and dynamic visual node state inspection.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/lru-cache.html\` with key-value insertion form, cache capacity slider, eviction log, and ordered node chain diagram.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/lru-cache.css\` with animated node eviction fades, head/tail pointer highlight badges, and memory occupancy bars.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/lru-cache.js\` implementing class \`${toPascal(p.slug)}LruCache\` with \`get(key)\`, \`put(key, value)\`, and \`getEvictedEntries()\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/lru-cache.test.mjs\` asserting O(1) access updates, correct eviction of least recently used items on overflow, and cache clear resets with node:test.`
    ]
  },
  {
    featureFile: "trie-search",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Prefix Tree (Trie) Typeahead Autocomplete & Spell Distance Engine",
    desc: (p) => `Build an in-memory Trie (Prefix Tree) search data structure and fuzzy typeahead autocomplete engine for ${p.name} that enables fast prefix lookups, calculates Levenshtein edit distance for spelling suggestions, and renders prefix subtrees.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/trie-search.html\` with instant typeahead search input, auto-suggest dropdown list, and interactive Trie hierarchy tree viewer.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/trie-search.css\` with highlighted prefix match characters, glowing tree edge connectors, and smooth suggestion list transitions.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/trie-search.js\` implementing class \`${toPascal(p.slug)}TrieEngine\` with \`insert(word)\`, \`findWordsWithPrefix(prefix)\`, and \`fuzzySearch(query, maxDistance)\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/trie-search.test.mjs\` validating exact prefix completion, empty prefix handling, case-insensitivity, and Levenshtein distance accuracy with node:test.`
    ]
  },
  {
    featureFile: "websocket-reconnect",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Resilient WebSocket Heartbeat & Exponential Backoff Reconnection Engine",
    desc: (p) => `Build an autonomous client-side resilient WebSocket connection manager for ${p.name} that implements ping/pong heartbeats, automated exponential backoff with jitter on disconnect, queued offline messages, and comprehensive unit tests.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/websocket-reconnect.html\` with connection toggle button, simulate drop connection button, message queue status, and connection timeline.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/websocket-reconnect.css\` styling connection state pills (Connected, Reconnecting, Failed), backoff countdown timer, and message log cards.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/websocket-reconnect.js\` implementing class \`${toPascal(p.slug)}ResilientSocket\` with \`connect()\`, \`send(message)\`, \`calculateBackoff(attempt)\`, and \`flushQueue()\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/websocket-reconnect.test.mjs\` testing backoff formula clamping, message buffering during disconnects, and successful reconnection state recovery with node:test.`
    ]
  },
  {
    featureFile: "diff-patch-engine",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Myers Diff / Patch Engine with Chunk Boundary Visualizer",
    desc: (p) => `Build an independent in-browser line-by-line text diff and patch application engine for ${p.name} based on the Myers diff algorithm, calculating insertions, deletions, unchanged chunks, and generating unified diff patches.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/diff-patch-engine.html\` with side-by-side original and modified text areas, unified diff output view, and patch apply preview stage.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/diff-patch-engine.css\` with green addition highlight strips, red deletion highlight strips, line numbers, and split-view gutters.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/diff-patch-engine.js\` implementing class \`${toPascal(p.slug)}DiffPatchEngine\` with \`computeDiff(original, modified)\`, \`applyPatch(source, patch)\`, and \`toUnifiedFormat(diff)\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/diff-patch-engine.test.mjs\` testing identical text zero-diff, pure additions, pure deletions, and roundtrip patch integrity with node:test.`
    ]
  }
];

// Generate exactly 300 Issues across 40 projects
// We will assign:
// Exactly 100 Level 1 tasks
// Exactly 100 Level 2 tasks
// Exactly 100 Level 3 tasks
// Total = 300 tasks!
// Distribution across 40 projects:
// Projects 0 to 19 (20 projects): 8 tasks each = 160 tasks
// Projects 20 to 39 (20 projects): 7 tasks each = 140 tasks
// Total tasks = 300 tasks!

const allIssues = [];
let issueCounter = 1301; // Continuous numbering starting from 1301!

// To ensure exactly 100 L1, 100 L2, 100 L3:
// In 20 projects with 8 tasks:
// - 10 projects get: 3 L1, 3 L2, 2 L3 (10 * 8 = 80 tasks: 30 L1, 30 L2, 20 L3)
// - 10 projects get: 2 L1, 3 L2, 3 L3 (10 * 8 = 80 tasks: 20 L1, 30 L2, 30 L3)
// Total for first 20 projects = 50 L1, 60 L2, 50 L3 (160 tasks)
//
// In 20 projects with 7 tasks:
// - 10 projects get: 3 L1, 2 L2, 2 L3 (10 * 7 = 70 tasks: 30 L1, 20 L2, 20 L3)
// - 10 projects get: 2 L1, 2 L2, 3 L3 (10 * 7 = 70 tasks: 20 L1, 20 L2, 30 L3)
// Total for second 20 projects = 50 L1, 40 L2, 50 L3 (140 tasks)
//
// Grand totals:
// L1: 50 + 50 = 100 tasks!
// L2: 60 + 40 = 100 tasks!
// L3: 50 + 50 = 100 tasks!
// Grand total = 300 tasks!

let l1Idx = 0;
let l2Idx = 0;
let l3Idx = 0;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  const assignedTemplates = [];

  let l1Count = 0;
  let l2Count = 0;
  let l3Count = 0;

  if (pIdx < 10) {
    // 8 tasks: 3 L1, 3 L2, 2 L3
    l1Count = 3; l2Count = 3; l3Count = 2;
  } else if (pIdx < 20) {
    // 8 tasks: 2 L1, 3 L2, 3 L3
    l1Count = 2; l2Count = 3; l3Count = 3;
  } else if (pIdx < 30) {
    // 7 tasks: 3 L1, 2 L2, 2 L3
    l1Count = 3; l2Count = 2; l3Count = 2;
  } else {
    // 7 tasks: 2 L1, 2 L2, 3 L3
    l1Count = 2; l2Count = 2; l3Count = 3;
  }

  for (let i = 0; i < l1Count; i++) {
    assignedTemplates.push(level1Templates[l1Idx++ % level1Templates.length]);
  }
  for (let i = 0; i < l2Count; i++) {
    assignedTemplates.push(level2Templates[l2Idx++ % level2Templates.length]);
  }
  for (let i = 0; i < l3Count; i++) {
    assignedTemplates.push(level3Templates[l3Idx++ % level3Templates.length]);
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
      zeroConflictGuarantee: `Zero-Merge-Conflict Guarantee: This task is implemented strictly in its own isolated files (${filesList}). Do not modify common files (index.html, styles.css, script.js) to guarantee 100% conflict-free merging!`
    });
  }
}

const countL1 = allIssues.filter(i => i.level === 'level1').length;
const countL2 = allIssues.filter(i => i.level === 'level2').length;
const countL3 = allIssues.filter(i => i.level === 'level3').length;

console.log(`Generated ${allIssues.length} conflict-free issues successfully (IDs 1301-1600)!`);
console.log(`Distribution: Level 1 (${countL1}), Level 2 (${countL2}), Level 3 (${countL3})`);

// 1. Build BATCH18_ISSUES.md
let md = `# 🚀 CAREERFORGE Batch 18 Issues Catalog: 300 Multi-Level Contributor Tasks

**Repository:** \`Pratyush-Panda-2006/CAREERFORGE\`  
**Initiative:** Nexus Spring of Code 2026 (NSoC '26)  
**Batch Scope:** **Multi-Level Tasks Across All 40 Showcase Projects (Level 1, Level 2, and Level 3)**  
**Catalog Size:** 300 Handcrafted Showcase Enhancements (IDs #1301 to #1600)  
**Distribution:** **100 Level 1 Tasks (3 Points)** | **100 Level 2 Tasks (5 Points)** | **100 Level 3 Tasks (10 Points)**  
**Zero-Merge-Conflict Architecture:** Every single task operates in its own **dedicated, isolated files** (e.g. \`[feature].html\`, \`[feature].css\`, \`[feature].js\`, plus \`[feature].test.mjs\` for Level 3). Contributors **do not edit shared files** (\`index.html\`, \`styles.css\`, \`script.js\`), eliminating 100% of git merge conflicts!

---

## 📑 Table of Contents
1. [Multi-Level Scoring & Guidelines](#1-multi-level-scoring--guidelines)
2. [Batch 18 Distribution Matrix (40 Projects)](#2-batch-18-distribution-matrix-40-projects)
3. [Detailed Task Specifications (300 Issues: #1301 to #1600)](#3-detailed-task-specifications-300-issues)
4. [Automated Publishing & Dry-Run Guide](#4-automated-publishing--dry-run-guide)

---

## 1. Multi-Level Scoring & Guidelines

Batch 18 provides opportunities for contributors across all skill levels under Nexus Spring of Code 2026:

| Tier | Label | Points | Deliverable | Conflict Prevention Strategy |
| :---: | :---: | :---: | :---: | :--- |
| **Level 1** | \`level1\` | **3 Points** | **Isolated UI Sub-View** | Build in dedicated HTML/CSS/JS without touching shared files. |
| **Level 2** | \`level2\` | **5 Points** | **Interactive Tool & Component** | Build dynamic tool, validator, or parser in dedicated files. |
| **Level 3** | \`level3\` | **10 Points** | **Isolated Engine & Test Suite** | Build complete engine with dedicated HTML, CSS, JS, and Unit Test. |

### 🛡️ Why Contributors Face ZERO Merge Conflicts:
- **No Shared File Contention:** Tasks do not modify existing shared files (\`index.html\`, \`styles.css\`, \`script.js\`).
- **Dedicated Unique Filenames:** Every task specifies its own dedicated files under \`public/showcase/[project-slug]/\`.
- **Instant Concurrent Merges:** Because each PR introduces new distinct files, dozens of contributors can submit and merge PRs concurrently with zero merge conflicts!

---

## 2. Batch 18 Distribution Matrix (40 Projects)

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

md += `\n---\n\n## 3. Detailed Task Specifications (300 Issues: #1301 to #1600)\n\n`;

for (const item of allIssues) {
  const levelText = item.level === 'level1' ? 'Level 1 (3 Points)' : item.level === 'level2' ? 'Level 2 (5 Points)' : 'Level 3 (10 Points)';
  md += `#### ${item.id}. \`[${item.project}]\` ${item.title.replace(`[${item.project}] `, '')}\n`;
  md += `- **Labels:** \`${item.labels.join('`, `')}\`\n`;
  md += `- **Showcase Path:** \`public/showcase/${item.project}/\`\n`;
  md += `- **Points:** **${item.points}** (${levelText})\n`;
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

Batch 18 issues can be previewed or published to GitHub via the companion script:

\`\`\`bash
# 1. Preview all 300 Batch 18 issues in dry-run mode
node scripts/create-batch18-issues.mjs --dry-run

# 2. Or using npm run script
npm run create-batch18-issues -- --dry-run

# 3. Publish directly to GitHub repository (via GitHub Actions or with GITHUB_TOKEN)
node scripts/create-batch18-issues.mjs
\`\`\`
`;

fs.writeFileSync(path.resolve('BATCH18_ISSUES.md'), md, 'utf-8');
console.log('Successfully written BATCH18_ISSUES.md!');

// 2. Build scripts/create-batch18-issues.mjs
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
      "User-Agent": "CAREERFORGE-Batch18-Publisher",
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
    '**Award Value:** **' + item.points + '**\\n\\n' +
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
  console.log(\`🚀 CAREERFORGE Batch 18 Issue Publisher (NSoC 2026)\`);
  console.log(\`   Total Issues in Batch: \${issues.length} (100 Level 1, 100 Level 2, 100 Level 3)\`);
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

  console.log(\`\\n✨ Batch 18 Processing Completed (\${issues.length} Issues Processed)!\\n\`);
}

run();
`;

fs.writeFileSync(path.resolve('scripts', 'create-batch18-issues.mjs'), scriptCode, 'utf-8');
console.log('Successfully written scripts/create-batch18-issues.mjs!');
