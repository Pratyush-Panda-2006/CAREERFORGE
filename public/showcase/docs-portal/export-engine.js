/**
 * Docs Portal - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #594 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing documentation catalogs, technical guides,
 * and knowledge base nodes into downloadable formats (JSON, CSV, and Markdown audit summary) with automated downloading.
 */

export class DocsPortalExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='docs-portal-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'docs-portal-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample documentation articles and schema dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'DOC-101',
        title: 'Authentication & JWT Handshake',
        category: 'Security',
        section: 'Guides',
        words: 1850,
        readTime: 7,
        author: 'Security Core Team',
        status: 'Published',
        lastUpdated: '2026-03-10'
      },
      {
        id: 'DOC-102',
        title: 'GraphQL Schema Federation, "v2"',
        category: 'API Reference',
        section: 'Reference',
        words: 3200,
        readTime: 12,
        author: 'API Platform Guild',
        status: 'Published',
        lastUpdated: '2026-04-01'
      },
      {
        id: 'DOC-103',
        title: 'Microservices Quickstart\n[Clustered Setup]',
        category: 'Getting Started',
        section: 'Tutorials',
        words: 1200,
        readTime: 5,
        author: 'DevRel Team',
        status: 'Published',
        lastUpdated: '2026-01-15'
      },
      {
        id: 'DOC-104',
        title: 'WebAssembly SIMD Acceleration',
        category: 'Performance',
        section: 'Deep Dives',
        words: 4100,
        readTime: 16,
        author: 'Performance Lab',
        status: 'Draft',
        lastUpdated: '2026-03-22'
      },
      {
        id: 'DOC-105',
        title: 'Webhooks Event Streaming',
        category: 'Integration',
        section: 'Guides',
        words: 2100,
        readTime: 8,
        author: 'Integrations Guild',
        status: 'Published',
        lastUpdated: '2026-02-18'
      },
      {
        id: 'DOC-106',
        title: 'eBPF Kernel Observability Agent',
        category: 'Observability',
        section: 'Deep Dives',
        words: 4600,
        readTime: 18,
        author: 'Infra & Systems',
        status: 'Published',
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
   * Generates summary metrics from documentation records
   * @param {Array<object>} [data=this.data]
   * @returns {object}
   */
  generateAuditMetrics(data = this.data) {
    const records = Array.isArray(data) ? data : this.data;
    const totalDocs = records.length;
    let totalWords = 0;
    let totalReadTime = 0;
    const categoryCounts = {};
    const sectionCounts = {};

    for (const item of records) {
      if (typeof item.words === 'number') totalWords += item.words;
      if (typeof item.readTime === 'number') totalReadTime += item.readTime;

      if (item.category) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
      if (item.section) {
        sectionCounts[item.section] = (sectionCounts[item.section] || 0) + 1;
      }
    }

    const avgWords = totalDocs > 0 ? Math.round(totalWords / totalDocs) : 0;

    return {
      totalDocs,
      totalWords,
      totalReadTime,
      avgWords,
      categoryCounts,
      sectionCounts
    };
  }

  /**
   * Formats Markdown Documentation Audit Report
   * @param {Array<object>} [data=this.data]
   * @param {string} [title='Docs Portal - Knowledge Base Audit']
   * @returns {string}
   */
  toMarkdownAudit(data = this.data, title = 'Docs Portal - Knowledge Base Audit') {
    const records = Array.isArray(data) ? data : this.data;
    const metrics = this.generateAuditMetrics(records);
    const timestamp = new Date().toISOString();

    const sections = [
      `# ${title}`,
      `> Generated on: \`${timestamp}\` | Platform: **Docs Portal Core**`,
      '',
      '## 📚 Knowledge Base Volume Metrics',
      `- **Total Documented Articles:** ${metrics.totalDocs}`,
      `- **Total Word Count:** ${metrics.totalWords.toLocaleString()} words`,
      `- **Cumulative Reading Time:** ~${metrics.totalReadTime} minutes`,
      `- **Average Article Length:** ${metrics.avgWords.toLocaleString()} words`,
      '',
      '## 📂 Category Breakdown',
      Object.entries(metrics.categoryCounts)
        .map(([cat, count]) => `- **${cat}:** ${count} articles (${Math.round((count / (metrics.totalDocs || 1)) * 100)}%)`)
        .join('\n'),
      '',
      '## 📑 Documentation Ledger'
    ];

    if (records.length === 0) {
      sections.push('_No documentation records currently loaded._');
      return sections.join('\n');
    }

    const headers = Object.keys(records[0]);
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = records.map(rec => {
      const row = headers.map(h => {
        let val = rec[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number' && h.toLowerCase().includes('words')) return `${val.toLocaleString()} words`;
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
    const exportEngine = new DocsPortalExportEngine();

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
        exportEngine.triggerDownload(`docs-portal-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Dataset successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`docs-portal-${dateStr}.csv`, blob, 'text/csv');
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
