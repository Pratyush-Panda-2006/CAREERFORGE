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

const modularTemplates = [
  {
    featureFile: "audit-trail",
    theme: "Autonomous State History & Cryptographic Audit Trail Module",
    desc: (p) => `Build an isolated audit log module in ${p.name} that records system events, calculates SHA-256 hash chains for tamper evidence, and displays an exportable timeline in a dedicated sub-view.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/audit-trail.html\` with an isolated event feed container, filter controls, and integrity verification badge (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/audit-trail.css\` styling the chronological timeline, hash chips, and status glow indicators (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/audit-trail.js\` implementing class \`${toPascal(p.slug)}AuditChain\` with methods \`recordEvent(action, payload)\`, \`computeHash(block)\`, and \`verifyChainIntegrity()\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/audit-trail.test.mjs\` testing hash generation, sequence verification, and tamper detection with node:test (~25 lines).`
    ]
  },
  {
    featureFile: "benchmark-suite",
    theme: "Client-Side Stress Testing & Telemetry Benchmark Engine",
    desc: (p) => `Create a standalone performance benchmarking sub-module for ${p.name} that evaluates client-side frame throughput, memory footprint, and operation latency under simulated load spikes.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/benchmark-suite.html\` with a live FPS meter, iteration counter, and run/stop execution buttons (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/benchmark-suite.css\` featuring performance gauge cards, latency bars, and dark glassmorphic styling (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/benchmark-suite.js\` exporting \`${toPascal(p.slug)}BenchmarkSuite\` with \`runThroughputTest(iterations)\`, \`measureLatency()\`, and \`getSummaryMetrics()\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/benchmark-suite.test.mjs\` asserting percentile calculations (P50, P95, P99) and benchmark bounds (~25 lines).`
    ]
  },
  {
    featureFile: "offline-sync",
    theme: "Resilient Offline Data Persistence & Conflict-Free Queue Engine",
    desc: (p) => `Implement an independent offline sync module for ${p.name} that queues state mutations during network dropouts and reconciles with simulated cloud backends using deterministic vector clocks.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/offline-sync.html\` displaying connection state badges, queued request tables, and a manual "Sync Now" trigger (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/offline-sync.css\` with network pulse indicators, amber warning badges for pending items, and responsive card layouts (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/offline-sync.js\` implementing \`${toPascal(p.slug)}SyncQueue\` with \`enqueue(mutation)\`, \`flushQueue()\`, and \`resolveConflict(local, remote)\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/offline-sync.test.mjs\` verifying queue FIFO ordering, serialization integrity, and retry backoff timers (~25 lines).`
    ]
  },
  {
    featureFile: "widget-embed",
    theme: "Portable Embeddable Component & Iframe PostMessage Communication Bridge",
    desc: (p) => `Build a zero-dependency embeddable widget sub-module for ${p.name} that can be embedded into third-party parent applications with bi-directional postMessage communication and theme propagation.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/widget-embed.html\` containing a compact standalone widget view with parent-listener readiness scripts (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/widget-embed.css\` with auto-scaling layout units, minimal border footprint, and dynamic accent theme classes (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/widget-embed.js\` implementing \`${toPascal(p.slug)}WidgetBridge\` with \`postToParent(event, data)\`, \`onParentMessage(listener)\`, and \`setTheme(themeObj)\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/widget-embed.test.mjs\` asserting origin validation, message payload validation, and event dispatcher reliability (~25 lines).`
    ]
  }
];

