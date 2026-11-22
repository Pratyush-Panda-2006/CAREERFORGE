import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const OUTPUT_PATH = path.resolve("public", "leaderboard.json");

// Non-NSoC contributors (collaborators, project owners, bots) excluded from the contributor leaderboard
const EXCLUDED_USERS = new Set([
  "harshbok69-bit",
  "Pratyush-Panda-2006",
  "Pratyush-Panda"
]);

function isExcludedUser(username) {
  if (!username) return true;
  if (username.includes("[bot]")) return true;
  return EXCLUDED_USERS.has(username);
}

// Map known author emails and names to their canonical GitHub usernames
const authorToUser = {
  "souravranjanmirdha@gmail.com": "souravranjanmirdha-sudo",
  "adityanarayanpadhi511@gmail.com": "AdityaNarayanPadhi",
  "anubaghel470@gmail.com": "Harshit214713",
  "309636889+harshit214713@users.noreply.github.com": "Harshit214713",
  "abhishekcse2004@gmail.com": "Anshuu2004",
  "swatipanda2324@gmail.com": "SwatiManjari",
  "85987665+divyanshagarwal123@users.noreply.github.com": "divyanshAgarwal123",
  "73594751+sarbajit-sengupta@users.noreply.github.com": "Sarbajit-Sengupta",
  "sarbajitsengupta1712@gmail.com": "Sarbajit-Sengupta",
  "aush5895@gmail.com": "aush5895",
  "190047591+chanchall26@users.noreply.github.com": "chanchall26",
  "kunalyelgatew@gmail.com": "kunal-yelgate",
  "4602056+jay23606@users.noreply.github.com": "jay23606",
  "akadixit98@gmail.com": "Akanksha7Dixit",
  "176571887+bhavyasingh-sa@users.noreply.github.com": "bhavyasingh-sa",
  "githubaaqibhafeezkhan@gmail.com": "Aaqibhafeezkhan",
  "yashsharmaji8502@gmail.com": "yash-sharmaji",
  "mohdmunis161@gmail.com": "mohdmunis161",
  "pallav.biyala@iitgn.ac.in": "Pallav-Biyala"
};

/**
 * Check if a PR satisfies the user criteria:
 * - From this repository
 * - Merged
 * - Has nsoc26 label
 * - Has level3, level2, or level1 label
 */
function isQualifiedNsocPr(pr) {
  if (!pr.merged_at) return false;

  const user = pr.user?.login;
  if (isExcludedUser(user)) return false;

  const labels = (pr.labels || []).map(l => (typeof l === "string" ? l : l.name || "").toLowerCase());
  const hasNsoc = labels.includes("nsoc26");
  const hasLevel = labels.some(l => ["level1", "level2", "level3"].includes(l));

  if (hasNsoc && hasLevel) {
    return true;
  }

  // Fallback: Check if title, body, or head branch explicitly identifies nsoc26 and level
  const text = ((pr.title || "") + " " + (pr.body || "") + " " + (pr.head?.ref || "")).toLowerCase();
  const textNsoc = hasNsoc || text.includes("nsoc26") || text.includes("nsoc");
  const textLevel = hasLevel || text.includes("level1") || text.includes("level2") || text.includes("level3");

  return textNsoc && textLevel;
}

/**
 * Scan git history for NSoC merged PR commits
 */
