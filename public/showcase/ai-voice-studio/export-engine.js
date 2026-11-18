/**
 * AI Voice Studio - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #638 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing neural voice profiles, DSP audio mastering telemetry,
 * and vocoder benchmarks into downloadable formats (JSON, CSV, and Markdown audit summary) with automated downloading.
 */

export class AiVoiceStudioExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='ai-voice-studio-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'ai-voice-studio-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample neural voice dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'VOICE-101',
        name: 'Aura Broadcast Pro',
        voiceType: 'Narrative',
        accent: 'American Neutral',
        sampleRate: 48000,
        clarityScore: 99.4,
        latencyMs: 2.1,
        tier: 'Enterprise',
        updatedDate: '2026-03-12'
      },
      {
        id: 'VOICE-102',
        name: 'Sol Modern, "Conversational RP"',
        voiceType: 'Conversational',
        accent: 'British RP',
        sampleRate: 48000,
        clarityScore: 97.8,
        latencyMs: 1.8,
        tier: 'Community',
        updatedDate: '2026-03-24'
      },
      {
        id: 'VOICE-103',
        name: 'Zephyr Cinematic Drama',
        voiceType: 'Character',
        accent: 'Mid-Atlantic',
        sampleRate: 96000,
        clarityScore: 99.1,
        latencyMs: 3.4,
        tier: 'Enterprise',
        updatedDate: '2026-04-02'
      },
      {
        id: 'VOICE-104',
        name: 'Vesper Calm Meditation',
        voiceType: 'Relaxation',
        accent: 'Australian Warm',
        sampleRate: 44100,
        clarityScore: 98.2,
        latencyMs: 2.6,
        tier: 'Community',
        updatedDate: '2026-04-10'
      },
      {
        id: 'VOICE-105',
        name: 'Titan Industrial\nBroadcast Announcer',
        voiceType: 'Commercial',
        accent: 'North American Booming',
        sampleRate: 48000,
        clarityScore: 96.9,
        latencyMs: 1.9,
        tier: 'Enterprise',
        updatedDate: '2026-04-20'
      }
    ];
  }

  /**
   * Sets dataset for export
   * @param {Array<object>} items
   */
  setData(items) {
    if (Array.isArray(items)) {
      this.data = [...items];
    }
  }

  /**
   * Serializes current data into formatted JSON string
   * @param {boolean} [pretty=true]
   * @returns {string}
   */
  toJSON(pretty = true) {
    return pretty ? JSON.stringify(this.data, null, 2) : JSON.stringify(this.data);
  }

  /**
   * Generates a Blob with JSON data
   * @returns {Blob}
   */
  toJSONBlob() {
    const jsonString = this.toJSON(true);
    return new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  }

  /**
   * Serializes current dataset into CSV string according to RFC 4180
   * @param {object} [options={}]
   * @param {string} [options.delimiter=',']
   * @param {Array<string>} [options.columns]
   * @returns {string}
   */
  toCSVString(options = {}) {
    if (!this.data || this.data.length === 0) {
      return '';
    }

    const delimiter = options.delimiter || ',';
    const columns = options.columns || Object.keys(this.data[0]);

    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = columns.map(col => escapeCell(col)).join(delimiter);
    const dataRows = this.data.map(row => {
      return columns.map(col => escapeCell(row[col])).join(delimiter);
    });

    return [headerRow, ...dataRows].join('\r\n');
  }

  /**
   * Generates a Blob with CSV data
   * @returns {Blob}
   */
  toCSVBlob() {
    const csvString = this.toCSVString();
    return new Blob([csvString], { type: 'text/csv;charset=utf-8' });
  }

  /**
   * Generates a formatted Markdown Audit Summary report
   * @returns {string}
   */
  toMarkdownAudit() {
    const totalCount = this.data.length;
    if (totalCount === 0) {
      return '# AI Voice Studio - Model Audit Report\n\n*No neural voice records available.*';
    }

    const avgClarity = (this.data.reduce((sum, item) => sum + (item.clarityScore || 0), 0) / totalCount).toFixed(1);
    const topClarity = [...this.data].sort((a, b) => (b.clarityScore || 0) - (a.clarityScore || 0))[0];
    const fastest = [...this.data].sort((a, b) => (a.latencyMs || 99) - (b.latencyMs || 99))[0];

    let md = `# AI Voice Studio - Neural Model Catalog Audit\n\n`;
    md += `**Generated On:** ${new Date().toISOString().slice(0, 10)}\n`;
    md += `**Total Catalog Voices:** ${totalCount}\n`;
    md += `**Average Clarity Index:** ${avgClarity}%\n`;
    md += `**Highest Fidelity Model:** ${topClarity ? `${topClarity.name} (${topClarity.clarityScore}%)` : 'N/A'}\n`;
    md += `**Fastest Realtime Latency:** ${fastest ? `${fastest.name} (${fastest.latencyMs}ms)` : 'N/A'}\n\n`;

    md += `### Neural Voice Model Manifest\n\n`;
    md += `| ID | Model Name | Voice Type | Accent | DSP Rate | Clarity | Latency | Tier |\n`;
    md += `|:---|:---|:---|:---|:---|:---|:---|:---|\n`;

    this.data.forEach(item => {
      const cleanName = String(item.name || '').replace(/[\r\n]+/g, ' ');
      const rateStr = item.sampleRate ? `${item.sampleRate / 1000} kHz` : 'N/A';
      md += `| ${item.id || ''} | ${cleanName} | ${item.voiceType || ''} | ${item.accent || ''} | ${rateStr} | ${item.clarityScore || 0}% | ${item.latencyMs || 0}ms | ${item.tier || ''} |\n`;
    });

    md += `\n*Report client-generated by AI Voice Studio Export Engine.*`;
    return md;
  }

  /**
   * Sanitizes a string for use as a file name
   * @param {string} name
   * @returns {string}
   */
  sanitizeFilename(name) {
    if (!name) return 'export';
    return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
  }

  /**
   * Formats byte size into human readable string
   * @param {number} bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = (bytes / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 2);
    return `${size} ${units[idx]}`;
  }

  /**
   * Triggers download in the browser environment
   * @param {string} filename
   * @param {Blob|string} content
   * @param {string} [mimeType='application/octet-stream']
   * @returns {boolean}
   */
  triggerDownload(filename, content, mimeType = 'application/octet-stream') {
    if (typeof document === 'undefined') {
      return false;
    }

    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.sanitizeFilename(filename);

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);

    this.lastExportTimestamp = Date.now();
    return true;
  }
}

