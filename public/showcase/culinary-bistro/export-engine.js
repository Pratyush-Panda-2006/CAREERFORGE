/**
 * Culinary Bistro - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #598 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing dining menus, wine cellar inventory,
 * and service ticket summaries into downloadable formats (JSON, CSV, and Markdown audit summary) with automated downloading.
 */

export class CulinaryBistroExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='culinary-bistro-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'culinary-bistro-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample culinary menu items and kitchen ledger
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'DISH-101',
        title: 'Truffle Glazed Wagyu Ribeye',
        category: 'Mains',
        course: 'Entrée',
        price: 68.50,
        calories: 820,
        chef: 'Chef Antoine',
        status: 'Available',
        lastUpdated: '2026-03-10'
      },
      {
        id: 'DISH-102',
        title: 'Pan-Seared Scallops, "Saffron Butter"',
        category: 'Seafood',
        course: 'Starter',
        price: 28.00,
        calories: 410,
        chef: 'Chef Elena',
        status: 'Available',
        lastUpdated: '2026-04-01'
      },
      {
        id: 'DISH-103',
        title: 'Wild Forest Morel Risotto\n[Aged Parmesan]',
        category: 'Vegetarian',
        course: 'Entrée',
        price: 34.00,
        calories: 620,
        chef: 'Chef Marco',
        status: 'Available',
        lastUpdated: '2026-01-15'
      },
      {
        id: 'DISH-104',
        title: 'Smoked Duck Breast & Cherry Reduction',
        category: 'Poultry',
        course: 'Entrée',
        price: 44.00,
        calories: 740,
        chef: 'Chef Antoine',
        status: 'Seasonal',
        lastUpdated: '2026-03-22'
      },
      {
        id: 'DISH-105',
        title: 'Citrus Infused Hamachi Crudo',
        category: 'Raw Bar',
        course: 'Starter',
        price: 24.50,
        calories: 310,
        chef: 'Chef Elena',
        status: 'Available',
        lastUpdated: '2026-02-18'
      },
      {
        id: 'DISH-106',
        title: 'Valrhona Dark Chocolate Soufflé',
        category: 'Desserts',
        course: 'Dessert',
        price: 18.00,
        calories: 530,
        chef: 'Pastry Chef Claire',
        status: 'Available',
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
   * Computes audit metrics for culinary reports
   * @param {Array<object>} [data=this.data]
   * @returns {object}
   */
  generateAuditMetrics(data = this.data) {
    const records = Array.isArray(data) ? data : this.data;
    if (records.length === 0) {
      return {
        totalDishes: 0,
        totalRevenuePotential: 0,
        avgPrice: 0,
        categories: {}
      };
    }

    let totalRevenuePotential = 0;
    const categories = {};

    records.forEach(item => {
      const price = Number(item.price) || 0;
      totalRevenuePotential += price;

      const cat = item.category || 'General';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const avgPrice = Math.round((totalRevenuePotential / records.length) * 100) / 100;

    return {
      totalDishes: records.length,
      totalRevenuePotential: Math.round(totalRevenuePotential * 100) / 100,
      avgPrice,
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

    let md = `# Culinary Bistro - Menu & Dining Audit Report\n\n`;
    md += `*Generated automatically on ${dateFormatted} via CulinaryBistroExportEngine*\n\n`;
    md += `## Executive Summary\n\n`;
    md += `- **Total Catalog Items:** ${metrics.totalDishes}\n`;
    md += `- **Combined Menu Price:** \$${metrics.totalRevenuePotential.toLocaleString()}\n`;
    md += `- **Average Course Price:** \$${metrics.avgPrice.toFixed(2)}\n\n`;

    md += `### Category Breakdown\n\n`;
    if (Object.keys(metrics.categories).length > 0) {
      for (const [category, count] of Object.entries(metrics.categories)) {
        md += `- **${category}:** ${count} item(s)\n`;
      }
    } else {
      md += `*No menu categories registered.*\n`;
    }

    md += `\n## Menu Items Manifest\n\n`;

    if (records.length === 0) {
      md += `*No culinary records currently loaded in view state.*\n`;
      return md;
    }

    const headers = Object.keys(records[0]);
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;

    for (const row of records) {
      const rowVals = headers.map(h => {
        let val = row[h];
        if (typeof val === 'number' && h === 'price') {
          return `\$${val.toFixed(2)}`;
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
    const exportEngine = new CulinaryBistroExportEngine();

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
        exportEngine.triggerDownload(`culinary-bistro-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Menu data successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`culinary-bistro-${dateStr}.csv`, blob, 'text/csv');
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
