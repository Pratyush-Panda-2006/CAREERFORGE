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
  // 1. agency-studio (Level 2 & Level 3)
  {
    project: "agency-studio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[agency-studio] Build interactive client project kickoff intake questionnaire modal with multi-step progress bar",
    description: "Create an interactive multi-step project discovery intake wizard where prospective clients specify project goals, brand identity requirements, estimated budget brackets, and target delivery milestones with step validation and summary review.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, add a multi-step project kickoff modal container with steps: (1) Scope & Objectives, (2) Visual Style, (3) Timeline & Budget.",
      "In `script.js`, manage step progression, validate required form fields per slide, and compile final scope brief into downloadable summary or submission feedback.",
      "In `styles.css`, style modal with creative studio glassmorphism, animated step indicator pills, and responsive layout."
    ]
  },
  {
    project: "agency-studio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[agency-studio] Implement interactive HTML5 Canvas magnetic cursor particle mesh effect in hero background",
    description: "Build an interactive, high-performance particle mesh background on HTML5 Canvas in the agency hero section where floating geometric nodes react dynamically to mouse velocity, forming elastic web connections with spring physics.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, add `<canvas id='heroMeshCanvas'></canvas>` layered behind the hero typography.",
      "In `script.js`, implement particle physics animation loop using `requestAnimationFrame`, calculating Euclidean distance, cursor proximity repulsion, and node interconnecting lines.",
      "In `styles.css`, ensure canvas fits viewport responsively, respects `prefers-reduced-motion` accessibility media query, and blends seamlessly with dark gradient backdrop."
    ]
  },

  // 2. ai-voice-studio (Level 2 & Level 3)
  {
    project: "ai-voice-studio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[ai-voice-studio] Build voice accent & dialect previewer with audio pitch and cadence variation presets",
    description: "Build an interactive accent and dialect customization drawer allowing creators to switch voice personality presets (e.g. British RP, US Pacific West, Australian Outback, Transatlantic), fine-tuning pitch inflection and pacing presets.",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add accent selector card grid with dialect flag chips and cadence presets.",
      "In `script.js`, adjust speech synthesis utterance properties (`pitch`, `rate`, `lang`) dynamically based on selected regional profile.",
      "In `styles.css`, design sleek audio studio card controls with neon accent borders and active state highlights."
    ]
  },
  {
    project: "ai-voice-studio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ai-voice-studio] Implement real-time microphone audio recording and speech waveform analyzer using Web Audio API AudioContext",
    description: "Build a live voice cloning input recorder where users record their microphone audio in real time, visualising live frequency spectrum / oscilloscope waves on HTML5 Canvas using Web Audio API `AudioContext` and `AnalyserNode` with playback preview.",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add Voice Sample Recorder interface with Record, Stop, and Playback buttons and waveform canvas.",
      "In `script.js`, request microphone stream with `navigator.mediaDevices.getUserMedia`, connect to `AnalyserNode`, and render real-time frequency bars on Canvas.",
      "In `styles.css`, style recorder console with pulsing red recording indicator, glowing visualizer frame, and high-contrast audio meters."
    ]
  },

  // 3. automotive-hypercar (Level 2 & Level 3)
  {
    project: "automotive-hypercar",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[automotive-hypercar] Build interactive active aerodynamic wing & spoiler telemetry visualizer with angle-of-attack control",
    description: "Develop an interactive aerodynamic spoiler telemetry visualizer where users adjust active rear wing angle of attack (0° to 45°), calculating downforce (kg) and drag penalty (Cd) in real time with dynamic SVG aerofoil streamlines.",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, create an Active Aero panel with angle slider and telemetry readouts.",
      "In `script.js`, calculate downforce equations factoring wing angle, vehicle speed, and air density, updating visual airflow vectors dynamically.",
      "In `styles.css`, render responsive telemetry gauge cards with carbon-fiber textures and speed warning states."
    ]
  },
  {
    project: "automotive-hypercar",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[automotive-hypercar] Implement interactive race lap time simulator with track selector, tire compound physics, and sector splits",
    description: "Implement a full lap time simulator allowing users to select iconic racing circuits (Nürburgring Nordschleife, Silverstone, Laguna Seca), select tire compounds (Soft Slick, Medium, Wet), and simulate lap time with sector splits (S1, S2, S3) and animated track progress.",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, add Track Simulation arena with circuit selector dropdown, tire compound toggles, and live sector split board.",
      "In `script.js`, implement kinematic physics model calculating cornering Gs, acceleration runs, braking zones, and tire degradation curves.",
      "In `styles.css`, design professional motorsport telemetry dashboard with glowing split deltas (purple for fastest, green for personal best)."
    ]
  },

  // 4. crypto-exchange-pro (Level 2 & Level 3)
  {
    project: "crypto-exchange-pro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[crypto-exchange-pro] Build interactive trade history filter drawer with date range, pair selector, and CSV export",
    description: "Create an interactive trade execution history drawer allowing traders to filter past orders by currency pair (BTC/USDT, ETH/USDT, SOL/USDT), order side (Buy/Sell), date range, and export formatted trade execution reports to CSV.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add trade history drawer trigger button and filter controls (pair, side, date picker).",
      "In `script.js`, filter mock executed orders dynamically, calculate cumulative volume/fees, and generate downloadable CSV data blob.",
      "In `styles.css`, style trading ledger with alternating row fills, green/red side pill badges, and sticky table header."
    ]
  },
  {
    project: "crypto-exchange-pro",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[crypto-exchange-pro] Implement real-time simulated order matching engine with bid-ask spread execution and price slippage math",
    description: "Build an algorithmic order matching engine that matches simulated limit and market orders against active orderbook liquidity depth, executing filled orders when crossed, calculating price slippage percentage, and updating recent trade logs.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add order submission form (Limit / Market) with slippage tolerance selector.",
      "In `script.js`, implement in-memory orderbook matching algorithm matching buy bids and ask offers, generating partial fills and trade execution events.",
      "In `styles.css`, render dynamic visual flash animations on order book rows when executions occur (green for bid fills, red for ask fills)."
    ]
  },

  // 5. culinary-bistro (Level 2 & Level 3)
  {
    project: "culinary-bistro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[culinary-bistro] Build interactive seasonal tasting menu wine pairing course selector with tasting notes popovers",
    description: "Build an interactive 5-course tasting menu explorer where diners select wine pairings (Classic Sommelier vs Rare Vintage Reserve), preview sommelier tasting notes (Tannins, Acidity, Finish), and view real-time menu surcharge tally.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add an interactive 5-course tasting menu section with course cards and wine pairing toggle pills.",
      "In `script.js`, handle pairing selection, display sommelier aroma/flavor notes in modal or popover, and recalculate dining totals.",
      "In `styles.css`, design vintage French bistro typography, gold accent borders, and flavor profile rating indicators."
    ]
  },
  {
    project: "culinary-bistro",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[culinary-bistro] Implement interactive table seating floor plan layout visualizer with real-time table availability state",
    description: "Develop an architectural restaurant floor plan visualizer using interactive SVG shapes (Main Dining Hall, Window Booths, Garden Terrace, Chef's Counter), allowing guests to click specific tables to reserve seats with party size capacity checks.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add an SVG restaurant floor plan map with numbered table objects and zone legends.",
      "In `script.js`, manage table reservation states (Available, Reserved, Selected), validate party size against table capacity, and sync selection with booking form.",
      "In `styles.css`, render sleek lighting accents, hover glow on available tables, and clear reserved/occupied visual indicators."
    ]
  },

  // 6. cybersecurity-sentinel (Level 2 & Level 3)
  {
    project: "cybersecurity-sentinel",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[cybersecurity-sentinel] Build interactive firewall rule manager with IP whitelist, blacklist, and CIDR subnet validator",
    description: "Build an interactive firewall rule configuration interface allowing security engineers to add, toggle, and delete IP CIDR block rules (e.g. `10.0.0.0/16`), validating IPv4/IPv6 CIDR syntax, and filtering rules by active status.",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, add Firewall Rules Manager panel with rule creation form and data table.",
      "In `script.js`, implement CIDR subnet validation regex, manage rule state (Allow/Deny/Drop), and persist rules in `localStorage`.",
      "In `styles.css`, format SOC defense table with status toggles, action buttons, and red/green security state pills."
    ]
  },
  {
    project: "cybersecurity-sentinel",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[cybersecurity-sentinel] Implement interactive automated penetration testing vulnerability report generator with PDF/print layout",
    description: "Develop an automated security penetration report generator compiling active vulnerability scans, CVSS scores, affected assets, remediation timelines, and executive risk grade into a formatted printable security audit report.",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, add 'Generate Audit Report' action modal with customizable audit scope filters.",
      "In `script.js`, calculate overall security posture score (A+ to F), synthesize detected vulnerabilities into categorized tables, and trigger formatted print/PDF view.",
      "In `styles.css`, write `@media print` stylesheets formatting executive cover page, risk matrix heatmaps, and clean white-paper styling."
    ]
  },

  // 7. developer-portfolio (Level 2 & Level 3)
  {
    project: "developer-portfolio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[developer-portfolio] Build interactive GitHub contribution activity heatmap graph with date cell tooltips",
    description: "Create an interactive 52-week contribution activity heatmap grid (inspired by GitHub's contribution graph) with 4-level green intensity, date/commit count hover tooltips, and filterable year selector.",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add Contribution Activity heatmap container with month labels and day columns.",
      "In `script.js`, generate 365-day mock commit activity dataset, render SVG/CSS grid cells, and attach dynamic hover tooltip listeners.",
      "In `styles.css`, style matrix with terminal green theme, subtle hover cell scale transitions, and legend scale indicators."
    ]
  },
  {
    project: "developer-portfolio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[developer-portfolio] Implement interactive retro terminal mini-game (Hacker Typing / SSH Escape) with score persistence",
    description: "Build an interactive retro CLI mini-game directly inside the portfolio terminal (e.g., timed cyber decryption typing challenge or firewall bypass maze) with scoring, time limits, and high-score saving in `localStorage`.",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add mini-game trigger command (`play`, `game`) to terminal help roster.",
      "In `script.js`, build game loop with countdown timer, randomized target decipher words, keystroke accuracy scoring, and score leaderboard.",
      "In `styles.css`, format game screen output with ASCII art headers, retro CRT scanline animations, and game over screens."
    ]
  },

  // 8. docs-portal (Level 2 & Level 3)
  {
    project: "docs-portal",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[docs-portal] Build interactive API webhook simulator with payload event selector and mock signature verification",
    description: "Build an interactive webhook testing playground where developers choose event triggers (`user.created`, `invoice.paid`, `payment.failed`), view generated HMAC-SHA256 signature headers, inspect JSON payloads, and test mock deliveries.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add a Webhook Playground card with event selector dropdown and code preview window.",
      "In `script.js`, dynamically generate event-specific JSON payloads, compute simulated HMAC hex signatures, and display copyable payload headers.",
      "In `styles.css`, style with sleek developer tooling aesthetics, syntax badge headers, and copy payload toast triggers."
    ]
  },
  {
    project: "docs-portal",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[docs-portal] Implement client-side full-text documentation search engine with fuzzy matching and highlighted search snippets",
    description: "Build a high-performance in-memory search index indexing all documentation headings, code examples, and body paragraphs, supporting `Cmd+K` / `Ctrl+K` shortcut modal, fuzzy keyword scoring, and highlighted snippet matching.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add full-page search modal overlay with keyboard navigation hints (`Esc` to close, arrow keys to navigate).",
      "In `script.js`, index documentation DOM nodes into structured search trie/index, implement fuzzy substring scoring, and highlight matched search terms in results.",
      "In `styles.css`, style search modal with dark glassmorphism backdrop, breadcrumb location chips, and highlighted matching search tokens."
    ]
  },

  // 9. ecommerce-store (Level 2 & Level 3)
  {
    project: "ecommerce-store",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[ecommerce-store] Build customer recently viewed items carousel with quick restore and localStorage sync",
    description: "Create a 'Recently Viewed Products' section displaying recently inspected items as a horizontal carousel with thumbnail, pricing, and quick 'Add to Cart' actions, persisting browsing history in `localStorage`.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add a Recently Viewed section above the footer with scroll navigation buttons.",
      "In `script.js`, append product IDs to browsing history array whenever product cards or modals are opened, maintaining maximum 6 recent items.",
      "In `styles.css`, style compact horizontal scroll cards with smooth hover lift and clear history button."
    ]
  },
  {
    project: "ecommerce-store",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ecommerce-store] Implement interactive multi-currency pricing engine with real-time conversion rates and localized formatting",
    description: "Build a comprehensive multi-currency engine supporting USD ($), EUR (€), GBP (£), JPY (¥), CAD ($), and INR (₹), updating prices across product catalog, quick-view modals, discounts, and cart subtotal with localized `Intl.NumberFormat` formatting.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add currency selector dropdown in the shop top navigation bar.",
      "In `script.js`, implement currency exchange rate multiplier dictionary, recompute all displayed catalog prices, and format with `Intl.NumberFormat`.",
      "In `styles.css`, style currency dropdown with currency symbols, country flags, and active selection state."
    ]
  },

  // 10. edtech-academy (Level 2 & Level 3)
  {
    project: "edtech-academy",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[edtech-academy] Build interactive student study schedule planner with calendar export and reminder notifications",
    description: "Build a weekly study timetable planner where students allocate study sessions across enrolled courses, calculate weekly study hours, set daily focus goals, and export scheduled study blocks as `.ics` calendar files.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add Study Planner section with weekly calendar grid (Monday-Sunday) and subject allocation chips.",
      "In `script.js`, manage weekly study schedule state, calculate total commitment hours, and construct downloadable `.ics` calendar invitation.",
      "In `styles.css`, style calendar slots with course color badges, drag/click assignment UI, and weekly hours summary cards."
    ]
  },
  {
    project: "edtech-academy",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[edtech-academy] Implement interactive algorithmic code visualizer demonstrating Sorting and Binary Search step-by-step",
    description: "Build an interactive algorithm learning visualizer animating Sorting (Bubble Sort, Quick Sort) and Binary Search on an array of numbers with bar height rendering, color-coded swap/compare states, step-by-step controls, and speed slider.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add Algorithm Visualizer section with animated bar container, algorithm picker, and playback controls.",
      "In `script.js`, implement generator-based step execution yielding comparison states, updating array bar heights and active comparison colors dynamically.",
      "In `styles.css`, render high-contrast neon bars with color states (cyan for inspecting, emerald green for sorted, amber for swapping)."
    ]
  },

  // 11. festival-hub (Level 2 & Level 3)
  {
    project: "festival-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[festival-hub] Build festival soundstage crowd density meter with simulated real-time heat alerts",
    description: "Create an interactive stage capacity monitoring dashboard showing live crowd density percentages across all stages (Main Cyber Stage, Neon Oasis, Underground Vault), color-coded capacity meters, and alternate stage recommendations.",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add Stage Density & Crowd Flow card in the venue area.",
      "In `script.js`, simulate fluctuating crowd levels (Comfortable, Busy, At Capacity), display overflow alerts, and update stage status tags.",
      "In `styles.css`, style visual density bars with energetic neon gradient fills and pulsing surge warning badges."
    ]
  },
  {
    project: "festival-hub",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[festival-hub] Implement interactive DJ synthesizer soundboard with drum pads, BPM tempo slider, and audio playback",
    description: "Build an interactive cyber music launchpad featuring 8 drum/synth pads using Web Audio API synthesized frequencies (Kick, Snare, Hi-Hat, Synth Lead, Bass Drop), with adjustable BPM tempo, visual beat pulse, and keyboard key triggers (keys 1-8).",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add Cyber Launchpad section with 8 interactive drum pads and BPM slider.",
      "In `script.js`, synthesize audio waveforms using Web Audio API `AudioContext` oscillators and gain envelopes upon pad click or hotkey press.",
      "In `styles.css`, style launchpad with responsive grid, glowing neon borders, and dynamic active pad press animations."
    ]
  },

  // 12. fintech-vault (Level 2 & Level 3)
  {
    project: "fintech-vault",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[fintech-vault] Build interactive loan amortization schedule calculator with extra monthly payment comparison",
    description: "Develop an interactive personal/mortgage loan calculator allowing borrowers to adjust loan amount, interest rate, loan term (10, 15, 30 years), and optional extra monthly principal payment to see interest saved and shortened payoff timeline.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add a Loan Payoff & Amortization section with input sliders and yearly breakdown table.",
      "In `script.js`, compute monthly principal & interest equations, generate full amortization schedule, and compare baseline vs accelerated payoff.",
      "In `styles.css`, format clean financial table layout with savings highlight chips and responsive summary metrics."
    ]
  },
  {
    project: "fintech-vault",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[fintech-vault] Implement automated budget allocation engine (50/30/20 Rule) with interactive income distribution donut chart",
    description: "Build an intelligent budgeting engine that categorizes monthly income according to the 50/30/20 rule (Needs: 50%, Wants: 30%, Savings & Debt: 20%) with customizable bucket sliders, actionable saving tips, and dynamic SVG donut chart rendering.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add Budget Allocation Planner section with income input and interactive SVG donut chart.",
      "In `script.js`, calculate categorical dollar amounts dynamically, draw SVG path arcs based on percentages, and flag budget overages.",
      "In `styles.css`, style donut segments with luxury emerald, gold, and sapphire gradients and interactive hover slice highlights."
    ]
  },

  // 13. gaming-esports-hub (Level 2 & Level 3)
  {
    project: "gaming-esports-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[gaming-esports-hub] Build pro player crosshair & sensitivity converter for competitive FPS games",
    description: "Build an interactive mouse sensitivity and crosshair converter between major FPS esports titles (Valorant, CS2, Overwatch 2, Apex Legends) calculating equivalent eDPI with live customizable SVG crosshair preview.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add Sensitivity & Crosshair Lab section with game selectors, DPI inputs, and crosshair canvas.",
      "In `script.js`, calculate cross-game sensitivity conversion constants, compute true eDPI, and update SVG crosshair (color, gap, thickness, dot).",
      "In `styles.css`, design esports HUD aesthetics with gaming weapon reticle target background and one-click copy settings button."
    ]
  },
  {
    project: "gaming-esports-hub",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[gaming-esports-hub] Implement interactive fantasy esports draft simulator with salary cap and roster points calculator",
    description: "Implement a fantasy draft arena where players assemble a 5-member esports team within a strict $50,000 salary cap, assigning roles (Top, Jungle, Mid, ADC, Support), calculating projected fantasy points, and validating roster compliance.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add Fantasy Draft Arena section with player roster pool, role slots, and salary meter.",
      "In `script.js`, manage selected squad state, enforce budget restrictions, calculate projected fantasy points, and check role requirements.",
      "In `styles.css`, render high-energy esports cards with role badge iconography, animated salary progress bar, and 'Lock In Roster' celebration."
    ]
  },

  // 14. health-vitality (Level 2 & Level 3)
  {
    project: "health-vitality",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[health-vitality] Build interactive sleep debt calculator with optimal sleep & wake cycle recommendations",
    description: "Build an interactive sleep debt calculator that tracks weekday vs weekend sleep hours, calculates accumulated sleep debt, and recommends optimal bedtime schedules based on 90-minute REM sleep cycle intervals.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add Sleep Debt & REM Cycles section with target wake time selector.",
      "In `script.js`, calculate sleep deficit hours, compute 90-minute cycle backward bedtimes (e.g., 5 cycles = 7.5 hrs), and display restorative tips.",
      "In `styles.css`, style with soothing midnight violet aesthetics, moon cycle badges, and visual sleep quality ratings."
    ]
  },
  {
    project: "health-vitality",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[health-vitality] Implement interactive VO2 Max and cardio fitness tier assessment calculator with metabolic age projection",
    description: "Develop a clinical-grade cardiovascular fitness assessment tool estimating VO2 Max (ml/kg/min) based on resting heart rate, age, gender, exercise frequency, and 1-mile walk/run performance, calculating cardiovascular age differential.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add VO2 Max & Metabolic Age Assessment wizard with input sliders and metric toggle.",
      "In `script.js`, implement peer-reviewed non-exercise VO2 max regression algorithms, map results to fitness percentiles, and compute biological heart age.",
      "In `styles.css`, render semi-circular gauge speedometer showing fitness categories (Poor, Fair, Good, Excellent, Superior) with glowing needle."
    ]
  },

  // 15. luxury-realms (Level 2 & Level 3)
  {
    project: "luxury-realms",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[luxury-realms] Build interactive superyacht charter route customizer with waypoint duration and fuel surcharge estimator",
    description: "Build an interactive Mediterranean / Caribbean yacht charter route planner where guests select ports of call (Monaco, St. Tropez, Portofino, Capri), calculating nautical miles, estimated cruising hours, and fuel surcharge tally.",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add Yacht Itinerary Customizer section with port selector and route summary card.",
      "In `script.js`, calculate cumulative nautical distance, compute average cruising speed hours, and estimate fuel consumption costs.",
      "In `styles.css`, style with nautical luxury aesthetics, port waypoint timeline connectors, and printable itinerary card."
    ]
  },
  {
    project: "luxury-realms",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[luxury-realms] Implement interactive private aviation carbon offset certificate calculator with verified gold standard credits",
    description: "Build an environmental aviation impact calculator estimating metric tons of CO2 generated by jet class (Light, Midsize, Heavy Global 7500) per flight route, calculating required Gold Standard carbon credit purchase and generating verified offset certificates.",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add Aviation Carbon Offset section with aircraft class selector and certificate preview modal.",
      "In `script.js`, compute fuel burn emissions per flight hour, calculate credit retirement pricing, and generate digital certificate with unique serial hash.",
      "In `styles.css`, design elegant emerald-trimmed certificate styling with embossed seal graphics and print/download triggers."
    ]
  },

  // 16. nonprofit-impact (Level 2 & Level 3)
  {
    project: "nonprofit-impact",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[nonprofit-impact] Build interactive corporate partnership sponsorship tier builder with CSR benefit calculator",
    description: "Create an interactive corporate sustainability partnership tier selector (Bronze, Silver, Gold, Evergreen Champion) calculating tax-deductible contributions, employee engagement perks, tree planting allocations, and branded impact report delivery.",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, add Corporate Partnership section with tier comparison cards and customized donation slider.",
      "In `script.js`, calculate employee volunteer hours provided, carbon credit certificates allocated, and total trees planted.",
      "In `styles.css`, style corporate tier cards with metallic borders, CSR perk checklists, and 'Inquire for Partnership' drawer."
    ]
  },
  {
    project: "nonprofit-impact",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[nonprofit-impact] Implement interactive satellite reforestation progress visualizer with historical year-over-year foliage slider",
    description: "Build an interactive satellite canopy recovery explorer with a year-over-year split slider (2020 to 2026) demonstrating simulated Normalized Difference Vegetation Index (NDVI) foliage growth, canopy density %, and biodiversity resurgence.",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, add Satellite Progress section with before/after comparison slider and biome selector.",
      "In `script.js`, implement draggable split-screen divider showing vegetation recovery progress, canopy cover statistics, and wildlife sightings.",
      "In `styles.css`, format slider handle with dual arrow icon, lush canopy color grading, and responsive viewport sizing."
    ]
  },

  // 17. podcast-audio-stream (Level 2 & Level 3)
  {
    project: "podcast-audio-stream",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[podcast-audio-stream] Build interactive podcast playlist and queue manager with drag-or-click reordering",
    description: "Create an interactive playback queue drawer allowing listeners to queue upcoming episodes, reorder upcoming episode playback sequence, view total remaining listening duration, and remove played tracks.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add Queue Manager slideout drawer and 'Add to Queue' buttons on episode cards.",
      "In `script.js`, maintain in-memory play queue array, handle move up / move down reordering, and auto-play next queued episode upon track completion.",
      "In `styles.css`, style queue drawer with compact episode rows, drag handles, and total queued playback duration counter."
    ]
  },
  {
    project: "podcast-audio-stream",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[podcast-audio-stream] Implement interactive live audio transcription search and synchronized paragraph karaoke highlighting",
    description: "Build a synchronized podcast transcript reader with keyword search filtering that highlights matching terms, automatically scrolls and highlights the active paragraph in sync with playback time, and allows clicking any sentence to seek audio playback.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add Transcript Reader drawer with search input and timestamped sentence blocks.",
      "In `script.js`, sync transcript sentences with `audio.currentTime`, apply active highlight styling, smooth scroll into view, and attach click-to-seek listeners.",
      "In `styles.css`, style active transcription lines with bright text and subtle background glow, with smooth scroll container."
    ]
  },

  // 18. real-estate-luxe (Level 2 & Level 3)
  {
    project: "real-estate-luxe",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[real-estate-luxe] Build interactive property investment ROI & cap rate calculator for luxury rental properties",
    description: "Build a real estate investment calculator computing Capitalization Rate (Cap Rate), Gross Rental Yield, Cash-on-Cash Return, and Net Operating Income (NOI) based on purchase price, expected monthly rental income, and property management fees.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add an Investment & Cap Rate Analysis card in the listing view.",
      "In `script.js`, calculate annual gross rent, operating expenses (vacancy, insurance, maintenance), and compute dynamic Cap Rate percentages.",
      "In `styles.css`, design financial summary cards with investment grade badges (Prime, High Yield, Speculative) and responsive layout."
    ]
  },
  {
    project: "real-estate-luxe",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[real-estate-luxe] Implement interactive 2D architectural estate floor plan visualizer with room dimensions and sunlight angle simulation",
    description: "Develop an architectural estate blueprint visualizer with clickable room zones (Grand Foyer, Master Suite, Wine Cellar, Infinity Terrace) displaying square footage and an interactive time-of-day sun angle slider illustrating natural lighting exposure.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add Blueprint & Sunlight Simulator section with interactive SVG estate floor plan.",
      "In `script.js`, handle room click inspections, calculate sun shadow angles across rooms based on selected hour slider (6 AM to 8 PM), and show natural light exposure.",
      "In `styles.css`, render sleek architectural blueprint grid styling with ambient golden hour light gradients."
    ]
  },

  // 19. saas-launchpad (Level 2 & Level 3)
  {
    project: "saas-launchpad",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[saas-launchpad] Build interactive cloud infrastructure savings calculator comparing AWS vs Self-Hosted vs SaaS Launchpad",
    description: "Build an interactive cloud cost comparison tool where engineering leaders enter compute clusters and monthly data egress (GBs), visualizing 3-year total cost of ownership (TCO) across AWS, bare metal self-hosting, and SaaS Launchpad.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add TCO Cloud Savings Calculator section with cluster size sliders and comparison bars.",
      "In `script.js`, compute infrastructure, maintenance, and engineering overhead costs dynamically, calculating estimated net annual savings.",
      "In `styles.css`, render side-by-side animated bar graphs with comparative cost breakdown and 'Download Executive Quote' CTA."
    ]
  },
  {
    project: "saas-launchpad",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[saas-launchpad] Implement interactive live system observability log stream simulator with regex search and level filtering",
    description: "Build a high-throughput simulated real-time server log console (streaming mock microservice logs at 2 logs/sec) with pause/resume controls, log severity filter pills (INFO, WARN, ERROR, FATAL), regex search input, and error rate spike alerts.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add Live Log Stream terminal card with streaming controls and filter buttons.",
      "In `script.js`, implement generator stream appending timestamped JSON/text log lines, handle regex query matching, and trigger visual warning badges on ERROR spikes.",
      "In `styles.css`, style with dark high-contrast terminal monospace fonts, color-coded level badges, and smooth auto-scroll lock behavior."
    ]
  },

  // 20. travel-odyssey (Level 2 & Level 3)
  {
    project: "travel-odyssey",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[travel-odyssey] Build interactive multi-city flight layover planner with connection time warnings",
    description: "Develop a multi-leg expedition flight route planner where travelers add connection cities, calculate layover durations, and receive automatic warning badges for tight connections (<90 minutes) or long layovers with airport lounge advice.",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add Flight Route & Layover Planner card with waypoint leg inputs.",
      "In `script.js`, calculate cumulative layover times, flag connection risk levels (Low, Tight Connection, Overnight), and suggest transit tips.",
      "In `styles.css`, design flight timeline layout with airport IATA chips, connection warning pills, and layover duration badges."
    ]
  },
  {
    project: "travel-odyssey",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[travel-odyssey] Implement interactive expedition altitude sickness risk calculator with acclimatization ascent scheduler",
    description: "Build a high-altitude expedition safety tool (for treks like Kilimanjaro, Everest Base Camp, and Inca Trail) calculating daily elevation gain, evaluating Acute Mountain Sickness (AMS) risk score, and generating safe acclimatization rest day itineraries.",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add Altitude Safety & Acclimatization Planner section with mountain trek selector and daily ascent inputs.",
      "In `script.js`, implement wilderness medicine altitude ascent guidelines (max recommended 500m/day above 3,000m), evaluate AMS risk score, and auto-insert acclimatization rest days.",
      "In `styles.css`, render high-contrast mountain elevation profile chart with danger zone color bands (amber above 3,000m, red above 5,000m) and health advisory cards."
    ]
  }
];