function toPascal(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

const allIssues = [];
let issueCounter = 151; // Continuous numbering starting from 151!

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  // 30 projects get 4 issues (120), 10 projects get 3 issues (30) => total 150!
  const count = pIdx < 30 ? 4 : 3;

  for (let i = 0; i < count; i++) {
    const t = modularTemplates[i % modularTemplates.length];
    const issueNum = issueCounter++;

    allIssues.push({
      id: issueNum,
      project: p.slug,
      projectName: p.name,
      level: "level3",
      points: "10 Points",
      labels: ["nsoc26", "level3", "enhancement"],
      title: `[${p.slug}] Implement ${t.theme.toLowerCase()} in dedicated modular files`,
      description: t.desc(p),
      featureFile: t.featureFile,
      suggestions: t.guide(p),
      zeroConflictGuarantee: `Zero-Merge-Conflict Guarantee: This task is implemented strictly in its own isolated files (\`${t.featureFile}.html\`, \`${t.featureFile}.css\`, \`${t.featureFile}.js\`, \`${t.featureFile}.test.mjs\`). Do not modify common files (index.html, styles.css, script.js) to guarantee 100% conflict-free merging!`,
      codeRequirement: "Minimum 100+ lines of clean, structured code across dedicated HTML, CSS, JS, and test file."
    });
  }
}

console.log(`Generated ${allIssues.length} conflict-free issues successfully (IDs 151-300)!`);

// 1. Build BATCH10_ISSUES.md
let md = `# 🚀 CAREERFORGE Batch 10 Issues Catalog: 150 Conflict-Free Level 3 Contributor Tasks (10 Points Each)

**Repository:** \`Pratyush-Panda-2006/CAREERFORGE\`  
**Initiative:** Nexus Spring of Code 2026 (NSoC '26)  
**Batch Scope:** **Strictly Level 3 (10 Points) Tasks Across All 40 Showcase Projects**  
**Catalog Size:** 150 Handcrafted Showcase Enhancements  
**Zero-Merge-Conflict Architecture:** Every single task operates in its own **dedicated, isolated file quartet** (e.g. \`[feature].html\`, \`[feature].css\`, \`[feature].js\`, \`[feature].test.mjs\`). Contributors **do not edit shared files** (\`index.html\`, \`styles.css\`, \`script.js\`), eliminating 100% of git merge conflicts!

---

## 📑 Table of Contents
1. [Zero-Merge-Conflict Architecture Guidelines](#1-zero-merge-conflict-architecture-guidelines)
2. [Batch 10 Distribution Matrix (40 Projects)](#2-batch-10-distribution-matrix-40-projects)
3. [Detailed Task Specifications (150 Issues: #151 to #300)](#3-detailed-task-specifications-150-issues)
4. [Automated Publishing & Dry-Run Guide](#4-automated-publishing--dry-run-guide)

---

## 1. Zero-Merge-Conflict Architecture Guidelines

All tasks in Batch 10 are graded at **Level 3 (10 Points)** under Nexus Spring of Code 2026:

| Tier | Label | Points | Code Footprint | Conflict Prevention Strategy |
| :---: | :---: | :---: | :---: | :--- |
| **Level 3** | \`level3\` | **10 Points** | **≥ 100 lines** | **Isolated File Quartet**: Build in dedicated files without touching shared core files. |

### 🛡️ Why Contributors Face ZERO Merge Conflicts:
- **No Shared File Contention:** Tasks do not modify existing shared files (\`index.html\`, \`styles.css\`, \`script.js\`).
- **Dedicated Unique Filenames:** Every task specifies its own dedicated files under \`public/showcase/[project-slug]/\`:
  - \`[feature-name].html\` (UI View)
  - \`[feature-name].css\` (Styles)
  - \`[feature-name].js\` (Modular Logic)
  - \`[feature-name].test.mjs\` (Unit Test)
- **Instant Concurrent Merges:** Because each PR introduces new distinct files, dozens of contributors can submit and merge PRs concurrently with zero merge conflicts!

---

## 2. Batch 10 Distribution Matrix (40 Projects)

| # | Project Directory | Domain | Assigned Level 3 Tasks |
|---|---|---|---|
`;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  const count = pIdx < 30 ? 4 : 3;
  md += `| ${pIdx + 1} | \`${p.slug}\` | ${p.name} | ${count} Tasks (10 pts each) |\n`;
}

