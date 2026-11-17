/**
 * Smart IoT Nexus - Visual State & Text Change Diff Inspector
 * Line-by-line diff algorithm comparing IoT firmware parameters, MQTT ACL rules, and sensor calibration metrics.
 */

export class SmartIotNexusDiffInspector {
  constructor() {
    this.diffLines = [];
    this.metrics = {
      added: 0,
      removed: 0,
      unchanged: 0,
      totalLines: 0,
      changePercent: 0
    };
  }

  computeDiff(originalText = '', modifiedText = '') {
    const origLines = String(originalText).split('\n');
    const modLines = String(modifiedText).split('\n');

    this.diffLines = [];
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    let i = 0;
    let j = 0;

    while (i < origLines.length && j < modLines.length) {
      if (origLines[i] === modLines[j]) {
        this.diffLines.push({
          type: 'unchanged',
          origLineNum: i + 1,
          modLineNum: j + 1,
          content: origLines[i]
        });
        unchanged++;
        i++;
        j++;
      } else {
        let foundInMod = -1;
        for (let k = j + 1; k < Math.min(j + 6, modLines.length); k++) {
          if (origLines[i] === modLines[k]) {
            foundInMod = k;
            break;
          }
        }

        if (foundInMod !== -1) {
          while (j < foundInMod) {
            this.diffLines.push({
              type: 'added',
              origLineNum: null,
              modLineNum: j + 1,
              content: modLines[j]
            });
            added++;
            j++;
          }
        } else {
          this.diffLines.push({
            type: 'removed',
            origLineNum: i + 1,
            modLineNum: null,
            content: origLines[i]
          });
          removed++;
          i++;
        }
      }
    }

    while (i < origLines.length) {
      this.diffLines.push({
        type: 'removed',
        origLineNum: i + 1,
        modLineNum: null,
        content: origLines[i]
      });
      removed++;
      i++;
    }

    while (j < modLines.length) {
      this.diffLines.push({
        type: 'added',
        origLineNum: null,
        modLineNum: j + 1,
        content: modLines[j]
      });
      added++;
      j++;
    }

    const totalLines = this.diffLines.length;
    const changed = added + removed;
    const changePercent = totalLines > 0 ? Number(((changed / totalLines) * 100).toFixed(1)) : 0;

    this.metrics = {
      added,
      removed,
      unchanged,
      totalLines,
      changePercent
    };

    return this.diffLines;
  }

  generateUnifiedView() {
    return this.diffLines.map(line => {
      const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  ';
      return `${prefix}${line.content}`;
    }).join('\n');
  }

  getChangeMetrics() {
    return { ...this.metrics };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const diffContainer = document.getElementById('diffOutputContainer');
    if (!diffContainer) return;

    const inspector = new SmartIotNexusDiffInspector();

    const origInput = document.getElementById('origTextInput');
    const modInput = document.getElementById('modTextInput');
    const compareBtn = document.getElementById('compareDiffBtn');
    const sampleBtn = document.getElementById('loadSampleDiffBtn');

    const statAdded = document.getElementById('statAddedLines');
    const statRemoved = document.getElementById('statRemovedLines');
    const statUnchanged = document.getElementById('statUnchangedLines');
    const statPercent = document.getElementById('statChangePercent');

    function renderDiff() {
      diffContainer.replaceChildren();
      const lines = inspector.diffLines;

      if (lines.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-diff';
        empty.textContent = 'Paste baseline vs target IoT firmware parameters above and click "Run Firmware Diff".';
        diffContainer.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'diff-table';

      for (const item of lines) {
        const tr = document.createElement('tr');
        tr.className = `diff-row row-${item.type}`;

        const tdOrigNum = document.createElement('td');
        tdOrigNum.className = `diff-gutter ${item.type === 'removed' ? 'removed' : ''}`;
        tdOrigNum.textContent = item.origLineNum ? String(item.origLineNum) : '';

        const tdModNum = document.createElement('td');
        tdModNum.className = `diff-gutter ${item.type === 'added' ? 'added' : ''}`;
        tdModNum.textContent = item.modLineNum ? String(item.modLineNum) : '';

        const tdMarker = document.createElement('td');
        tdMarker.className = 'diff-marker';
        tdMarker.textContent = item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' ';

        const tdContent = document.createElement('td');
        tdContent.className = 'diff-content';
        tdContent.textContent = item.content;

        tr.appendChild(tdOrigNum);
        tr.appendChild(tdModNum);
        tr.appendChild(tdMarker);
        tr.appendChild(tdContent);

        table.appendChild(tr);
      }

      diffContainer.appendChild(table);

      const m = inspector.getChangeMetrics();
      if (statAdded) statAdded.textContent = String(m.added);
      if (statRemoved) statRemoved.textContent = String(m.removed);
      if (statUnchanged) statUnchanged.textContent = String(m.unchanged);
      if (statPercent) statPercent.textContent = `${m.changePercent}%`;
    }

    if (compareBtn) {
      compareBtn.addEventListener('click', () => {
        const orig = origInput?.value || '';
        const mod = modInput?.value || '';
        inspector.computeDiff(orig, mod);
        renderDiff();
      });
    }

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        if (origInput) {
          origInput.value = [
            'device_type: EdgeGateway_ESP32_S3',
            'firmware_version: v1.4.2',
            'mqtt_broker: tls://broker.smartiot.net:8883',
            'telemetry_interval_sec: 60',
            'low_power_sleep_mode: false',
            'lora_frequency_mhz: 868.1',
            'ota_server_endpoint: https://ota.smartiot.net/v1/update'
          ].join('\n');
        }
        if (modInput) {
          modInput.value = [
            'device_type: EdgeGateway_ESP32_S3',
            'firmware_version: v2.0.0-PROD',
            'mqtt_broker: tls://edge-us-east.smartiot.net:8883',
            'telemetry_interval_sec: 30',
            'sensor_fusion_kalman_filter: true',
            'low_power_sleep_mode: true',
            'lora_frequency_mhz: 915.0',
            'battery_threshold_mv: 3300',
            'ota_server_endpoint: https://ota.smartiot.net/v2/secure'
          ].join('\n');
        }
        inspector.computeDiff(origInput.value, modInput.value);
        renderDiff();
      });
    }

    renderDiff();
  });
}