export function generateBody(item) {
  const suggestionsList = item.suggestions.map(s => `- ${s}`).join("\n");
  return `### 🎯 Task Overview
- **Project Directory:** \`public/showcase/${item.project}/\`
- **Difficulty:** \`${item.level}\` (${item.points})
- **Track:** Nexus Spring of Code 2026 (\`nsoc26\`)
- **Category:** Feature Implementation & Showcase Expansion

---

### 📝 Issue Description
${item.description}

---

### 💡 Suggested Implementation Steps
${suggestionsList}

---

### 🛡️ Contribution Guidelines & Avoiding Merge Conflicts:
1. ⏳ **How to Claim:**
   - Reply with **\`/claim\`** in the comments below.
   - Our automation bot will assign you and start your **3-day timer (72 hours)**.
2. 🔄 **Avoid Merge Conflicts:**
   - Always make sure your branch is up to date with the latest \`main\` before submitting your PR:
     \`\`\`bash
     git remote add upstream https://github.com/Pratyush-Panda-2006/CAREERFORGE.git
     git fetch upstream
     git rebase upstream/main  # or git merge upstream/main
     \`\`\`
   - If git flags a conflict, resolve the conflict markers in your files, test locally, and push!
3. 🔒 **Showcase Scope Policy:**
   - All code changes must strictly reside inside **\`public/showcase/${item.project}/\`**.
   - **Do not** modify \`src/\`, root configuration, or workflow files.
4. 🚀 **Submitting your Pull Request:**
   - Test locally with \`npm run dev\` and verify \`http://localhost:5173/showcase/${item.project}/index.html\`.
   - In your PR description, include **\`Closes #<this-issue-number>\`** (e.g. \`Closes #107\`).
   - Our PR Gatekeeper will automatically validate your code scope and copy the matching \`nsoc26\` and difficulty labels to your PR!

Happy Coding! 🌸`;
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 CAREERFORGE Issue Generator - Batch 6 (40 Issues)`);
  console.log(`   Strict Filter: Level 2 & Level 3 Only`);
  console.log(`======================================================\n`);
  console.log(`Target Repository: ${owner}/${repo}`);
  console.log(`Total Issues in Catalog: ${issues.length}`);
  console.log(`Mode: ${isDryRun || !octokit ? "DRY RUN (Validation & Local Preview)" : "LIVE GITHUB PUBLISH"}\n`);

  let countLevel2 = 0;
  let countLevel3 = 0;

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    if (item.level === "level2") countLevel2++;
    else if (item.level === "level3") countLevel3++;

    const body = generateBody(item);

    if (isDryRun || !octokit) {
      console.log(`[${String(i + 1).padStart(2, "0")}/${issues.length}] [${item.level.toUpperCase()} - ${item.points}] (${item.project})`);
      console.log(`     Title: ${item.title}`);
      console.log(`     Labels: ${item.labels.join(", ")}`);
      console.log(`     Body Length: ${body.length} chars | Suggestions: ${item.suggestions.length}`);
    } else {
      try {
        const res = await octokit.rest.issues.create({
          owner,
          repo,
          title: item.title,
          body,
          labels: item.labels
        });
        console.log(`[${i + 1}/${issues.length}] Created Issue #${res.data.number} (${item.level}): ${item.title}`);
      } catch (err) {
        console.error(`[${i + 1}/${issues.length}] Failed to create "${item.title}":`, err.message);
      }
      // Delay 1.2s to prevent GitHub secondary rate limits
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`📊 Catalog Summary:`);
  console.log(`   - Level 2 (5 pts):  ${countLevel2} issues`);
  console.log(`   - Level 3 (10 pts): ${countLevel3} issues`);
  console.log(`   - Total Issues:     ${issues.length} issues across 20 showcases`);
  console.log(`------------------------------------------------------\n`);
}

run();
