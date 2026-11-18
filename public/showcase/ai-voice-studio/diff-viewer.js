/**
 * AiVoiceStudioDiffInspector
 * Visual state & text change diff inspector with line highlighting for SSML scripts, phonetics, and audio DSP settings.
 */
export class AiVoiceStudioDiffInspector {
  constructor() {
    this.presets = {
      ssmlRevision: {
        name: 'SSML Script Narration Revision',
        left: `<speak>
  <p>Welcome to CareerForge Voice Studio.</p>
  <s>We provide high fidelity neural synthesis.</s>
</speak>`,
        right: `<speak>
  <p>
    <prosody pitch="+6%" rate="98%">Welcome to CareerForge Voice Studio.</prosody>
  </p>
  <break time="200ms"/>
  <s>We provide zero-latency high fidelity neural voice synthesis.</s>
</speak>`
      },
      phonemeMapping: {
        name: 'Phonetic Lexicon Tuning',
        left: `{
  "word": "CAREERFORGE",
  "phoneme": "ka-reer-forj",
  "stress": 1
}`,
        right: `{
  "word": "CAREERFORGE",
  "alphabet": "ipa",
  "phoneme": "kəˈɹɪəɹ fɔːdʒ",
  "stress": 2,
  "language": "en-US"
}`
      },
      masteringFilter: {
        name: 'DSP Equalizer & Compressor Preset',
        left: `{
  "preamp_gain": 0.0,
  "highpass_hz": 60,
  "limiter_db": -2.0
}`,
        right: `{
  "preamp_gain": 1.5,
  "highpass_hz": 80,
  "multiband_compression": true,
  "limiter_db": -0.8,
  "de_esser_sensitivity": 0.45
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
    wrapper.className = 'av-diff-container';

    // Summary metrics bar
    const statsBar = document.createElement('div');
    statsBar.className = 'av-diff-stats';

    const addBadge = document.createElement('span');
    addBadge.className = 'av-stat-badge av-stat-add';
    addBadge.textContent = `+${diffResult.metrics.additions} Additions`;

    const delBadge = document.createElement('span');
    delBadge.className = 'av-stat-badge av-stat-del';
    delBadge.textContent = `-${diffResult.metrics.deletions} Deletions`;

    const uncBadge = document.createElement('span');
    uncBadge.className = 'av-stat-badge av-stat-unc';
    uncBadge.textContent = `${diffResult.metrics.unchanged} Unchanged`;

    const pctBadge = document.createElement('span');
    pctBadge.className = 'av-stat-badge av-stat-pct';
    pctBadge.textContent = `${diffResult.metrics.changePercentage}% Modified`;

    statsBar.append(addBadge, delBadge, uncBadge, pctBadge);

    // Diff table
    const table = document.createElement('div');
    table.className = 'av-diff-table';

    for (const line of diffResult.lines) {
      const row = document.createElement('div');
      row.className = `av-diff-row av-diff-row-${line.type}`;

      const oldNum = document.createElement('div');
      oldNum.className = 'av-diff-num av-diff-num-old';
      oldNum.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNum = document.createElement('div');
      newNum.className = 'av-diff-num av-diff-num-new';
      newNum.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const marker = document.createElement('div');
      marker.className = 'av-diff-marker';
      marker.textContent = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

      const content = document.createElement('div');
      content.className = 'av-diff-content';
      content.textContent = line.content;

      row.append(oldNum, newNum, marker, content);
      table.append(row);
    }

    wrapper.append(statsBar, table);
    container.append(wrapper);
  }
}
