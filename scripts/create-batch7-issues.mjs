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
  // 1. agency-studio
  {
    project: "agency-studio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[agency-studio] Build interactive client brand moodboard builder with drag-and-drop palette generator",
    description: "Create an interactive brand moodboard workspace where clients curate creative project inspirations, generate dynamic HEX color palettes, preview typography pairings (Serif / Sans / Monospace), and export a branded design brief.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, add a Brand Moodboard Creator section with palette swatches and font preview containers.",
      "In `script.js`, implement random palette generator with complementary color math, handle drag/click swatch adjustments, and export design brief to JSON/PNG.",
      "In `styles.css`, format interactive canvas with aesthetic studio glassmorphism, responsive swatch grid, and smooth hover micro-interactions."
    ]
  },
  {
    project: "agency-studio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[agency-studio] Implement interactive 3D WebGL or CSS 3D tilt perspective card engine with dynamic gyroscope/mouse inertia",
    description: "Build an interactive physics-driven 3D perspective card engine across featured case studies calculating dynamic pitch/roll matrix transformations based on mouse velocity and mobile device orientation with realistic specular glare reflection.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, add 3D perspective wrapper elements around hero showcase cards.",
      "In `script.js`, calculate cursor Euclidean distance from card center, compute 3D rotation angles (`rotateX`, `rotateY`), apply spring physics dampening on mouse leave, and support `DeviceOrientationEvent`.",
      "In `styles.css`, style dynamic specular gradient highlight overlay that moves inversely with cursor perspective, respecting `prefers-reduced-motion`."
    ]
  },

  // 2. ai-voice-studio
  {
    project: "ai-voice-studio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[ai-voice-studio] Build interactive voice pitch-shift and robotic modulation filter laboratory",
    description: "Build an audio modulation filter laboratory allowing creators to apply real-time DSP effects to voice clips (Vocoder, Cyber Cyborg, Studio Reverb, Helium Pitch, Deep Radio Bass) using Web Audio API nodes.",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add Audio Modulation FX rack with preset buttons and parameter rotary dials.",
      "In `script.js`, chain Web Audio API `BiquadFilterNode`, `DelayNode`, and `ConvolverNode` to active audio source, processing frequency shifts in real time.",
      "In `styles.css`, design hardware rack aesthetic with brushed metallic borders, LED effect status lights, and responsive dial controls."
    ]
  },
  {
    project: "ai-voice-studio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ai-voice-studio] Implement client-side multi-track audio timeline editor with track trimming and volume envelopes",
    description: "Develop a multi-track DAW (Digital Audio Workstation) timeline where users layer voiceover recordings against background ambient audio, trim clip boundaries with drag handles, configure gain keyframe automation, and export mixed audio.",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add Multi-Track Editor interface with Track 1 (Voice) and Track 2 (Ambience) horizontal lanes.",
      "In `script.js`, manage track playback synchronization, handle clip dragging and boundary trimming, render timeline scrubber, and mix audio tracks via `AudioContext`.",
      "In `styles.css`, format DAW interface with time ruler headers (seconds/bars), waveform track lanes, and interactive volume faders."
    ]
  },

  // 3. automotive-hypercar
  {
    project: "automotive-hypercar",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[automotive-hypercar] Build interactive regenerative braking energy recovery simulator with deceleration telemetry",
    description: "Create an interactive energy regeneration telemetry simulator showing recovered kilowatt-hours (kWh), deceleration G-forces, brake pad thermal wear reduction, and extended city range miles across 3 regen modes (Off, Adaptive, Aggressive One-Pedal).",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, add Kinetic Energy Recovery System (KERS) telemetry card with regen setting toggles.",
      "In `script.js`, calculate kinetic energy equations ($E = \\frac{1}{2}mv^2$) based on vehicle speed, deceleration rate, and regenerative motor efficiency.",
      "In `styles.css`, style telemetry dial with electric cyan energy capture glow, deceleration G-meter needle, and dynamic battery replenishment animations."
    ]
  },
  {
    project: "automotive-hypercar",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[automotive-hypercar] Implement interactive torque vectoring differential visualizer with dynamic cornering yaw simulation",
    description: "Build an interactive 4-motor torque vectoring simulation demonstrating real-time torque distribution (Newton-meters) to each independent wheel during high-speed cornering, visualizing tire slip angles, lateral Gs, and active yaw correction.",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, add Quad-Motor Torque Vectoring visualizer arena with steering angle and cornering radius controls.",
      "In `script.js`, implement dynamic vehicle bicycle yaw kinematic equations, dynamically redistributing outer vs inner motor torque to counteract understeer/oversteer.",
      "In `styles.css`, render high-tech chassis blueprint with animated torque transfer arrows, tire grip heatmaps, and telemetry readouts."
    ]
  },

  // 4. crypto-exchange-pro
  {
    project: "crypto-exchange-pro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[crypto-exchange-pro] Build interactive crypto portfolio allocation rebalancer with target weights and drift alerts",
    description: "Develop an interactive portfolio rebalancer where crypto traders define target allocation percentages (e.g. 50% BTC, 30% ETH, 20% SOL), computing portfolio drift percentage, necessary buy/sell trade quantities, and rebalancing fees.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add Portfolio Rebalancing card with asset allocation sliders and rebalance action button.",
      "In `script.js`, compute deviation between current holdings and target weights, generate required compensatory trade orders, and check slippage boundaries.",
      "In `styles.css`, style with high-contrast crypto exchange data tables, allocation split bars, and warning indicators for drift > 5%."
    ]
  },
  {
    project: "crypto-exchange-pro",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[crypto-exchange-pro] Implement simulated WebSocket ticker connection manager with auto-reconnect and live market jitter",
    description: "Build a simulated real-time WebSocket client engine streaming orderbook ticks, bid-ask updates, and trade executions with simulated network latency jitter (15ms - 120ms), auto-reconnection exponential backoff, and packet drop recovery.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add WebSocket connection status indicator pill with latency ping meter in the top navigation bar.",
      "In `script.js`, build an event-emitter WebSocket simulator emitting randomized price ticks following geometric Brownian motion, with disconnect/reconnect simulation.",
      "In `styles.css`, format connection status chip with green/amber/red indicator lights and animated tick pulse effects."
    ]
  },

  // 5. culinary-bistro
  {
    project: "culinary-bistro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[culinary-bistro] Build interactive artisanal cocktail mixology lab with flavor balance radar chart",
    description: "Create an interactive craft cocktail builder where guests choose spirit bases (Cognac, Botanical Gin, Aged Bourbon), infusions, and bitters, rendering an interactive SVG radar chart comparing Sweet, Bitter, Sour, and Boozy profiles.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add Artisanal Mixology Lab section with ingredient selection pills and SVG radar chart canvas.",
      "In `script.js`, compute multi-axis flavor metrics dynamically based on selected ingredients and draw SVG polygon coordinates with smooth transitions.",
      "In `styles.css`, style radar chart with gold metallic accents, frosted glass containers, and drink recipe card preview."
    ]
  },
  {
    project: "culinary-bistro",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[culinary-bistro] Implement interactive dynamic kitchen rush order queue manager with ticket priority dispatching",
    description: "Build a real-time Kitchen Display System (KDS) simulator managing incoming table dining tickets, calculating preparation lead times across courses (Appetizer, Entrée, Dessert), station routing (Grill, Pastry, Garde Manger), and fire order dispatching.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add Kitchen Display System (KDS) dashboard modal with station filter tabs and active ticket columns.",
      "In `script.js`, implement prioritized queue scheduler tracking elapsed cooking minutes, course synchronization, and audio chime alerts on urgent tickets.",
      "In `styles.css`, design authentic stainless-steel kitchen ticket aesthetic with color-coded ticket timers (Green -> Amber -> Flashing Red on delay)."
    ]
  },

  // 6. cybersecurity-sentinel
  {
    project: "cybersecurity-sentinel",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[cybersecurity-sentinel] Build interactive SSL/TLS certificate inspector and cryptographic cipher suite analyzer",
    description: "Develop a security diagnostic inspector analyzing domain SSL/TLS certificates, grading cipher suites (AES-256-GCM, ChaCha20-Poly1305), inspecting certificate transparency logs, checking expiration countdowns, and flagging insecure protocols.",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, add SSL/TLS Diagnostic Inspector card with domain lookup input and cipher breakdown table.",
      "In `script.js`, simulate cryptographic handshake inspection, assign SSL security letter grade (A+ to F), and highlight vulnerabilities (e.g. CBC padding).",
      "In `styles.css`, format cryptographic audit results with padlock badge icons, certificate chain visual tree, and status pills."
    ]
  },
  {
    project: "cybersecurity-sentinel",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[cybersecurity-sentinel] Implement interactive SIEM threat correlation rule engine with Boolean alert logic and incident triage",
    description: "Build an interactive Security Information and Event Management (SIEM) correlation engine allowing analysts to define multi-condition detection rules (e.g., Brute Force Spike + Privilege Escalation within 60s) and automatically triage high-severity security incidents.",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, add SIEM Rule Builder & Incident Triage workspace with rule logic builder.",
      "In `script.js`, evaluate sliding-time-window event stream against Boolean correlation logic, grouping matching alerts into actionable security incidents.",
      "In `styles.css`, style SOC incident response interface with MITRE ATT&CK tactic tags, severity badges, and incident acknowledgment triggers."
    ]
  },

  // 7. developer-portfolio
  {
    project: "developer-portfolio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[developer-portfolio] Build interactive system architecture diagram explorer with node inspection popups",
    description: "Create an interactive microservices architectural topology diagram (Frontend, API Gateway, Event Bus, Redis Cache, Database Cluster) with animated connection data packets and clickable node inspection cards detailing tech stack and metrics.",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add System Architecture Topology section with SVG service nodes and connector lines.",
      "In `script.js`, animate pulse packets traversing architecture connectors and render popover inspection cards upon node click.",
      "In `styles.css`, design dark cyberpunk blueprint styling with neon node borders, active latency chips, and responsive layout."
    ]
  },
  {
    project: "developer-portfolio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[developer-portfolio] Implement interactive Git commit tree visualization graph with branch checkout simulator",
    description: "Build an interactive visual Git DAG (Directed Acyclic Graph) branch visualizer in the portfolio showing commit hashes, branch merges (`main`, `feature/v2`, `hotfix`), and interactive checkout simulator with visual HEAD pointer movements.",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add Git Commit History Graph section with interactive branch selector pills.",
      "In `script.js`, calculate SVG branch bezier curves connecting commit nodes, implement `checkout` and `cherry-pick` simulators updating branch HEAD pointers.",
      "In `styles.css`, style commit circles with git branch signature colors, animated branch merge lines, and commit metadata tooltips."
    ]
  },

  // 8. docs-portal
  {
    project: "docs-portal",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[docs-portal] Build interactive multi-language code snippet converter (cURL, Python, JavaScript, Go)",
    description: "Build a dynamic code example switcher for API documentation endpoints allowing developers to toggle code snippets across cURL, Python `requests`, Node.js `fetch`, and Go `net/http` with syntax highlighting and instant copy confirmation.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add multi-language tab bars above documentation API request code blocks.",
      "In `script.js`, maintain active language selection across all documentation pages in `localStorage`, swapping code syntax snippets synchronously.",
      "In `styles.css`, design sleek tab buttons with language logos (Python, JS, Go, Bash), code line numbers, and copy toast notifications."
    ]
  },
  {
    project: "docs-portal",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[docs-portal] Implement interactive OpenAPI / Swagger JSON schema spec parser and interactive endpoint builder",
    description: "Develop a client-side OpenAPI 3.0 specification parser that ingests raw OpenAPI JSON schema, dynamically rendering interactive API endpoint cards, path parameters, JSON request body schemas, and response status tables.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add OpenAPI Schema Explorer section with schema upload / sample dropdown selector.",
      "In `script.js`, parse OpenAPI 3.0 JSON paths, parameters, and schema definitions, generating interactive documentation DOM nodes dynamically.",
      "In `styles.css`, format HTTP method pills (`GET`, `POST`, `PUT`, `DELETE`), parameter type badges, and expandable JSON schema model accordions."
    ]
  },

  // 9. ecommerce-store
  {
    project: "ecommerce-store",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[ecommerce-store] Build interactive product stock inventory alert notification modal with email validation",
    description: "Create an interactive 'Notify Me When Available' modal for out-of-stock product variations, with client-side email format validation, size/color variant selection, and notification subscription persistence in `localStorage`.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add Stock Alert modal overlay with email input field and variant dropdown.",
      "In `script.js`, manage modal triggers on sold-out products, validate email format using regex, and persist subscribed alert items.",
      "In `styles.css`, style modal with modern tech-gear aesthetic, animated bell icon, and toast confirmation feedback."
    ]
  },
  {
    project: "ecommerce-store",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ecommerce-store] Implement interactive multi-attribute product faceted filter engine with live count aggregation",
    description: "Build a high-performance faceted search and filtering algorithm dynamically filtering the catalog across price sliders, brand categories, color swatches, connectivity, and review ratings with real-time matching product count tallies.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add comprehensive Faceted Filter sidebar with multi-select checkboxes and price range slider.",
      "In `script.js`, implement multi-predicate faceted filter engine computing set intersections and recalculating count badges on unselected facets.",
      "In `styles.css`, design responsive filter sidebar with collapsible facet groups, active filter chips, and smooth product card transitions."
    ]
  },

  // 10. edtech-academy
  {
    project: "edtech-academy",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[edtech-academy] Build interactive coding streak tracker with motivational milestone badges and freeze protector",
    description: "Build an interactive student study streak tracker (e.g. '🔥 14-Day Coding Streak') with weekly habit calendar, freeze protector tokens, motivational quote generator, and celebratory confetti upon reaching milestone targets.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add Streak & Study Habit widget in student dashboard area.",
      "In `script.js`, track daily activity dates in `localStorage`, compute consecutive streak days, handle streak freeze equip, and trigger celebration effects.",
      "In `styles.css`, design energetic gamified badges with flame animations, calendar day circles, and streak milestone progress bar."
    ]
  },
  {
    project: "edtech-academy",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[edtech-academy] Implement interactive regex pattern tester sandbox with live token match highlighter",
    description: "Build a real-time Regular Expression training sandbox where students enter regex patterns and flags (`g`, `i`, `m`), visualizing matched substrings in real time with color-coded syntax token highlights, capture group breakdown, and cheat-sheet reference.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add Regex Testing Sandbox section with regex input, flags toggles, and test text container.",
      "In `script.js`, compile dynamic RegExp safely with try/catch error handling, extract capture groups, and render color-coded match overlay spans.",
      "In `styles.css`, format code editor with monospace typography, syntax error warning banners, and capture group index tags."
    ]
  },

  // 11. festival-hub
  {
    project: "festival-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[festival-hub] Build festival friend group meetup locator with GPS coordinate pin drops",
    description: "Create an interactive festival meetup locator allowing attendees to drop custom waypoint pins (Camp Tent, Hydration Point, Stage Meeting Pole), generate shareable location URLs, and view compass bearing direction indicators.",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add Festival Waypoint Pin Locator tool to the venue map area.",
      "In `script.js`, handle map click pin drops, calculate compass angle and distance from festival center, and generate shareable hash URLs.",
      "In `styles.css`, style animated waypoint pins with glowing cyber beacon rings and waypoint coordinate cards."
    ]
  },
  {
    project: "festival-hub",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[festival-hub] Implement interactive 3D stage lighting visualizer with DMX laser beam color sequencing",
    description: "Develop an animated 3D festival stage lighting visualizer on HTML5 Canvas rendering moving head spotlights, laser sweeps, and strobe flashes synchronized to rhythmic audio BPM tempo with adjustable color hue sliders.",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add Stage Lighting & Laser Simulator canvas container with lighting controller knobs.",
      "In `script.js`, implement 2.5D/3D light ray projection loop using Canvas 2D context gradients, animating rotational sweeps and laser chases.",
      "In `styles.css`, format lighting console with DMX controller faders, color spectrum wheel, and strobe frequency toggles."
    ]
  },

  // 12. fintech-vault
  {
    project: "fintech-vault",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[fintech-vault] Build interactive crypto vs stock DCA (Dollar-Cost Averaging) investment simulator",
    description: "Develop an investment DCA simulator comparing lump-sum investing versus recurring weekly/monthly deposits across Bitcoin, S&P 500 Index, and Ethereum over 1 to 5 years with cumulative value and ROI comparison charts.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add DCA Investment Strategy card with asset selection buttons and contribution frequency dropdown.",
      "In `script.js`, calculate compound dollar-cost averaging returns factoring mock historical annualized returns and volatility, comparing against cash savings.",
      "In `styles.css`, design sleek financial chart legend cards, comparative return metrics, and return-on-investment percentage chips."
    ]
  },
  {
    project: "fintech-vault",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[fintech-vault] Implement interactive credit card payoff snowball vs avalanche debt elimination strategist",
    description: "Build an advanced debt elimination planner allowing users to input multiple debt accounts (balances, interest rates, minimum payments), calculating payoff timelines and total interest paid under the Debt Snowball versus Debt Avalanche methods.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add Debt Elimination Strategist section with multi-account input builder and payoff timeline charts.",
      "In `script.js`, implement amortization comparison simulation prioritizing lowest balance (Snowball) vs highest APR (Avalanche), computing interest savings.",
      "In `styles.css`, format comparison breakdown cards with debt-free date milestones, interest difference callouts, and print export buttons."
    ]
  },

  // 13. gaming-esports-hub
  {
    project: "gaming-esports-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[gaming-esports-hub] Build interactive esports tournament match replay video chapter navigator",
    description: "Create an interactive tournament match replay modal with chapter timeline markers (First Blood, Baron Steal, Teamfight Ace, Base Push), allowing fans to jump directly to key match highlights with score overlays.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add Match Replay modal with video player mockup and timeline chapter markers.",
      "In `script.js`, handle chapter marker clicks, update current match playhead, display event summary tooltip, and track highlight clips.",
      "In `styles.css`, style chapter scrubber with esports kill/objective icon markers, active highlight glow, and responsive player layout."
    ]
  },
  {
    project: "gaming-esports-hub",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[gaming-esports-hub] Implement interactive 2D esports tactical battle map whiteboard with team strategy draw tools",
    description: "Build an interactive 2D tactical whiteboard (inspired by competitive FPS/MOBA minimaps) allowing team captains to place player tokens, draw offensive/defensive path vectors on canvas, drop tactical smoke/ward icons, and export strategy sketches.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add Tactical Strategy Whiteboard section with map selector and tool palette (pen, eraser, tokens).",
      "In `script.js`, implement HTML5 Canvas drawing engine with stroke color/width controls, draggable champion/agent icons, and PNG export function.",
      "In `styles.css`, design dark military HUD aesthetic with tool selector icons, minimap background textures, and clear/undo buttons."
    ]
  },

  // 14. health-vitality
  {
    project: "health-vitality",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[health-vitality] Build interactive daily micro-habit stacking checklist with streak gamification",
    description: "Create a longevity daily micro-habit checklist (Morning Sunlight, 5g Creatine, Cold Shower, 10k Steps, Zone 2 Cardio) with audio chime sound on completion, animated progress percentage ring, and streak preservation.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add Daily Longevity Habit Stack card with interactive habit items and progress ring.",
      "In `script.js`, calculate daily completion percentage, synthesize audio chime with Web Audio API upon completing items, and persist status in `localStorage`.",
      "In `styles.css`, style with sleek wellness minimalism, SVG circular progress stroke, and celebratory badge animations."
    ]
  },
  {
    project: "health-vitality",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[health-vitality] Implement interactive glycemic load and blood glucose spike predictor for custom meals",
    description: "Build an interactive glycemic response simulator where users compose custom meals (Oats, Berries, Honey, Rice, Chicken), calculating net carbohydrates and glycemic load, and plotting an estimated postprandial blood glucose curve (mg/dL) over 3 hours.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add Glycemic Response Predictor section with food item adder and SVG blood glucose curve.",
      "In `script.js`, calculate composite glycemic load, generate mathematical glucose rise/fall curve over 180 minutes, and flag potential glucose crashes.",
      "In `styles.css`, render continuous SVG line chart with safe range zone (70-140 mg/dL) green band and glucose spike warning accents."
    ]
  },

  // 15. luxury-realms
  {
    project: "luxury-realms",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[luxury-realms] Build interactive private island luxury villa custom booking package builder",
    description: "Create a bespoke private island reservation package builder where high-net-worth guests select villa tiers, private master chef dining, helicopter transfers, and marine yacht excursions with live itemized invoice summary.",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add Private Island Package Customizer section with villa tier cards and luxury add-on checkboxes.",
      "In `script.js`, calculate nights multiplier, service charges, private aviation transfers, and update total invoice tally with currency converter.",
      "In `styles.css`, format luxury invoice card with gold typography, high-res photography cards, and 'Reserve via Concierge' trigger."
    ]
  },
  {
    project: "luxury-realms",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[luxury-realms] Implement interactive superyacht helipad flight clearance and nautical weather station visualizer",
    description: "Build an aviation maritime clearance terminal calculating Beaufort wind scale, sea wave swells (meters), superyacht deck pitch/roll angles, and rendering dynamic Green/Amber/Red helipad flight landing safety statuses.",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add Helipad Flight Clearance & Marine Weather Station console.",
      "In `script.js`, calculate maritime flight clearance safety algorithms factoring wind knots, sea state, and deck roll degrees, outputting clearance decision.",
      "In `styles.css`, design naval aviation radar aesthetic with pitch/roll attitude indicator gimbal, wind compass rose, and landing status beacon."
    ]
  },

  // 16. nonprofit-impact
  {
    project: "nonprofit-impact",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[nonprofit-impact] Build interactive clean water well project fund progress bar with geo-coordinates",
    description: "Build an interactive community clean water borehole project tracker displaying funding milestones ($5,000 / $10,000), lives impacted counter, verified geographic GPS coordinates, and photo installation progress gallery.",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, add Clean Water Wells initiative card with live progress bar and GPS coordinates badge.",
      "In `script.js`, calculate funding percentage remaining, update community impact statistics, and display borehole location coordinates.",
      "In `styles.css`, style with refreshing aquatic cyan gradients, animated wave progress fill, and interactive photo thumbnail gallery."
    ]
  },
  {
    project: "nonprofit-impact",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[nonprofit-impact] Implement interactive biodiversity wildlife species resurgence growth model using Lotka-Volterra equations",
    description: "Develop a mathematical ecological simulation modeling wildlife population recovery and vegetation biomass growth over 10 simulated years using Lotka-Volterra predator-prey differential equations with interactive parameter sliders.",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, add Ecological Resurgence Simulator section with initial species sliders and SVG population graph.",
      "In `script.js`, implement numerical Euler integration of Lotka-Volterra differential equations, plotting predator and prey population curves over time.",
      "In `styles.css`, render dual SVG line curves (Flora biomass vs Wildlife populations) with ecological equilibrium indicators and slider controls."
    ]
  },

  // 17. podcast-audio-stream
  {
    project: "podcast-audio-stream",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[podcast-audio-stream] Build interactive episode audio chapter markers navigator with section summaries",
    description: "Develop an episode audio chapter navigator displaying time intervals, chapter titles, topic summaries, and quick-skip buttons to jump the audio playback directly to selected discussion topics.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add Chapter Navigation bar and accordion drawer in the episode player area.",
      "In `script.js`, sync active chapter highlight with `audio.currentTime`, allow clicking chapters to seek playback, and display chapter topic bullets.",
      "In `styles.css`, format chapter list with timestamp chips, active playing audio indicator, and smooth hover highlight states."
    ]
  },
  {
    project: "podcast-audio-stream",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[podcast-audio-stream] Implement client-side dynamic speech speed-pitch correction audio engine using Web Audio API PitchShifter",
    description: "Build an advanced playback speed processor (0.5x to 3.0x) maintaining natural human vocal tone without distortion or pitch anomalies, implementing granular delay modulation in Web Audio API to prevent high-pitched squeaks.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add Playback Pitch & Speed controller panel with fine-tune speed slider.",
      "In `script.js`, chain Web Audio API granular pitch-shift delay network, computing delay ramp cycles to compensate for speed rate alterations.",
      "In `styles.css`, format speed buttons (1x, 1.25x, 1.5x, 2x) with audio engineer console styling and active frequency response visualizer."
    ]
  },

  // 18. real-estate-luxe
  {
    project: "real-estate-luxe",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[real-estate-luxe] Build interactive property viewing virtual reality (VR) 360-degree panorama viewer modal",
    description: "Develop a 360-degree virtual tour panoramic room viewer modal allowing prospective buyers to click-and-drag or use orientation tilt controls to explore luxury villa interiors with interactive hotspot detail tags.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add 'Launch 360° Virtual Tour' button and panoramic viewer modal window.",
      "In `script.js`, implement mouse/touch drag spherical coordinate panning, position room feature hotspot tags (e.g. Italian Marble, Smart Glass), and handle full-screen toggle.",
      "In `styles.css`, design luxury architectural viewer framing, compass direction icon, and clickable hotspot pulse animations."
    ]
  },
  {
    project: "real-estate-luxe",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[real-estate-luxe] Implement interactive property valuation automated valuation model (AVM) regression calculator",
    description: "Build an algorithmic real estate valuation engine estimating estate market value, confidence score, and price-per-square-foot by running regression calculations across square footage, waterfront frontage, architectural grade, and neighborhood comps.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add Automated Valuation Model (AVM) section with property parameter sliders.",
      "In `script.js`, calculate weighted multivariate regression model, compute estimated value confidence intervals (low/mid/high range), and derive investment scores.",
      "In `styles.css`, render high-end appraisal summary cards with confidence meters, price-per-sqft benchmarks, and downloadable valuation summary."
    ]
  },

  // 19. saas-launchpad
  {
    project: "saas-launchpad",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[saas-launchpad] Build interactive API rate-limiting tier customizer with burst capacity token bucket simulator",
    description: "Build an interactive token bucket rate-limiting simulator where developers configure burst capacity (tokens) and refill rates (tokens/sec), testing simulated request spikes and visualizing token depletion and throttle 429 states in real time.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add Token Bucket Rate Limiter card with bucket capacity sliders and 'Send Burst Requests' button.",
      "In `script.js`, implement token bucket algorithm refilling tokens at steady intervals, deducting tokens per request, and triggering HTTP 429 visual alerts when empty.",
      "In `styles.css`, render animated liquid token fill gauge with capacity markers and real-time request pass/drop status badges."
    ]
  },
  {
    project: "saas-launchpad",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[saas-launchpad] Implement interactive distributed tracing flamegraph waterfall visualizer for microservice latency",
    description: "Develop an interactive distributed trace waterfall flamegraph visualizer rendering hierarchical spans (Auth -> API Gateway -> PostgreSQL Query -> Redis Cache Miss) with execution durations, bottleneck latency flags, and error span highlighting.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add Distributed Tracing Waterfall section with trace ID search and span flamegraph container.",
      "In `script.js`, render hierarchical span tree with relative start offsets and duration bars, calculating critical latency path and expanding child spans.",
      "In `styles.css`, style flamegraph bars with service-specific colors, timeline millisecond axis, and span inspection drawer on click."
    ]
  },

  // 20. travel-odyssey
  {
    project: "travel-odyssey",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[travel-odyssey] Build interactive travel immunization and health advisory risk matrix by destination country",
    description: "Create an interactive expedition health advisory directory where adventurers select destination countries (Sub-Saharan Africa, Amazon Basin, Himalayas) to review required vs recommended vaccinations (Yellow Fever, Malaria prophylaxis) and emergency clinic locations.",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add Travel Health & Immunization card with country selector dropdown.",
      "In `script.js`, render categorized health advisories (Mandatory, Recommended, Routine), calculate medication prep lead time (e.g. 4-6 weeks prior), and show emergency contacts.",
      "In `styles.css`, format medical advisory cards with health warning icons, vaccine checklist pills, and high-contrast alert tags."
    ]
  },
  {
    project: "travel-odyssey",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[travel-odyssey] Implement interactive celestial navigation and night sky stargazing visibility predictor for wilderness expeditions",
    description: "Build an expedition night sky visibility simulator calculating Moon phase illumination percentage, Bortle dark-sky scale (Class 1 to 9), Milky Way galactic core visibility windows, and ISS space station flyover times based on campsite coordinates.",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add Celestial Navigation & Night Sky Predictor section with campsite coordinates input.",
      "In `script.js`, calculate lunar phase angle equations ($0\\%$ to $100\\%$ illumination), determine astronomical twilight hours, and compute stargazing condition index.",
      "In `styles.css`, render dark starry night sky canvas background with dynamic moon phase graphics, Bortle scale color badges, and observation timeline."
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
  console.log(`🚀 CAREERFORGE Issue Generator - Batch 7 (40 Issues)`);
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
