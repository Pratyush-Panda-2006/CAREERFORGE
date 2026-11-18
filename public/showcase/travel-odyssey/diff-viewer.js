/**
 * TravelOdysseyDiffInspector
 * Visual state & text change diff inspector with line highlighting for flight schedules, visa policies, and travel itineraries.
 */
export class TravelOdysseyDiffInspector {
  constructor() {
    this.presets = {
      itineraryEvolution: {
        name: 'Tokyo 7-Day Travel Itinerary Revision',
        left: `{
  "destination": "Tokyo, Japan",
  "days": [
    "Day 1: Shinjuku & Shibuya Crossing",
    "Day 2: Asakusa Senso-ji & Akihabara",
    "Day 3: Day trip to Mount Fuji Hakone bus",
    "Day 4: Ginza Shopping & Roppongi"
  ],
  "transport_pass": "Tokyo Metro 72hr Subways"
}`,
        right: `{
  "destination": "Tokyo, Japan",
  "days": [
    "Day 1: Arrival Haneda, Shinjuku Golden Gai",
    "Day 2: Asakusa Senso-ji, Ueno Park, Akihabara",
    "Day 3: Odakyu Romancecar to Hakone Onsen Stay",
    "Day 4: Hakone Lake Ashi ropeway, Shinkansen back to Tokyo",
    "Day 5: TeamLab Planets & Tsukiji Outer Market"
  ],
  "transport_pass": "JR Hokuriku Arch Pass + Suica IC Card",
  "onsen_tattoo_policy_verified": true
}`
      },
      visaPolicyChange: {
        name: 'European Union Entry Visa Policy Update',
        left: `{
  "jurisdiction": "Schengen Zone",
  "visa_free_entry": true,
  "advance_authorization_required": false,
  "passport_min_validity_months": 3,
  "entry_fee_eur": 0
}`,
        right: `{
  "jurisdiction": "Schengen Zone",
  "visa_free_entry": true,
  "advance_authorization_required": true,
  "system": "ETIAS (European Travel Information and Authorisation System)",
  "passport_min_validity_months": 6,
  "biometric_facial_capture_at_border": true,
  "entry_fee_eur": 7
}`
      },
      flightReschedule: {
        name: 'Airline Flight Schedule Retime Notice',
        left: `{
  "airline": "Singapore Airlines (SQ-22)",
  "departure_airport": "SIN",
  "departure_time_local": "23:45",
  "arrival_airport": "EWR",
  "aircraft": "A350-900ULR",
  "transit_stop": "Nonstop"
}`,
        right: `{
  "airline": "Singapore Airlines (SQ-22)",
  "departure_airport": "SIN",
  "departure_time_local": "00:20 (+1 day)",
  "arrival_airport": "EWR",
  "aircraft": "A350-900ULR",
  "transit_stop": "Nonstop",
  "delay_compensation_voucher_sgd": 150,
  "meal_voucher_code": "SIN-SQ-TERM3-MEAL"
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
    wrapper.className = 'to-diff-container';

    const statsBar = document.createElement('div');
    statsBar.className = 'to-diff-stats';

    const addBadge = document.createElement('span');
    addBadge.className = 'to-stat-badge to-stat-add';
    addBadge.textContent = `+${diffResult.metrics.additions} Additions`;

    const delBadge = document.createElement('span');
    delBadge.className = 'to-stat-badge to-stat-del';
    delBadge.textContent = `-${diffResult.metrics.deletions} Deletions`;

    const uncBadge = document.createElement('span');
    uncBadge.className = 'to-stat-badge to-stat-unc';
    uncBadge.textContent = `${diffResult.metrics.unchanged} Unchanged`;

    const pctBadge = document.createElement('span');
    pctBadge.className = 'to-stat-badge to-stat-pct';
    pctBadge.textContent = `${diffResult.metrics.changePercentage}% Modified`;

    statsBar.append(addBadge, delBadge, uncBadge, pctBadge);

    const table = document.createElement('div');
    table.className = 'to-diff-table';

    for (const line of diffResult.lines) {
      const row = document.createElement('div');
      row.className = `to-diff-row to-diff-row-${line.type}`;

      const oldNum = document.createElement('div');
      oldNum.className = 'to-diff-num to-diff-num-old';
      oldNum.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNum = document.createElement('div');
      newNum.className = 'to-diff-num to-diff-num-new';
      newNum.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const marker = document.createElement('div');
      marker.className = 'to-diff-marker';
      marker.textContent = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

      const content = document.createElement('div');
      content.className = 'to-diff-content';
      content.textContent = line.content;

      row.append(oldNum, newNum, marker, content);
      table.append(row);
    }

    wrapper.append(statsBar, table);
    container.append(wrapper);
  }
}
