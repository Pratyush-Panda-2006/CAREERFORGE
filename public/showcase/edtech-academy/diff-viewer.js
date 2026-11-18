/**
 * EdtechAcademyDiffInspector
 * Visual state & text change diff inspector with line highlighting for course syllabi, quiz questions, and grading rubrics.
 */
export class EdtechAcademyDiffInspector {
  constructor() {
    this.presets = {
      syllabusRevision: {
        name: 'Curriculum Syllabus Annual Revision',
        left: `{
  "course": "CS-302: Cloud Architecture",
  "term": "Fall 2025",
  "modules": [
    "1. Virtual Machines & Hypervisors",
    "2. Relational Database Clustering",
    "3. Monolithic Load Balancing"
  ],
  "lab_environment": "Ubuntu VM on Local Hypervisor"
}`,
        right: `{
  "course": "CS-302: Cloud Architecture",
  "term": "Fall 2026",
  "modules": [
    "1. Containerization & OCI Runtimes",
    "2. Distributed Consensus & Raft",
    "3. Serverless Edge Functions & Kafka",
    "4. Zero-Trust Mesh & Telemetry"
  ],
  "lab_environment": "Ephemeral Kubernetes Namespace in Cloud",
  "cloud_credits_per_student_usd": 150
}`
      },
      quizQuestionTuning: {
        name: 'Quiz Question Bloom Taxonomy Upgrade',
        left: `{
  "id": "q401",
  "bloom_level": "Recall",
  "prompt": "What is the primary purpose of a database index?",
  "options": [
    "A) Encrypt rows",
    "B) Speed up queries",
    "C) Backup logs"
  ],
  "correct": "B"
}`,
        right: `{
  "id": "q401",
  "bloom_level": "Analyze",
  "prompt": "Given a B-tree index on (user_id, created_at), analyze why the query WHERE created_at > NOW() triggers a full table scan.",
  "options": [
    "A) Missing covering index clause",
    "B) Non-leading index column in composite composite key violates prefix rule",
    "C) Database locking overhead"
  ],
  "correct": "B",
  "explanation": "Composite index requires matching leading column (user_id) for index seek."
}`
      },
      rubricCriteria: {
        name: 'Capstone Grading Rubric Calibration',
        left: `{
  "tier_1_pass": "Code compiles and passes basic test case",
  "max_score": 100,
  "deductions_for_style": 10
}`,
        right: `{
  "tier_1_distinction": "100% test coverage, O(N log N) time complexity, zero memory leaks",
  "tier_2_proficient": "Passes all functional integration tests, documented API contracts",
  "tier_3_developing": "Code compiles but fails edge case boundary conditions",
  "max_score": 100,
  "automated_ci_evaluator": true
}`
      }
    };
  }

  computeDiff(oldText, newText) {
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    const matrix = Array.from({ length: oldLines.length + 1 }, () =>
      new Array(newLines.length + 1).fill(0)
    );

    for (let i = 1; i <= oldLines.length; i++) {
      for (let j = 1; j <= newLines.length; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }

    const diffLines = [];
    let i = oldLines.length;
    let j = newLines.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        diffLines.unshift({
          type: 'unchanged',
          oldLineNumber: i,
          newLineNumber: j,
          content: oldLines[i - 1]
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
        diffLines.unshift({
          type: 'addition',
          oldLineNumber: null,
          newLineNumber: j,
          content: newLines[j - 1]
        });
        j--;
      } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
        diffLines.unshift({
          type: 'deletion',
          oldLineNumber: i,
          newLineNumber: null,
          content: oldLines[i - 1]
        });
        i--;
      }
    }

    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const item of diffLines) {
      if (item.type === 'addition') additions++;
      else if (item.type === 'deletion') deletions++;
      else if (item.type === 'unchanged') unchanged++;
    }

    const total = additions + deletions + unchanged;
    const changePercentage = total > 0 ? Math.round(((additions + deletions) / total) * 100) : 0;

    return {
      lines: diffLines,
      metrics: {
        additions,
        deletions,
        unchanged,
        total,
        changePercentage
      }
    };
  }

  getPreset(key) {
    return this.presets[key] || null;
  }

  getPresetKeys() {
    return Object.keys(this.presets);
  }

  render(container, diffResult) {
    if (!container) return;
    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'ed-diff-container';

    const statsBar = document.createElement('div');
    statsBar.className = 'ed-diff-stats';

    const addBadge = document.createElement('span');
    addBadge.className = 'ed-stat-badge ed-stat-add';
    addBadge.textContent = `+${diffResult.metrics.additions} Additions`;

    const delBadge = document.createElement('span');
    delBadge.className = 'ed-stat-badge ed-stat-del';
    delBadge.textContent = `-${diffResult.metrics.deletions} Deletions`;

    const uncBadge = document.createElement('span');
    uncBadge.className = 'ed-stat-badge ed-stat-unc';
    uncBadge.textContent = `${diffResult.metrics.unchanged} Unchanged`;

    const pctBadge = document.createElement('span');
    pctBadge.className = 'ed-stat-badge ed-stat-pct';
    pctBadge.textContent = `${diffResult.metrics.changePercentage}% Modified`;

    statsBar.append(addBadge, delBadge, uncBadge, pctBadge);

    const table = document.createElement('div');
    table.className = 'ed-diff-table';

    for (const line of diffResult.lines) {
      const row = document.createElement('div');
      row.className = `ed-diff-row ed-diff-row-${line.type}`;

      const oldNum = document.createElement('div');
      oldNum.className = 'ed-diff-num ed-diff-num-old';
      oldNum.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNum = document.createElement('div');
      newNum.className = 'ed-diff-num ed-diff-num-new';
      newNum.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const marker = document.createElement('div');
      marker.className = 'ed-diff-marker';
      marker.textContent = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

      const content = document.createElement('div');
      content.className = 'ed-diff-content';
      content.textContent = line.content;

      row.append(oldNum, newNum, marker, content);
      table.append(row);
    }

    wrapper.append(statsBar, table);
    container.append(wrapper);
  }
}
