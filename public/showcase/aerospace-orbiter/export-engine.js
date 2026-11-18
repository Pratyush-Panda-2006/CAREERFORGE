/**
 * Aerospace Orbiter - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #654 - Level 3 Core Feature
 *
 * Implements client-side export serialization into RFC 4180 CSV, structured JSON ephemeris,
 * and executive Markdown orbital flight dossiers with automated browser downloads.
 */

export class AerospaceOrbiterExportEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<string>} [options.defaultColumns]
   */
  constructor(options = {}) {
    this.defaultColumns = options.defaultColumns || [
      'id',
      'name',
      'noradId',
      'orbitType',
      'altitudeKm',
      'velocityKmS',
      'inclinationDeg',
      'massKg',
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
        system: 'Aerospace Orbiter Flight Telemetry Suite',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        totalCraft: items.length,
        ...metadata
      },
      spacecraft: items
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Builds formatted Markdown orbital flight dossier summary
   * @param {Array<object>} items
   * @returns {string}
   */
  toMarkdownSummary(items = []) {
    const now = new Date().toISOString().split('T')[0];
    const totalMass = items.reduce((sum, item) => sum + (Number(item.massKg) || 0), 0);
    const avgVelocity = items.length
      ? (items.reduce((sum, item) => sum + (Number(item.velocityKmS) || 0), 0) / items.length).toFixed(2)
      : '0.00';

    let md = `# ⌬ Aerospace Orbiter Orbital Flight Summary\n`;
    md += `*Generated: ${now} | Spacecraft Ephemeris & Telemetry Audit*\n\n`;
    md += `## Mission Overview\n`;
    md += `- **Tracked Spacecraft:** ${items.length}\n`;
    md += `- **Combined Orbital Mass:** ${totalMass.toLocaleString()} kg\n`;
    md += `- **Mean Orbital Velocity:** ${avgVelocity} km/s\n\n`;

    md += `## Spacecraft Catalog\n\n`;
    md += `| ID | Spacecraft Name | NORAD ID | Orbit Regime | Altitude (km) | Velocity (km/s) | Status |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    for (const item of items) {
      const altStr = item.altitudeKm !== undefined ? Number(item.altitudeKm).toLocaleString() : 'N/A';
      const velStr = item.velocityKmS !== undefined ? `${item.velocityKmS} km/s` : 'N/A';
      md += `| ${item.id || '-'} | ${item.name || '-'} | ${item.noradId || '-'} | ${item.orbitType || '-'} | ${altStr} | ${velStr} | ${item.status || '-'} |\n`;
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