function scanGitCommits(processedPrNumbers, contributorStats) {
  try {
    const log = execSync('git log --format="COMMIT_START%h%n%an%n%ae%n%s%n%b%nCOMMIT_END"', {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024
    });
    const rawCommits = log.split("COMMIT_START").filter(Boolean);
    let newlyAdded = 0;

    for (const c of rawCommits) {
      const lines = c.trim().split("\n");
      const [hash, author, email, subj, ...bodyParts] = lines;
      const body = bodyParts.slice(0, -1).join("\n");
      const fullText = (subj + " " + body).toLowerCase();

      // Only count commits that correspond to nsoc tasks
      const isNsocCommit = fullText.includes("nsoc") || fullText.includes("level1") || fullText.includes("level2") || fullText.includes("level3");

      let prNumber = null;
      let username = null;

      // Pattern A: Merge pull request #<pr> from <user>/...
      const mergePrMatch = subj.match(/Merge pull request #(\d+)(?:\s+from\s+([^\/\s]+))?/i);
      if (mergePrMatch) {
        prNumber = parseInt(mergePrMatch[1], 10);
        const possibleUser = mergePrMatch[2];
        if (possibleUser && !possibleUser.includes("Pratyush") && !possibleUser.includes("patch") && !possibleUser.includes("chore") && !possibleUser.includes("main")) {
          username = possibleUser;
        }
      }

      // Pattern B: Squash commit: ... (#<pr>) at the end of subject
      const squashPrMatch = subj.match(/\(#(\d+)\)$/);
      if (squashPrMatch) {
        prNumber = parseInt(squashPrMatch[1], 10);
      }

      if (!prNumber || processedPrNumbers.has(prNumber)) continue;

      if (!username) {
        const emailLower = (email || "").toLowerCase().trim();
        if (authorToUser[emailLower]) {
          username = authorToUser[emailLower];
        } else {
          const authorLower = (author || "").toLowerCase().trim();
          for (const [k, v] of Object.entries(authorToUser)) {
            if (v.toLowerCase() === authorLower) {
              username = v;
              break;
            }
          }
        }
      }

      if (!username) {
        const coAuthorMatch = body.match(/Co-authored-by:\s+([^\s<]+)\s+<([^>]+)>/i);
        if (coAuthorMatch) {
          const coEmail = coAuthorMatch[2].toLowerCase();
          if (authorToUser[coEmail]) {
            username = authorToUser[coEmail];
          } else if (!coAuthorMatch[1].includes("bot")) {
            username = coAuthorMatch[1];
          }
        }
      }

      if (username && !isExcludedUser(username) && isNsocCommit) {
        processedPrNumbers.add(prNumber);
        if (!contributorStats[username]) {
          contributorStats[username] = {
            username,
            avatar_url: `https://github.com/${username}.png`,
            profile_url: `https://github.com/${username}`,
            merged_prs: 0
          };
        }
        contributorStats[username].merged_prs += 1;
        newlyAdded++;
      }
    }

    if (newlyAdded > 0) {
      console.log(`[Leaderboard Sync] Scanned git history: +${newlyAdded} eligible NSoC merged PRs found.`);
    }
  } catch (err) {
    console.warn("[Leaderboard Sync] Git commit scan warning:", err.message);
  }
}

async function run() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repoEnv = process.env.GITHUB_REPOSITORY || "Pratyush-Panda-2006/CAREERFORGE";
  const [owner, repo] = repoEnv.split("/");

  console.log(`[Leaderboard Sync] Starting NSoC Leaderboard Sync for ${owner}/${repo}...`);
  console.log(`[Leaderboard Sync] Filtering exclusively: repository ${owner}/${repo}, labels [nsoc26] AND [level1 | level2 | level3]`);

  const contributorStats = {};
  const processedPrNumbers = new Set();

  // 1. Fetch closed PRs from GitHub API
  try {
    let page = 1;
    let keepPaging = true;

    while (keepPaging && page <= 25) {
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=100&page=${page}`;
      const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "CAREERFORGE-Leaderboard-Sync",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`[Leaderboard Sync] API responded with ${res.status} on page ${page}`);
        break;
      }

      const pulls = await res.json();
      if (!pulls || !Array.isArray(pulls) || pulls.length === 0) break;

      for (const pr of pulls) {
        if (!pr.merged_at) continue;

        const prNum = pr.number;
        if (processedPrNumbers.has(prNum)) continue;

        if (isQualifiedNsocPr(pr)) {
          processedPrNumbers.add(prNum);
          const username = pr.user.login;

          if (!contributorStats[username]) {
            contributorStats[username] = {
              username,
              avatar_url: pr.user.avatar_url || `https://github.com/${username}.png`,
              profile_url: pr.user.html_url || `https://github.com/${username}`,
              merged_prs: 0
            };
          }
          contributorStats[username].merged_prs += 1;
        }
      }

      if (pulls.length < 100) break;
      page++;
    }
    console.log(`[Leaderboard Sync] GitHub API scan identified ${processedPrNumbers.size} eligible NSoC merged PRs.`);
  } catch (apiErr) {
    console.warn(`[Leaderboard Sync API Warning]: ${apiErr.message}`);
  }

  // 2. Enrich with local git log commits if needed
  scanGitCommits(processedPrNumbers, contributorStats);

  // 3. Remove any excluded user that slipped through
  for (const ex of EXCLUDED_USERS) {
    delete contributorStats[ex];
  }

  // 4. Sort descending by merged PR count
  const sorted = Object.values(contributorStats)
    .filter((item) => item.merged_prs > 0 && !isExcludedUser(item.username))
    .sort((a, b) => b.merged_prs - a.merged_prs);

  if (sorted.length === 0) {
    console.error("[Leaderboard Sync Error]: No qualified NSoC contributors found. Aborting write to prevent wipe.");
    process.exit(1);
  }

  const leaderboardData = {
    last_updated: new Date().toISOString(),
    filter_criteria: {
      repository: `${owner}/${repo}`,
      required_labels: ["nsoc26", ["level1", "level2", "level3"]]
    },
    total_merged_prs: processedPrNumbers.size,
    contributors: sorted.map((item, idx) => ({
      rank: idx + 1,
      ...item
    })),
    _cache: {
      processed_pr_numbers: Array.from(processedPrNumbers),
      cached_at: new Date().toISOString()
    }
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(leaderboardData, null, 2));
  console.log(
    `[Leaderboard Sync] Successfully saved ${leaderboardData.contributors.length} NSoC contributors (${processedPrNumbers.size} eligible merged PRs total) to public/leaderboard.json`
  );
}

run().catch((err) => {
  console.error("[Leaderboard Sync Fatal]:", err);
  process.exit(1);
});
