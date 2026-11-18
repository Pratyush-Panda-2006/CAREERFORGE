/**
 * PodcastAudioStreamDiffInspector
 * Visual state & text change diff inspector with line highlighting for RSS feeds, HLS playlists, and audio mastering curves.
 */
export class PodcastAudioStreamDiffInspector {
  constructor() {
    this.presets = {
      rssFeedUpdate: {
        name: 'RSS 2.0 Feed Metadata Evolution',
        left: `<item>
  <title>Ep 101: Building Scalable Systems</title>
  <enclosure url="https://cdn.pod.com/101.mp3" length="48201200" type="audio/mpeg"/>
  <itunes:duration>00:45:12</itunes:duration>
</item>`,
        right: `<item>
  <title>Ep 101: Building Scalable Systems (Remastered)</title>
  <enclosure url="https://cdn.pod.com/101-hls/master.m3u8" length="51200000" type="application/x-mpegURL"/>
  <itunes:duration>00:45:12</itunes:duration>
  <podcast:transcript url="https://cdn.pod.com/101.vtt" type="text/vtt"/>
  <podcast:chapters url="https://cdn.pod.com/101.chapters.json" type="application/json+chapters"/>
  <podcast:soundbite startTime="420.0" duration="30.0">Key insight on distributed queues</podcast:soundbite>
</item>`
      },
      hlsPlaylistRevision: {
        name: 'HLS Audio Bitrate Variant Ladder',
        left: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=128000
audio_128k.m3u8`,
        right: `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
audio_64k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"
audio_128k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=256000,CODECS="mp4a.40.2"
audio_256k.m3u8`
      },
      masteringFilter: {
        name: 'Broadcast Loudness & EQ Curve',
        left: `{
  "target_lufs": -19.0,
  "highpass_hz": 50,
  "de_esser": false,
  "limiter_ceiling_db": -2.0
}`,
        right: `{
  "target_lufs": -16.0,
  "highpass_hz": 80,
  "de_esser": true,
  "de_esser_threshold_db": -18.5,
  "limiter_ceiling_db": -1.0,
  "warmth_boost_250hz_db": 1.5
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
    wrapper.className = 'pas-diff-container';

    const statsBar = document.createElement('div');
    statsBar.className = 'pas-diff-stats';

    const addBadge = document.createElement('span');
    addBadge.className = 'pas-stat-badge pas-stat-add';
    addBadge.textContent = `+${diffResult.metrics.additions} Additions`;

    const delBadge = document.createElement('span');
    delBadge.className = 'pas-stat-badge pas-stat-del';
    delBadge.textContent = `-${diffResult.metrics.deletions} Deletions`;

    const uncBadge = document.createElement('span');
    uncBadge.className = 'pas-stat-badge pas-stat-unc';
    uncBadge.textContent = `${diffResult.metrics.unchanged} Unchanged`;

    const pctBadge = document.createElement('span');
    pctBadge.className = 'pas-stat-badge pas-stat-pct';
    pctBadge.textContent = `${diffResult.metrics.changePercentage}% Modified`;

    statsBar.append(addBadge, delBadge, uncBadge, pctBadge);

    const table = document.createElement('div');
    table.className = 'pas-diff-table';

    for (const line of diffResult.lines) {
      const row = document.createElement('div');
      row.className = `pas-diff-row pas-diff-row-${line.type}`;

      const oldNum = document.createElement('div');
      oldNum.className = 'pas-diff-num pas-diff-num-old';
      oldNum.textContent = line.oldLineNumber !== null ? String(line.oldLineNumber) : '';

      const newNum = document.createElement('div');
      newNum.className = 'pas-diff-num pas-diff-num-new';
      newNum.textContent = line.newLineNumber !== null ? String(line.newLineNumber) : '';

      const marker = document.createElement('div');
      marker.className = 'pas-diff-marker';
      marker.textContent = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

      const content = document.createElement('div');
      content.className = 'pas-diff-content';
      content.textContent = line.content;

      row.append(oldNum, newNum, marker, content);
      table.append(row);
    }

    wrapper.append(statsBar, table);
    container.append(wrapper);
  }
}
