/**
 * Gaming Esports Hub - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #610 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing competitive tournament schedules, prize pool manifests,
 * and arena telemetry audits into downloadable formats (JSON, CSV, and Markdown audit summary) with automated downloading.
 */

export class GamingEsportsHubExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='gaming-esports-hub-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'gaming-esports-hub-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample competitive esports tournament dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'ESP-101',
        title: 'VCT Champions Grand Final',
        category: 'FPS',
        game: 'Valorant',
        prizePool: 2250000,
        viewers: 1450000,
        organizer: 'Riot Games Esports',
        status: 'Scheduled',
        lastUpdated: '2026-03-10'
      },
      {
        id: 'ESP-102',
        title: 'Worlds Championship Semis, "Upper Bracket"',
        category: 'MOBA',
        game: 'League of Legends',
        prizePool: 3500000,
        viewers: 2800000,
        organizer: 'LoL Esports Global',
        status: 'Live',
        lastUpdated: '2026-04-01'
      },
      {
        id: 'ESP-103',
        title: 'Major Antwerp Decider\n[Best of 5]',
        category: 'FPS',
        game: 'CS2',
        prizePool: 1250000,
        viewers: 890000,
        organizer: 'PGL Esports',
        status: 'Completed',
        lastUpdated: '2026-01-15'
      },
      {
        id: 'ESP-104',
        title: 'The International Aegis Match',
        category: 'MOBA',
        game: 'Dota 2',
        prizePool: 18000000,
        viewers: 1100000,
        organizer: 'Valve Corporation',
        status: 'Scheduled',
        lastUpdated: '2026-03-22'
      },
      {
        id: 'ESP-105',
        title: 'Apex Global Series Championship',
        category: 'Battle Royale',
        game: 'Apex Legends',
        prizePool: 2000000,
        viewers: 620000,
        organizer: 'Respawn Entertainment',
        status: 'Completed',
        lastUpdated: '2026-02-18'
      },
      {
        id: 'ESP-106',
        title: 'Evo Top 8 Grand Finals',
        category: 'Fighting',
        game: 'Street Fighter 6',
        prizePool: 500000,
        viewers: 410000,
        organizer: 'Evolution Championship',
        status: 'Live',
        lastUpdated: '2026-04-12'
      }
    ];
  }

  /**
   * Updates data records
   * @param {Array<object>} data
   * @returns {Array<object>}
   */
  setData(data) {
    if (!Array.isArray(data)) {
      throw new TypeError('setData requires an array of record objects');
    }
    this.data = [...data];
    return this.data;
  }

  /**
   * Retrieves active records
   * @returns {Array<object>}
   */
  getData() {
    return [...this.data];
  }

  /**
   * Serializes current data into formatted JSON string
   * @param {Array<object>} [data=this.data]
   * @param {number} [indent=2]
   * @returns {string}
   */
  toJSON(data = this.data, indent = 2) {
    const records = Array.isArray(data) ? data : this.data;
    return JSON.stringify(records, null, indent);
  }

  /**
   * Converts data into a JSON Blob
   * @param {Array<object>} [data=this.data]
   * @param {number} [indent=2]
   * @returns {Blob}
   */
  toJSONBlob(data = this.data, indent = 2) {
    const jsonStr = this.toJSON(data, indent);
    const mimeType = 'application/json;charset=utf-8';
    if (typeof Blob !== 'undefined') {
      return new Blob([jsonStr], { type: mimeType });
    }
    return {
      size: Buffer.byteLength(jsonStr, 'utf8'),
      type: mimeType,
      text: async () => jsonStr
    };
  }

  /**
   * Escapes a single CSV value compliant with RFC 4180
   * @param {*} value
   * @param {string} [delimiter=',']
   * @returns {string}
   */
  escapeCSVValue(value, delimiter = ',') {
    if (value === null || value === undefined) {
      return '';
    }

    let str = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const needsQuotes =
      str.includes(delimiter) ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r');

    if (needsQuotes) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Converts dataset into RFC-4180 compliant CSV string
   * @param {Array<object>} [data=this.data]
   * @param {object} [options={}]
   * @param {Array<string>} [options.headers]
   * @param {string} [options.delimiter=',']
   * @param {boolean} [options.includeHeaders=true]
   * @returns {string}
   */
  toCSVString(data = this.data, options = {}) {
    const records = Array.isArray(data) ? data : this.data;
    if (records.length === 0) return '';

    const delimiter = options.delimiter || ',';
    const includeHeaders = options.includeHeaders !== false;

    let headers = options.headers;
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      const keysSet = new Set();
      records.forEach(row => {
        if (row && typeof row === 'object') {
          Object.keys(row).forEach(k => keysSet.add(k));
        }
      });
      headers = Array.from(keysSet);
    }

    const lines = [];

    if (includeHeaders) {
      const headerLine = headers
        .map(h => this.escapeCSVValue(h, delimiter))
        .join(delimiter);
      lines.push(headerLine);
    }

    for (const row of records) {
      const rowLine = headers
        .map(h => {
          const val = row ? row[h] : '';
          return this.escapeCSVValue(val, delimiter);
        })
        .join(delimiter);
      lines.push(rowLine);
    }

    return lines.join('\r\n');
  }

  /**
   * Converts dataset into a CSV Blob
   * @param {Array<object>} [data=this.data]
   * @param {object} [options={}]
   * @returns {Blob}
   */
  toCSVBlob(data = this.data, options = {}) {
    const csvStr = this.toCSVString(data, options);
    const mimeType = 'text/csv;charset=utf-8';
    if (typeof Blob !== 'undefined') {
      return new Blob([csvStr], { type: mimeType });
    }
    return {
      size: Buffer.byteLength(csvStr, 'utf8'),
      type: mimeType,
      text: async () => csvStr
    };
  }

  /**
   * Computes tournament prize and viewership metrics for esports reports
   * @param {Array<object>} [data=this.data]
   * @returns {object}
   */
  generateAuditMetrics(data = this.data) {
    const records = Array.isArray(data) ? data : this.data;
    if (records.length === 0) {
      return {
        totalTournaments: 0,
        totalPrizePool: 0,
        avgPrizePool: 0,
        categories: {}
      };
    }

    let totalPrizePool = 0;
    const categories = {};

    records.forEach(item => {
      const prize = Number(item.prizePool) || 0;
      totalPrizePool += prize;

      const cat = item.category || 'Tournament';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const avgPrizePool = Math.round((totalPrizePool / records.length) * 100) / 100;

    return {
      totalTournaments: records.length,
      totalPrizePool: Math.round(totalPrizePool * 100) / 100,
      avgPrizePool,
      categories
    };
  }

  /**
   * Generates formatted Markdown Audit Summary report
   * @param {Array<object>} [data=this.data]
   * @returns {string}
   */
  toMarkdownAudit(data = this.data) {
    const records = Array.isArray(data) ? data : this.data;
    const metrics = this.generateAuditMetrics(records);
    const dateFormatted = new Date().toISOString().slice(0, 10);

    let md = `# Gaming Esports Hub - Tournament & Arena Audit Report\n\n`;
    md += `*Generated automatically on ${dateFormatted} via GamingEsportsHubExportEngine*\n\n`;
    md += `## Executive Summary\n\n`;
    md += `- **Total Premier Tournaments:** ${metrics.totalTournaments}\n`;
    md += `- **Cumulative Prize Pool:** \$${metrics.totalPrizePool.toLocaleString()}\n`;
    md += `- **Average Championship Bounty:** \$${metrics.avgPrizePool.toLocaleString()}\n\n`;

    md += `### Category Breakdown\n\n`;
    if (Object.keys(metrics.categories).length > 0) {
      for (const [category, count] of Object.entries(metrics.categories)) {
        md += `- **${category}:** ${count} tournament(s)\n`;
      }
    } else {
      md += `*No esports categories registered.*\n`;
    }

    md += `\n## Tournament Manifest\n\n`;

    if (records.length === 0) {
      md += `*No esports tournament records currently loaded in view state.*\n`;
      return md;
    }

    const headers = Object.keys(records[0]);
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;

    for (const row of records) {
      const rowVals = headers.map(h => {
        let val = row[h];
        if (typeof val === 'number' && h === 'prizePool') {
          return `\$${val.toLocaleString()}`;
        }
        if (typeof val === 'string') {
          return val.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
        }
        return val !== undefined && val !== null ? String(val) : '';
      });
      md += `| ${rowVals.join(' | ')} |\n`;
    }

    return md;
  }

  /**
   * Sanitizes filenames for safe client-side downloading
   * @param {string} rawName
   * @param {string} [defaultExt='json']
   * @returns {string}
   */
  sanitizeFilename(rawName, defaultExt = 'json') {
    if (!rawName || typeof rawName !== 'string') {
      return `${this.filenamePrefix}.${defaultExt}`;
    }

    let clean = rawName
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_');

    const ext = defaultExt.replace(/^\./, '');
    if (!clean.endsWith(`.${ext}`)) {
      return `${clean}.${ext}`;
    }
    return clean;
  }

  /**
   * Formats bytes into readable units
   * @param {number} bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (!bytes || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let b = bytes;
    while (b >= 1024 && i < units.length - 1) {
      b /= 1024;
      i++;
    }
    return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  /**
   * Client-side automated file downloader
   * @param {string} filename
   * @param {Blob|string} blobOrContent
   * @param {string} [mimeType='text/plain']
   * @returns {boolean}
   */
  triggerDownload(filename, blobOrContent, mimeType = 'text/plain') {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    let blob;
    if (blobOrContent instanceof Blob) {
      blob = blobOrContent;
    } else {
      blob = new Blob([String(blobOrContent)], { type: mimeType });
    }

    const sanitized = this.sanitizeFilename(filename);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitized;
    link.style.display = 'none';

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
    const exportEngine = new GamingEsportsHubExportEngine();

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
        exportEngine.triggerDownload(`gaming-esports-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Tournament data successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`gaming-esports-${dateStr}.csv`, blob, 'text/csv');
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
