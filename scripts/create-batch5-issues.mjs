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
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[agency-studio] Add interactive project delivery timeline badge and estimated turnaround indicator",
    description: "Enhance service and package cards in the creative agency studio by adding an interactive turnaround estimate badge (e.g. '⚡ 2-3 Weeks Rapid Sprint') with hover explanation of agency sprint milestones.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, add timeline badge elements with clock icons to service and proposal cards.",
      "In `styles.css`, style turnaround chips with subtle glassmorphism borders and high-contrast typography.",
      "In `script.js`, attach tooltip hover listeners displaying sprint phase breakdowns (Discovery -> Design -> Launch)."
    ]
  },
  {
    project: "agency-studio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[agency-studio] Build interactive client deliverables ROI estimator and project scope configurator",
    description: "Develop a client-facing scope configurator where potential clients select design deliverables (Design System, 3D Assets, Mobile App, Web Architecture), choose team seniority, and see dynamic project timeline, cost estimate, and projected conversion ROI lift.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, add an interactive Scope & ROI Configurator section with tier toggle pills.",
      "In `script.js`, calculate itemized pricing, delivery sprint duration, and expected ROI percentage multiplier dynamically.",
      "In `styles.css`, build a summary dashboard with animated price tickers and an 'Export Scope Brief' trigger button."
    ]
  },

  // 2. ai-voice-studio
  {
    project: "ai-voice-studio",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[ai-voice-studio] Add character count and estimated audio duration badge to voice script input",
    description: "Add a live character counter and estimated speech duration indicator below the voice script input textarea so voice artists and creators know their exact script length (e.g., '342 chars / ~24 sec spoken').",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add character counter and estimated audio duration badge containers.",
      "In `script.js`, listen to `input` events on the prompt textarea and dynamically compute words, characters, and estimated speech seconds (~150 words per minute).",
      "In `styles.css`, style the badge with dark neon accents and subtle warn color when approaching 1,000 characters."
    ]
  },
  {
    project: "ai-voice-studio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[ai-voice-studio] Build audio export options modal with format (WAV/MP3) and bitrate selector",
    description: "Create an audio export modal for generated voice clips allowing users to choose output format (WAV uncompressed, MP3 320kbps, OGG), select sample rate (44.1kHz / 48kHz), enter custom filename, and trigger instant download.",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add an Export Audio modal overlay with radio button selectors and filename input.",
      "In `script.js`, manage modal open/close state, validate filename input, and generate a synthesized audio blob download.",
      "In `styles.css`, style modal with studio glassmorphism, glowing action buttons, and responsive modal layout."
    ]
  },

  // 3. automotive-hypercar
  {
    project: "automotive-hypercar",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[automotive-hypercar] Add battery charging speed indicator card with AC vs DC Fast Charger toggle",
    description: "Add an interactive charging speed comparison card to the hypercar powertrain section comparing Level 2 AC (11kW) vs Ultra-Fast 800V DC (350kW) charging times with visual battery fill animations.",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, add an interactive Charging Architecture card with AC/DC toggle buttons.",
      "In `styles.css`, style animated progress bar indicating 10% to 80% charge replenishment times.",
      "In `script.js`, toggle between charging rates (e.g. 18 mins on 350kW DC vs 6.5 hours on AC) with animated numbers."
    ]
  },
  {
    project: "automotive-hypercar",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[automotive-hypercar] Implement interactive EV road trip range estimator with terrain & temperature simulation",
    description: "Build an interactive EV hypercar trip range estimator allowing drivers to adjust ambient temperature (-10°C to 45°C), driving mode (Track, Eco, Ludicrous Cruise), and terrain gradient (Flat, Mountainous) to calculate projected range and battery consumption.",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, create a Range Simulator section with interactive sliders and driving mode pills.",
      "In `script.js`, implement non-linear physics calculation factoring aerodynamic drag, climate control energy, and regenerative braking.",
      "In `styles.css`, render high-tech telemetry dials, temperature warning accents, and dynamic mileage gauge."
    ]
  },

  // 4. crypto-exchange-pro
  {
    project: "crypto-exchange-pro",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[crypto-exchange-pro] Add trading fee tier discount badge and 30-day VIP level progress pill",
    description: "Display trading fee rates (Maker: 0.02% / Taker: 0.05%) and an interactive VIP Tier badge (VIP 1 to VIP 5) with a tooltip explaining required 30-day trading volume to unlock zero-maker fees.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add VIP Fee Tier chip in the exchange top bar.",
      "In `styles.css`, style badge with subtle gold gradient border, VIP star icon, and popover container.",
      "In `script.js`, handle tooltip display showing volume progress bar and fee reduction percentages."
    ]
  },
  {
    project: "crypto-exchange-pro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[crypto-exchange-pro] Build interactive leverage slider and liquidation price risk calculator",
    description: "Build an interactive perpetual futures position calculator with leverage slider (1x up to 100x), calculating estimated liquidation price, required initial margin, maintenance margin, and estimated profit at target exit price.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add leverage slider and margin calculator card to the trade execution panel.",
      "In `script.js`, compute liquidation threshold dynamically based on entry price, position size, and leverage multiplier.",
      "In `styles.css`, style risk warning indicator that changes color from emerald green (1-5x) to amber (10-25x) to crimson red (>50x)."
    ]
  },

  // 5. culinary-bistro
  {
    project: "culinary-bistro",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[culinary-bistro] Add table seating area preference selector (Main Dining, Patio, Chef Counter) to reservation form",
    description: "Enhance the bistro table reservation system with an interactive seating preference selector (Main Dining Salon, Heated Garden Patio, Chef's Tasting Counter) with contextual badges indicating availability.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add radio card buttons for seating area preference with descriptive icons.",
      "In `styles.css`, style cards with elegant gold active borders, ambient lighting effects, and hover transitions.",
      "In `script.js`, update reservation summary state and show patio weather advisory note if outdoor seating is selected."
    ]
  },
  {
    project: "culinary-bistro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[culinary-bistro] Build digital gift card custom balance builder and preview card modal",
    description: "Create an interactive culinary gift card customizer where guests choose dining denomination ($50, $100, $250, Custom), pick festive bistro artwork themes (Vintage Paris, Michelin Luxe, Midnight Champagne), and preview the personalized digital gift certificate.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add Gift Card section with preset denomination chips and recipient input fields.",
      "In `script.js`, update live digital card preview with recipient name, custom message, and animated balance badge.",
      "In `styles.css`, design luxurious metallic card styling with embossed typography and printable CSS layout."
    ]
  },

  // 6. cybersecurity-sentinel
  {
    project: "cybersecurity-sentinel",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[cybersecurity-sentinel] Add interactive system security health score badge with compliance status",
    description: "Add a security posture score badge (e.g. '🛡️ 98/100 SOC-2 Compliant') in the Sentinel navigation header with a popover showing active defense layers (WAF Active, DDoS Shield On, TLS 1.3 Enforced).",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, insert security score pill component into the platform header.",
      "In `styles.css`, style with glowing cyan border, security shield icon, and dropdown summary drawer.",
      "In `script.js`, toggle security compliance checklist modal when clicking the score badge."
    ]
  },
  {
    project: "cybersecurity-sentinel",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[cybersecurity-sentinel] Implement interactive two-factor authentication (2FA) mock authenticator simulator with TOTP countdown timer",
    description: "Build an interactive 2FA authenticator simulator featuring a 30-second circular progress ring, rotating 6-digit TOTP security code generator, simulated QR code setup step, and verification test input field.",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, add a 2FA Simulator section with SVG timer ring and code verification input.",
      "In `script.js`, implement pseudo-random 6-digit TOTP generator that updates every 30 seconds with synchronized SVG stroke-dashoffset countdown.",
      "In `styles.css`, design dark military-grade terminal aesthetic with cryptographic font styling and validation state animations."
    ]
  },

  // 7. developer-portfolio
  {
    project: "developer-portfolio",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[developer-portfolio] Add interactive availability status badge (Available for Q2 Contracts) with calendar preview tooltip",
    description: "Add a status indicator pill in the developer portfolio hero (e.g. '🟢 Available for Q2 2026 Contracts') with a tooltip displaying preferred engagement types (Remote Frontend, Open Source Architecture).",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add live availability pill with pulsing green dot.",
      "In `styles.css`, style with terminal neon green glow, monospace typography, and popover container.",
      "In `script.js`, add tooltip hover/click interactions and keyboard accessibility support."
    ]
  },
  {
    project: "developer-portfolio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[developer-portfolio] Build interactive technical article reader modal with reading progress indicator and copy-code buttons",
    description: "Create an interactive blog article preview modal allowing visitors to read engineering write-ups with a top scroll progress bar, syntax-highlighted code blocks, and copy-code buttons.",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add an Article Reader modal container with mock engineering blog posts.",
      "In `script.js`, calculate modal scroll progress, update top reading indicator, and handle copy-to-clipboard actions with visual feedback.",
      "In `styles.css`, format markdown-like blog typography, code block container styling, and responsive close button."
    ]
  },

  // 8. docs-portal
  {
    project: "docs-portal",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[docs-portal] Add HTTP status codes reference drawer with quick error explanation tooltips",
    description: "Add an accessible HTTP status reference widget (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 429 Too Many Requests, 500 Internal Error) with color-coded status badges and troubleshooting recommendations.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add an HTTP Status Codes reference accordion under the API overview section.",
      "In `styles.css`, style status code tags with standard HTTP response color coding (2xx green, 4xx orange, 5xx red).",
      "In `script.js`, enable instant search filter for status codes and copy error code payloads."
    ]
  },
  {
    project: "docs-portal",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[docs-portal] Build interactive theme switcher (Dark, High-Contrast Obsidian, Light) with localStorage persistence",
    description: "Implement a multi-theme switcher for the documentation portal allowing readers to toggle between Default Dark, High-Contrast Obsidian, and Clean Light mode, storing user preference in `localStorage`.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add theme toggle dropdown in the top documentation navbar.",
      "In `styles.css`, define CSS custom properties (variables) for each color theme, ensuring WCAG AA contrast compliance.",
      "In `script.js`, apply active theme attribute to root document element and persist choice across browser reloads."
    ]
  },

  // 9. ecommerce-store
  {
    project: "ecommerce-store",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[ecommerce-store] Add interactive free shipping progress bar showing amount remaining to unlock free delivery",
    description: "Add an animated cart progress bar (e.g., 'Add $25.00 more to unlock Free Express Shipping!') that dynamically updates as items are added or removed from the cart.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, insert a Free Shipping progress banner inside the cart slideout drawer.",
      "In `script.js`, calculate remaining amount towards free shipping threshold ($150) and update progress bar percentage.",
      "In `styles.css`, animate progress bar fill transition with confetti or celebration badge upon reaching 100%."
    ]
  },
  {
    project: "ecommerce-store",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ecommerce-store] Implement interactive multi-item product comparison matrix drawer with feature highlighting",
    description: "Build an interactive product comparison drawer allowing shoppers to select up to 3 tech items and compare specs (Processor, Battery Life, Connectivity, Weight, Price, Warranty) side-by-side with difference highlighting.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add 'Compare' checkbox to product cards and create a bottom slide-up comparison drawer.",
      "In `script.js`, maintain selected comparison items in state, render comparison matrix table, and handle remove actions.",
      "In `styles.css`, design a responsive comparison grid with sticky headers, spec highlights, and direct 'Add Both to Cart' CTA."
    ]
  },

  // 10. edtech-academy
  {
    project: "edtech-academy",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[edtech-academy] Add course prerequisite checklist with interactive completion checkboxes",
    description: "Add a clear prerequisite skills checklist card to course overview pages (e.g. 'Basic JavaScript Knowledge', 'Git Fundamentals') allowing prospective students to check off skills they already possess.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add a Prerequisite Knowledge checklist component with interactive checkboxes.",
      "In `styles.css`, style checked items with strikethrough styling and positive feedback checkmark icons.",
      "In `script.js`, show a 'Ready to Enroll' readiness badge when all prerequisite checkboxes are checked."
    ]
  },
  {
    project: "edtech-academy",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[edtech-academy] Implement downloadable course completion certificate generator using HTML5 Canvas",
    description: "Build an interactive certificate generator where students enter their name, select completed specialization, and render a high-resolution verified completion certificate on HTML5 Canvas with instant PNG download.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add a Certificate Generator modal with recipient name input and certificate preview canvas.",
      "In `script.js`, draw certificate borders, academy seal, student name, verification ID, and signature onto Canvas, and export via data URL.",
      "In `styles.css`, style certificate preview with gold foil border aesthetics and responsive download controls."
    ]
  },

  // 11. festival-hub
  {
    project: "festival-hub",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[festival-hub] Add interactive festival FAQ accordion with category filter tabs",
    description: "Add a categorized FAQ accordion for festival attendees (Ticketing, Camping & Lockers, Prohibited Items, Accessibility) with smooth expansion and search keyword filter.",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add a Festival Info & FAQ section with category filter buttons.",
      "In `styles.css`, style accordion items with cyber neon accent borders and smooth max-height transition.",
      "In `script.js`, filter visible questions by selected category and toggle accordion disclosure panels."
    ]
  },
  {
    project: "festival-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[festival-hub] Build festival survival packing checklist with category progress counters and localStorage persistence",
    description: "Build an interactive packing checklist for festival-goers (Hydration Pack, Ear Protection, LED Totem, Portable Power Bank) with category progress counters (Camping / Gear / Health) and `localStorage` state saving.",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add Festival Packing Checklist section with item checkboxes and reset button.",
      "In `script.js`, calculate category completion percentages, save checked items to `localStorage`, and trigger completion badge.",
      "In `styles.css`, style interactive checkboxes with holographic glow and progress bar indicators."
    ]
  },

  // 12. fintech-vault
  {
    project: "fintech-vault",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[fintech-vault] Add virtual card freeze/unfreeze security toggle button with animated card lock status",
    description: "Add an interactive security toggle button to the virtual debit card widget allowing account holders to freeze or unfreeze card transactions with instant visual feedback (grayscale overlay and lock icon badge).",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add Freeze Card toggle switch next to card details.",
      "In `styles.css`, style frozen card state with frosted blur, grayscale filter, and security lock badge.",
      "In `script.js`, update card state in memory and display temporary toast alert confirming status change."
    ]
  },
  {
    project: "fintech-vault",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[fintech-vault] Build interactive subscription manager card with monthly spend breakdown and cancel reminder alerts",
    description: "Create an active recurring subscriptions tracking card (Netflix, Spotify, GitHub, AWS) showing renewal dates, monthly cost breakdown, total annual commitment, and toggleable reminder notification dates.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add a Recurring Subscriptions card with itemized list and total burn rate.",
      "In `script.js`, calculate aggregate monthly and annual subscription totals and allow filtering by renewal urgency.",
      "In `styles.css`, design clean fintech table layout with service logo chips and warning badges for upcoming renewals."
    ]
  },

  // 13. gaming-esports-hub
  {
    project: "gaming-esports-hub",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[gaming-esports-hub] Add match countdown timer badge with 'Add to Calendar' ICS file export",
    description: "Add a live countdown timer badge to upcoming championship matches with a one-click button generating an `.ics` calendar file download so fans never miss a tournament match.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add countdown clock component and 'Add to Calendar' button to featured match card.",
      "In `script.js`, calculate remaining hours/minutes to match start and generate downloadable `.ics` calendar blob upon click.",
      "In `styles.css`, style countdown timer with esports digital HUD styling and pulsing red live dot."
    ]
  },
  {
    project: "gaming-esports-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[gaming-esports-hub] Build tournament match prediction poll widget with live vote percentage bars",
    description: "Implement an interactive match prediction widget where fans vote on which team will win upcoming playoffs, instantly seeing community vote percentages and prediction vote counts updated dynamically.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add match prediction voting card with team vote buttons and percentage bars.",
      "In `script.js`, handle vote click, disable voting once submitted, recalculate percentage distribution, and persist vote in `localStorage`.",
      "In `styles.css`, animate prediction split bar with team signature colors and glowing active states."
    ]
  },

  // 14. health-vitality
  {
    project: "health-vitality",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[health-vitality] Add daily hydration reminder alarm toggle with audio chime notification",
    description: "Add an hourly water intake reminder toggle switch to the hydration tracker card with synthesized Web Audio API chime sound and desktop notification permission prompt.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add reminder bell icon toggle and interval selector dropdown (30m, 60m, 90m).",
      "In `script.js`, play subtle synthesized audio chime using Web Audio API when user tests the reminder alarm.",
      "In `styles.css`, style toggle control with clean wellness turquoise accents and active state pulse."
    ]
  },
  {
    project: "health-vitality",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[health-vitality] Implement interactive intermittent fasting tracker with circular timer and metabolic stage milestones",
    description: "Build an interactive intermittent fasting timer with protocol selector (16:8, 18:6, 20:4, Circadian), animated circular SVG progress clock, metabolic stage milestones (Anabolic, Catabolic, Fat Burning, Ketosis), and start/stop controls.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add an Intermittent Fasting card with circular SVG timer and stage indicators.",
      "In `script.js`, implement fasting timer engine calculating elapsed time, remaining hours, active metabolic zone, and completion state.",
      "In `styles.css`, render dual-ring SVG circular progress bar with gradient glow and metabolic zone highlight tags."
    ]
  },

  // 15. luxury-realms
  {
    project: "luxury-realms",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[luxury-realms] Add destination local time and weather forecast pill to private jet destination cards",
    description: "Enhance private aviation charter cards with an interactive destination metadata pill displaying real-time destination local time (UTC offset) and current weather conditions (e.g. '☀️ Monaco 22°C • 14:30 CEST').",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add destination climate and local time badge container to flight cards.",
      "In `script.js`, compute destination local time using timezone offsets and render weather status icons.",
      "In `styles.css`, style badges with high-contrast gold typography and translucent slate backing."
    ]
  },
  {
    project: "luxury-realms",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[luxury-realms] Build bespoke onboard catering menu customizer with dietary preferences selector",
    description: "Build an onboard catering preference customizer where private jet passengers select bespoke dining tiers (Caviar & Champagne, Organic Vegan Kaiseki, Mediterranean Seafood), specify dietary restrictions, and add special requests.",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add an In-Flight Dining section with selection cards and dietary tag filters.",
      "In `script.js`, update charter booking summary with selected culinary package and estimate catering surcharge.",
      "In `styles.css`, style menu cards with luxury typography, dietary badges, and selected card highlight effects."
    ]
  },

  // 16. nonprofit-impact
  {
    project: "nonprofit-impact",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[nonprofit-impact] Add live impact metric badge counter (Acres Protected / Communities Supported) with animated count-up",
    description: "Add an impact statistics banner with animated counter animation showcasing total acres conserved (42,500+), indigenous communities supported (18), and native saplings planted (1.2M+).",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, add impact metric statistic cards with leaf and earth icons.",
      "In `script.js`, implement smooth numerical count-up easing function triggering when the metrics section enters viewport.",
      "In `styles.css`, style stats cards with eco-green gradient borders and bold numeral typography."
    ]
  },
  {
    project: "nonprofit-impact",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[nonprofit-impact] Build interactive recurring donation impact calculator showing tangible monthly milestones",
    description: "Build an interactive recurring donation impact calculator where donors drag a monthly contribution slider ($10 to $250/mo) to see tangible annualized impact milestones (e.g. '$25/mo plants 300 mangrove trees and restores 0.5 acres of coral reef').",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, create a Monthly Impact Calculator card with dynamic range slider.",
      "In `script.js`, dynamically calculate trees planted, wildlife habitat preserved, and carbon offset tonnage based on monthly pledge.",
      "In `styles.css`, design responsive visual impact breakdown cards with celebratory animations upon slider changes."
    ]
  },

  // 17. podcast-audio-stream
  {
    project: "podcast-audio-stream",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[podcast-audio-stream] Add episode share modal with custom timestamp URL generator and one-click copy button",
    description: "Add an episode sharing modal allowing listeners to share current episode link, optionally check 'Start at current timestamp' (e.g. `?t=14m20s`), and copy link with visual confirmation tooltip.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add share icon button to player bar and episode cards, and create a Share modal.",
      "In `script.js`, grab current audio playback time, construct timestamped share link, and copy to clipboard via Clipboard API.",
      "In `styles.css`, style share modal with audio wave motifs, social share pills, and animated 'Copied!' toast."
    ]
  },
  {
    project: "podcast-audio-stream",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[podcast-audio-stream] Build customizable sleep timer modal (15m, 30m, 45m, End of Episode) with countdown badge",
    description: "Implement a sleep timer feature for listeners that pauses audio playback after a user-chosen duration (15 min, 30 min, 45 min, 60 min, or end of active episode), displaying a persistent countdown timer chip in the player bar.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add sleep timer moon icon button in player controls and timer selector modal.",
      "In `script.js`, manage `setTimeout`/`setInterval` countdown, gradually fade out audio volume before pausing, and clear timer on cancel.",
      "In `styles.css`, style active sleep timer pill with glowing moon icon and compact countdown display."
    ]
  },

  // 18. real-estate-luxe
  {
    project: "real-estate-luxe",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[real-estate-luxe] Add private viewing scheduling modal with date-time picker and agent selector",
    description: "Create an interactive private showing request modal on property listing cards allowing prospective buyers to select viewing date, preferred time slot (Morning / Afternoon / Sunset), and choose preferred luxury estate concierge.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add 'Schedule Private Tour' button to listing cards and tour booking modal dialog.",
      "In `script.js`, validate date-time selections, prevent past dates, and show instant booking confirmation card.",
      "In `styles.css`, style modal with architectural minimalism, gold accent borders, and responsive input fields."
    ]
  },
  {
    project: "real-estate-luxe",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[real-estate-luxe] Build monthly HOA and property tax cost breakdown calculator with dynamic summary pie chart",
    description: "Build an itemized monthly homeownership cost calculator that estimates principal & interest, property taxes (1.2%), homeowners insurance, and HOA dues, rendering an interactive SVG donut chart breakdown.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add an Ownership Cost Breakdown card in the property details section.",
      "In `script.js`, calculate itemized monthly costs from property list price and generate dynamic SVG donut chart segments.",
      "In `styles.css`, style legend items with matching color chips and hover highlights on chart segments."
    ]
  },

  // 19. saas-launchpad
  {
    project: "saas-launchpad",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[saas-launchpad] Add live system status indicator widget (99.99% Uptime) with operational status badge",
    description: "Add a platform reliability and status badge in the footer/header (e.g. '🟢 All Systems Operational • 99.99% Uptime') with a popover showing status for API, Dashboard, and Webhook engines.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, insert system status chip with pulsing green indicator dot.",
      "In `styles.css`, style popover drawer with dark SaaS theme, latency metrics, and status lights.",
      "In `script.js`, add hover and click listeners to toggle detailed service component status."
    ]
  },
  {
    project: "saas-launchpad",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[saas-launchpad] Build interactive product feature tour modal with step-by-step navigation carousel",
    description: "Create an interactive product feature walkthrough modal showcasing core platform capabilities (Realtime Tracing, Anomaly Detection, Alert Routing) with step dots, previous/next buttons, and keyboard arrow key navigation.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add 'Take Product Tour' CTA button and tour modal container with 4 feature slides.",
      "In `script.js`, implement slide index state management, slide transition animations, and arrow key event listeners.",
      "In `styles.css`, design high-tech dashboard mockup illustrations, glowing slide indicators, and smooth carousel transitions."
    ]
  },

  // 20. travel-odyssey
  {
    project: "travel-odyssey",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[travel-odyssey] Add interactive visa and entry requirements checker card based on traveler nationality",
    description: "Add an entry requirements advisory card on destination expedition pages where travelers select their passport issuing country (US, UK, EU, India, Australia, Canada) to see visa requirements, passport validity rules, and vaccination guidelines.",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add Passport & Visa Advisory card with country selector dropdown.",
      "In `script.js`, dynamically render entry requirements (Visa-Free, eVisa, Visa on Arrival) matching selected destination and nationality.",
      "In `styles.css`, style advisory badges with high-contrast status tags and alert icons."
    ]
  },
  {
    project: "travel-odyssey",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[travel-odyssey] Build printable expedition itinerary voucher generator with trip QR code and gear checklist",
    description: "Build an expedition voucher generator that compiles the booked expedition details, dates, emergency satellite coordinates, and required gear list into a clean printable voucher with a mock QR verification code.",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add 'Print / Download Voucher' action button to booked itinerary cards.",
      "In `script.js`, generate printable voucher modal window with formatted trip summary and mock SVG QR code.",
      "In `styles.css`, include `@media print` rules ensuring clean, high-contrast, black-and-white page printing without website navigation bars."
    ]
  },

  // 21. automotive-hypercar - Test Suite Addition
  {
    project: "automotive-hypercar",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[automotive-hypercar] Implement comprehensive physics & acceleration simulation test suite using Node.js test runner",
    description: "Create an automated unit test suite (`public/showcase/automotive-hypercar/physics.test.mjs`) verifying mathematical formulas for 0-60 acceleration, drag coefficient equations, battery range consumption curves, and telemetry bounds.",
    suggestions: [
      "Create `public/showcase/automotive-hypercar/physics.test.mjs` using Node's built-in `node:test` and `node:assert/strict` modules.",
      "Extract or export telemetry calculation helpers from `script.js` into modular testable functions.",
      "Write unit tests verifying acceleration times across speed intervals, battery depletion rates under high load, and edge-case inputs."
    ]
  },

  // 22. ecommerce-store - Test Suite Addition
  {
    project: "ecommerce-store",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ecommerce-store] Implement comprehensive shopping cart and discount calculation test suite using Node.js test runner",
    description: "Create an automated unit test suite (`public/showcase/ecommerce-store/cart.test.mjs`) validating cart operations: adding items, quantity updates, removal, subtotal calculation, promo code percentage/fixed discounts, sales tax rates, and free shipping thresholds.",
    suggestions: [
      "Create `public/showcase/ecommerce-store/cart.test.mjs` using Node's built-in `node:test` and `node:assert/strict` modules.",
      "Test cart state calculations: subtotal accuracy with floating-point precision rounding, coupon code validation rules, and empty cart handling.",
      "Ensure all test cases run cleanly via `node public/showcase/ecommerce-store/cart.test.mjs`."
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
  console.log(`🚀 CAREERFORGE Issue Generator - Batch 5 (42 Issues)`);
  console.log(`======================================================\n`);
  console.log(`Target Repository: ${owner}/${repo}`);
  console.log(`Total Issues in Catalog: ${issues.length}`);
  console.log(`Mode: ${isDryRun || !octokit ? "DRY RUN (Validation & Local Preview)" : "LIVE GITHUB PUBLISH"}\n`);

  let countLevel1 = 0;
  let countLevel2 = 0;
  let countLevel3 = 0;

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    if (item.level === "level1") countLevel1++;
    else if (item.level === "level2") countLevel2++;
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
  console.log(`   - Level 1 (3 pts): ${countLevel1} issues`);
  console.log(`   - Level 2 (5 pts): ${countLevel2} issues`);
  console.log(`   - Level 3 (10 pts): ${countLevel3} issues`);
  console.log(`   - Total Issues:    ${issues.length} issues across 20 showcases`);
  console.log(`------------------------------------------------------\n`);
}

run();

