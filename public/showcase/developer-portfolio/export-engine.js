/**
 * Developer Portfolio - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #590 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing developer projects, repositories,
 * and skill matrices into downloadable formats (JSON, CSV, and Markdown audit summary) with automated downloading.
 */

export class DeveloperPortfolioExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='developer-portfolio-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'developer-portfolio-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample developer repository and project dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'REPO-01',
        title: 'Neural Vision WASM',
        category: 'AI & Compilers',
        language: 'Rust',
        stars: 1240,
        forks: 185,
        license: 'MIT',
        status: 'Active',
        lastCommit: '2026-03-15'
      },
      {
        id: 'REPO-02',
        title: 'Quantum Key Protocol, "Inc."',
        category: 'Cryptography',
        language: 'Go',
        stars: 890,
        forks: 94,
        license: 'Apache-2.0',
        status: 'Active',
        lastCommit: '2026-02-28'
      },
      {
        id: 'REPO-03',
        title: 'HyperFlux Distributed DB\n[Clustered]',
        category: 'Distributed Systems',
        language: 'Rust',
        stars: 3450,
        forks: 410,
        license: 'MPL-2.0',
        status: 'Active',
        lastCommit: '2026-04-02'
      },
      {
        id: 'REPO-04',
        title: 'Aura UI Design System',
        category: 'Frontend',
        language: 'TypeScript',
        stars: 620,
        forks: 78,
        license: 'MIT',
        status: 'Maintenance',
        lastCommit: '2026-01-19'
      },
      {
        id: 'REPO-05',
        title: 'EdgePulse Telemetry',
        category: 'DevOps & Systems',
        language: 'C',
        stars: 1980,
        forks: 230,
        license: 'GPL-3.0',
        status: 'Active',
        lastCommit: '2026-03-24'
      },
      {
        id: 'REPO-06',
        title: 'Veloce GraphQL Router',
        category: 'Backend & API',
        language: 'TypeScript',
        stars: 1540,
        forks: 160,
        license: 'MIT',
        status: 'Active',
        lastCommit: '2026-04-10'
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
    if (records.length === 0) {
      return '';
    }

    const delimiter = options.delimiter || ',';
    const includeHeaders = options.includeHeaders !== false;

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
   * Generates summary metrics from repository records
   * @param {Array<object>} [data=this.data]
   * @returns {object}
   */
  generateAuditMetrics(data = this.data) {
    const records = Array.isArray(data) ? data : this.data;
    const totalProjects = records.length;
    let totalStars = 0;
    let totalForks = 0;
    const langCounts = {};
    const categoryCounts = {};

    for (const item of records) {
      if (typeof item.stars === 'number') totalStars += item.stars;
      if (typeof item.forks === 'number') totalForks += item.forks;

      if (item.language) {
        langCounts[item.language] = (langCounts[item.language] || 0) + 1;
      }
      if (item.category) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    }

    const avgStars = totalProjects > 0 ? Math.round(totalStars / totalProjects) : 0;

    return {
      totalProjects,
      totalStars,
      totalForks,
      avgStars,
      langCounts,
      categoryCounts
    };
  }

  /**
   * Formats Markdown Portfolio Audit Report
   * @param {Array<object>} [data=this.data]
   * @param {string} [title='Developer Portfolio - Repository & Skillset Audit']
   * @returns {string}
   */
  toMarkdownAudit(data = this.data, title = 'Developer Portfolio - Repository & Skillset Audit') {
    const records = Array.isArray(data) ? data : this.data;
    const metrics = this.generateAuditMetrics(records);
    const timestamp = new Date().toISOString();

    const sections = [
      `# ${title}`,
      `> Generated on: \`${timestamp}\` | Platform: **Developer Portfolio Core**`,
      '',
      '## 🌟 Repository Portfolio Metrics',
      `- **Total Repositories:** ${metrics.totalProjects}`,
      `- **Cumulative GitHub Stars:** ★ ${metrics.totalStars.toLocaleString()}`,
      `- **Cumulative Network Forks:** ⑂ ${metrics.totalForks.toLocaleString()}`,
      `- **Average Stars Per Repo:** ★ ${metrics.avgStars.toLocaleString()}`,
      '',
      '## 💻 Languages & Tech Distribution',
      Object.entries(metrics.langCounts)
        .map(([lang, count]) => `- **${lang}:** ${count} projects (${Math.round((count / (metrics.totalProjects || 1)) * 100)}%)`)
        .join('\n'),
      '',
      '## 📑 Project Ledger'
    ];

    if (records.length === 0) {
      sections.push('_No repository records currently loaded._');
      return sections.join('\n');
    }

    const headers = Object.keys(records[0]);
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = records.map(rec => {
      const row = headers.map(h => {
        let val = rec[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number' && h.toLowerCase().includes('stars')) return `★ ${val.toLocaleString()}`;
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
    const clean = name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').trim();
    if (ext && !clean.endsWith(`.${ext}`)) {
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
    const exportEngine = new DeveloperPortfolioExportEngine();

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
        exportEngine.triggerDownload(`dev-portfolio-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Dataset successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`dev-portfolio-${dateStr}.csv`, blob, 'text/csv');
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
