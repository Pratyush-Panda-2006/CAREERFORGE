/**
 * Luxury Realms - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #646 - Level 3 Core Feature
 *
 * Implements client-side export serialization into RFC 4180 CSV, formatted JSON,
 * and executive Markdown acquisition dossiers with automated browser downloads.
 */

export class LuxuryRealmsExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<string>} [options.defaultColumns]
   */
  constructor(options = {}) {
    this.defaultColumns = options.defaultColumns || [
      'id',
      'name',
      'location',
      'category',
      'price',
      'areaSqft',
      'bedrooms',
      'rating',
      'status'
    ];
  }

  /**
   * Escapes a single value according to RFC 4180 CSV rules
   * @param {*} value
   * @returns {string}
   */
  _escapeCSV(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return this._escapeCSV(value.join('; '));
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Serializes items to RFC 4180 compliant CSV string
   * @param {Array<object>} items
   * @param {Array<string>} [columns=this.defaultColumns]
   * @returns {string}
   */
  toCSVString(items = [], columns = this.defaultColumns) {
    if (!Array.isArray(items) || items.length === 0) {
      return columns.join(',') + '\n';
    }

    const header = columns.join(',');
    const rows = items.map(item => {
      return columns.map(col => this._escapeCSV(item[col])).join(',');
    });

    return [header, ...rows].join('\n') + '\n';
  }

  /**
   * Serializes items to formatted JSON string
   * @param {Array<object>} items
   * @param {object} [metadata={}]
   * @returns {string}
   */
  toJSONString(items = [], metadata = {}) {
    const payload = {
      exportMetadata: {
        system: 'Luxury Realms Portfolio Management',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        totalItems: items.length,
        ...metadata
      },
      estates: items
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Builds formatted Markdown portfolio executive dossier
   * @param {Array<object>} items
   * @returns {string}
   */
  toMarkdownSummary(items = []) {
    const now = new Date().toISOString().split('T')[0];
    const totalValuation = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const avgArea = items.length
      ? Math.round(items.reduce((sum, item) => sum + (Number(item.areaSqft) || 0), 0) / items.length)
      : 0;

    const formattedTotal = totalValuation >= 1e6
      ? `$${(totalValuation / 1e6).toFixed(1)}M USD`
      : `$${totalValuation.toLocaleString()} USD`;

    let md = `# ✦ Luxury Realms Portfolio Executive Summary\n`;
    md += `*Generated: ${now} | Confidential Client Dossier*\n\n`;
    md += `## Portfolio Metrics Overview\n`;
    md += `- **Curated Sanctuaries:** ${items.length}\n`;
    md += `- **Aggregate Capital Valuation:** ${formattedTotal}\n`;
    md += `- **Average Interior Footprint:** ${avgArea.toLocaleString()} sqft\n\n`;

    md += `## Curated Estate Inventory\n\n`;
    md += `| ID | Estate Title | Location | Valuation | Interior Area | Status |\n`;
    md += `|---|---|---|---|---|---|\n`;

    for (const item of items) {
      const priceStr = item.price ? `$${(item.price / 1e6).toFixed(1)}M` : 'POA';
      const areaStr = item.areaSqft ? `${item.areaSqft.toLocaleString()} sqft` : 'N/A';
      md += `| ${item.id || '-'} | ${item.name || '-'} | ${item.location || '-'} | ${priceStr} | ${areaStr} | ${item.status || '-'} |\n`;
    }

    return md;
  }

  /**
   * Generates a Blob for JSON data
   * @param {Array<object>} items
   * @returns {Blob|{content: string, type: string}}
   */
  toJSONBlob(items = []) {
    const content = this.toJSONString(items);
    if (typeof Blob !== 'undefined') {
      return new Blob([content], { type: 'application/json;charset=utf-8;' });
    }
    return { content, type: 'application/json;charset=utf-8;' };
  }

  /**
   * Generates a Blob for CSV data
   * @param {Array<object>} items
   * @param {Array<string>} [columns]
   * @returns {Blob|{content: string, type: string}}
   */
  toCSVBlob(items = [], columns) {
    const content = this.toCSVString(items, columns);
    if (typeof Blob !== 'undefined') {
      return new Blob([content], { type: 'text/csv;charset=utf-8;' });
    }
    return { content, type: 'text/csv;charset=utf-8;' };
  }

  /**
   * Triggers client-side browser download
   * @param {string} filename
   * @param {Blob|{content: string, type: string}} blob
   * @returns {boolean}
   */
  triggerDownload(filename, blob) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return false;
    }

    const realBlob = blob instanceof Blob
      ? blob
      : new Blob([blob.content], { type: blob.type || 'text/plain' });

    const url = URL.createObjectURL(realBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
}
