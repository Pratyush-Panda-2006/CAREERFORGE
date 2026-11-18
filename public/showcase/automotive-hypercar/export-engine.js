/**
 * Automotive Hypercar - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #634 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing hypercar dyno telemetry, powertrain specifications,
 * and track lap records into downloadable formats (JSON, CSV, and Markdown audit summary) with automated downloading.
 */

export class AutomotiveHypercarExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='automotive-hypercar-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'automotive-hypercar-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample hypercar performance dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'HC-01',
        name: 'Apex Valkyrie AMR Pro',
        brand: 'Aston Martin',
        horsepower: 1160,
        topSpeed: 402,
        zeroToSixty: 2.5,
        drivetrain: 'Hybrid AWD',
        status: 'Production',
        price: 3200000,
        testedDate: '2026-02-14'
      },
      {
        id: 'HC-02',
        name: 'Jesko Absolut, "Record Edition"',
        brand: 'Koenigsegg',
        horsepower: 1600,
        topSpeed: 531,
        zeroToSixty: 2.4,
        drivetrain: 'RWD Twin-Turbo',
        status: 'Delivering',
        price: 3400000,
        testedDate: '2026-03-01'
      },
      {
        id: 'HC-03',
        name: 'Nevera Time Attack',
        brand: 'Rimac',
        horsepower: 1914,
        topSpeed: 412,
        zeroToSixty: 1.74,
        drivetrain: 'Quad-Motor EV',
        status: 'Production',
        price: 2400000,
        testedDate: '2026-03-20'
      },
      {
        id: 'HC-04',
        name: 'Chiron Super Sport 300+',
        brand: 'Bugatti',
        horsepower: 1578,
        topSpeed: 490,
        zeroToSixty: 2.3,
        drivetrain: 'Quad-Turbo W16',
        status: 'Delivering',
        price: 3900000,
        testedDate: '2026-04-05'
      },
      {
        id: 'HC-05',
        name: 'Solus GT Monoposto\nTrack Special',
        brand: 'McLaren',
        horsepower: 829,
        topSpeed: 322,
        zeroToSixty: 2.5,
        drivetrain: 'NA V10 RWD',
        status: 'Delivered',
        price: 4000000,
        testedDate: '2026-04-18'
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
      return '# Automotive Hypercar - Performance Audit Report\n\n*No vehicle records available.*';
    }

    const avgHp = Math.round(this.data.reduce((sum, item) => sum + (item.horsepower || 0), 0) / totalCount);
    const topFastest = [...this.data].sort((a, b) => (b.topSpeed || 0) - (a.topSpeed || 0))[0];
    const topQuickest = [...this.data].sort((a, b) => (a.zeroToSixty || 99) - (b.zeroToSixty || 99))[0];

    let md = `# Automotive Hypercar - Performance Audit Report\n\n`;
    md += `**Generated On:** ${new Date().toISOString().slice(0, 10)}\n`;
    md += `**Total Monitored Vehicles:** ${totalCount}\n`;
    md += `**Fleet Average Power:** ${avgHp.toLocaleString()} HP\n`;
    md += `**Top Speed Record Holder:** ${topFastest ? `${topFastest.name} (${topFastest.topSpeed} km/h)` : 'N/A'}\n`;
    md += `**Fastest 0-100 km/h Launch:** ${topQuickest ? `${topQuickest.name} (${topQuickest.zeroToSixty}s)` : 'N/A'}\n\n`;

    md += `### Vehicle Fleet Specifications Table\n\n`;
    md += `| ID | Vehicle Model | Brand | Horsepower | Top Speed | 0-100 km/h | Drivetrain | Est. Price |\n`;
    md += `|:---|:---|:---|:---|:---|:---|:---|:---|\n`;

    this.data.forEach(item => {
      const cleanName = String(item.name || '').replace(/[\r\n]+/g, ' ');
      const priceStr = item.price ? `$${(item.price / 1000000).toFixed(1)}M` : 'N/A';
      md += `| ${item.id || ''} | ${cleanName} | ${item.brand || ''} | ${item.horsepower || 0} HP | ${item.topSpeed || 0} km/h | ${item.zeroToSixty || 0}s | ${item.drivetrain || ''} | ${priceStr} |\n`;
    });

    md += `\n*Report client-generated by Automotive Hypercar Export Engine.*`;
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
    const exportEngine = new AutomotiveHypercarExportEngine();

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
        exportEngine.triggerDownload(`hypercar-telemetry-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Fleet data successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`hypercar-telemetry-${dateStr}.csv`, blob, 'text/csv');
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
