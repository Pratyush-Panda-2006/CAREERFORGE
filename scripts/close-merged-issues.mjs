import fs from "fs";
import path from "path";
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
      const fullText = subj + "\n" + body;

      // 1. Squash commits with double parens: ... (#<issueNum>) (#<prNum>)
      const doubleParenMatch = subj.match(/\(#(\d+)\)\s+\(#(\d+)\)$/);
      if (doubleParenMatch) {
        const issueNum = parseInt(doubleParenMatch[1], 10);
        const prNum = parseInt(doubleParenMatch[2], 10);
        if (!issueToMeta.has(issueNum)) {
          issueToMeta.set(issueNum, { issueNum, prNum, hash, author });
        }
      }

      // 2. Merge commits: Merge pull request #<prNum> from <branch>
      const mergePrMatch = subj.match(/Merge pull request #(\d+)(?:\s+from\s+([^\s]+))?/i);
      if (mergePrMatch) {
        const prNum = parseInt(mergePrMatch[1], 10);
        const branch = mergePrMatch[2] || "";
        const branchIssueMatch = branch.match(/-(\d+)$/);
        if (branchIssueMatch) {
          const issueNum = parseInt(branchIssueMatch[1], 10);
          if (!issueToMeta.has(issueNum)) {
            issueToMeta.set(issueNum, { issueNum, prNum, hash, author });
          }
        }
      }

      // 3. Keywords: Closes #<issue>, Fixes #<issue>, Resolves #<issue>
      const keywordMatches = [
        ...fullText.matchAll(/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi)
      ];
      for (const km of keywordMatches) {
        const issueNum = parseInt(km[1], 10);
        const prMatch = subj.match(/#(\d+)/);
        const prNum = prMatch ? parseInt(prMatch[1], 10) : null;
        if (!issueToMeta.has(issueNum)) {
          issueToMeta.set(issueNum, { issueNum, prNum, hash, author });
        }
      }

      // 4. Direct issue reference (#<num>) in commit subject
      const singleParenMatch = subj.match(/\(#(\d+)\)$/);
      if (singleParenMatch) {
        const num = parseInt(singleParenMatch[1], 10);
        // Only if within known issue ranges (< 1000)
        if (num <= 900 && !issueToMeta.has(num)) {
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
  console.log(`   Mode: ${isDryRun || !octokit ? "DRY-RUN (Preview Only)" : "LIVE CLOSE"}`);
  console.log("======================================================\n");

  const resolvedIssues = scanGitResolvedIssues();
  console.log(`Found ${resolvedIssues.size} resolved issue references from Git history.`);

  // If Octokit is available, also inspect closed PRs from GitHub API
  if (octokit) {
    try {
      console.log("Fetching closed PRs from GitHub API to discover additional linked issues...");
      const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
        owner,
        repo,
        state: "closed",
        per_page: 100
      });

      for await (const response of iterator) {
        const pulls = response.data;
        if (!pulls || pulls.length === 0) break;

        for (const pr of pulls) {
          if (!pr.merged_at) continue;

          const prNum = pr.number;
          const body = pr.body || "";
          const title = pr.title || "";
          const branch = pr.head?.ref || "";

          // Keywords in body
          const kwMatches = [
            ...body.matchAll(/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi)
          ];
          for (const km of kwMatches) {
            const issueNum = parseInt(km[1], 10);
            if (!resolvedIssues.has(issueNum)) {
              resolvedIssues.set(issueNum, { issueNum, prNum, hash: pr.merge_commit_sha || `PR #${prNum}`, author: pr.user?.login });
            }
          }

          // Branch name ending with -<id>
          const bMatch = branch.match(/-(\d+)$/);
          if (bMatch) {
            const issueNum = parseInt(bMatch[1], 10);
            if (!resolvedIssues.has(issueNum)) {
              resolvedIssues.set(issueNum, { issueNum, prNum, hash: pr.merge_commit_sha || `PR #${prNum}`, author: pr.user?.login });
            }
          }

          // Title containing (#<id>)
          const titleMatches = [...title.matchAll(/#(\d+)/g)];
          for (const tm of titleMatches) {
            const num = parseInt(tm[1], 10);
            if (num !== prNum && !resolvedIssues.has(num)) {
              resolvedIssues.set(num, { issueNum: num, prNum, hash: pr.merge_commit_sha || `PR #${prNum}`, author: pr.user?.login });
            }
          }
        }
      }
      console.log(`Total resolved issue pool after GitHub API scan: ${resolvedIssues.size}`);
    } catch (err) {
      console.warn("⚠️ GitHub API pulls scan warning:", err.message);
    }
  }

  // Fetch all open issues in the repository
  let openIssues = [];
  if (octokit) {
    try {
      console.log("Fetching currently open issues from GitHub...");
      const allOpen = await octokit.paginate(octokit.rest.issues.listForRepo, {
        owner,
        repo,
        state: "open",
        per_page: 100
      });
      // Filter out Pull Requests (which GitHub API returns under issues)
      openIssues = allOpen.filter((item) => !item.pull_request);
      console.log(`Found ${openIssues.length} currently open issues in ${owner}/${repo}.`);
    } catch (err) {
      console.error("⚠️ Failed to list open issues:", err.message);
      return;
    }
  } else {
    // In dry-run mode without token, simulate with all known resolved issues
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

    if (isDryRun || !octokit) {
      console.log(`[DRY-RUN] [${i + 1}/${issuesToClose.length}] Would close Issue #${issue.number}: "${issue.title}" (Merged via PR #${meta.prNum || meta.hash})`);
      closedCount++;
    } else {
      let success = false;
      let retries = 0;

      while (!success && retries < 3) {
        try {
          // 1. Post congratulatory closing comment
          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issue.number,
            body: `### 🎉 Issue Resolved & Closed\n\nThis issue has been completed and merged via Pull Request #${meta.prNum || meta.hash}.\n\nThank you for contributing to **CAREERFORGE**! 🚀`
          });

          // 2. Close the issue
          await octokit.rest.issues.update({
            owner,
            repo,
            issue_number: issue.number,
            state: "closed",
            state_reason: "completed"
          });

          console.log(`✅ [${i + 1}/${issuesToClose.length}] Closed Issue #${issue.number} (Merged via PR #${meta.prNum || meta.hash})`);
          closedCount++;
          success = true;

          // Rate limit pause
          await new Promise((r) => setTimeout(r, 600));
        } catch (err) {
          retries++;
          console.error(`⚠️ Attempt ${retries} failed for Issue #${issue.number}: ${err.message}`);
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

  console.log(`\n✨ Successfully closed ${closedCount} merged issues! 🎉\n`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
