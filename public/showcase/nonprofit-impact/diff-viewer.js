/**
 * NonprofitImpactDiffInspector
 * Visual state & text change diff inspector with line highlighting for grant budgets, carbon methodologies, and impact audits.
 */
export class NonprofitImpactDiffInspector {
  constructor() {
    this.presets = {
      carbonMethodology: {
        name: 'Carbon Accounting Standard Revision',
        left: `{
  "methodology": "Verra VM0007 v1.4",
  "soil_depth_sampled_cm": 30,
  "discount_buffer_risk_pct": 20.0,
  "crediting_period_years": 10,
  "annual_target_tco2e": 45000
}`,
        right: `{
  "methodology": "Verra VM0033 v2.1 (Coastal Blue Carbon)",
  "soil_depth_sampled_cm": 100,
  "discount_buffer_risk_pct": 12.5,
  "crediting_period_years": 25,
  "annual_target_tco2e": 78200,
  "permanence_guarantee_years": 100
}`
      },
      grantBudget: {
        name: 'Annual Grant Budget Reallocation',
        left: `{
  "fiscal_year": 2026,
  "clean_water_initiatives_usd": 350000,
  "reforestation_usd": 420000,
  "emergency_food_aid_usd": 180000,
  "operations_pct": 12.0
}`,
        right: `{
  "fiscal_year": 2026,
  "clean_water_initiatives_usd": 480000,
  "reforestation_usd": 550000,
  "emergency_food_aid_usd": 320000,
  "operations_pct": 8.5,
  "donor_matching_unlocked_usd": 250000
}`
      },
      treeCanopyAudit: {
        name: 'Satellite Forest Canopy Verification',
        left: `{
  "sector": "Northern Watershed Corridor",
  "projected_survival_rate_pct": 85.0,
  "verified_hectares": 1200,
  "drone_survey_passed": false
}`,
        right: `{
  "sector": "Northern Watershed Corridor",
  "projected_survival_rate_pct": 91.4,
  "verified_hectares": 1450,
  "drone_survey_passed": true,
  "canopy_closure_density_pct": 68.2
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
    wrapper.className = 'np-diff-container';

    const statsBar = document.createElement('div');
    statsBar.className = 'np-diff-stats';

    const addBadge = document.createElement('span');
    addBadge.className = 'np-stat-badge np-stat-add';
    addBadge.textContent = `+${diffResult.metrics.additions} Additions`;

    const delBadge = document.createElement('span');
    delBadge.className = 'np-stat-badge np-stat-del';
    delBadge.textContent = `-${diffResult.metrics.deletions} Deletions`;

    const uncBadge = document.createElement('span');
    uncBadge.className = 'np-stat-badge np-stat-unc';
    uncBadge.textContent = `${diffResult.metrics.unchanged} Unchanged`;

    const pctBadge = document.createElement('span');
    pctBadge.className = 'np-stat-badge np-stat-pct';
    pctBadge.textContent = `${diffResult.metrics.changePercentage}% Modified`;

    statsBar.append(addBadge, delBadge, uncBadge, pctBadge);

    const table = document.createElement('div');
    table.className = 'np-diff-table';

    for (const line of diffResult.lines) {
      const row = document.createElement('div');
      row.className = `np-diff-row np-diff-row-${line.type}`;

      const oldNum = document.createElement('div');
      oldNum.className = 'np-diff-num np-diff-num-old';
      oldNum.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNum = document.createElement('div');
      newNum.className = 'np-diff-num np-diff-num-new';
      newNum.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const marker = document.createElement('div');
      marker.className = 'np-diff-marker';
      marker.textContent = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

      const content = document.createElement('div');
      content.className = 'np-diff-content';
      content.textContent = line.content;

      row.append(oldNum, newNum, marker, content);
      table.append(row);
    }

    wrapper.append(statsBar, table);
    container.append(wrapper);
  }
}
