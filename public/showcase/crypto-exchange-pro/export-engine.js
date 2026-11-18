/**
 * Crypto Exchange Pro - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #650 - Level 3 Core Feature
 *
 * Implements client-side export serialization into RFC 4180 CSV, structured JSON,
 * and executive Markdown market summaries with automated browser downloads.
 */

export class CryptoExchangeProExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<string>} [options.defaultColumns]
   */
  constructor(options = {}) {
    this.defaultColumns = options.defaultColumns || [
      'id',
      'symbol',
      'base',
      'quote',
      'category',
      'lastPrice',
      'change24h',
      'volume24h',
      'fundingRate'
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
        system: 'Crypto Exchange Pro Terminal',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        totalPairs: items.length,
        ...metadata
      },
      markets: items
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Builds formatted Markdown market executive summary
   * @param {Array<object>} items
   * @returns {string}
   */
  toMarkdownSummary(items = []) {
    const now = new Date().toISOString().split('T')[0];
    const totalVolume = items.reduce((sum, item) => sum + (Number(item.volume24h) || 0), 0);
    const avgChange = items.length
      ? (items.reduce((sum, item) => sum + (Number(item.change24h) || 0), 0) / items.length).toFixed(2)
      : '0.00';

    const formattedVol = totalVolume >= 1e9
      ? `$${(totalVolume / 1e9).toFixed(2)}B USDT`
      : totalVolume >= 1e6
      ? `$${(totalVolume / 1e6).toFixed(2)}M USDT`
      : `$${totalVolume.toLocaleString()} USDT`;

    let md = `# ❖ Crypto Exchange Pro Market Summary\n`;
    md += `*Generated: ${now} | Exchange Orderbook Audit*\n\n`;
    md += `## Market Overview\n`;
    md += `- **Active Trading Pairs:** ${items.length}\n`;
    md += `- **24h Aggregate Volume:** ${formattedVol}\n`;
    md += `- **Average 24h Price Action:** ${avgChange}%\n\n`;

    md += `## Trading Pair Inventory\n\n`;
    md += `| ID | Symbol | Last Price | 24h Change | 24h Volume | Category |\n`;
    md += `|---|---|---|---|---|---|\n`;

    for (const item of items) {
      const priceStr = item.lastPrice ? `$${Number(item.lastPrice).toLocaleString()}` : 'N/A';
      const changeStr = item.change24h ? `${item.change24h > 0 ? '+' : ''}${item.change24h}%` : '0.00%';
      const volStr = item.volume24h ? `$${(item.volume24h / 1e6).toFixed(1)}M` : '0';
      md += `| ${item.id || '-'} | ${item.symbol || '-'} | ${priceStr} | ${changeStr} | ${volStr} | ${item.category || '-'} |\n`;
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
