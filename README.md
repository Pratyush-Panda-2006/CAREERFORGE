# ⚡ CAREERFORGE — Open Source Platform & Isolated Showcase Architecture

[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![CodeQL Security](https://img.shields.io/badge/CodeQL-Active-10B981?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/codeql.yml)
[![PR Guardrails](https://img.shields.io/badge/PR_Guardrails-Enforced-F59E0B?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/pr-guardrails.yml)

> **CAREERFORGE** is a next-generation open-source contribution portal and standalone website showcase platform. Designed around a **Single-Repository Isolated Architecture**, it allows open-source contributors to build, preview, and refine standalone web templates under `public/showcase/` without risk of breaking core platform code.

---

## 🌟 Key Features & Highlights

- 🏢 **Single-Repository Showcase Architecture**: 20 isolated static website project templates hosted in `public/showcase/` with live preview capabilities.
- ⚡ **Zero-Database 24h Leaderboard**: Automated daily synchronization via GitHub Actions (`scripts/generate-leaderboard.mjs`) fetching merged PR metrics and publishing to `public/leaderboard.json`.
- 🔒 **Automated Security Guardrails**: PR scope enforcement (`.github/workflows/pr-guardrails.yml`) preventing unauthorized modifications to core `src/` files and scanning for unsafe code patterns.
- 🛡️ **CodeQL Vulnerability Scanning**: Continuous static application security testing (SAST) for JavaScript & TypeScript.
- 🎨 **Modern Glassmorphic UI**: High-impact, dark-mode design system crafted with Tailwind CSS v4, Lucide icons, and responsive layouts.

---

## 📁 Repository Directory Structure

```text
carrers-frontend/
├── .github/
│   └── workflows/
│       ├── claim-expiry-cron.yml    # 24h Claim Expiration & Auto-Unassign Cron
│       ├── codeql.yml               # CodeQL SAST Security Scanner
│       ├── issue-manager.yml        # First-Time Welcome & /claim Bot
│       ├── leaderboard-sync.yml     # 24h Automated Leaderboard Sync
│       ├── pr-gatekeeper.yml        # Scope Gatekeeper & Auto-Close Action
│       └── pr-guardrails.yml        # Scope Enforcement & Security Check
├── public/
│   ├── leaderboard.json             # Flat-JSON Daily Leaderboard Data
│   └── showcase/                    # 20 Standalone Website Templates
│       ├── ecommerce-store/
│       ├── agency-studio/
│       ├── festival-hub/
│       ├── saas-launchpad/
│       ├── developer-portfolio/
│       ├── docs-portal/
│       ├── culinary-bistro/
│       ├── real-estate-luxe/
│       ├── fintech-vault/
│       ├── gaming-esports-hub/
│       ├── health-vitality/
│       ├── travel-odyssey/
│       ├── edtech-academy/
│       ├── podcast-audio-stream/
│       ├── nonprofit-impact/
│       ├── automotive-hypercar/
│       ├── ai-voice-studio/
│       ├── cybersecurity-sentinel/
│       ├── luxury-realms/
│       └── crypto-exchange-pro/
├── scripts/
│   └── generate-leaderboard.mjs    # Octokit PR Aggregation Script
├── src/
│   ├── components/                 # Core Platform Layout & Navigation
│   ├── pages/                      # Projects, Leaderboard & Certificates
│   └── App.tsx
├── CONTRIBUTING.md                  # Contribution Rules & Guidelines
├── CODE_OF_CONDUCT.md              # Community Standards & Conduct Policy
└── SECURITY.md                      # Security Policy & Vulnerability Disclosure
```

---

## 🚀 20 Standalone Showcase Projects

| Project Slug | Domain / Category | Live Local Preview Path |
|---|---|---|
| `showcase/ecommerce-store` | E-Commerce & Tech Gear | `/showcase/ecommerce-store/index.html` |
| `showcase/agency-studio` | Design Agency & Studio | `/showcase/agency-studio/index.html` |
| `showcase/festival-hub` | Cyber Music Festival | `/showcase/festival-hub/index.html` |
| `showcase/saas-launchpad` | Observability SaaS | `/showcase/saas-launchpad/index.html` |
| `showcase/developer-portfolio` | Terminal Developer Portfolio | `/showcase/developer-portfolio/index.html` |
| `showcase/docs-portal` | API Documentation Portal | `/showcase/docs-portal/index.html` |
| `showcase/culinary-bistro` | French Fine Dining Bistro | `/showcase/culinary-bistro/index.html` |
| `showcase/real-estate-luxe` | Luxury Estate Showcase | `/showcase/real-estate-luxe/index.html` |
| `showcase/fintech-vault` | Decentralized Banking Vault | `/showcase/fintech-vault/index.html` |
| `showcase/gaming-esports-hub` | Pro Esports Arena | `/showcase/gaming-esports-hub/index.html` |
| `showcase/health-vitality` | AI Biomarker Longevity | `/showcase/health-vitality/index.html` |
| `showcase/travel-odyssey` | Curated Expedition Travel | `/showcase/travel-odyssey/index.html` |
| `showcase/edtech-academy` | AI & Systems Academy | `/showcase/edtech-academy/index.html` |
| `showcase/podcast-audio-stream` | Deep Tech Podcast Network | `/showcase/podcast-audio-stream/index.html` |
| `showcase/nonprofit-impact` | Climate Reforestation | `/showcase/nonprofit-impact/index.html` |
| `showcase/automotive-hypercar` | Electric Hypercar Portal | `/showcase/automotive-hypercar/index.html` |
| `showcase/ai-voice-studio` | Voice Cloning Studio | `/showcase/ai-voice-studio/index.html` |
| `showcase/cybersecurity-sentinel` | Zero-Trust SIEM Shield | `/showcase/cybersecurity-sentinel/index.html` |
| `showcase/luxury-realms` | Jet & Island Concierge | `/showcase/luxury-realms/index.html` |
| `showcase/crypto-exchange-pro` | Perpetual DEX Trading | `/showcase/crypto-exchange-pro/index.html` |

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Execution

1. **Clone the repository**:
   ```bash
   git clone https://github.com/prisma-labs/carrers-frontend.git
   cd carrers-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to view the core React platform.  
   Open `http://localhost:5173/showcase/[project-slug]/index.html` to view any static showcase template.

4. **Verify production build**:
   ```bash
   npm run build
   ```

5. **Run manual Leaderboard Sync script**:
   ```bash
   npm run sync-leaderboard
   ```

---

## 🛡️ Security & Contribution Governance

- 📖 **[CONTRIBUTING.md](CONTRIBUTING.md)**: Rules for contributing under `public/showcase/`.
- 📜 **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**: Community standards and harassment-free commitment.
- 🔒 **[SECURITY.md](SECURITY.md)**: Vulnerability disclosure policies and automated security guardrails.

---

## 📄 License

Distributed under the **MIT License**.
