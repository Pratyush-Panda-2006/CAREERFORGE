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

function toPascal(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

// Level 2 Templates (5 Points - Intermediate / UI, Interactive Tools & Visualizers)
const level2Templates = [
  {
    featureFile: "interaction-heatmap",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Interactive Cursor Heatmap & Activity Density Visualizer",
    desc: (p) => `Build an isolated cursor interaction and click frequency heatmap overlay for ${p.name} that aggregates pointer coordinates, computes spatial density kernels, and renders real-time thermal gradient overlays across the viewport.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/interaction-heatmap.html\` with toggle heatmap overlay button, opacity slider, clear heat-points control, and coordinate readout badge.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/interaction-heatmap.css\` styling the transparent canvas overlay, floating controls dock, and radial thermal gradient effects.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/interaction-heatmap.js\` implementing class \`${toPascal(p.slug)}HeatmapTracker\` with \`recordPoint(x, y, weight)\`, \`renderHeatmap(canvas)\`, and \`resetData()\`.`
    ]
  },
  {
    featureFile: "smart-clipboard",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Multi-Item Clipboard Stack & Smart Paste History Drawer",
    desc: (p) => `Build an isolated multi-entry clipboard history stack for ${p.name} that intercepts copy events, categorizes copied text/code snippets by format, provides quick preview drawer, and enables single-click re-copy.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/smart-clipboard.html\` with sliding drawer trigger, snippet search input, category chip filters, and history item list.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/smart-clipboard.css\` with smooth slide-over drawer animations, syntax-themed snippet cards, and copy success feedback tooltips.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/smart-clipboard.js\` implementing class \`${toPascal(p.slug)}ClipboardVault\` with \`pushItem(text, type)\`, \`filterItems(query)\`, and \`copyToClipboard(id)\`.`
    ]
  },
  {
    featureFile: "command-palette",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Fuzzy Search Quick-Action Command Palette (Cmd+K / Ctrl+K)",
    desc: (p) => `Build an accessible, keyboard-navigable command palette modal for ${p.name} supporting fast fuzzy search, categorized action groups, keyboard arrow navigation, and shortcut execution.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/command-palette.html\` with modal overlay container, search input with Cmd+K hint, categorized results container, and keyboard navigation helper footer.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/command-palette.css\` styling dark glassmorphic modal dialog, active keyboard cursor focus, and keyboard badge pills.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/command-palette.js\` implementing class \`${toPascal(p.slug)}CommandPalette\` with \`registerAction(id, label, category, handler)\`, \`fuzzySearch(query)\`, and \`executeSelected()\`.`
    ]
  },
  {
    featureFile: "audio-synthesizer",
    level: "level2",
    points: "5 Points",
    labels: ["nsoc26", "level2", "enhancement"],
    theme: "Web Audio UI Sound Effects & Chime Synthesizer",
    desc: (p) => `Build an independent programmatic UI audio chime synthesizer for ${p.name} using the HTML5 Web Audio API, generating synthetic interactive tones for button clicks, success confirmations, warning beeps, and navigation transitions without external audio files.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/audio-synthesizer.html\` with audio volume control slider, sound toggle mute switch, soundboard preview buttons, and frequency oscilloscope visualizer.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/audio-synthesizer.css\` styling interactive soundboard trigger buttons, volume slider track, and pulsating sound wave animations.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/audio-synthesizer.js\` implementing class \`${toPascal(p.slug)}SoundSynthesizer\` with \`playTone(freq, type, duration)\`, \`playSuccessChime()\`, \`playErrorBuzzer()\`, and \`setVolume(level)\`.`
    ]
  }
];

