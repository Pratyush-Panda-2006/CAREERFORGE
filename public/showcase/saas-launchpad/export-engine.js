/**
 * SaaS Launchpad - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #586 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing tabular/metric state into
 * downloadable formats (JSON, CSV, and formatted Markdown audit summary) with automated downloading.
 */

export class SaasLaunchpadExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='saas-metrics-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'saas-metrics-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample subscription dataset for SaaS metrics showcase
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'SUB-101',
        company: 'Acme Cloud Dynamics',
        tier: 'Enterprise',
        mrr: 4500,
        status: 'Active',
        seats: 120,
        churnRisk: 'Low',
        region: 'US-East',
        joinedAt: '2025-02-14'
      },
      {
        id: 'SUB-102',
        company: 'HyperScale Systems',
        tier: 'Enterprise',
        mrr: 7200,
        status: 'Active',
        seats: 250,
        churnRisk: 'Medium',
        region: 'EU-Central',
        joinedAt: '2025-04-10'
      },
      {
        id: 'SUB-103',
        company: 'Veloce AI Labs, "Inc."',
        tier: 'Growth',
        mrr: 1800,
        status: 'Active',
        seats: 45,
        churnRisk: 'Low',
        region: 'US-West',
        joinedAt: '2025-06-22'
      },
      {
        id: 'SUB-104',
        company: 'FinPulse Analytics\n[Global]',
        tier: 'Growth',
        mrr: 2100,
        status: 'Trial',
        seats: 30,
        churnRisk: 'High',
        region: 'AP-South',
        joinedAt: '2025-09-01'
      },
      {
        id: 'SUB-105',
        company: 'NorthStar Media',
        tier: 'Starter',
        mrr: 490,
        status: 'Active',
        seats: 12,
        churnRisk: 'Low',
        region: 'US-East',
        joinedAt: '2025-11-15'
      },
      {
        id: 'SUB-106',
        company: 'QuantMatrix Partners',
        tier: 'Enterprise',
        mrr: 5600,
        status: 'Past Due',
        seats: 180,
        churnRisk: 'High',
        region: 'EU-West',
        joinedAt: '2025-12-05'
      }
    ];
  }

  /**
   * Sets new data array
   * @param {Array<object>} data
   */
  setData(data) {
    if (!Array.isArray(data)) {
      throw new TypeError('setData requires an array of record objects');
    }
    this.data = [...data];
    return this.data;
  }

  /**
   * Returns current dataset
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
    // Safe Node fallback if Blob is unavailable
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

    // If string contains delimiter, double quote, or newlines, quote and escape
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
    if (records.length === 0) {
      return '';
    }

    const delimiter = options.delimiter || ',';
    const includeHeaders = options.includeHeaders !== false;

    // Determine column headers
    const headers = options.headers || Object.keys(records[0]);
    const lines = [];

    if (includeHeaders) {
      const headerLine = headers
        .map(h => this.escapeCSVValue(h, delimiter))
        .join(delimiter);
      lines.push(headerLine);
    }

    for (const record of records) {
      const row = headers.map(header => {
        const val = record[header];
        return this.escapeCSVValue(val, delimiter);
      });
      lines.push(row.join(delimiter));
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
    const csvContent = this.toCSVString(data, options);
    const mimeType = 'text/csv;charset=utf-8';
    if (typeof Blob !== 'undefined') {
      return new Blob([csvContent], { type: mimeType });
    }
    return {
      size: Buffer.byteLength(csvContent, 'utf8'),
      type: mimeType,
      text: async () => csvContent
    };
  }

  /**
   * Generates summary metrics from current records
   * @param {Array<object>} [data=this.data]
   * @returns {object}
   */
  generateAuditMetrics(data = this.data) {
    const records = Array.isArray(data) ? data : this.data;
    const totalRecords = records.length;
    let totalMRR = 0;
    let totalSeats = 0;
    const tierCounts = {};
    const riskCounts = {};
    const statusCounts = {};

    for (const item of records) {
      if (typeof item.mrr === 'number') totalMRR += item.mrr;
      if (typeof item.seats === 'number') totalSeats += item.seats;

      if (item.tier) {
        tierCounts[item.tier] = (tierCounts[item.tier] || 0) + 1;
      }
      if (item.churnRisk) {
        riskCounts[item.churnRisk] = (riskCounts[item.churnRisk] || 0) + 1;
      }
      if (item.status) {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      }
    }

    const avgMRR = totalRecords > 0 ? Math.round(totalMRR / totalRecords) : 0;
    const arr = totalMRR * 12;

    return {
      totalRecords,
      totalMRR,
      arr,
      avgMRR,
      totalSeats,
      tierCounts,
      riskCounts,
      statusCounts
    };
  }

  /**
   * Generates formatted Markdown Audit Summary report
   * @param {Array<object>} [data=this.data]
   * @param {string} [title='SaaS Launchpad - Executive Portfolio Audit']
   * @returns {string}
   */
  toMarkdownAudit(data = this.data, title = 'SaaS Launchpad - Executive Portfolio Audit') {
    const records = Array.isArray(data) ? data : this.data;
    const metrics = this.generateAuditMetrics(records);
    const timestamp = new Date().toISOString();

    const sections = [
      `# ${title}`,
      `> Generated on: \`${timestamp}\` | Platform: **SaaS Launchpad Core**`,
      '',
      '## 📊 Executive KPI Snapshot',
      `- **Total Subscriptions:** ${metrics.totalRecords}`,
      `- **Monthly Recurring Revenue (MRR):** $${metrics.totalMRR.toLocaleString()}`,
      `- **Annual Run Rate (ARR):** $${metrics.arr.toLocaleString()}`,
      `- **Average Revenue Per Account (ARPU):** $${metrics.avgMRR.toLocaleString()}`,
      `- **Active Seat Allocation:** ${metrics.totalSeats.toLocaleString()} seats`,
      '',
      '## 🏷️ Tier Breakdown',
      Object.entries(metrics.tierCounts)
        .map(([tier, count]) => `- **${tier}:** ${count} accounts (${Math.round((count / (metrics.totalRecords || 1)) * 100)}%)`)
        .join('\n'),
      '',
      '## 📋 Account Ledger'
    ];

    if (records.length === 0) {
      sections.push('_No account records currently loaded._');
      return sections.join('\n');
    }

    const headers = Object.keys(records[0]);
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = records.map(rec => {
      const row = headers.map(h => {
        let val = rec[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number' && h.toLowerCase().includes('mrr')) return `$${val.toLocaleString()}`;
        return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      });
      return `| ${row.join(' | ')} |`;
    });

    sections.push(headerRow);
    sections.push(separatorRow);
    sections.push(...dataRows);

    return sections.join('\n');
  }

  /**
   * Cleans filename removing illegal filesystem characters
   * @param {string} name
   * @param {string} [ext='']
   * @returns {string}
   */
  sanitizeFilename(name, ext = '') {
    if (!name || typeof name !== 'string') {
      name = this.filenamePrefix;
    }
    let clean = name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').trim();
    if (ext && !clean.endsWith(`.${ext}`)) {
      return `${clean}.${ext}`;
    }
    return clean;
  }

  /**
   * Helper formatting bytes into readable string (KB, MB)
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
    const exportEngine = new SaasLaunchpadExportEngine();

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
        exportEngine.triggerDownload(`saas-dataset-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Dataset successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`saas-accounts-${dateStr}.csv`, blob, 'text/csv');
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
