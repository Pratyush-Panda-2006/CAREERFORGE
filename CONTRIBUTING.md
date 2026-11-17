# 🛠️ Open Source Contribution Guidelines

Welcome to the CAREERFORGE Open Source Contribution Program! We run our community website projects within a single repository using an isolated public showcase architecture.

---

## 🌸 Nexus Spring of Code (NSoC '26) Participation

CAREERFORGE is an official participating organization in the **Nexus Spring of Code (NSoC 2026)**.

### 🏷️ Mandatory Labels and Points Structure
Every task and contribution is graded under the official NSoC scoring system:

| Label | Points | Used for |
| :--- | :--- | :--- |
| `nsoc26` | **Mandatory tag** | Every NSoC issue and PR |
| `level1` | **3 points** | Documentation, typo fixes and other small work |
| `level2` | **5 points** | UI and frontend work: layouts, components, styling and page-level changes |
| `level3` | **10 points** | Core logic, database changes and complex features |

- The **`nsoc26`** tag is automatically added to all issues and PRs by our CI automation bots.
- Issues will have their difficulty assigned by maintainers (`level1`, `level2`, or `level3`).

### 🎯 Issue Claiming
- Reply with **`/claim`** on any unassigned issue to assign yourself.
- **3-Day (72h) Deadline:** Once assigned, you have 72 hours to submit a linked Pull Request. If inactive, the claim automatically expires via cron.

---

## 🚨 Strict Contribution Rules

### 📌 Rule 1: Core Application Code in `src/` is Strictly Locked
- **DO NOT** modify, reformat, or delete any files inside the `src/` directory.
- The `src/` directory contains the core platform routing, navbar, leaderboard, and showcase hub logic. Pull Requests modifying files in `src/` will be automatically rejected.

### 📌 Rule 2: Website Contributions Belong Exclusively in `public/showcase/`
- All website template contributions, bug fixes, feature additions, and styling updates **MUST** be made exclusively inside their assigned project directory under `public/showcase/[project-name]/`.
- **Flexible Multi-File Architecture:** Contributors can add **one or more HTML, CSS, and JavaScript files** (e.g. `index.html`, sub-pages, modular CSS stylesheets, ES modules, helper scripts, unit tests `*.test.mjs`, and assets):
  ```text
  public/showcase/[project-name]/
  ├── index.html                   # Primary entry point
  ├── [sub-page].html              # Additional HTML sub-pages (optional)
  ├── styles.css                   # Main stylesheet
  ├── [module].css                 # Additional CSS stylesheets (optional)
  ├── script.js                    # Primary logic script
  ├── [utils].js                   # Modular JS / ES modules (optional)
  └── [feature].test.mjs           # Unit tests (optional, run via node --test)
  ```
