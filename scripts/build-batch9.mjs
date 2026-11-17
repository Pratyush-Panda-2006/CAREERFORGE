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

const issueTemplates = [
  // Template variations ensuring rich, diverse, easy-to-follow tasks
  {
    theme: "Adaptive User Settings & Preference Persistence State Engine",
    desc: (p) => `Build an easy-to-implement client-side state machine in ${p.name} that manages personalized user settings (e.g. view layout preferences, sound cues, high-contrast modes, metric units) with LocalStorage persistence and reset capabilities.`,
    html: (p) => `Add a modern "#${p.slug}-preferences-modal" drawer with toggle switches, custom select dropdowns, and an export configuration button.`,
    css: (p) => `Style modal with backdrop-blur, smooth cubic-bezier slide transitions, glowing radio toggles, and responsive padding.`,
    js: (p) => `Create a class \`${toPascal(p.slug)}PreferenceManager\` with methods \`load()\`, \`save(key, val)\`, \`resetDefaults()\`, and \`exportJSON()\`.`,
    test: (p) => `Write unit tests verifying default fallback values, valid JSON export strings, and persistence integrity.`
  },
  {
    theme: "Dynamic Search, Tag Filtering & Multi-Column Sorting Engine",
    desc: (p) => `Implement a high-performance in-memory filtering and multi-attribute sorting engine for ${p.name} that lets visitors quickly search items, filter by multiple tag chips, and sort ascending/descending with zero latency.`,
    html: (p) => `Add search input with clear button, filter chip row, and multi-option sort dropdown in the primary showcase view.`,
    css: (p) => `Style search input bar with active focus ring, animated pill tag chips, and subtle empty-state alert card.`,
    js: (p) => `Implement \`${toPascal(p.slug)}FilterEngine\` with methods \`filterByKeyword(query)\`, \`toggleTag(tag)\`, and \`sort(field, direction)\`.`,
    test: (p) => `Write unit tests confirming case-insensitive matching, compound tag filtering, and ascending/descending sorting precision.`
  },
  {
    theme: "Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer",
    desc: (p) => `Build an interactive telemetry visualizer in ${p.name} that dynamically draws live performance curves, historical trends, and interactive hover tooltips using HTML5 Canvas or inline SVG.`,
    html: (p) => `Add a canvas element \`#${p.slug}-telemetry-canvas\` with hover coordinate overlay and time-window selector buttons (1H, 24H, 7D).`,
    css: (p) => `Format container with dark glassmorphic border, glowing gradient line strokes, and floating tooltip cursor styling.`,
    js: (p) => `Create \`${toPascal(p.slug)}TelemetryVisualizer\` handling automated data points smoothing, canvas path rendering, and mouse event coordinate tracking.`,
    test: (p) => `Write unit tests validating math interpolation, min/max coordinate bounding, and data normalization (0.0 to 1.0).`
  },
  {
    theme: "Client-Side Export Engine & Formatted Summary Report Generator",
    desc: (p) => `Implement an export engine for ${p.name} that serializes the current view state into downloadable formats (JSON, CSV, and clean text audit summary) with automated file downloading.`,
    html: (p) => `Add export dropdown menu with options: "Download JSON Data", "Export CSV Table", and "Copy Markdown Audit".`,
    css: (p) => `Style dropdown popover with subtle drop-shadow, active hover state highlights, and icon adornments.`,
    js: (p) => `Implement \`${toPascal(p.slug)}ExportEngine\` with \`toJSONBlob()\`, \`toCSVString()\`, and \`triggerDownload(filename, blob)\`.`,
    test: (p) => `Write unit tests verifying CSV escaping of commas and quotes, valid JSON structure, and correct file MIME types.`
  }
];