md += `\n---\n\n## 3. Detailed Task Specifications (150 Issues: #151 to #300)\n\n`;

for (const item of allIssues) {
  md += `#### ${item.id}. \`[${item.project}]\` ${item.title.replace(`[${item.project}] `, '')}\n`;
  md += `- **Labels:** \`${item.labels.join('`, `')}\`\n`;
  md += `- **Showcase Path:** \`public/showcase/${item.project}/\`\n`;
  md += `- **Points:** **${item.points}** (Level 3)\n`;
  md += `- **Code Requirement:** **${item.codeRequirement}**\n`;
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

Batch 10 issues can be previewed or published to GitHub via the companion script:

\`\`\`bash
# 1. Preview all 150 Batch 10 issues in dry-run mode
node scripts/create-batch10-issues.mjs --dry-run

# 2. Or using npm run script
npm run create-batch10-issues -- --dry-run

# 3. Publish directly to GitHub repository (via GitHub Actions or with GITHUB_TOKEN)
node scripts/create-batch10-issues.mjs
\`\`\`
`;

fs.writeFileSync(path.resolve('BATCH10_ISSUES.md'), md, 'utf-8');
console.log('Successfully written BATCH10_ISSUES.md!');

// 2. Build scripts/create-batch10-issues.mjs
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

let octokit = null;
if (token && !isDryRun) {
  try {
    const { Octokit } = await import("@octokit/rest");
    octokit = new Octokit({ auth: token });
  } catch {
    console.warn("⚠️ @octokit/rest not found. Ensure dependencies are installed.");
  }
}

const repoEnv = process.env.GITHUB_REPOSITORY || "Pratyush-Panda-2006/CAREERFORGE";
const [owner, repo] = repoEnv.split("/");

export const issues = ${JSON.stringify(allIssues, null, 2)};

function formatBody(item) {
  const guide = item.suggestions.map((s, idx) => (idx + 1) + '. ' + s).join('\\n');
  return '### 🌸 Nexus Spring of Code 2026 (NSoC \\'26) — Issue Specification\\n\\n' +
    '**Target Showcase Directory:** \`public/showcase/' + item.project + '/\`\\n' +
    '**Difficulty Tier:** **Level 3 (Advanced / Core Feature)**\\n' +
    '**Award Value:** **' + item.points + '**\\n' +
    '**Required Code Size:** **' + item.codeRequirement + '**\\n\\n' +
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
  console.log(\`🚀 CAREERFORGE Batch 10 Issue Publisher (NSoC 2026)\`);
  console.log(\`   Total Issues in Batch: \${issues.length} (100% Level 3 Zero-Conflict Tasks)\`);
  console.log(\`   Mode: \${isDryRun || !octokit ? "DRY-RUN (Preview Only)" : "LIVE PUBLISH"}\`);
  console.log(\`======================================================\\n\`);

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    const body = formatBody(item);

    if (isDryRun || !octokit) {
      console.log(\`[DRY-RUN] [\${i + 1}/\${issues.length}] \${item.title}\`);
      console.log(\`          Labels: \${item.labels.join(", ")} | Points: \${item.points}\`);
      console.log(\`          Path: public/showcase/\${item.project}/\`);
      console.log(\`------------------------------------------------------\`);
    } else {
      let success = false;
      let retries = 0;
      while (!success && retries < 3) {
        try {
          const { data: created } = await octokit.rest.issues.create({
            owner,
            repo,
            title: item.title,
            body,
            labels: item.labels
          });
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

  console.log(\`\\n✨ Batch 10 Processing Completed (\${issues.length} Issues Processed)!\\n\`);
}

run();
`;

fs.writeFileSync(path.resolve('scripts', 'create-batch10-issues.mjs'), scriptCode, 'utf-8');
console.log('Successfully written scripts/create-batch10-issues.mjs!');
