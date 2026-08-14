# 🛠️ Open Source Contribution Guidelines

Welcome to the PRISMA LABS Open Source Contribution Program! We run our community website projects within a single repository using an isolated public showcase architecture.

To ensure stability, safety, and seamless live previews, all contributors must strictly adhere to the following rules:

---

## 🚨 Strict Contribution Rules

### 📌 Rule 1: Core Application Code in `src/` is Strictly Locked
- **DO NOT** modify, reformat, or delete any files inside the `src/` directory.
- The `src/` directory contains the core platform routing, navbar, leaderboard, and showcase hub logic. Pull Requests modifying files in `src/` will be automatically rejected.

### 📌 Rule 2: Website Contributions Belong Exclusively in `public/showcase/`
- All website template contributions, bug fixes, feature additions, and styling updates **MUST** be made exclusively inside their assigned project directory under:
  ```text
  public/showcase/[project-name]/
  ├── index.html
  ├── styles.css
  └── script.js
  ```
- Current 20 isolated website project showcase directories:
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

### 📌 Rule 3: Test Static Templates Locally Before Submitting a PR
- Run the local dev server using Vite before creating a Pull Request:
  ```bash
  npm run dev
  ```
- Open `http://localhost:5173/showcase/[your-project-folder]/index.html` in your browser to test your static HTML/CSS/JS template.
- Ensure all relative paths (images, stylesheets, scripts) work correctly without console errors.

---

## 🚀 How to Submit a Contribution

1. **Fork** the repository and clone it locally.
2. Navigate into your target project directory: `public/showcase/[project-slug]/`.
3. Build or refine your standalone feature (`index.html`, `styles.css`, `script.js`).
4. Commit your changes with a descriptive message (e.g., `feat(ecommerce-store): add cart item counter`).
5. Open a **Pull Request** referencing the issue number (e.g., `Fixes #101`).

Thank you for contributing to PRISMA LABS Open Source! Happy coding! 🚀