function toPascal(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

const allIssues = [];
let issueCounter = 1;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  // 30 projects get 4 issues each (120), remaining 10 get 3 issues each (30) => total 150!
  const issuesForProject = pIdx < 30 ? 4 : 3;

  for (let i = 0; i < issuesForProject; i++) {
    const t = issueTemplates[i % issueTemplates.length];
    const issueNum = issueCounter++;
    
    allIssues.push({
      id: issueNum,
      project: p.slug,
      projectName: p.name,
      level: "level3",
      points: "10 Points",
      labels: ["nsoc26", "level3", "enhancement"],
      title: `[${p.slug}] Implement ${t.theme.toLowerCase()}`,
      description: t.desc(p),
      suggestions: [
        `HTML Structure: In \`public/showcase/${p.slug}/index.html\`, ${t.html(p)} (~20 lines of clean semantic markup).`,
        `Styling & UI: In \`public/showcase/${p.slug}/styles.css\`, ${t.css(p)} (~30 lines of modern glassmorphic CSS).`,
        `Core Logic: In \`public/showcase/${p.slug}/script.js\`, ${t.js(p)} (~45 lines of well-documented ES6 code).`,
        `Unit Verification: In \`public/showcase/${p.slug}/${p.slug.split('-')[0]}-feature-${i + 1}.test.mjs\`, ${t.test(p)} (~25 lines of node:test code).`
      ],
      codeRequirement: "Minimum 100+ lines of clean, structured code across HTML, CSS, JS, and test file."
    });
  }
}

console.log(`Generated ${allIssues.length} issues successfully!`);

// 1. Build BATCH9_ISSUES.md
let md = `# 🚀 CAREERFORGE Batch 9 Issues Catalog: 150 Level 3 Contributor Tasks (10 Points Each)

**Repository:** \`Pratyush-Panda-2006/CAREERFORGE\`  
**Initiative:** Nexus Spring of Code 2026 (NSoC '26)  
**Batch Scope:** **Strictly Level 3 (10 Points) Tasks Across All 40 Projects**  
**Catalog Size:** 150 Handcrafted Showcase Enhancements  
**Design Philosophy:** Easy to understand, modular, step-by-step guidance requiring a **minimum of 100 lines of code** across HTML, CSS, JS, and test files.

---

## 📑 Table of Contents
1. [Scoring & Contribution Guidelines](#1-scoring--contribution-guidelines)
2. [Batch 9 Distribution Matrix (40 Projects)](#2-batch-9-distribution-matrix-40-projects)
3. [Detailed Task Specifications (150 Issues)](#3-detailed-task-specifications-150-issues)
4. [Automated Publishing & Dry-Run Guide](#4-automated-publishing--dry-run-guide)

---

## 1. Scoring & Contribution Guidelines

All tasks in Batch 9 award the maximum point value under Nexus Spring of Code 2026:

| Tier | Label | Points | Code Footprint | Requirements |
| :---: | :---: | :---: | :---: | :--- |
| **Level 3** | \`level3\` | **10 Points** | **≥ 100 lines** | Easy-to-follow modular architecture: UI markup (~20 lines), CSS styles (~30 lines), Core logic (~45 lines), Unit test (~25 lines). |

> [!TIP]
> - All contributions must reside exclusively within their assigned project folder under \`public/showcase/[project-slug]/\`.
> - Contributors can add **1 or more HTML, CSS, and JavaScript files** (e.g. sub-pages, stylesheets, ES modules, test files).
> - Never modify files in \`src/\`, \`package.json\`, or top-level project configs.

---

## 2. Batch 9 Distribution Matrix (40 Projects)

| # | Project Directory | Domain | Assigned Level 3 Tasks |
|---|---|---|---|
`;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  const count = pIdx < 30 ? 4 : 3;
  md += `| ${pIdx + 1} | \`${p.slug}\` | ${p.name} | ${count} Tasks (10 pts each) |\n`;
}

md += `\n---\n\n## 3. Detailed Task Specifications (150 Issues)\n\n`;

