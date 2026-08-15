import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
});

const OUTPUT_PATH = path.resolve("public", "leaderboard.json");
const INCREMENTAL_THRESHOLD = 500;

/**
 * Load existing leaderboard data and cache if available
 */
function loadExistingLeaderboard() {
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      const raw = fs.readFileSync(OUTPUT_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (err) {
    console.warn("[Leaderboard Sync] Warning: Could not read existing leaderboard cache:", err.message);
  }
  return null;
}

async function run() {
  const repoEnv = process.env.GITHUB_REPOSITORY || "owner/repo";
  const [owner, repo] = repoEnv.split("/");

  if (!owner || !repo || repoEnv === "owner/repo") {
    console.warn(`[Leaderboard Sync] GITHUB_REPOSITORY not set or set to default (${repoEnv}).`);
    if (!process.env.GITHUB_TOKEN) {
      console.warn("[Leaderboard Sync] No GITHUB_TOKEN provided. Running in local/mock mode.");
      if (fs.existsSync(OUTPUT_PATH)) {
        console.log("[Leaderboard Sync] Preserving existing public/leaderboard.json.");
        return;
      }
    }
  }

  console.log(`[Leaderboard Sync] Starting sync for ${owner}/${repo}...`);

  const existingData = loadExistingLeaderboard();
  const existingCache = existingData?._cache || {};
  const cachedStats = {};
  const processedPrNumbers = new Set(existingCache.processed_pr_numbers || []);

  // Hydrate contributor stats from existing leaderboard if available
  if (existingData && Array.isArray(existingData.contributors)) {
    for (const c of existingData.contributors) {
      if (c.username) {
        cachedStats[c.username] = {
          username: c.username,
          avatar_url: c.avatar_url || `https://github.com/${c.username}.png`,
          profile_url: c.profile_url || `https://github.com/${c.username}`,
          merged_prs: c.merged_prs || 0,
        };
      }
    }
  }

  const totalKnownPrs = processedPrNumbers.size;
  const isIncrementalEligible = totalKnownPrs >= INCREMENTAL_THRESHOLD && Boolean(existingData?.last_updated);

  let contributorStats = { ...cachedStats };
  let newlyProcessedCount = 0;

  try {
    if (isIncrementalEligible) {
      console.log(
        `[Leaderboard Sync] Large repo detected (${totalKnownPrs} merged PRs cached >= ${INCREMENTAL_THRESHOLD}). Performing optimized incremental sync...`
      );

      const lastSyncTimestamp = new Date(existingData.last_updated).getTime();
      let stopEarly = false;

      // Iterate through closed PRs sorted by updated descending
      const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
        owner,
        repo,
        state: "closed",
        sort: "updated",
        direction: "desc",
        per_page: 100,
      });

      for await (const response of iterator) {
        const pagePulls = response.data;
        if (!pagePulls || pagePulls.length === 0) break;

        for (const pr of pagePulls) {
          const prUpdatedAt = new Date(pr.updated_at).getTime();

          // If PR is merged and not yet recorded
          if (pr.merged_at && pr.user && !pr.user.login.includes("[bot]")) {
            const prNum = pr.number;
            if (!processedPrNumbers.has(prNum)) {
              processedPrNumbers.add(prNum);
              const username = pr.user.login;
              if (!contributorStats[username]) {
                contributorStats[username] = {
                  username,
                  avatar_url: pr.user.avatar_url,
                  profile_url: pr.user.html_url,
                  merged_prs: 0,
                };
              }
              contributorStats[username].merged_prs += 1;
              newlyProcessedCount++;
            }
          }

          // If we encounter PRs that haven't been updated since last sync and are already known,
          // we can safely stop fetching older pages
          if (prUpdatedAt < lastSyncTimestamp && processedPrNumbers.has(pr.number)) {
            stopEarly = true;
            break;
          }
        }

        if (stopEarly) {
          console.log("[Leaderboard Sync] Incremental checkpoint reached. Older PRs unchanged.");
          break;
        }
      }
    } else {
      console.log("[Leaderboard Sync] Fetching all closed PRs using Octokit paginate...");

      // Fetch all pages using octokit.paginate
      const allClosedPrs = await octokit.paginate(octokit.rest.pulls.list, {
        owner,
        repo,
        state: "closed",
        per_page: 100,
      });

      console.log(`[Leaderboard Sync] Fetched ${allClosedPrs.length} total closed PRs.`);

      // Reset contributor stats for full recalculation
      contributorStats = {};
      processedPrNumbers.clear();

      for (const pr of allClosedPrs) {
        if (pr.merged_at && pr.user && !pr.user.login.includes("[bot]")) {
          const prNum = pr.number;
          processedPrNumbers.add(prNum);
          const username = pr.user.login;

          if (!contributorStats[username]) {
            contributorStats[username] = {
              username,
              avatar_url: pr.user.avatar_url,
              profile_url: pr.user.html_url,
              merged_prs: 0,
            };
          }
          contributorStats[username].merged_prs += 1;
          newlyProcessedCount++;
        }
      }
    }
  } catch (error) {
    console.error(`[Leaderboard Sync Error]: ${error.message}`);

    // If rate limited or API error occurs and cache exists, preserve existing data
    if (existingData) {
      console.warn("[Leaderboard Sync] Using fallback cached leaderboard due to API error / rate limit.");
      return;
    }
    throw error;
  }

  // Sort descending by merged PR count
  const sorted = Object.values(contributorStats)
    .filter((item) => item.merged_prs > 0)
    .sort((a, b) => b.merged_prs - a.merged_prs);

  const leaderboardData = {
    last_updated: new Date().toISOString(),
    total_merged_prs: processedPrNumbers.size,
    contributors: sorted.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    })),
    _cache: {
      processed_pr_numbers: Array.from(processedPrNumbers),
      cached_at: new Date().toISOString(),
    },
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(leaderboardData, null, 2));
  console.log(
    `[Leaderboard Sync] Successfully saved ${leaderboardData.contributors.length} contributors (${processedPrNumbers.size} merged PRs total, +${newlyProcessedCount} new) to public/leaderboard.json`
  );
}

run().catch((err) => {
  console.error("[Leaderboard Sync Fatal]:", err);
  process.exit(1);
});
