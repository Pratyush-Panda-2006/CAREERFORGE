import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";

// Get token from gh CLI
const token = execSync("gh auth token", { encoding: "utf-8" }).trim();
const octokit = new Octokit({ auth: token });
const owner = "Pratyush-Panda-2006";
const repo = "CAREERFORGE";

const issues = [
  // 1. agency-studio
  {
    project: "agency-studio",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[agency-studio] Add interactive client FAQ accordion with smooth spring expansion animation",
    description: "Build an interactive frequently asked questions accordion in the agency studio showcase so prospective clients can easily learn about timeline, deliverables, and revision policies.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, add a dedicated FAQ section with questions and answer containers.",
      "In `styles.css`, style accordion headers with subtle hover glow, rotating chevron icon, and smooth height expansion.",
      "In `script.js`, handle click events to toggle the active question and smoothly close open siblings."
    ]
  },
  {
    project: "agency-studio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[agency-studio] Build client feedback review submission modal with star rating and tag selector",
    description: "Create an interactive testimonial submission modal where clients can rate project collaboration (1 to 5 stars), pick project tags (e.g. Branding, Full-Stack, UI/UX), write review text, and see instant submission feedback.",
    suggestions: [
      "In `public/showcase/agency-studio/index.html`, create a Review Modal overlay with star rating inputs and tag pills.",
      "In `script.js`, handle star click/hover animations, validate form inputs, and append the submitted testimonial to the review list.",
      "In `styles.css`, style modal backdrop with glassmorphism, animated glowing stars, and responsive padding."
    ]
  },

  // 2. ai-voice-studio
  {
    project: "ai-voice-studio",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[ai-voice-studio] Add audio volume slider with mute toggle button to voice preview card",
    description: "Add a compact volume slider and mute/unmute icon button to the voice model preview player so users can easily adjust playback loudness.",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add volume control container next to the voice sample play buttons.",
      "In `script.js`, attach input listeners to adjust volume on the active audio player or synthesized speech utterance.",
      "In `styles.css`, style the volume range slider with sleek track styling and high-contrast thumb."
    ]
  },
  {
    project: "ai-voice-studio",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ai-voice-studio] Implement interactive multi-track audio waveform generator using HTML5 Canvas",
    description: "Build an animated HTML5 Canvas audio waveform visualizer that dynamically generates fluctuating soundwave bars matching the rhythm and frequency of selected voice samples.",
    suggestions: [
      "In `public/showcase/ai-voice-studio/index.html`, add a `<canvas id='voiceWaveform'>` container in the voice studio hero.",
      "In `script.js`, create a canvas render loop animating audio frequency bars with gradient fills and reactive peaks.",
      "In `styles.css`, style the visualizer frame with neon cyan borders and ambient glow."
    ]
  },

  // 3. automotive-hypercar
  {
    project: "automotive-hypercar",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[automotive-hypercar] Build vehicle comparison matrix table comparing specs against top 3 hypercars",
    description: "Create a side-by-side technical comparison table contrasting the Hypercar against top industry benchmarks across Horsepower, Top Speed, Aerodynamic Downforce, and Curb Weight.",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, add a Comparison Matrix section with vehicle columns and spec rows.",
      "In `styles.css`, style the matrix with dark carbon styling, highlighted winner badges for superior metrics, and responsive mobile horizontal scroll.",
      "In `script.js`, add a vehicle selector toggle to compare different configurations."
    ]
  },
  {
    project: "automotive-hypercar",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[automotive-hypercar] Implement interactive 0-60 acceleration simulation stopwatch with live G-meter dial",
    description: "Build an interactive launch control simulator where users click 'Launch Hypercar', triggering an animated digital speedometer acceleration curve from 0 to 60 mph in 1.8 seconds with an interactive G-force circular meter.",
    suggestions: [
      "In `public/showcase/automotive-hypercar/index.html`, add a Launch Simulator section with speedometer display and circular G-force dial.",
      "In `script.js`, write a physics acceleration simulation timer that ramps speed from 0 to 60 mph and animates dial coordinates.",
      "In `styles.css`, style the HUD cluster with glowing redline graphics, neon gauge needle, and launch countdown lights."
    ]
  },

  // 4. crypto-exchange-pro
  {
    project: "crypto-exchange-pro",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[crypto-exchange-pro] Add token search bar with quick currency filter buttons (All, Layer 1, DeFi, AI)",
    description: "Provide quick token discovery in the market overview table by adding an interactive search filter and category pill buttons.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add search input and category filter buttons above the market table.",
      "In `script.js`, filter visible token rows dynamically as the user types or clicks category pills.",
      "In `styles.css`, style the active filter button with glowing border and subtle background tint."
    ]
  },
  {
    project: "crypto-exchange-pro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[crypto-exchange-pro] Build interactive order book depth visualizer chart using dynamic SVG bars",
    description: "Build an order book depth chart showing cumulative buy (bids, green) and sell (asks, red) liquidity curves with interactive hover tooltips displaying price and volume.",
    suggestions: [
      "In `public/showcase/crypto-exchange-pro/index.html`, add an SVG container for order book market depth visualization.",
      "In `script.js`, calculate cumulative bid/ask volume curves and generate SVG polygon points dynamically.",
      "In `styles.css`, style with semi-transparent green/red fill gradients and crosshair coordinate readouts."
    ]
  },

  // 5. culinary-bistro
  {
    project: "culinary-bistro",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[culinary-bistro] Add dietary allergens alert tooltip popover (Nuts, Dairy, Shellfish) to dish cards",
    description: "Help restaurant guests dine safely by adding interactive allergen warning tooltips to menu dish items.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add allergen warning badges (⚠️ Contains: Dairy, Tree Nuts) on relevant dishes.",
      "In `styles.css`, style tooltips with refined typography, gold borders, and smooth fade-in animations on hover.",
      "Ensure tooltips are accessible on touch devices."
    ]
  },
  {
    project: "culinary-bistro",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[culinary-bistro] Build chef special tasting menu interactive multi-course timeline preview",
    description: "Create an interactive culinary journey preview for the 7-course Chef Tasting Menu with dish imagery, course numbering, and chef inspiration stories.",
    suggestions: [
      "In `public/showcase/culinary-bistro/index.html`, add a Tasting Menu timeline section with course cards.",
      "In `script.js`, allow users to click courses to expand chef notes and wine pairing highlights.",
      "In `styles.css`, style with Parisian bistro aesthetic, elegant line separators, and subtle zoom on hover."
    ]
  },

  // 6. cybersecurity-sentinel
  {
    project: "cybersecurity-sentinel",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[cybersecurity-sentinel] Build interactive CVE vulnerability severity filter with CVSS score meter",
    description: "Create a vulnerability database explorer allowing security analysts to filter threats by CVSS score range (0.0 to 10.0) and exploitability status.",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, add a CVE Explorer section with CVSS range slider and severity pills.",
      "In `script.js`, filter mock CVE entries dynamically and render score meters with color-coded badges.",
      "In `styles.css`, style CVSS meters with glowing red, amber, and blue gradients."
    ]
  },
  {
    project: "cybersecurity-sentinel",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[cybersecurity-sentinel] Implement interactive network port scanner simulator with simulated ping latency display",
    description: "Build an interactive network defense tool widget where users input an IP address or hostname, click 'Scan Host', and see simulated port inspection (HTTP 80, HTTPS 443, SSH 22, FTP 21) with open/closed status and latency badges.",
    suggestions: [
      "In `public/showcase/cybersecurity-sentinel/index.html`, create a Port Scanner console interface with target input and scan button.",
      "In `script.js`, simulate asynchronous port checks with progressive scanning animation and status results.",
      "In `styles.css`, style with hacker-terminal aesthetic, monospace fonts, and animated scanning radar line."
    ]
  },

  // 7. developer-portfolio
  {
    project: "developer-portfolio",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[developer-portfolio] Add interactive resume download button with format dropdown (PDF / Plaintext / JSON)",
    description: "Enhance the portfolio header with a resume download button that offers format choices (Download as PDF, View as Plaintext, or Inspect JSON Resume).",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add resume dropdown button markup with format options.",
      "In `script.js`, handle format selection, trigger simulated downloads or modal display for JSON resume.",
      "In `styles.css`, style dropdown menu with sleek terminal borders and hover highlights."
    ]
  },
  {
    project: "developer-portfolio",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[developer-portfolio] Build project filter tag bar with live project counter chip",
    description: "Add a category filter bar (All, Web Apps, CLI Tools, Open Source, AI) above the projects grid with a dynamic counter badge showing matching project counts.",
    suggestions: [
      "In `public/showcase/developer-portfolio/index.html`, add filter pills above the project grid.",
      "In `script.js`, filter cards with matching category data attributes and update the counter chip.",
      "In `styles.css`, style active pill with high-contrast terminal highlight and smooth fade transitions."
    ]
  },

  // 8. docs-portal
  {
    project: "docs-portal",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[docs-portal] Add breadcrumb navigation trail with copy-link-to-section anchor icons",
    description: "Improve documentation navigation by adding hierarchical breadcrumb links at the top of doc articles and hoverable '#' anchor links next to all section headings.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add breadcrumbs markup at the start of doc content.",
      "In `script.js`, inject copy-to-clipboard anchor link buttons next to all `<h2>` and `<h3>` headings.",
      "In `styles.css`, style anchor links to appear cleanly on heading hover with toast feedback."
    ]
  },
  {
    project: "docs-portal",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[docs-portal] Build interactive API rate limit quota status gauge with simulated reset countdown",
    description: "Add an interactive API developer status card showing current hourly request quota (e.g. 842 / 1,000 requests used), a circular percentage progress gauge, and a live reset timer.",
    suggestions: [
      "In `public/showcase/docs-portal/index.html`, add API Quota Status card in the API overview section.",
      "In `script.js`, simulate quota usage percentages and run a countdown timer to next quota reset.",
      "In `styles.css`, style with circular SVG progress ring and status indicator chips."
    ]
  },

  // 9. ecommerce-store
  {
    project: "ecommerce-store",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[ecommerce-store] Build wishlist / favorites drawer with item badge counter and localStorage persistence",
    description: "Allow shoppers to click a heart icon on product cards to save items to a Wishlist, view their saved items in a sliding drawer, and persist favorites in `localStorage`.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add heart toggle buttons on product cards and a Wishlist sliding drawer markup.",
      "In `script.js`, store favorited product IDs in `localStorage`, update wishlist counter badge, and render saved items.",
      "In `styles.css`, style wishlist drawer with slide-in animation, empty state card, and remove item buttons."
    ]
  },
  {
    project: "ecommerce-store",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[ecommerce-store] Implement interactive product review & customer rating breakdown analytics widget",
    description: "Build an interactive product reviews section with overall star average (e.g., 4.8 / 5.0), star rating distribution progress bars (5-star down to 1-star), and a filterable review list.",
    suggestions: [
      "In `public/showcase/ecommerce-store/index.html`, add a Customer Reviews & Ratings section with breakdown bars.",
      "In `script.js`, calculate percentage breakdown for star ratings, filter reviews by verified purchase or star count.",
      "In `styles.css`, style rating distribution bars with smooth gradient fills and amber review stars."
    ]
  },

  // 10. edtech-academy
  {
    project: "edtech-academy",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[edtech-academy] Add student testimonial quotes slider with verified graduate status badges",
    description: "Highlight student success stories by adding an interactive student review carousel featuring student photos, current tech employer badges, and verified graduate chips.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add a Student Stories carousel section with slider controls.",
      "In `script.js`, support next/prev navigation and dot indicator selection.",
      "In `styles.css`, style review cards with modern glassmorphism, company badge icons, and smooth transitions."
    ]
  },
  {
    project: "edtech-academy",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[edtech-academy] Implement interactive code challenge sandbox editor with live syntax test runner",
    description: "Build an interactive in-browser coding challenge widget where students write a JavaScript function, click 'Run Tests', and see immediate pass/fail test results with execution runtime.",
    suggestions: [
      "In `public/showcase/edtech-academy/index.html`, add code challenge container with editor textarea and test results console.",
      "In `script.js`, evaluate student code safely against predefined unit test cases and display green/red status badges.",
      "In `styles.css`, style editor with dark monospace code theme, line numbers, and clean test result badges."
    ]
  },

  // 11. festival-hub
  {
    project: "festival-hub",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[festival-hub] Add interactive festival weather forecast widget with day-by-day icons",
    description: "Provide weather clarity for festival attendees by adding a stylish 3-day weather forecast widget (temperature, conditions, sunset time) tailored for festival weekend.",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add a Festival Weather card in the event info section.",
      "In `styles.css`, style forecast cards with weather icons (☀️ Sunny, 🌙 Clear Night), temperature badges, and neon accents.",
      "Ensure clean layout across desktop and mobile screens."
    ]
  },
  {
    project: "festival-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[festival-hub] Build festival venue map interactive stage locator with popover stage schedules",
    description: "Create an interactive festival venue map layout with clickable stage pins (Main Stage, Neon Arena, Bass Vault, Chill Oasis) that reveal stage line-up and upcoming DJ sets on click.",
    suggestions: [
      "In `public/showcase/festival-hub/index.html`, add an SVG or CSS grid festival map with stage pins.",
      "In `script.js`, handle pin clicks to open a popover dialog showing stage headliners and schedule.",
      "In `styles.css`, style stage pins with pulsing glowing markers and smooth popover animations."
    ]
  },

  // 12. fintech-vault
  {
    project: "fintech-vault",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[fintech-vault] Add quick export transaction report button (CSV / PDF format) to ledger",
    description: "Allow users to export their transaction history statement by adding an 'Export Statement' dropdown with CSV and print-optimized PDF options.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add an Export Statement button next to the transaction filter bar.",
      "In `script.js`, generate CSV data dynamically from transaction objects and trigger download via blob URL.",
      "In `styles.css`, style dropdown button with sleek banking styling and icon indicators."
    ]
  },
  {
    project: "fintech-vault",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[fintech-vault] Implement currency exchange rate converter with real-time fee calculation & mock rates",
    description: "Build an interactive global foreign exchange converter where users convert currencies (USD, EUR, GBP, JPY, CAD), view live mid-market exchange rates, and see transparent conversion fee breakdowns.",
    suggestions: [
      "In `public/showcase/fintech-vault/index.html`, add a Foreign Exchange Converter card with currency pickers and swap button.",
      "In `script.js`, calculate converted amounts using a mock exchange rate matrix and itemize bank fee vs guaranteed rate.",
      "In `styles.css`, style with glowing currency flags, live exchange rate ticker, and rate update timestamp."
    ]
  },

  // 13. gaming-esports-hub
  {
    project: "gaming-esports-hub",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[gaming-esports-hub] Add live twitch stream status badge indicator to featured tournament banner",
    description: "Enhance the tournament hero banner by adding an animated '🔴 LIVE ON TWITCH' broadcast status badge with simulated concurrent viewer count (e.g., '142.8K Viewers').",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add live stream badge in the tournament hero header.",
      "In `styles.css`, style badge with pulsing red live dot and Twitch purple brand accents.",
      "In `script.js`, add simulated viewer counter fluctuation for authentic broadcast feel."
    ]
  },
  {
    project: "gaming-esports-hub",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[gaming-esports-hub] Build interactive esports team leaderboard with win streaks and head-to-head records",
    description: "Create an interactive competitive standings table showing tournament teams, match points, win/loss differential, and clickable team rows displaying head-to-head records.",
    suggestions: [
      "In `public/showcase/gaming-esports-hub/index.html`, add a Standings Leaderboard table with rank badges.",
      "In `script.js`, sort teams dynamically by points or win streak and support row expansion for match details.",
      "In `styles.css`, style with dark gaming aesthetics, podium rank badges (Gold, Silver, Bronze), and win streak flames."
    ]
  },

  // 14. health-vitality
  {
    project: "health-vitality",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[health-vitality] Add daily step goal achievement progress bar with motivational badge rewards",
    description: "Add a daily step tracker metric widget displaying current step count against 10,000 steps goal with an animated progress bar and reward badges.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add a Step Tracker widget card in the daily activity section.",
      "In `script.js`, calculate goal percentage and unlock achievement badges when goal is met.",
      "In `styles.css`, style progress bar with vibrant emerald gradient and reward badge glow."
    ]
  },
  {
    project: "health-vitality",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[health-vitality] Implement interactive meal planner & macronutrient distribution balance chart",
    description: "Build an interactive daily nutrition meal planner where users log breakfast, lunch, and dinner items, dynamically updating an SVG donut chart of daily Caloric intake vs Protein, Carbs, and Fats.",
    suggestions: [
      "In `public/showcase/health-vitality/index.html`, add meal logger section with meal slots and an SVG donut chart container.",
      "In `script.js`, calculate macro totals, update SVG circle stroke offsets for donut segments, and display target delta.",
      "In `styles.css`, style meal items with delete/edit chips, calories badge, and responsive summary cards."
    ]
  },

  // 15. luxury-realms
  {
    project: "luxury-realms",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[luxury-realms] Add VIP private concierge contact modal with preferred contact method selector",
    description: "Build an exclusive VIP inquiry modal allowing high-net-worth clients to request a callback or encrypted briefing with their preferred communication channel (Signal, WhatsApp VIP, Private Phone).",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add a Concierge Contact modal markup with communication channel buttons.",
      "In `script.js`, handle modal opening on 'Request Briefing' clicks, validate contact input, and display confirmation card.",
      "In `styles.css`, style with luxury dark theme, gold borders, and elegant form controls."
    ]
  },
  {
    project: "luxury-realms",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[luxury-realms] Build luxury property virtual video walkthrough player modal with chapter timestamps",
    description: "Add an immersive architectural video tour modal with interactive chapter navigation (e.g. Master Suite, Private Helipad, Wine Cellar, Infinity Terrace) jumping to specific tour moments.",
    suggestions: [
      "In `public/showcase/luxury-realms/index.html`, add tour preview thumbnail with play button opening video tour modal.",
      "In `script.js`, render chapter buttons that simulate jumping to video tour milestones with active highlights.",
      "In `styles.css`, style modal with cinema dark backdrop, refined gold playback controls, and chapter cards."
    ]
  },

  // 16. nonprofit-impact
  {
    project: "nonprofit-impact",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[nonprofit-impact] Add live community donor wall ticker showing recent contributor names and impact",
    description: "Celebrate community supporters by adding a live scrolling donor wall ticker displaying recent donor handles, trees planted amounts, and country flags.",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, add a Donor Wall marquee or grid section.",
      "In `styles.css`, style donor chips with eco-friendly green borders, leafy badge icons, and smooth continuous scroll animation.",
      "Ensure mobile responsiveness and high contrast readability."
    ]
  },
  {
    project: "nonprofit-impact",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[nonprofit-impact] Build interactive reforestation species directory with carbon absorption metrics",
    description: "Create an interactive educational directory of native tree species planted (e.g. Baobab, Douglas Fir, Mangrove) showing lifespan, native region, and annual carbon absorption in kg CO2.",
    suggestions: [
      "In `public/showcase/nonprofit-impact/index.html`, add a Tree Species Directory section with filterable cards.",
      "In `script.js`, support filtering by region (Africa, Americas, Asia) and sorting by carbon absorption rate.",
      "In `styles.css`, style species cards with botanical illustrations, carbon absorption meters, and ecological impact tags."
    ]
  },

  // 17. podcast-audio-stream
  {
    project: "podcast-audio-stream",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[podcast-audio-stream] Add episode bookmark timestamp note saver with localStorage persistence",
    description: "Allow listeners to click a 'Bookmark Timestamp' button during audio playback to save key moments with custom notes, saved in `localStorage`.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add a 'Bookmark Moment' button and saved bookmarks tray.",
      "In `script.js`, capture current playback timestamp, prompt for a brief note, store in `localStorage`, and jump to time on click.",
      "In `styles.css`, style bookmarks list with timestamp chips, delete action, and clean card styling."
    ]
  },
  {
    project: "podcast-audio-stream",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[podcast-audio-stream] Build audio equalizer preset selector (Speech, Bass Boost, Treble, Studio Acoustic)",
    description: "Add an audio profile preset selector allowing listeners to toggle equalizer presets with visual simulated EQ frequency sliders updating reactively.",
    suggestions: [
      "In `public/showcase/podcast-audio-stream/index.html`, add an EQ preset dropdown or button group in player controls.",
      "In `script.js`, update simulated 5-band EQ slider heights when presets (Speech, Bass Boost, Studio) are selected.",
      "In `styles.css`, style frequency sliders with glowing vertical bars and active preset badge."
    ]
  },

  // 18. real-estate-luxe
  {
    project: "real-estate-luxe",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[real-estate-luxe] Add neighborhood walk-score & transit rating info card to luxury listings",
    description: "Enhance estate detail cards by adding a neighborhood livability widget showing Walk Score, Transit Score, and distance to private airports and Michelin restaurants.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add a Neighborhood Scores section on property listing cards.",
      "In `styles.css`, style scores with circular rating badges (e.g. 94/100 Walker's Paradise), muted gold borders, and icon indicators.",
      "Ensure clean alignment across desktop and tablet viewports."
    ]
  },
  {
    project: "real-estate-luxe",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[real-estate-luxe] Build interactive property comparison drawer allowing side-by-side comparison of 2 villas",
    description: "Allow prospective buyers to check 'Compare' on up to 2 villas and view a side-by-side comparison drawer highlighting price, square footage, bedrooms, infinity pools, and acreage.",
    suggestions: [
      "In `public/showcase/real-estate-luxe/index.html`, add 'Compare' checkboxes on estate cards and a comparison drawer popup.",
      "In `script.js`, manage selected properties state, validate max 2 items, and render comparison matrix.",
      "In `styles.css`, style comparison table with split columns, luxury badges, and clear button."
    ]
  },

  // 19. saas-launchpad
  {
    project: "saas-launchpad",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[saas-launchpad] Add interactive feature search filter bar in the integrations ecosystem directory",
    description: "Add an instant search and filter bar to the integrations section (Slack, GitHub, Datadog, AWS, PagerDuty) allowing users to search tools by name or category.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add search input and category filter buttons above integration logos.",
      "In `script.js`, filter visible integration cards dynamically based on user search query.",
      "In `styles.css`, style search input with keyboard shortcut indicator and glowing focus ring."
    ]
  },
  {
    project: "saas-launchpad",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    title: "[saas-launchpad] Build customer onboarding checklist widget with step completion badges and confetti",
    description: "Create an interactive getting-started onboarding widget for new teams with 4 setup steps (Create Workspace, Connect Repository, Invite Teammates, Run First Pipeline) with completion progress and celebration confetti.",
    suggestions: [
      "In `public/showcase/saas-launchpad/index.html`, add an Onboarding Checklist card in dashboard preview section.",
      "In `script.js`, allow checking off steps, update percentage completion, and trigger a celebration banner when 100% complete.",
      "In `styles.css`, style completed items with green checkmarks, strikethrough, and animated progress bar."
    ]
  },

  // 20. travel-odyssey
  {
    project: "travel-odyssey",
    level: "level1",
    points: "3 Points",
    labels: ["nsoc26", "level1", "good first issue"],
    title: "[travel-odyssey] Add interactive flight duration & time-zone difference calculator badge",
    description: "Provide quick travel clarity by adding an interactive flight duration badge (e.g. '✈️ 11h 45m from JFK • +5 hrs time difference') to expedition adventure cards.",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add departure city selector dropdown and flight duration badge to trip cards.",
      "In `script.js`, update flight hours and time zone difference dynamically based on selected home airport.",
      "In `styles.css`, style badges with clean dark glassmorphism and airport icon chips."
    ]
  },
  {
    project: "travel-odyssey",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    title: "[travel-odyssey] Implement interactive expedition budget planner with currency converter and cost breakdown",
    description: "Build an interactive travel budget calculator where adventurers configure accommodation tier (Standard, Premium Eco-Lodge, Luxury Glamping), gear rental packages, guided tour options, and see total budget with currency conversion (USD, EUR, GBP, AUD).",
    suggestions: [
      "In `public/showcase/travel-odyssey/index.html`, add an Expedition Budget Planner section with tier selectors and currency dropdown.",
      "In `script.js`, calculate itemized costs dynamically, apply currency exchange multipliers, and calculate per-person rate.",
      "In `styles.css`, style with sleek summary card, itemized expense breakdown bar chart, and 'Save Expedition Estimate' action."
    ]
  }
];

function generateBody(item) {
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
  console.log(`Starting creation of ${issues.length} multi-level contributor issues across 20 showcase projects...`);

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    const body = generateBody(item);

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

  console.log("All 40 multi-level issues created successfully!");
}

run();
