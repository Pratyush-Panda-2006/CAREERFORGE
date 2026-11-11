import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";

// Allow dry-run mode for local validation and previewing
const isDryRun = process.argv.includes("--dry-run");

let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token && !isDryRun) {
  try {
    token = execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    console.warn("⚠️ Could not retrieve token via `gh auth token`. Falling back to dry-run mode.");
    console.warn("   To publish issues to GitHub, ensure GITHUB_TOKEN is set or run `gh auth login`.");
  }
}

const octokit = token ? new Octokit({ auth: token }) : null;
const owner = "Pratyush-Panda-2006";
const repo = "CAREERFORGE";

export const issues = [
  // 1. ecommerce-store
  {
    project: "ecommerce-store",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[ecommerce-store] Build interactive multi-product specification comparison matrix drawer",
    description: "Allow shoppers to select up to 3 hardware items from the catalog, slide open a comparative bottom sheet/drawer, and contrast pricing, specs, availability, battery life, weight, and user ratings with differences highlighted.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add compare checkbox/toggle buttons to product cards and create `#product-comparison-drawer` container.",
      "In `script.js`, maintain an in-memory `comparisonList` array (max 3 items), handle additions/removals, and dynamically render a specs table contrasting key parameters.",
      "In `styles.css`, format drawer with sliding transition, glassmorphism, sticky row headers, and color-coded difference callouts."
    ]
  },
  {
    project: "ecommerce-store",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ecommerce-store] Implement tiered promo code calculation engine with rule-based cart discount matrix & canvas invoice generator",
    description: "Implement an in-memory promotional discount engine handling conditional rules (minimum spend thresholds, category-specific coupon codes, BOGO algorithms, and tax estimation) paired with an exportable client-side canvas checkout receipt/invoice generator.",
    suggestions: [
      "In `script.js`, implement a pure class `PromoDiscountEngine` with methods: `applyCoupon(code, cart)`, `evaluateTierDiscount(subtotal)`, `calculateTaxAndShipping(address, subtotal)`.",
      "Support standard coupon codes (`CYBER20` for 20% off, `FREESHIP` for zero shipping above $100, `BUNDLE3` for buy-2-get-1-free).",
      "Implement `generateInvoiceReceipt(orderData)` drawing a high-DPI HTML5 Canvas invoice with barcode, order items table, tax totals, and download as PNG."
    ]
  },

  // 2. agency-studio
  {
    project: "agency-studio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[agency-studio] Build interactive project scope and budget estimator with visual deliverable chips",
    description: "Build an interactive project inquiry scope calculator where potential clients toggle services (Brand Identity, Web Development, 3D Motion, Design Systems, SEO), configure timelines, and receive real-time estimated budget ranges and timeline milestones.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, create an 'Interactive Project Estimator' section with interactive deliverable toggle chips and timeline sliders.",
      "In `script.js`, compute budget estimates based on selected services and deliverable complexity with real-time summary updates.",
      "In `styles.css`, style deliverable tags with glowing active states, glassmorphic cost summary card, and responsive mobile layout."
    ]
  },
  {
    project: "agency-studio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[agency-studio] Implement client-side WebGL / Canvas liquid distortion hover wave shader for portfolio showcases",
    description: "Build a high-performance Canvas 2D / WebGL image ripple and liquid displacement effect applied on portfolio project thumbnails upon hover/pointer drag with customizable frequency, amplitude dampening, and reduced-motion fallback.",
    suggestions: [
      "In `script.js`, create a Canvas-based displacement renderer calculating 2D sine-wave water ripples or WebGL vertex distortion on cursor movement.",
      "Implement physics dampening so ripples smoothly attenuate and settle over time when pointer is idle.",
      "Support mobile touch dragging and gracefully disable animation when `prefers-reduced-motion` is detected."
    ]
  },

  // 3. festival-hub
  {
    project: "festival-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[festival-hub] Build personalized festival schedule and artist itinerary planner with conflict alerting",
    description: "Create an interactive personal lineup builder where attendees can bookmark performances across multiple stages, visually view their chronological timeline, receive warnings when two artist sets overlap, and export to iCalendar (.ics).",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add a bookmark star/icon to artist lineup cards and an 'Itinerary Drawer' tab.",
      "In `script.js`, manage saved artist schedule in `localStorage`, execute collision detection algorithm for overlapping stage times, and generate valid RFC 5545 `.ics` file strings.",
      "In `styles.css`, design chronological time track bars with warning badges on conflicting time slots."
    ]
  },
  {
    project: "festival-hub",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[festival-hub] Implement real-time interactive stage crowd density & decibel sound level heatmap simulator",
    description: "Implement an interactive canvas-based festival venue map rendering real-time crowd heatmaps, pulsating decibel sound contours from active stages, and dynamic route pathfinding from current location to exits/medical tents.",
    suggestions: [
      "In `script.js`, implement a Canvas vector map of the festival grounds with stages, food courts, and safety stations.",
      "Compute radial heatmap gradients using Gaussian attenuation formulas based on simulated attendee count per zone.",
      "Implement decibel propagation circles that pulsate in sync with virtual audio BPM and an A* route finder for walking navigation."
    ]
  },

  // 4. saas-launchpad
  {
    project: "saas-launchpad",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[saas-launchpad] Build 90-day service uptime history and incident severity matrix",
    description: "Build an enterprise-grade service status history component displaying 90-day uptime bars per microservice (API, Dashboard, Ingestion Pipeline, Webhooks), interactive day tooltips with latency metrics, and incident severity filter tags.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add an 'Enterprise System Status & Uptime History' container.",
      "In `script.js`, generate 90 daily discrete segments for 4 services with realistic historical incident tooltips (operational, degraded, outage).",
      "In `styles.css`, style emerald/amber/rose status bar pills with subtle micro-animations and responsive horizontal scrolling."
    ]
  },
  {
    project: "saas-launchpad",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[saas-launchpad] Implement real-time telemetry anomaly detection and adaptive alert threshold simulator",
    description: "Build a real-time streaming telemetry dashboard on Canvas plotting CPU, memory, and query latency with a rolling window, featuring dynamic standard-deviation anomaly detection that flags spikes and simulates webhook trigger alerts.",
    suggestions: [
      "In `script.js`, create a streaming multi-series Canvas chart engine rendering 60 rolling data points at 60fps.",
      "Implement a streaming statistical model computing rolling moving averages and Z-scores (`(x - mean) / stdDev`).",
      "When an anomaly (Z > 2.5) is detected, draw alert markers, log the incident to an event stream, and trigger notification toasts."
    ]
  },

  // 5. developer-portfolio
  {
    project: "developer-portfolio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[developer-portfolio] Build terminal neofetch hardware stats and live gauges widget",
    description: "Implement a CLI-themed `neofetch` / `fastfetch` system information banner displaying ASCII art, OS kernel simulation, live fake uptime ticker, and interactive memory/CPU usage progress gauges.",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add a `#neofetch-widget` container within the terminal profile header.",
      "In `script.js`, format an ANSI-colored ASCII logo, compute session uptime ticker, and animate ASCII progress bars (`[=====>----] 62%`).",
      "In `styles.css`, apply monospaced styling (`Fira Code`), neon terminal color palette, and responsive wrapping for mobile viewports."
    ]
  },
  {
    project: "developer-portfolio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[developer-portfolio] Implement in-browser monospace shell sandbox with virtual hierarchical file system & command pipes",
    description: "Build a sandboxed interactive terminal environment supporting command parsing with piping and flags (`ls -la`, `cd`, `cat`, `mkdir`, `rm`, `grep`, `pwd`, `history`, `clear`) running on an in-memory JSON file system tree.",
    suggestions: [
      "In `script.js`, design a hierarchical file tree structure (`{ '/': { 'about.md': '...', 'projects': { ... } } }`).",
      "Build a tokenizer and command parser handling arguments, flags (`-l`, `-a`), and standard output piping (`cat projects.txt | grep react`).",
      "Support command history navigation with Up/Down arrow keys and Tab completion for file and directory names."
    ]
  },

  // 6. docs-portal
  {
    project: "docs-portal",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[docs-portal] Build interactive API rate limit and token bucket quota visualizer",
    description: "Create an educational rate-limiting playground explaining `429 Too Many Requests`, featuring interactive request burst sliders, live token-bucket refill animation, and response headers preview (`X-RateLimit-Limit`, `X-RateLimit-Remaining`).",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add an interactive 'Rate Limiting Laboratory' card with trigger buttons and refill slider.",
      "In `script.js`, implement a deterministic Token Bucket algorithm that decrements on trigger, regenerates tokens per second, and updates simulated HTTP headers.",
      "In `styles.css`, render a visual bucket capacity gauge with liquid fill animation and warning states when exhausted."
    ]
  },
  {
    project: "docs-portal",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[docs-portal] Implement client-side interactive GraphQL query builder, AST syntax highlighter & response explorer",
    description: "Build a browser-based GraphQL query playground with an interactive schema explorer, autocomplete suggestion pills, query syntax highlighting, variable JSON editor, and instant response tree visualization.",
    suggestions: [
      "In `script.js`, define an in-memory mock schema containing queryable types (`User`, `Project`, `Issue`, `Leaderboard`).",
      "Implement a client-side recursive query resolver executing parsed GraphQL queries and returning structured JSON data.",
      "Build an AST syntax highlighter that colors field names, arguments, strings, and directives in real time."
    ]
  },

  // 7. culinary-bistro
  {
    project: "culinary-bistro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[culinary-bistro] Build sommelier wine and beverage pairing guide with flavor radar polygon wheel",
    description: "Implement an interactive beverage pairing recommendation assistant matching dishes from the tasting menu to curated French wines, displaying tannins, acidity, sweetness, and oak intensity on a visual polygon radar chart.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add a Sommelier wine pairing drawer modal accessible from menu courses.",
      "In `script.js`, render an SVG polygon radar chart plotting 5 sensory dimensions (Tannin, Acidity, Body, Sweetness, Fruit), calculating polygon coordinates dynamically.",
      "In `styles.css`, style vintage card layouts with subtle gold border accents and French typography pairing."
    ]
  },
  {
    project: "culinary-bistro",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[culinary-bistro] Implement interactive 2D restaurant floor plan table booking engine with seat allocation state machine",
    description: "Create an interactive SVG/Canvas restaurant floor plan displaying booth, patio, and main dining tables, with real-time seat availability state management (Available, Reserved, Occupied), party size capacity checking, and reservation booking workflow.",
    suggestions: [
      "In `script.js`, create an interactive floorplan state machine tracking 12 distinct tables across multiple time slots.",
      "Implement reservation collision detection ensuring tables cannot be double-booked for overlapping dinner seatings.",
      "Validate guest party size against minimum/maximum table seating limits and persist state in `localStorage`."
    ]
  },

  // 8. real-estate-luxe
  {
    project: "real-estate-luxe",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[real-estate-luxe] Build interactive mortgage amortization and investment yield trajectory calculator",
    description: "Build a comprehensive luxury real estate mortgage and loan calculator computing monthly principal, interest, property tax, homeowner insurance, HOA fees, and visualizing a 15-year vs 30-year amortization balance trajectory.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add a 'Financing & Investment Yield Calculator' section on property detail cards.",
      "In `script.js`, implement monthly compound interest math, amortization schedule generation, and SVG trajectory line chart.",
      "In `styles.css`, create clean input range sliders and summary pill counters with dark glassmorphism."
    ]
  },
  {
    project: "real-estate-luxe",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[real-estate-luxe] Implement interactive multi-level architectural blueprint viewer with room measurement annotator",
    description: "Build an architectural blueprint explorer allowing prospective buyers to switch between ground floor, penthouse, and terrace levels, hover to inspect room square footage, and click two points on the floorplan to measure real-world distances with a virtual tape measure tool.",
    suggestions: [
      "In `script.js`, build an interactive SVG blueprint canvas supporting pan, zoom, and floor level toggling.",
      "Implement an interactive measurement tool calculating Euclidean distance between two clicked points scaled to architectural scale (1px = 0.05m).",
      "Provide interactive room polygon hover highlights displaying dimensions, area in sq ft / sq m, and ceiling height."
    ]
  },

  // 9. fintech-vault
  {
    project: "fintech-vault",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[fintech-vault] Build automated recurring savings goals stash and compound interest wealth projector",
    description: "Implement an interactive personal wealth vault feature allowing users to create custom savings goals (e.g., Emergency Fund, Real Estate Down Payment), set weekly auto-contributions, and project compound returns over 1-10 years with interactive interest sliders.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add a 'Savings Goals & Growth Vault' card grid with modal for creating new stashes.",
      "In `script.js`, compute monthly recurring contribution growth with compound interest formulas and persist stashes in `localStorage`.",
      "In `styles.css`, format goal progress bars, target milestone badges, and projected profit glow cards."
    ]
  },
  {
    project: "fintech-vault",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[fintech-vault] Implement real-time rule-based financial fraud detection state machine & threat scoring engine",
    description: "Build an in-browser transaction fraud inspection engine analyzing mock banking transactions against configurable heuristic rules (velocity checks, geofencing jumps, unusual amount spikes, blacklisted merchant categories) and outputting risk scores with audit trails.",
    suggestions: [
      "In `script.js`, implement a modular `FraudDetector` engine evaluating transaction payloads against 5 heuristic rules.",
      "Score transactions on a 0-100 risk score matrix (Green: 0-29, Yellow: 30-69, Red: 70-100) with detailed rule trigger explanations.",
      "Trigger step-up verification modals (e.g. simulated OTP challenge) when high risk is flagged."
    ]
  },

  // 10. gaming-esports-hub
  {
    project: "gaming-esports-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[gaming-esports-hub] Build pro player head-to-head stat comparison radar with win probability estimator",
    description: "Build a head-to-head comparison modal for esports athletes comparing KDA, CS/min, damage share, first blood percentage, and champion pool mastery on an overlayed SVG radar chart with an algorithmic match win predictor.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add player comparison dropdown selectors and an SVG radar viewport.",
      "In `script.js`, normalize player metrics across 5 axes, draw dual overlayed SVG polygons (Cyan vs Magenta), and compute Elo-weighted matchup odds.",
      "In `styles.css`, style neon stat pill callouts and cybernetic border glows."
    ]
  },
  {
    project: "gaming-esports-hub",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[gaming-esports-hub] Implement interactive esports match simulator with real-time round-by-round tactical event log engine",
    description: "Build a turn-based esports tactical match simulation engine simulating rounds between top teams, calculating dynamic weapon economy, clutch probabilities, objective capture events (Baron/Bomb Plant), and streaming live kill-feed events at variable playback speeds.",
    suggestions: [
      "In `script.js`, build a deterministic simulation engine computing rounds based on team Elo ratings, economy state (Eco, Force Buy, Full Buy), and individual player momentum.",
      "Stream simulated events into a live event log ticker with customizable playback speeds (1x, 2x, 5x, Instant).",
      "Render round win history timeline bars and economy trajectory charts."
    ]
  }
];