// Browser UI initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const exportEngine = new AiVoiceStudioExportEngine();

    const dropdownToggle = document.getElementById('exportDropdownToggle');
    const dropdownMenu = document.getElementById('exportDropdownMenu');
    const btnDownloadJSON = document.getElementById('btnExportJSON');
    const btnDownloadCSV = document.getElementById('btnExportCSV');
    const btnCopyMarkdown = document.getElementById('btnExportMarkdown');
    const toastNotice = document.getElementById('exportToast');
    const previewContainer = document.getElementById('exportPreviewArea');
    const previewTabs = document.querySelectorAll('.preview-tab');

    function showToast(message) {
      if (!toastNotice) return;
      toastNotice.textContent = message;
      toastNotice.classList.add('visible');
      setTimeout(() => {
        toastNotice.classList.remove('visible');
      }, 3000);
    }

    function renderPreview(mode = 'json') {
      if (!previewContainer) return;
      if (mode === 'json') {
        previewContainer.textContent = exportEngine.toJSON();
      } else if (mode === 'csv') {
        previewContainer.textContent = exportEngine.toCSVString();
      } else if (mode === 'markdown') {
        previewContainer.textContent = exportEngine.toMarkdownAudit();
      }
    }

    if (dropdownToggle && dropdownMenu) {
      dropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== dropdownToggle) {
          dropdownMenu.classList.remove('open');
        }
      });
    }

    if (btnDownloadJSON) {
      btnDownloadJSON.addEventListener('click', () => {
        const blob = exportEngine.toJSONBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`ai-voices-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Voices data successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`ai-voices-${dateStr}.csv`, blob, 'text/csv');
        showToast('CSV Table exported successfully!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnCopyMarkdown) {
      btnCopyMarkdown.addEventListener('click', async () => {
        const markdown = exportEngine.toMarkdownAudit();
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(markdown);
            showToast('Markdown Audit Summary copied to clipboard!');
          } else {
            showToast('Clipboard access unavailable.');
          }
        } catch {
          showToast('Failed to copy to clipboard.');
        }
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    previewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        previewTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderPreview(tab.dataset.mode);
      });
    });

    renderPreview('json');
  });
}
