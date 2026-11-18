import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const OUTPUT_PATH = path.resolve("public", "leaderboard.json");

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
  "harsh.bok69@gmail.com": "harshbok69-bit",
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
 * Load existing leaderboard data and cache if available,
 * or recover baseline from git history if current file is empty.
 */
function loadExistingLeaderboard() {
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      const raw = fs.readFileSync(OUTPUT_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.contributors) && parsed.contributors.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Leaderboard Sync] Warning: Could not read existing leaderboard cache:", err.message);
  }

  // Recover baseline from git history before the wipe commit
  try {
    const gitBaseline = execSync("git show e07bf7b~1:public/leaderboard.json", { encoding: "utf-8" });
    const parsed = JSON.parse(gitBaseline);
    if (Array.isArray(parsed.contributors) && parsed.contributors.length > 0) {
      console.log("[Leaderboard Sync] Successfully restored valid baseline from git history (395 merged PRs).");
      return parsed;
    }
  } catch (err) {
    console.warn("[Leaderboard Sync] Could not recover git baseline:", err.message);
  }

  return null;
}

/**
 * Scan git log to extract all merged PRs and match them to authors
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

      let prNumber = null;
      let username = null;

      // Pattern A: Merge pull request #<pr> from <user>/...
      const mergePrMatch = subj.match(/Merge pull request #(\d+)(?:\s+from\s+([^\/\s]+))?/i);
      if (mergePrMatch) {
        prNumber = parseInt(mergePrMatch[1], 10);
        const possibleUser = mergePrMatch[2];
        if (possibleUser && !possibleUser.includes("Pratyush") && !possibleUser.includes("patch")) {
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

      if (username && !username.includes("[bot]") && !username.includes("Pratyush-Panda")) {
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

    console.log(`[Leaderboard Sync] Scanned git history: +${newlyAdded} merged PRs found.`);
  } catch (err) {
    console.warn("[Leaderboard Sync] Git commit scan failed:", err.message);
  }
}

async function run() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repoEnv = process.env.GITHUB_REPOSITORY || "Pratyush-Panda-2006/CAREERFORGE";
  const [owner, repo] = repoEnv.split("/");

  console.log(`[Leaderboard Sync] Starting sync for ${owner}/${repo}...`);

  const existingData = loadExistingLeaderboard();
  const existingCache = existingData?._cache || {};
  const contributorStats = {};
  const processedPrNumbers = new Set(existingCache.processed_pr_numbers || []);

  // Hydrate contributor stats from existing baseline
  if (existingData && Array.isArray(existingData.contributors)) {
    for (const c of existingData.contributors) {
      if (c.username) {
        contributorStats[c.username] = {
          username: c.username,
          avatar_url: c.avatar_url || `https://github.com/${c.username}.png`,
          profile_url: c.profile_url || `https://github.com/${c.username}`,
          merged_prs: c.merged_prs || 0
        };
      }
    }
  }

  // 1. Fetch live from GitHub API if token is provided
  if (token) {
    try {
      const { Octokit } = await import("@octokit/rest");
      const octokit = new Octokit({ auth: token });
      console.log("[Leaderboard Sync] Querying GitHub API for merged pull requests...");

      const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
        owner,
        repo,
        state: "closed",
        sort: "updated",
        direction: "desc",
        per_page: 100
      });

      let pageCount = 0;
      for await (const response of iterator) {
        pageCount++;
        const pagePulls = response.data;
        if (!pagePulls || pagePulls.length === 0) break;

        for (const pr of pagePulls) {
          if (pr.merged_at && pr.user && !pr.user.login.includes("[bot]") && !pr.user.login.includes("Pratyush-Panda")) {
            const prNum = pr.number;
            if (!processedPrNumbers.has(prNum)) {
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
        }

        // Limit pages if running on incremental trigger
        if (pageCount >= 20) break;
      }
    } catch (apiErr) {
      console.warn(`[Leaderboard Sync API Warning]: ${apiErr.message}`);
    }
  }

  // 2. Enrich with local git log commits (catches any squash/merge commits not yet indexed by API)
  scanGitCommits(processedPrNumbers, contributorStats);

  // 3. Sort descending by merged PR count
  const sorted = Object.values(contributorStats)
    .filter((item) => item.merged_prs > 0)
    .sort((a, b) => b.merged_prs - a.merged_prs);

  // Guard: NEVER overwrite with empty contributors
  if (sorted.length === 0) {
    console.error("[Leaderboard Sync Error]: No contributors found. Aborting write to prevent wipe.");
    process.exit(1);
  }

  const leaderboardData = {
    last_updated: new Date().toISOString(),
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
    `[Leaderboard Sync] Successfully saved ${leaderboardData.contributors.length} contributors (${processedPrNumbers.size} merged PRs total) to public/leaderboard.json`
  );
}

run().catch((err) => {
  console.error("[Leaderboard Sync Fatal]:", err);
  process.exit(1);
});
