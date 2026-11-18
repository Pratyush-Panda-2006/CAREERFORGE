/**
 * Cybersecurity Sentinel - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #642 - Level 3 Core Feature
 *
 * Implements client-side export capabilities serializing SOC incident manifests, CVSS telemetry,
 * and security threat audit reports into downloadable formats (JSON, CSV, and Markdown audit summary) with automated downloading.
 */

export class CybersecuritySentinelExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.filenamePrefix='cybersecurity-sentinel-export']
   */
  constructor(options = {}) {
    this.filenamePrefix = options.filenamePrefix || 'cybersecurity-sentinel-export';
    this.data = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.lastExportTimestamp = null;
  }

  /**
   * Default sample SOC threat incident dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'INC-901',
        title: 'Distributed SSH Brute Force',
        vector: 'Network',
        severity: 'Critical',
        sourceIp: '198.51.100.42',
        cvssScore: 9.8,
        eventsCount: 4280,
        status: 'Active',
        detectedDate: '2026-03-15'
      },
      {
        id: 'INC-902',
        title: 'Blind SQLi, "Auth Bypass"',
        vector: 'Application',
        severity: 'High',
        sourceIp: '203.0.113.19',
        cvssScore: 8.6,
        eventsCount: 142,
        status: 'Mitigated',
        detectedDate: '2026-03-22'
      },
      {
        id: 'INC-903',
        title: 'Kernel Privilege Escalation',
        vector: 'Endpoint',
        severity: 'Critical',
        sourceIp: '10.0.4.15',
        cvssScore: 9.1,
        eventsCount: 18,
        status: 'Investigating',
        detectedDate: '2026-04-01'
      },
      {
        id: 'INC-904',
        title: 'DNS Tunneling Exfiltration',
        vector: 'Protocol',
        severity: 'Medium',
        sourceIp: '192.0.2.88',
        cvssScore: 6.4,
        eventsCount: 890,
        status: 'Active',
        detectedDate: '2026-04-09'
      },
      {
        id: 'INC-905',
        title: 'Ransomware Canary\nFilesystem Trigger',
        vector: 'Filesystem',
        severity: 'Critical',
        sourceIp: '10.0.8.210',
        cvssScore: 9.9,
        eventsCount: 512,
        status: 'Contained',
        detectedDate: '2026-04-16'
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
      return '# Cybersecurity Sentinel - Incident Audit Report\n\n*No threat incident records available.*';
    }

    const criticalCount = this.data.filter(item => String(item.severity).toLowerCase() === 'critical').length;
    const avgCvss = (this.data.reduce((sum, item) => sum + (item.cvssScore || 0), 0) / totalCount).toFixed(1);
    const totalEvents = this.data.reduce((sum, item) => sum + (item.eventsCount || 0), 0);
    const maxCvss = [...this.data].sort((a, b) => (b.cvssScore || 0) - (a.cvssScore || 0))[0];

    let md = `# Cybersecurity Sentinel - Incident Audit Report\n\n`;
    md += `**Generated On:** ${new Date().toISOString().slice(0, 10)}\n`;
    md += `**Total Monitored Incidents:** ${totalCount}\n`;
    md += `**Critical Threat Count:** ${criticalCount}\n`;
    md += `**Average CVSS v3.1 Score:** ${avgCvss}\n`;
    md += `**Total Aggregated Events:** ${totalEvents.toLocaleString()}\n`;
    md += `**Highest Severity Incident:** ${maxCvss ? `${maxCvss.title} (CVSS ${maxCvss.cvssScore})` : 'N/A'}\n\n`;

    md += `### Security Incident Log Table\n\n`;
    md += `| Incident ID | Threat Title | Vector | Severity | Source IP | CVSS | Events | Status |\n`;
    md += `|:---|:---|:---|:---|:---|:---|:---|:---|\n`;

    this.data.forEach(item => {
      const cleanTitle = String(item.title || '').replace(/[\r\n]+/g, ' ');
      md += `| ${item.id || ''} | ${cleanTitle} | ${item.vector || ''} | ${item.severity || ''} | ${item.sourceIp || ''} | ${item.cvssScore || 0} | ${(item.eventsCount || 0).toLocaleString()} | ${item.status || ''} |\n`;
    });

    md += `\n*Report client-generated by Cybersecurity Sentinel Export Engine.*`;
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
    const exportEngine = new CybersecuritySentinelExportEngine();

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
        exportEngine.triggerDownload(`security-threats-${dateStr}.json`, blob, 'application/json');
        showToast('JSON Threat data successfully downloaded!');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
      });
    }

    if (btnDownloadCSV) {
      btnDownloadCSV.addEventListener('click', () => {
        const blob = exportEngine.toCSVBlob();
        const dateStr = new Date().toISOString().slice(0, 10);
        exportEngine.triggerDownload(`security-threats-${dateStr}.csv`, blob, 'text/csv');
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
