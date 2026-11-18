/**
 * AutomotiveHypercarDiffInspector
 * Visual state & text change diff inspector with line highlighting for hypercar ECU tune maps, aero telemetry, and chassis setups.
 */
export class AutomotiveHypercarDiffInspector {
  constructor() {
    this.presets = {
      aeroBalance: {
        name: 'Monza Low-Drag vs Spa High-Downforce Aero',
        left: `{
  "circuit": "Autodromo Nazionale Monza",
  "front_wing_angle_deg": 1.8,
  "rear_wing_aoa_deg": 3.2,
  "gurney_flap_installed": false,
  "cd_target": 0.295,
  "cl_target": 0.680
}`,
        right: `{
  "circuit": "Circuit de Spa-Francorchamps",
  "front_wing_angle_deg": 3.5,
  "rear_wing_aoa_deg": 6.8,
  "gurney_flap_installed": true,
  "cd_target": 0.345,
  "cl_target": 1.150,
  "drs_efficiency_pct": 38.0
}`
      },
      torqueVectoring: {
        name: 'Dry Track Dynamic vs Wet Street Yaw Control',
        left: `{
  "mode": "Dry Track Attack",
  "yaw_damping_gain": 0.85,
  "inner_wheel_brake_torque_nm": 180,
  "oversteer_allowance_deg": 8.0,
  "launch_traction_threshold_slip": 0.085
}`,
        right: `{
  "mode": "Wet Surface Active Stability",
  "yaw_damping_gain": 1.75,
  "inner_wheel_brake_torque_nm": 60,
  "oversteer_allowance_deg": 1.5,
  "launch_traction_threshold_slip": 0.035,
  "aquaplaning_intervention": true
}`
      },
      damperKinematics: {
        name: 'Damper Bump & Rebound Tuning Profile',
        left: `{
  "front_bump_rate_kn_s": 3.8,
  "front_rebound_kn_s": 5.4,
  "rear_bump_rate_kn_s": 4.2,
  "rear_rebound_kn_s": 6.1
}`,
        right: `{
  "front_bump_rate_kn_s": 4.6,
  "front_rebound_kn_s": 6.8,
  "rear_bump_rate_kn_s": 5.2,
  "rear_rebound_kn_s": 7.6,
  "heave_damper_rate_kn_s": 8.5
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
    wrapper.className = 'ah-diff-container';

    // Summary metrics bar
    const statsBar = document.createElement('div');
    statsBar.className = 'ah-diff-stats';

    const addBadge = document.createElement('span');
    addBadge.className = 'ah-stat-badge ah-stat-add';
    addBadge.textContent = `+${diffResult.metrics.additions} Additions`;

    const delBadge = document.createElement('span');
    delBadge.className = 'ah-stat-badge ah-stat-del';
    delBadge.textContent = `-${diffResult.metrics.deletions} Deletions`;

    const uncBadge = document.createElement('span');
    uncBadge.className = 'ah-stat-badge ah-stat-unc';
    uncBadge.textContent = `${diffResult.metrics.unchanged} Unchanged`;

    const pctBadge = document.createElement('span');
    pctBadge.className = 'ah-stat-badge ah-stat-pct';
    pctBadge.textContent = `${diffResult.metrics.changePercentage}% Modified`;

    statsBar.append(addBadge, delBadge, uncBadge, pctBadge);

    // Diff table
    const table = document.createElement('div');
    table.className = 'ah-diff-table';

    for (const line of diffResult.lines) {
      const row = document.createElement('div');
      row.className = `ah-diff-row ah-diff-row-${line.type}`;

      const oldNum = document.createElement('div');
      oldNum.className = 'ah-diff-num ah-diff-num-old';
      oldNum.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNum = document.createElement('div');
      newNum.className = 'ah-diff-num ah-diff-num-new';
      newNum.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const marker = document.createElement('div');
      marker.className = 'ah-diff-marker';
      marker.textContent = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

      const content = document.createElement('div');
      content.className = 'ah-diff-content';
      content.textContent = line.content;

      row.append(oldNum, newNum, marker, content);
      table.append(row);
    }

    wrapper.append(statsBar, table);
    container.append(wrapper);
  }
}
