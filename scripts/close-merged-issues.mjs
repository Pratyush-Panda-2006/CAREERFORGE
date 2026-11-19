import { execSync } from "child_process";

const isDryRun = process.argv.includes("--dry-run");

let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token && !isDryRun) {
  try {
    token = execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    console.warn("⚠️ Could not retrieve token via `gh auth token`. Falling back to dry-run mode.");
  }
}

const repoEnv = process.env.GITHUB_REPOSITORY || "Pratyush-Panda-2006/CAREERFORGE";
const [owner, repo] = repoEnv.split("/");

/**
 * Native GitHub API helper with rate limit handling and pagination
 */
async function ghRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CAREERFORGE-Issue-Closer",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API error ${res.status} on ${url}: ${errorText}`);
  }
  return res.json();
}

/**
 * Scan git history for all resolved issue references
 */
function scanGitResolvedIssues() {
  const issueToMeta = new Map();

  try {
    const rawLog = execSync('git log --format="COMMIT_START%h%n%an%n%ae%n%s%n%b%nCOMMIT_END"', {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024
    });
    const rawCommits = rawLog.split("COMMIT_START").filter(Boolean);

    for (const c of rawCommits) {
      const lines = c.trim().split("\n");
      const [hash, author, email, subj, ...bodyParts] = lines;
      const body = bodyParts.slice(0, -1).join("\n");
      const fullText = (subj || "") + "\n" + (body || "");

      // 1. Squash commits with double parens: ... (#<issueNum>) (#<prNum>)
      const doubleParenMatch = subj.match(/\(#(\d+)\)\s+\(#(\d+)\)$/);
      if (doubleParenMatch) {
        const issueNum = parseInt(doubleParenMatch[1], 10);
        const prNum = parseInt(doubleParenMatch[2], 10);
        if (issueNum < 2200 && !issueToMeta.has(issueNum)) {
          issueToMeta.set(issueNum, { issueNum, prNum, hash, author });
        }
      }

      // 2. Merge commits: Merge pull request #<prNum> from <branch>
      const mergePrMatch = subj.match(/Merge pull request #(\d+)(?:\s+from\s+([^\s]+))?/i);
      if (mergePrMatch) {
        const prNum = parseInt(mergePrMatch[1], 10);
        const branch = mergePrMatch[2] || "";
        const branchIssueMatch = branch.match(/(\d+)$/);
        if (branchIssueMatch) {
          const issueNum = parseInt(branchIssueMatch[1], 10);
          if (issueNum < 2200 && !issueToMeta.has(issueNum)) {
            issueToMeta.set(issueNum, { issueNum, prNum, hash, author });
          }
        }
      }

      // 3. Keywords: Closes #<issue>, Fixes #<issue>, Resolves #<issue>
      const keywordMatches = [
        ...fullText.matchAll(/\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved|issue|task)\b\s*:?\s*#?(\d+)/gi)
      ];
      for (const km of keywordMatches) {
        const issueNum = parseInt(km[1], 10);
        const prMatch = subj.match(/#(\d+)/);
        const prNum = prMatch ? parseInt(prMatch[1], 10) : null;
        if (issueNum < 2200 && issueNum !== prNum && !issueToMeta.has(issueNum)) {
          issueToMeta.set(issueNum, { issueNum, prNum, hash, author });
        }
      }

      // 4. Issue URL references in commit body
      const urlMatches = [
        ...fullText.matchAll(/https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/gi)
      ];
      for (const um of urlMatches) {
        const issueNum = parseInt(um[1], 10);
        const prMatch = subj.match(/#(\d+)/);
        const prNum = prMatch ? parseInt(prMatch[1], 10) : null;
        if (issueNum < 2200 && !issueToMeta.has(issueNum)) {
          issueToMeta.set(issueNum, { issueNum, prNum, hash, author });
        }
      }

      // 5. Direct issue reference (#<num>) in commit subject
      const singleParenMatch = subj.match(/\(#(\d+)\)$/);
      if (singleParenMatch) {
        const num = parseInt(singleParenMatch[1], 10);
        // Only if within known issue ranges (< 2000)
        if (num <= 1500 && !issueToMeta.has(num)) {
          issueToMeta.set(num, { issueNum: num, prNum: num, hash, author });
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ Git commit scan error:", err.message);
  }

  return issueToMeta;
}

async function run() {
  console.log("======================================================");
  console.log("🧹 CAREERFORGE Automated Merged Issue Closer");
  console.log(`   Repository: ${owner}/${repo}`);
  console.log(`   Mode: ${isDryRun || !token ? "DRY-RUN (Preview Only)" : "LIVE CLOSE"}`);
  console.log("======================================================\n");

  const resolvedIssues = scanGitResolvedIssues();
  console.log(`Found ${resolvedIssues.size} resolved issue references from Git history.`);

  // If token is available or public API can be read, fetch closed PRs to discover linked issues
  try {
    console.log("Fetching recent closed PRs from GitHub API to discover additional linked issues...");
    let page = 1;
    let keepFetching = true;

    while (keepFetching && page <= 5) {
      const pulls = await ghRequest(`/repos/${owner}/${repo}/pulls?state=closed&per_page=100&page=${page}`);
      if (!pulls || pulls.length === 0) break;

      for (const pr of pulls) {
        if (!pr.merged_at) continue;

        const prNum = pr.number;
        const textToScan = [
          pr.body || "",
          pr.title || "",
          pr.head?.ref || ""
        ].join("\n");

        // Keywords in body/title
        const kwMatches = [
          ...textToScan.matchAll(/\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved|issue|task)\b\s*:?\s*#?(\d+)/gi)
        ];
        for (const km of kwMatches) {
          const issueNum = parseInt(km[1], 10);
          if (issueNum < 2200 && issueNum !== prNum && !resolvedIssues.has(issueNum)) {
            resolvedIssues.set(issueNum, {
              issueNum,
              prNum,
              hash: pr.merge_commit_sha || `PR #${prNum}`,
              author: pr.user?.login
            });
          }
        }

        // Branch name ending with digits
        const bMatch = (pr.head?.ref || "").match(/(\d+)$/);
        if (bMatch) {
          const issueNum = parseInt(bMatch[1], 10);
          if (issueNum < 2200 && issueNum !== prNum && !resolvedIssues.has(issueNum)) {
            resolvedIssues.set(issueNum, {
              issueNum,
              prNum,
              hash: pr.merge_commit_sha || `PR #${prNum}`,
              author: pr.user?.login
            });
          }
        }

        // Title containing (#<id>)
        const titleMatches = [...(pr.title || "").matchAll(/#(\d+)/g)];
        for (const tm of titleMatches) {
          const num = parseInt(tm[1], 10);
          if (num < 2200 && num !== prNum && !resolvedIssues.has(num)) {
            resolvedIssues.set(num, {
              issueNum: num,
              prNum,
              hash: pr.merge_commit_sha || `PR #${prNum}`,
              author: pr.user?.login
            });
          }
        }
      }

      page++;
    }
    console.log(`Total resolved issue pool after GitHub API scan: ${resolvedIssues.size}`);
  } catch (err) {
    console.warn("⚠️ GitHub API pulls scan warning:", err.message);
  }

  // Fetch all open issues in the repository
  let openIssues = [];
  if (token && !isDryRun) {
    try {
      console.log("Fetching currently open issues from GitHub...");
      let page = 1;
      while (true) {
        const issuesPage = await ghRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`);
        if (!issuesPage || issuesPage.length === 0) break;

        // Filter out Pull Requests (GitHub issues API includes PRs with a `pull_request` property)
        const pureIssues = issuesPage.filter((item) => !item.pull_request);
        openIssues.push(...pureIssues);

        if (issuesPage.length < 100) break;
        page++;
      }
      console.log(`Found ${openIssues.length} currently open issues in ${owner}/${repo}.`);
    } catch (err) {
      console.error("⚠️ Failed to list open issues:", err.message);
      return;
    }
  } else {
    // In dry-run mode without token, simulate
    console.log("[DRY-RUN] Simulating issue closing based on local git resolution mapping...");
    openIssues = [...resolvedIssues.values()].map((r) => ({
      number: r.issueNum,
      title: `[Simulated Issue #${r.issueNum}]`
    }));
  }

  // Find open issues that are resolved
  const issuesToClose = [];
  for (const issue of openIssues) {
    if (resolvedIssues.has(issue.number)) {
      issuesToClose.push({
        issue,
        meta: resolvedIssues.get(issue.number)
      });
    }
  }

  console.log(`\n🎯 Found ${issuesToClose.length} open issues that correspond to merged PRs/commits!\n`);

  let closedCount = 0;
  for (let i = 0; i < issuesToClose.length; i++) {
    const { issue, meta } = issuesToClose[i];

    if (isDryRun || !token) {
      console.log(`[DRY-RUN] [${i + 1}/${issuesToClose.length}] Would close Issue #${issue.number}: "${issue.title}" (Merged via PR #${meta.prNum || meta.hash})`);
      closedCount++;
    } else {
      let success = false;
      let retries = 0;

      while (!success && retries < 3) {
        try {
          // 1. Post congratulatory closing comment
          await ghRequest(`/repos/${owner}/${repo}/issues/${issue.number}/comments`, {
            method: "POST",
            body: JSON.stringify({
              body: `### 🎉 Issue Resolved & Closed\n\nThis issue has been completed and merged via Pull Request #${meta.prNum || meta.hash}.\n\nThank you for contributing to **CAREERFORGE**! 🚀`
            })
          });

          // 2. Close the issue
          await ghRequest(`/repos/${owner}/${repo}/issues/${issue.number}`, {
            method: "PATCH",
            body: JSON.stringify({
              state: "closed",
              state_reason: "completed"
            })
          });

          console.log(`✅ [${i + 1}/${issuesToClose.length}] Closed Issue #${issue.number} (Merged via PR #${meta.prNum || meta.hash})`);
          closedCount++;
          success = true;

          // Rate limit pause
          await new Promise((r) => setTimeout(r, 600));
        } catch (err) {
          retries++;
          console.error(`⚠️ Attempt ${retries} failed for Issue #${issue.number}: ${err.message}`);
          if (err.message.includes("403") || err.message.includes("429")) {
            console.log("⏳ Secondary rate limit detected, sleeping for 30 seconds before retry...");
            await new Promise((r) => setTimeout(r, 30000));
          } else {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      }
    }
  }

  console.log(`\n✨ Successfully closed ${closedCount} merged issues! 🎉\n`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