for (const item of allIssues) {
  md += `#### ${item.id}. \`[${item.project}]\` ${item.title.replace(`[${item.project}] `, '')}\n`;
  md += `- **Labels:** \`${item.labels.join('`, `')}\`\n`;
  md += `- **Showcase Path:** \`public/showcase/${item.project}/\`\n`;
  md += `- **Points:** **${item.points}** (Level 3)\n`;
  md += `- **Code Requirement:** **${item.codeRequirement}**\n`;
  md += `- **Description:** ${item.description}\n`;
  md += `- **Step-by-Step Implementation Guide:**\n`;
  for (const s of item.suggestions) {
    md += `  - ${s}\n`;
  }
  md += `\n`;
}

md += `---

## 4. Automated Publishing & Dry-Run Guide

Batch 9 issues can be validated or published directly to GitHub via the automation script:

\`\`\`bash
# 1. Preview all 150 issues in dry-run mode
node scripts/create-batch9-issues.mjs --dry-run

# 2. Or using npm run script
npm run create-batch9-issues -- --dry-run

# 3. Publish directly to GitHub repository (requires GITHUB_TOKEN or gh CLI)
node scripts/create-batch9-issues.mjs
\`\`\`
`;

fs.writeFileSync(path.resolve('BATCH9_ISSUES.md'), md, 'utf-8');
console.log('Successfully written BATCH9_ISSUES.md!');

// 2. Build scripts/create-batch9-issues.mjs
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

const owner = "Pratyush-Panda-2006";
const repo = "CAREERFORGE";

export const issues = ${JSON.stringify(allIssues, null, 2)};

function formatBody(item) {
  const guide = item.suggestions.map((s, idx) => (idx + 1) + '. ' + s).join('\\n');
  return '### 🌸 Nexus Spring of Code 2026 (NSoC \\'26) — Issue Specification\\n\\n' +
    '**Target Showcase Directory:** \`public/showcase/' + item.project + '/\`\\n' +
    '**Difficulty Tier:** **Level 3 (Advanced / Core Feature)**\\n' +
    '**Award Value:** **' + item.points + '**\\n' +
    '**Required Code Size:** **' + item.codeRequirement + '**\\n\\n' +
    '---\\n\\n' +
    '### 📋 Task Overview\\n' +
    item.description + '\\n\\n' +
    '---\\n\\n' +
    '### 🛠️ Step-by-Step Implementation Guide\\n' +
    guide + '\\n\\n' +
    '---\\n\\n' +
    '### 🚨 Strict Contribution Guardrails\\n' +
    '- **Scope Restriction:** All code changes **MUST** reside exclusively inside \`public/showcase/' + item.project + '/\`.\\n' +
    '- **Flexible Files:** You may add 1 or more HTML, CSS, JavaScript, and test files inside your project folder.\\n' +
    '- **Protected Core:** Never modify, reformat, or alter files in \`src/\`, \`package.json\`, \`.github/\`, or top-level configs.\\n' +
    '- **PR Description Keyword:** Ensure your PR description includes a closing keyword referencing this issue (e.g. \`Closes #<issue-id>\` or \`Fixes #<issue-id>\`).\\n' +
    '- **Claiming:** Reply with \`/claim\` to be assigned (3-day timer).\\n\\n' +
    'Happy Coding! 🚀';
}

async function run() {
  console.log(\`\\n======================================================\`);
  console.log(\`🚀 CAREERFORGE Batch 9 Issue Publisher (NSoC 2026)\`);
  console.log(\`   Total Issues in Batch: \${issues.length} (100% Level 3 Tasks)\`);
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
      try {
        const { data: created } = await octokit.rest.issues.create({
          owner,
          repo,
          title: item.title,
          body,
          labels: item.labels
        });
        console.log(\`✅ [\${i + 1}/\${issues.length}] Created Issue #\${created.number}: \${item.title}\`);
        // Delay to avoid secondary rate limit
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(\`❌ Failed to create issue "\${item.title}":\`, err.message);
      }
    }
  }

  console.log(\`\\n✨ Batch 9 Processing Completed (\${issues.length} Issues Processed)!\\n\`);
}

run();
`;

fs.writeFileSync(path.resolve('scripts', 'create-batch9-issues.mjs'), scriptCode, 'utf-8');
console.log('Successfully written scripts/create-batch9-issues.mjs!');