- Current 40 isolated website project showcase directories:
  1. `public/showcase/ecommerce-store/` — Tech gear & e-commerce shop
  2. `public/showcase/agency-studio/` — Creative studio & design agency
  3. `public/showcase/festival-hub/` — Electronic music & cyber festival
  4. `public/showcase/saas-launchpad/` — AI observability SaaS landing page
  5. `public/showcase/developer-portfolio/` — Terminal-inspired developer portfolio
  6. `public/showcase/docs-portal/` — API documentation portal
  7. `public/showcase/culinary-bistro/` — French artisanal bistro & menu
  8. `public/showcase/real-estate-luxe/` — Architectural luxury real estate
  9. `public/showcase/fintech-vault/` — Decentralized wealth & banking platform
  10. `public/showcase/gaming-esports-hub/` — Pro esports tournament arena
  11. `public/showcase/health-vitality/` — AI-powered health longevity dashboard
  12. `public/showcase/travel-odyssey/` — Curated expedition travel portal
  13. `public/showcase/edtech-academy/` — AI & systems learning academy
  14. `public/showcase/podcast-audio-stream/` — Deep tech podcast network
  15. `public/showcase/nonprofit-impact/` — Reforestation & climate alliance
  16. `public/showcase/automotive-hypercar/` — Electric hypercar concept portal
  17. `public/showcase/ai-voice-studio/` — Realtime AI voice cloning studio
  18. `public/showcase/cybersecurity-sentinel/` — Zero-trust threat shield platform
  19. `public/showcase/luxury-realms/` — Private island & jet concierge
  20. `public/showcase/crypto-exchange-pro/` — Sub-millisecond crypto perpetual DEX
  21. `public/showcase/aerospace-orbiter/` — Mission control & orbital mechanics hub
  22. `public/showcase/quantum-forge/` — Quantum circuit & qubit state simulator
  23. `public/showcase/biotech-genomics/` — CRISPR-Cas9 & DNA sequence workbench
  24. `public/showcase/smart-iot-nexus/` — Industrial IoT sensor matrix & telemetry
  25. `public/showcase/defi-yield-matrix/` — DeFi liquidity & compounding APY optimizer
  26. `public/showcase/virtual-museum-3d/` — Curated antiquities & 3D artifact gallery
  27. `public/showcase/renewable-microgrid/` — Clean energy microgrid load balancer
  28. `public/showcase/vr-metaverse-hub/` — WebXR spatial computing lounge & digital hub
  29. `public/showcase/supply-chain-logistics/` — Global intermodal freight & shipping tracker
  30. `public/showcase/robotics-automata/` — Robotic arm inverse kinematics simulator
  31. `public/showcase/neurotech-interface/` — Neural EEG waveform monitor & cognitive BCI
  32. `public/showcase/weather-radar-atlas/` — Severe weather Doppler radar & barometrics
  33. `public/showcase/streaming-cinema-hub/` — Indie cinema & 4K watch party lounge
  34. `public/showcase/fitness-crossfit-pro/` — Functional HIIT & calorie expenditure tracker
  35. `public/showcase/charity-microloans/` — Global peer-to-peer microfinance network
  36. `public/showcase/drone-delivery-skyway/` — Autonomous urban drone air corridor manager
  37. `public/showcase/music-daw-studio/` — 16-step drum sequencer & polyphonic synthesizer
  38. `public/showcase/pet-adoption-haven/` — Animal rescue & foster matching network
  39. `public/showcase/legal-smart-contracts/` — Smart contract clause & escrow milestone machine
  40. `public/showcase/agritech-precision-farming/` — Precision agriculture & drone crop telemetry

### 📌 Rule 3: Test Static Templates Locally Before Submitting a PR
- Run the local dev server using Vite before creating a Pull Request:
  ```bash
  npm run dev
  ```
- Open `http://localhost:5173/showcase/[your-project-folder]/index.html` in your browser to test your static HTML/CSS/JS template.
- Ensure all relative paths (images, stylesheets, scripts) work correctly without console errors.

### 📌 Rule 4: Mandatory Linked Issue Reference
- Every Pull Request description **MUST** reference a tracked issue using keywords like `Closes #101`, `Fixes #12`, or `Resolves #5`. Unlinked PRs will fail automated validation.

### 📌 Rule 5: One Project Folder Per Pull Request
- All modified files in a PR **MUST** belong to **exactly one** showcase directory under `public/showcase/`. Modifying files across multiple showcase projects in a single PR is strictly prohibited.

### 📌 Rule 6: Asset & File Size Guardian (Max 5MB / 15MB)
- Individual asset files must not exceed **5 MB**.
- Total aggregate asset changes across the PR must not exceed **15 MB**. Compress high-resolution media before submitting.

### 📌 Rule 7: Sync with Upstream & Resolving Merge Conflicts
When multiple contributors work on features within the same showcase project, merge conflicts can occur if another PR merges into `main` before yours.
- **Always keep your branch updated with upstream `main`:**
  ```bash
  # 1. Add upstream if not already added
  git remote add upstream https://github.com/Pratyush-Panda-2006/CAREERFORGE.git

  # 2. Fetch the latest upstream changes
  git fetch upstream

  # 3. Rebase your feature branch on upstream main
  git rebase upstream/main
  ```
- **If GitHub flags "This branch has conflicts that must be resolved":**
  - **Option A (GitHub Web):** Click the **"Resolve conflicts"** button on your PR, edit the conflicting lines, and click **"Mark as resolved"** -> **"Commit merge"**.
  - **Option B (Local Terminal):** Run `git rebase upstream/main`, manually edit the files to resolve conflicts, stage them with `git add <file>`, run `git rebase --continue`, and update your PR with `git push --force-with-lease origin <branch-name>`.

---

## 🚀 How to Submit a Contribution

1. **Fork** the repository and clone it locally.
2. Navigate into your target project directory: `public/showcase/[project-slug]/`.
3. Build or refine your standalone feature (`index.html`, `styles.css`, `script.js`).
4. Commit your changes with a descriptive message (e.g., `feat(ecommerce-store): add cart item counter`).
5. Open a **Pull Request** referencing the issue number (e.g., `Fixes #101`).

Thank you for contributing to CAREERFORGE Open Source! Happy coding! 🚀