function formatBody(item) {
  return `### 🌸 Nexus Spring of Code 2026 (NSoC '26) Contributor Task

**Showcase Project Directory:** \`public/showcase/${item.project}/\`  
**Difficulty Tier:** **${item.level === "level2" ? "Level 2 (Intermediate)" : "Level 3 (Advanced Core Logic)"}**  
**Scored Points:** **${item.points}**  
**Mandatory Labels:** \`${item.labels.join("`, `")}\`  

---

### 📋 Task Overview
${item.description}

---

### 💡 Step-by-Step Implementation Suggestions
${item.suggestions.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}

---

### 🚨 Strict Contribution Guardrails
- **Scope Restriction:** All code changes **MUST** reside exclusively inside \`public/showcase/${item.project}/\`.
- **Protected Core:** Never modify, reformat, or alter files in \`src/\`, \`package.json\`, \`.github/\`, or top-level project configs.
- **PR Description Keyword:** Ensure your PR description includes a closing keyword referencing this issue (e.g. \`Closes #<issue-id>\` or \`Fixes #<issue-id>\`).
- **Claiming & Level 3 Limit:** Reply with \`/claim\` to be assigned (3-day timer). Note: Contributors may hold at most **4 active Level 3 claims** simultaneously.

Happy Coding! 🚀`;
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 CAREERFORGE Batch 8 Issue Publisher (NSoC 2026)`);
  console.log(`   Total Issues in Batch: ${issues.length} (10 Level 2 + 10 Level 3)`);
  console.log(`   Mode: ${isDryRun ? "DRY-RUN (Preview Only)" : "LIVE PUBLISH"}`);
  console.log(`======================================================\n`);

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    const body = formatBody(item);

    if (isDryRun || !octokit) {
      console.log(`[DRY-RUN] [${i + 1}/${issues.length}] ${item.title}`);
      console.log(`          Labels: ${item.labels.join(", ")} | Points: ${item.points}`);
      console.log(`          Path: public/showcase/${item.project}/`);
      console.log(`------------------------------------------------------`);
    } else {
      try {
        const { data: created } = await octokit.rest.issues.create({
          owner,
          repo,
          title: item.title,
          body,
          labels: item.labels
        });
        console.log(`✅ [${i + 1}/${issues.length}] Created Issue #${created.number}: ${item.title}`);
        // Small delay to respect GitHub API secondary rate limits
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`❌ Failed to create issue "${item.title}":`, err.message);
      }
    }
  }

  console.log(`\n✨ Batch 8 Processing Completed!\n`);
}

run();

