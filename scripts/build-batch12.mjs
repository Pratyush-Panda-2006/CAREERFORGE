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
    featureFile: "state-debugger",
    theme: "In-Browser Time-Travel State Debugger & Event Snapshot Replay Module",
    desc: (p) => `Build an isolated time-travel state recorder for ${p.name} that captures immutable action snapshots, allowing users to step backward/forward in time, view state JSON diffs, and export/import state replays.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/state-debugger.html\` with timeline scrubber controls, action history table, and JSON diff inspector view (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/state-debugger.css\` with dark terminal typography, diff highlight spans (additions green, deletions red), and scrub playhead markers (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/state-debugger.js\` implementing class \`${toPascal(p.slug)}StateDebugger\` with \`recordSnapshot(action, state)\`, \`jumpToStep(index)\`, \`computeDiff(s1, s2)\`, and \`exportReplay()\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/state-debugger.test.mjs\` testing deep state cloning, step indexing boundaries, and diff generation accuracy with node:test (~25 lines).`
    ]
  },
  {
    featureFile: "data-visualizer",
    theme: "Multi-Dimensional SVG Radar Chart & Polar Metrics Visualizer",
    desc: (p) => `Build an autonomous multi-axis polar coordinate radar chart for ${p.name} that plots multi-variable performance metrics, renders polygonal overlay fills, and calculates enclosed polygon areas.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/data-visualizer.html\` with an inline SVG chart canvas, metric value sliders, and dataset toggle checkboxes (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/data-visualizer.css\` styling concentric polar grid webs, glowing polygon fills, and interactive vertex hover tooltips (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/data-visualizer.js\` implementing class \`${toPascal(p.slug)}RadarChart\` with \`polarToCartesian(radius, angleRad)\`, \`generatePolygonPoints(metrics)\`, and \`computeEnclosedArea()\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/data-visualizer.test.mjs\` testing trigonometric coordinate conversions, point string normalization, and area calculation precision (~25 lines).`
    ]
  },
  {
    featureFile: "mock-websocket",
    theme: "Simulated Bi-Directional WebSocket & RPC Streaming Hub",
    desc: (p) => `Build a self-contained WebSocket streaming emulator for ${p.name} that simulates continuous real-time pub/sub telemetry, handles automatic heartbeat pings, and visualizes packet drop rates.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/mock-websocket.html\` with connection status indicators (Connected, Reconnecting, Disconnected), topic subscription pills, and a live message log (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/mock-websocket.css\` with animated pulsing status dots, monospace packet streams, and latency gauge cards (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/mock-websocket.js\` implementing class \`${toPascal(p.slug)}SocketEmulator\` with \`subscribe(channel, handler)\`, \`publish(channel, payload)\`, \`simulateHeartbeat()\`, and \`simulateDropout(durationMs)\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/mock-websocket.test.mjs\` testing channel subscription multiplexing, heartbeat timeouts, and automatic reconnection backoff (~25 lines).`
    ]
  },
  {
    featureFile: "export-receipt",
    theme: "Canvas 2D Branded Graphic Certificate & PNG Receipt Exporter",
    desc: (p) => `Build an independent client-side HTML5 Canvas vector drawing engine for ${p.name} that formats high-DPI branded summary certificates or receipts with custom barcode patterns and instant PNG download.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/export-receipt.html\` with preview canvas viewport, customizable title inputs, and a "Download PNG Receipt" action button (~25 lines).`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/export-receipt.css\` featuring framed canvas shadows, preview magnification toggles, and responsive download toolbar (~35 lines).`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/export-receipt.js\` implementing class \`${toPascal(p.slug)}ReceiptGenerator\` with \`renderCanvas(ctx, data)\`, \`drawBarcode(ctx, code, x, y)\`, and \`downloadBlob(filename)\` (~45 lines).`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/export-receipt.test.mjs\` validating canvas coordinate bounds, barcode parity calculations, and data URL generation (~25 lines).`
    ]
  }
];

function toPascal(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

const allIssues = [];
let issueCounter = 451; // Continuous numbering starting from 451!

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

console.log(`Generated ${allIssues.length} conflict-free issues successfully (IDs 451-600)!`);

// 1. Build BATCH12_ISSUES.md
let md = `# 🚀 CAREERFORGE Batch 12 Issues Catalog: 150 Conflict-Free Level 3 Contributor Tasks (10 Points Each)

**Repository:** \`Pratyush-Panda-2006/CAREERFORGE\`  
**Initiative:** Nexus Spring of Code 2026 (NSoC '26)  
**Batch Scope:** **Strictly Level 3 (10 Points) Tasks Across All 40 Showcase Projects**  
**Catalog Size:** 150 Handcrafted Showcase Enhancements (IDs #451 to #600)  
**Zero-Merge-Conflict Architecture:** Every single task operates in its own **dedicated, isolated file quartet** (e.g. \`[feature].html\`, \`[feature].css\`, \`[feature].js\`, \`[feature].test.mjs\`). Contributors **do not edit shared files** (\`index.html\`, \`styles.css\`, \`script.js\`), eliminating 100% of git merge conflicts!

---

## 📑 Table of Contents
1. [Zero-Merge-Conflict Architecture Guidelines](#1-zero-merge-conflict-architecture-guidelines)
2. [Batch 12 Distribution Matrix (40 Projects)](#2-batch-12-distribution-matrix-40-projects)
3. [Detailed Task Specifications (150 Issues: #451 to #600)](#3-detailed-task-specifications-150-issues)
4. [Automated Publishing & Dry-Run Guide](#4-automated-publishing--dry-run-guide)

---

## 1. Zero-Merge-Conflict Architecture Guidelines

All tasks in Batch 12 are graded at **Level 3 (10 Points)** under Nexus Spring of Code 2026:

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

## 2. Batch 12 Distribution Matrix (40 Projects)

| # | Project Directory | Domain | Assigned Level 3 Tasks |
|---|---|---|---|
`;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  const count = pIdx < 30 ? 4 : 3;
  md += `| ${pIdx + 1} | \`${p.slug}\` | ${p.name} | ${count} Tasks (10 pts each) |\n`;
}

md += `\n---\n\n## 3. Detailed Task Specifications (150 Issues: #451 to #600)\n\n`;

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

Batch 12 issues can be previewed or published to GitHub via the companion script:

\`\`\`bash
# 1. Preview all 150 Batch 12 issues in dry-run mode
node scripts/create-batch12-issues.mjs --dry-run

# 2. Or using npm run script
npm run create-batch12-issues -- --dry-run

# 3. Publish directly to GitHub repository (via GitHub Actions or with GITHUB_TOKEN)
node scripts/create-batch12-issues.mjs
\`\`\`
`;

fs.writeFileSync(path.resolve('BATCH12_ISSUES.md'), md, 'utf-8');
console.log('Successfully written BATCH12_ISSUES.md!');

// 2. Build scripts/create-batch12-issues.mjs
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
  console.log(\`🚀 CAREERFORGE Batch 12 Issue Publisher (NSoC 2026)\`);
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

  console.log(\`\\n✨ Batch 12 Processing Completed (\${issues.length} Issues Processed)!\\n\`);
}

run();
`;

fs.writeFileSync(path.resolve('scripts', 'create-batch12-issues.mjs'), scriptCode, 'utf-8');
console.log('Successfully written scripts/create-batch12-issues.mjs!');