// Level 3 Templates (10 Points - Advanced / Algorithms, State Machines, Cryptography & Engines)
const level3Templates = [
  {
    featureFile: "merkle-verifier",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Merkle Tree Data Integrity & Cryptographic Proof Verification Engine",
    desc: (p) => `Build an isolated cryptographic Merkle tree engine for ${p.name} that calculates SHA-256 leaf hashes, builds balanced binary hash trees, generates cryptographic audit paths, and verifies inclusion proofs in sub-millisecond execution time.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/merkle-verifier.html\` with dataset input container, tree depth visualizer, proof verification status card, and tamper simulation button.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/merkle-verifier.css\` with hierarchical node connector lines, root hash status pills, and verified/tampered color highlights.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/merkle-verifier.js\` implementing class \`${toPascal(p.slug)}MerkleEngine\` with \`buildTree(dataArray)\`, \`getRootHash()\`, \`generateProof(index)\`, and \`verifyProof(leaf, proof, root)\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/merkle-verifier.test.mjs\` verifying binary tree calculation, correct proof validation, and tamper detection on modified leaf data using node:test.`
    ]
  },
  {
    featureFile: "priority-queue",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Binary Heap Priority Event Queue & Backpressure Dispatcher",
    desc: (p) => `Build an in-memory priority queue and asynchronous rate-controlled event dispatcher for ${p.name} implementing a binary min-heap / max-heap, token-bucket dispatch pacing, and backpressure queue metrics.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/priority-queue.html\` with task enqueue form (payload and priority rank), live queue depth gauge, dispatch rate slider, and processed event feed.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/priority-queue.css\` styling priority badge indicators (Urgent, High, Normal, Low), progress bars, and event feed transition cards.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/priority-queue.js\` implementing class \`${toPascal(p.slug)}PriorityQueue\` with \`enqueue(item, priority)\`, \`dequeue()\`, \`peek()\`, and \`startDispatcher(rateLimitMs, handler)\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/priority-queue.test.mjs\` testing heap property preservation, FIFO ordering on identical priorities, and rate-limited dequeue timing using node:test.`
    ]
  },
  {
    featureFile: "snapshot-time-travel",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Immutable State Snapshot & Bidirectional Time-Travel Debugger",
    desc: (p) => `Build an isolated immutable state timeline and time-travel replay engine for ${p.name} that captures serializable state snapshots, computes visual object diffs, and provides bidirectional scrub playback with breakpoint inspection.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/snapshot-time-travel.html\` with timeline scrubber slider, play/pause controls, step forward/backward buttons, state diff inspector, and JSON export button.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/snapshot-time-travel.css\` styling the scrubber track with tick marks, current frame cursor, and red/green property diff inspector badges.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/snapshot-time-travel.js\` implementing class \`${toPascal(p.slug)}TimeTravelStore\` with \`commitSnapshot(state, label)\`, \`stepTo(index)\`, \`undo()\`, \`redo()\`, and \`exportHistory()\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/snapshot-time-travel.test.mjs\` testing immutability of stored snapshots, correct index jumping, and JSON export/import parity using node:test.`
    ]
  },
  {
    featureFile: "raft-consensus",
    level: "level3",
    points: "10 Points",
    labels: ["nsoc26", "level3", "enhancement"],
    theme: "Distributed Raft Consensus & Leader Election State Machine",
    desc: (p) => `Build a simulated multi-node Raft consensus cluster engine in ${p.name} modeling Leader, Follower, and Candidate states, randomized heartbeat election timeouts, vote request RPC exchanges, and log replication commit cycles.`,
    guide: (p) => [
      `Dedicated HTML: Create \`public/showcase/${p.slug}/raft-consensus.html\` with 3-node or 5-node cluster diagram, kill node button, partition network toggle, term counter, and log replication viewer.`,
      `Dedicated CSS: Create \`public/showcase/${p.slug}/raft-consensus.css\` styling node state cards (Leader gold glow, Follower cyan glow, Candidate purple glow), and message packet travel animations.`,
      `Dedicated Module JS: Create \`public/showcase/${p.slug}/raft-consensus.js\` implementing class \`${toPascal(p.slug)}RaftCluster\` with \`startElection(nodeId)\`, \`sendHeartbeats()\`, \`replicateLog(command)\`, and \`handleNodeFailure(nodeId)\`.`,
      `Isolated Unit Test: Create \`public/showcase/${p.slug}/raft-consensus.test.mjs\` testing majority quorum calculation, split vote handling, term increments, and leader replacement when leader drops using node:test.`
    ]
  }
];

// Generate exactly 200 Issues across 40 projects
// Exactly 100 Level 2 tasks
// Exactly 100 Level 3 tasks
// Total = 200 tasks (5 per project)
// Projects 0 to 19 (20 projects): 3 Level 2 + 2 Level 3 (60 Level 2, 40 Level 3)
// Projects 20 to 39 (20 projects): 2 Level 2 + 3 Level 3 (40 Level 2, 60 Level 3)
// Grand totals: 100 Level 2, 100 Level 3 = 200 issues

const allIssues = [];
let issueCounter = 1601; // Continuous numbering starting from 1601

let l2Idx = 0;
let l3Idx = 0;

