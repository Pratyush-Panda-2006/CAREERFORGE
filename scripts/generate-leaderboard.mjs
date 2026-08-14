import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function run() {
  const repoEnv = process.env.GITHUB_REPOSITORY || "owner/repo";
  const [owner, repo] = repoEnv.split("/");

  console.log(`[Leaderboard Sync] Fetching merged PRs for ${owner}/${repo}...`);

  // Fetch closed PRs
  const { data: pulls } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "closed",
    per_page: 100,
  });

  const contributorStats = {};

  for (const pr of pulls) {
    if (pr.merged_at && pr.user && !pr.user.login.includes("[bot]")) {
      const username = pr.user.login;
      if (!contributorStats[username]) {
        contributorStats[username] = {
          username: username,
          avatar_url: pr.user.avatar_url,
          profile_url: pr.user.html_url,
          merged_prs: 0,
        };
      }
      contributorStats[username].merged_prs += 1;
    }
  }

  // Sort descending by merged PR count
  const sorted = Object.values(contributorStats).sort(
    (a, b) => b.merged_prs - a.merged_prs
  );

  const leaderboardData = {
    last_updated: new Date().toISOString(),
    contributors: sorted.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    })),
  };

  const outputPath = path.resolve("public", "leaderboard.json");
  fs.writeFileSync(outputPath, JSON.stringify(leaderboardData, null, 2));
  console.log(`[Leaderboard Sync] Successfully saved ${leaderboardData.contributors.length} contributors to public/leaderboard.json`);
}

run().catch((err) => {
  console.error("[Leaderboard Sync Error]:", err);
  process.exit(1);
});
