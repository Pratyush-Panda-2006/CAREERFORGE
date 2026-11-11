# 🚀 CAREERFORGE Batch 8 Issues Catalog: 20 Advanced Contributor Tasks (Level 2 & Level 3)

**Repository:** `Pratyush-Panda-2006/CAREERFORGE`  
**Initiative:** Nexus Spring of Code 2026 (NSoC '26)  
**Batch Scope:** **Strictly Level 2 (5 Points) & Level 3 (10 Points) Tasks**  
**Catalog Size:** 20 Handcrafted Showcase Enhancements (10 Level 2 + 10 Level 3)  
**Governance Policy:** Concurrency limit enforced (max 4 active Level 3 claims per user)  

---

## 📑 Table of Contents
1. [Batch Overview & Scoring Rubric](#1-batch-overview--scoring-rubric)
2. [Level 3 Concurrency Governance Rule](#2-level-3-concurrency-governance-rule)
3. [Batch 8 Issues Distribution Matrix](#3-batch-8-issues-distribution-matrix)
4. [Detailed Task Specifications (20 Issues)](#4-detailed-task-specifications)
   - [Level 2: Intermediate Tasks (10 Issues — 5 Points each)](#level-2-intermediate-tasks-10-issues--5-points)
   - [Level 3: Core Logic & Advanced Engines (10 Issues — 10 Points each)](#level-3-core-logic--advanced-engines-10-issues--10-points)
5. [Automated Publishing Guide](#5-automated-publishing-guide)

---

## 1. Batch Overview & Scoring Rubric

All tasks in Batch 8 adhere to the official Nexus Spring of Code 2026 scoring structure:

| Tier | Mandatory Label | Point Value | Scope & Requirements |
| :---: | :---: | :---: | :--- |
| **Level 2** | `level2` | **5 Points** | Interactive UI components, comparison drawers, audit timelines, radar charts, and loan calculators. |
| **Level 3** | `level3` | **10 Points** | Algorithmic state machines, Canvas 2D/WebGL physics and shaders, in-browser shells, fraud heuristics, and match simulation engines. |

---

## 2. Level 3 Concurrency Governance Rule

> [!IMPORTANT]
> To preserve equitable access to high-value tasks across the community, contributors are limited to a maximum of **4 concurrent Level 3 issues**.
> 
> - If a contributor currently has 4 active Level 3 issues claimed, subsequent `/claim` attempts on Level 3 issues will be blocked.
> - The contributor must submit a linked PR and close at least one of their 4 active Level 3 issues before claiming another.
> - Level 1 and Level 2 issues are **not** subject to this 4-issue cap.

---

## 3. Batch 8 Issues Distribution Matrix

| # | Showcase Directory | Level 2 Task (5 pts) | Level 3 Task (10 pts) |
|---|--------------------|----------------------|-----------------------|
| 1 | `ecommerce-store` | Multi-Product Specs Comparison Matrix Drawer | Tiered Promo Discount Engine & Canvas Invoice Generator |
| 2 | `agency-studio` | Project Scope & Budget Estimator with Deliverable Chips | WebGL / Canvas Liquid Distortion Hover Wave Shader |
| 3 | `festival-hub` | Personalized Festival Schedule & Conflict Alert Planner | Real-Time Stage Crowd Density & Decibel Heatmap Simulator |
| 4 | `saas-launchpad` | 90-Day Service Uptime History & Incident Severity Matrix | Real-Time Telemetry Anomaly Detection & Alert Simulator |
| 5 | `developer-portfolio` | Terminal Neofetch Hardware Stats & Live Gauges Widget | In-Browser Shell Sandbox with Virtual File System & Pipes |
| 6 | `docs-portal` | API Rate Limit & Token Bucket Quota Visualizer | Client-Side GraphQL Query Builder & AST Schema Explorer |
| 7 | `culinary-bistro` | Sommelier Wine Pairing Guide & Flavor Polygon Wheel | 2D Floor Plan Booking Engine & Seat Allocation Machine |
| 8 | `real-estate-luxe` | Mortgage Amortization & Investment Yield Trajectory | Multi-Level Architectural Blueprint Viewer & Measurement Tool |
| 9 | `fintech-vault` | Savings Goals Stash & Compound Interest Wealth Projector | Rule-Based Financial Fraud Detection Engine & Risk Scorer |
| 10 | `gaming-esports-hub` | Head-to-Head Player Stat Radar & Win Probability Tool | Interactive Esports Match Simulator with Live Event Log |

---

## 4. Detailed Task Specifications

---

### Level 2: Intermediate Tasks (10 Issues — 5 Points)

#### 1. `[ecommerce-store]` Interactive Multi-Product Specification Comparison Matrix & Drawer
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/ecommerce-store/`
- **Description:** Allow shoppers to select up to 3 hardware items from the catalog, slide open a comparative bottom sheet/drawer, and contrast pricing, specs, availability, battery life, weight, and user ratings with differences highlighted.
- **Implementation Guide:**
  1. In `index.html`, add a compare checkbox/toggle button on product cards and a hidden bottom drawer modal `#product-comparison-drawer`.
  2. In `script.js`, maintain an in-memory `comparisonList` array (max 3 items), handle additions/removals, and dynamically render a specs table contrasting key parameters.
  3. In `styles.css`, format drawer with sliding transition, glassmorphism, sticky row headers, and color-coded difference callouts.

#### 2. `[agency-studio]` Interactive Project Scope & Budget Estimator with Visual Deliverable Chips
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/agency-studio/`
- **Description:** Build an interactive project inquiry scope calculator where potential clients toggle services (Brand Identity, Web Development, 3D Motion, Design Systems, SEO), configure timelines, and receive real-time estimated budget ranges and timeline milestones.
- **Implementation Guide:**
  1. In `index.html`, create an "Interactive Project Estimator" section with interactive deliverable toggle chips and timeline sliders.
  2. In `script.js`, compute budget estimates based on selected services and deliverable complexity with real-time summary updates.
  3. In `styles.css`, style deliverable tags with glowing active states, glassmorphic cost summary card, and responsive mobile layout.

#### 3. `[festival-hub]` Personalized Festival Schedule & Artist Itinerary Planner with Conflict Alerting
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/festival-hub/`
- **Description:** Create an interactive personal lineup builder where attendees can bookmark performances across multiple stages, visually view their chronological timeline, receive warnings when two artist sets overlap, and export to iCalendar (`.ics`).
- **Implementation Guide:**
  1. In `index.html`, add a bookmark star/icon to artist lineup cards and an "Itinerary Drawer" tab.
  2. In `script.js`, manage saved artist schedule in `localStorage`, execute collision detection algorithm for overlapping stage times, and generate valid RFC 5545 `.ics` file strings.
  3. In `styles.css`, design chronological time track bars with warning badges on conflicting time slots.

#### 4. `[saas-launchpad]` 90-Day Service Uptime History & Incident Severity Matrix
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/saas-launchpad/`
- **Description:** Build an enterprise-grade service status history component displaying 90-day uptime bars per microservice (API, Dashboard, Ingestion Pipeline, Webhooks), interactive day tooltips with latency metrics, and incident severity filter tags.
- **Implementation Guide:**
  1. In `index.html`, add an "Enterprise System Status & Uptime History" container.
  2. In `script.js`, generate 90 daily discrete segments for 4 services with realistic random historical incidents (operational, degraded, outage) and interactive hover tooltip cards.
  3. In `styles.css`, style emerald/amber/rose status bar pills with subtle micro-animations and responsive scroll.

#### 5. `[developer-portfolio]` Terminal Neofetch Hardware Stats & Live Gauges Widget
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/developer-portfolio/`
- **Description:** Implement a CLI-themed `neofetch` / `fastfetch` system information banner displaying ASCII art, OS kernel simulation, live fake uptime ticker, and interactive memory/CPU usage progress gauges.
- **Implementation Guide:**
  1. In `index.html`, add a `#neofetch-widget` container within the terminal profile header.
  2. In `script.js`, format an ANSI-colored ASCII logo, compute session uptime ticker, and animate ASCII progress bars (`[=====>----] 62%`).
  3. In `styles.css`, apply monospaced styling (`Fira Code`), neon terminal color palette, and responsive wrapping for narrow screens.

#### 6. `[docs-portal]` Interactive API Rate Limit & Token Bucket Quota Visualizer
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/docs-portal/`
- **Description:** Create an educational rate-limiting playground explaining `429 Too Many Requests`, featuring interactive request burst sliders, live token-bucket refill animation, and response headers preview (`X-RateLimit-Limit`, `X-RateLimit-Remaining`).
- **Implementation Guide:**
  1. In `index.html`, add an interactive "Rate Limiting Laboratory" card with trigger buttons and refill slider.
  2. In `script.js`, implement a deterministic Token Bucket algorithm that decrements on trigger, regenerates tokens per second, and updates simulated HTTP headers.
  3. In `styles.css`, render a visual bucket capacity gauge with liquid fill animation and warning states when exhausted.

#### 7. `[culinary-bistro]` Sommelier Wine & Beverage Pairing Guide with Flavor Radar Profile
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/culinary-bistro/`
- **Description:** Implement an interactive beverage pairing recommendation assistant matching dishes from the tasting menu to curated French wines, displaying tannins, acidity, sweetness, and oak intensity on a visual polygon radar chart.
- **Implementation Guide:**
  1. In `index.html`, add a Sommelier wine pairing drawer modal accessible from menu courses.
  2. In `script.js`, render an SVG polygon radar chart plotting 5 sensory dimensions (Tannin, Acidity, Body, Sweetness, Fruit), calculating polygon coordinates dynamically.
  3. In `styles.css`, style vintage card layouts with subtle gold border accents and typography pairing.

#### 8. `[real-estate-luxe]` Interactive Mortgage Amortization & Investment Yield Trajectory
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/real-estate-luxe/`
- **Description:** Build a comprehensive luxury real estate mortgage and loan calculator computing monthly principal, interest, property tax, homeowner insurance, HOA fees, and visualizing a 15-year vs 30-year amortization balance trajectory.
- **Implementation Guide:**
  1. In `index.html`, add a "Financing & Investment Yield Calculator" section on property detail cards.
  2. In `script.js`, implement monthly compound interest math, amortization schedule generation, and SVG trajectory line chart.
  3. In `styles.css`, create clean input range sliders and summary pill counters with dark glassmorphism.

#### 9. `[fintech-vault]` Automated Recurring Savings Goals Stash & Compound Interest Wealth Projector
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/fintech-vault/`
- **Description:** Implement an interactive personal wealth vault feature allowing users to create custom savings goals (e.g., Emergency Fund, Real Estate Down Payment), set weekly auto-contributions, and project compound returns over 1-10 years with interactive interest sliders.
- **Implementation Guide:**
  1. In `index.html`, add a "Savings Goals & Growth Vault" card grid with modal for creating new stashes.
  2. In `script.js`, compute monthly recurring contribution growth with compound interest formulas and persist stashes in `localStorage`.
  3. In `styles.css`, format goal progress bars, target milestone badges, and projected profit glow cards.

#### 10. `[gaming-esports-hub]` Pro Player Head-to-Head Stat Comparison Radar with Win Probability Estimator
- **Labels:** `nsoc26`, `level2`, `enhancement`
- **Showcase Path:** `public/showcase/gaming-esports-hub/`
- **Description:** Build a head-to-head comparison modal for esports athletes comparing KDA, CS/min, damage share, first blood percentage, and champion pool mastery on an overlayed SVG radar chart with an algorithmic match win predictor.
- **Implementation Guide:**
  1. In `index.html`, add player comparison dropdown selectors and an SVG radar viewport.
  2. In `script.js`, normalize player metrics across 5 axes, draw dual overlayed SVG polygons (Cyan vs Magenta), and compute Elo-weighted matchup odds.
  3. In `styles.css`, style neon stat pill callouts and cybernetic border glows.

---

### Level 3: Core Logic & Advanced Engines (10 Issues — 10 Points)

#### 11. `[ecommerce-store]` Tiered Promo Code Calculation Engine with Rule-Based Cart Discount Matrix & Canvas Invoice Generator
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/ecommerce-store/`
- **Description:** Implement an in-memory promotional discount engine handling conditional rules (minimum spend thresholds, category-specific coupon codes, BOGO algorithms, and tax estimation) paired with an exportable client-side canvas checkout receipt/invoice generator.
- **Implementation Guide:**
  1. In `script.js`, implement a pure class `PromoDiscountEngine` with methods: `applyCoupon(code, cart)`, `evaluateTierDiscount(subtotal)`, `calculateTaxAndShipping(address, subtotal)`.
  2. Support standard coupon codes (`CYBER20` for 20% off, `FREESHIP` for zero shipping above $100, `BUNDLE3` for buy-2-get-1-free).
  3. Implement `generateInvoiceReceipt(orderData)` drawing a high-DPI HTML5 Canvas invoice with barcode, order items table, tax totals, and download as PNG.
  4. Write unit tests verifying edge cases (expired codes, stacking restrictions, rounding tolerances).

#### 12. `[agency-studio]` Client-Side WebGL / Canvas Liquid Distortion Hover Wave Shader for Portfolio Showcases
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/agency-studio/`
- **Description:** Build a high-performance Canvas 2D / WebGL image ripple and liquid displacement effect applied on portfolio project thumbnails upon hover/pointer drag with customizable frequency, amplitude dampening, and reduced-motion fallback.
- **Implementation Guide:**
  1. In `script.js`, create a Canvas-based displacement renderer calculating 2D sine-wave water ripples or WebGL vertex distortion on cursor movement.
  2. Implement physics dampening so ripples smoothly attenuate and settle over time when pointer is idle.
  3. Support mobile touch dragging and gracefully disable animation when `prefers-reduced-motion` is detected.
  4. Add unit tests for ripple coordinate bounds and math stability.

#### 13. `[festival-hub]` Real-Time Interactive Stage Crowd Density & Decibel Sound Level Heatmap Simulator
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/festival-hub/`
- **Description:** Implement an interactive canvas-based festival venue map rendering real-time crowd heatmaps, pulsating decibel sound contours from active stages, and dynamic route pathfinding from current location to exits/medical tents.
- **Implementation Guide:**
  1. In `script.js`, implement a Canvas vector map of the festival grounds with stages, food courts, and safety stations.
  2. Compute radial heatmap gradients using Gaussian attenuation formulas based on simulated attendee count per zone.
  3. Implement decibel propagation circles that pulsate in sync with virtual audio BPM.
  4. Implement an A* or Dijkstra pathfinding algorithm finding the shortest unobstructed path between any two clicked coordinates.

#### 14. `[saas-launchpad]` Real-Time Telemetry Anomaly Detection & Adaptive Alert Threshold Simulator
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/saas-launchpad/`
- **Description:** Build a real-time streaming telemetry dashboard on Canvas plotting CPU, memory, and query latency with a rolling window, featuring dynamic standard-deviation anomaly detection that flags spikes and simulates webhook trigger alerts.
- **Implementation Guide:**
  1. In `script.js`, create a streaming multi-series Canvas chart engine rendering 60 rolling data points at 60fps.
  2. Implement a streaming statistical model computing rolling moving averages and Z-scores (`(x - mean) / stdDev`).
  3. When an anomaly ($Z > 2.5$) is detected, draw alert markers, log the incident to an event stream, and trigger notification toasts.
  4. Create a comprehensive unit test suite validating the statistical anomaly model with synthetic test vectors.

#### 15. `[developer-portfolio]` In-Browser Monospace Shell Sandbox with Virtual Hierarchical File System & Command Parser
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/developer-portfolio/`
- **Description:** Build a sandboxed interactive terminal environment supporting command parsing with piping and flags (`ls -la`, `cd`, `cat`, `mkdir`, `rm`, `grep`, `pwd`, `history`, `clear`) running on an in-memory JSON file system tree.
- **Implementation Guide:**
  1. In `script.js`, design a hierarchical file tree structure (`{ "/": { "about.md": "...", "projects": { ... } } }`).
  2. Build a tokenizer and command parser handling arguments, flags (`-l`, `-a`), and standard output piping (`cat projects.txt | grep react`).
  3. Support command history navigation with Up/Down arrow keys and Tab completion for file and directory names.
  4. Write unit tests for path normalization (`cd ../`, absolute paths) and file permissions.

#### 16. `[docs-portal]` Client-Side Interactive GraphQL Query Builder, AST Syntax Highlighter & Response Explorer
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/docs-portal/`
- **Description:** Build a browser-based GraphQL query playground with an interactive schema explorer, autocomplete suggestion pills, query syntax highlighting, variable JSON editor, and instant response tree visualization.
- **Implementation Guide:**
  1. In `script.js`, define an in-memory mock schema containing queryable types (`User`, `Project`, `Issue`, `Leaderboard`).
  2. Implement a client-side recursive query resolver executing parsed GraphQL queries and returning structured JSON data.
  3. Build an AST syntax highlighter that colors field names, arguments, strings, and directives in real time.
  4. Write unit test cases for field selection filtering and variable substitution.

#### 17. `[culinary-bistro]` Interactive 2D Restaurant Floor Plan Table Booking Engine with Real-Time Seat Allocation State Machine
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/culinary-bistro/`
- **Description:** Create an interactive SVG/Canvas restaurant floor plan displaying booth, patio, and main dining tables, with real-time seat availability state management (Available, Reserved, Occupied), party size capacity checking, and reservation booking workflow.
- **Implementation Guide:**
  1. In `script.js`, create an interactive floorplan state machine tracking 12 distinct tables across multiple time slots.
  2. Implement reservation collision detection ensuring tables cannot be double-booked for overlapping dinner seatings.
  3. Validate guest party size against minimum/maximum table seating limits.
  4. Write unit tests verifying state transitions (`AVAILABLE` -> `PENDING` -> `RESERVED` -> `COMPLETED`).

#### 18. `[real-estate-luxe]` Interactive Multi-Level Architectural Blueprint Viewer with Room Measurement Annotator
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/real-estate-luxe/`
- **Description:** Build an architectural blueprint explorer allowing prospective buyers to switch between ground floor, penthouse, and terrace levels, hover to inspect room square footage, and click two points on the floorplan to measure real-world distances with a virtual tape measure tool.
- **Implementation Guide:**
  1. In `script.js`, build an interactive SVG blueprint canvas supporting pan, zoom, and floor level toggling.
  2. Implement an interactive measurement tool calculating Euclidean distance between two clicked points scaled to architectural scale (1px = 0.05m).
  3. Provide interactive room polygon hover highlights displaying dimensions, area in sq ft / sq m, and ceiling height.
  4. Add unit tests verifying Euclidean scale conversions and area calculation math.

#### 19. `[fintech-vault]` Real-Time Rule-Based Financial Fraud Detection State Machine & Threat Scoring Engine
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/fintech-vault/`
- **Description:** Build an in-browser transaction fraud inspection engine analyzing mock banking transactions against configurable heuristic rules (velocity checks, geofencing jumps, unusual amount spikes, blacklisted merchant categories) and outputting risk scores with audit trails.
- **Implementation Guide:**
  1. In `script.js`, implement a modular `FraudDetector` engine evaluating transaction payloads against 5 heuristic rules.
  2. Score transactions on a 0-100 risk score matrix (Green: 0-29, Yellow: 30-69, Red: 70-100) with detailed rule trigger explanations.
  3. Trigger step-up verification modals (e.g. simulated OTP challenge) when high risk is flagged.
  4. Write unit tests for rule scoring, velocity time-window tracking, and composite risk scoring.

#### 20. `[gaming-esports-hub]` Interactive Esports Match Simulator with Real-Time Round-by-Round Tactical Event Log Engine
- **Labels:** `nsoc26`, `level3`, `enhancement`
- **Showcase Path:** `public/showcase/gaming-esports-hub/`
- **Description:** Build a turn-based esports tactical match simulation engine simulating rounds between top teams, calculating dynamic weapon economy, clutch probabilities, objective capture events (Baron/Bomb Plant), and streaming live kill-feed events at variable playback speeds.
- **Implementation Guide:**
  1. In `script.js`, build a deterministic simulation engine computing rounds based on team Elo ratings, economy state (Eco, Force Buy, Full Buy), and individual player momentum.
  2. Stream simulated events into a live event log ticker with customizable playback speeds (1x, 2x, 5x, Instant).
  3. Render round win history timeline bars and economy trajectory charts.
  4. Add unit test suite verifying economy transitions and win-condition evaluations.

---

## 5. Automated Publishing Guide

Batch 8 issues can be published directly to GitHub via the automation script:

```bash
# Preview all 20 issues without creating them (Dry Run)
node scripts/create-batch8-issues.mjs --dry-run

# Publish all 20 issues to GitHub repository (requires GITHUB_TOKEN or gh CLI)
node scripts/create-batch8-issues.mjs
```