for (let pIdx = 0; pIdx < projects.length; pIdx++) {
  const p = projects[pIdx];
  const assignedTemplates = [];

  let l2Count = 0;
  let l3Count = 0;

  if (pIdx < 20) {
    l2Count = 3;
    l3Count = 2;
  } else {
    l2Count = 2;
    l3Count = 3;
  }

  for (let i = 0; i < l2Count; i++) {
    assignedTemplates.push(level2Templates[l2Idx++ % level2Templates.length]);
  }
  for (let i = 0; i < l3Count; i++) {
    assignedTemplates.push(level3Templates[l3Idx++ % level3Templates.length]);
  }

  for (const t of assignedTemplates) {
    const issueNum = issueCounter++;
    const filesList = t.level === "level3"
      ? `\`${t.featureFile}.html\`, \`${t.featureFile}.css\`, \`${t.featureFile}.js\`, \`${t.featureFile}.test.mjs\``
      : `\`${t.featureFile}.html\`, \`${t.featureFile}.css\`, \`${t.featureFile}.js\``;

    allIssues.push({
      id: issueNum,
      project: p.slug,
      projectName: p.name,
      level: t.level,
      points: t.points,
      labels: t.labels,
      title: `[${p.slug}] Implement ${t.theme.toLowerCase()} in dedicated modular files`,
      description: t.desc(p),
      featureFile: t.featureFile,
      suggestions: t.guide(p),
      zeroConflictGuarantee: `Zero-Merge-Conflict Guarantee: This task is implemented strictly in its own isolated files (${filesList}). Do not modify common files (index.html, styles.css, script.js) to guarantee 100% conflict-free merging!`
    });
  }
}

const countL2 = allIssues.filter(i => i.level === 'level2').length;
const countL3 = allIssues.filter(i => i.level === 'level3').length;

console.log(`Generated ${allIssues.length} conflict-free issues successfully (IDs 1601-1800)!`);
console.log(`Distribution: Level 2 (${countL2}), Level 3 (${countL3})`);

// Build scripts/create-batch19-issues.mjs
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

const repoEnv = process.env.GITHUB_REPOSITORY || "Pratyush-Panda-2006/CAREERFORGE";
const [owner, repo] = repoEnv.split("/");

export const issues = ${JSON.stringify(allIssues, null, 2)};

/**
 * Native fetch helper for publishing issues with rate limiting & error handling
 */
async function createGithubIssue(item, body) {
  const url = \`https://api.github.com/repos/\${owner}/\${repo}/issues\`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "CAREERFORGE-Batch19-Publisher",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: \`Bearer \${token}\`
    },
    body: JSON.stringify({
      title: item.title,
      body,
      labels: item.labels
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    const err = new Error(\`HTTP \${res.status}: \${errorText}\`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function formatBody(item) {
  const guide = item.suggestions.map((s, idx) => (idx + 1) + '. ' + s).join('\\n');
  const levelTitle = item.level === 'level2' ? 'Level 2 (Intermediate / UI & Tools)' : 'Level 3 (Advanced / Core Engine)';
  return '### 🌸 Nexus Spring of Code 2026 (NSoC \\'26) — Issue Specification\\n\\n' +
    '**Target Showcase Directory:** \`public/showcase/' + item.project + '/\`\\n' +
    '**Difficulty Tier:** **' + levelTitle + '**\\n' +
    '**Award Value:** **' + item.points + '**\\n\\n' +
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
    '- **Zero Conflicts:** Create your feature strictly in the designated isolated files specified above without modifying shared files (index.html, styles.css, script.js).\\n' +
    '- **Protected Core:** Never modify, reformat, or alter files in \`src/\`, \`package.json\`, \`.github/\`, or top-level configs.\\n' +
    '- **PR Description Keyword:** Ensure your PR description includes a closing keyword referencing this issue (e.g. \`Closes #<issue-id>\` or \`Fixes #<issue-id>\`).\\n' +
    '- **Claiming:** Reply with \`/claim\` to be assigned (3-day timer).\\n\\n' +
    'Happy Coding! 🚀';
}

async function run() {
  console.log(\`\\n======================================================\`);
  console.log(\`🚀 CAREERFORGE Batch 19 Issue Publisher (NSoC 2026)\`);
  console.log(\`   Total Issues in Batch: \${issues.length} (100 Level 2, 100 Level 3)\`);
  console.log(\`   Mode: \${isDryRun || !token ? "DRY-RUN (Preview Only)" : "LIVE PUBLISH"}\`);
  console.log(\`======================================================\\n\`);

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    const body = formatBody(item);

    if (isDryRun || !token) {
      console.log(\`[DRY-RUN] [\${i + 1}/\${issues.length}] \${item.title}\`);
      console.log(\`          Labels: \${item.labels.join(", ")} | Points: \${item.points} | Level: \${item.level}\`);
      console.log(\`          Path: public/showcase/\${item.project}/\`);
      console.log(\`------------------------------------------------------\`);
    } else {
      let success = false;
      let retries = 0;
      while (!success && retries < 3) {
        try {
          const created = await createGithubIssue(item, body);
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

  console.log(\`\\n✨ Batch 19 Processing Completed (\${issues.length} Issues Processed)!\\n\`);
}

run();
`;

fs.writeFileSync(path.resolve('scripts', 'create-batch19-issues.mjs'), scriptCode, 'utf-8');
console.log('Successfully written scripts/create-batch19-issues.mjs!');
