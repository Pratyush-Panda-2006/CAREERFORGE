/**
 * Supply Chain Logistics - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #686 - NSoC '26 Level 3 Feature
 */

export class SupplyChainLogisticsExportEngine {
  constructor(defaultFilenamePrefix = 'supply_chain_export') {
    this.prefix = defaultFilenamePrefix;
  }

  escapeCSVField(val) {
    if (val === null || val === undefined) return '';
    const stringVal = String(val);
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  }

  toCSVString(records, columns = null) {
    if (!Array.isArray(records) || records.length === 0) {
      return '';
    }
    const headers = columns || Object.keys(records[0]);
    const headerRow = headers.map(h => this.escapeCSVField(h)).join(',');

    const rows = records.map(record => {
      return headers.map(h => this.escapeCSVField(record[h])).join(',');
    });

    return [headerRow, ...rows].join('\n');
  }

  toJSONBlob(data) {
    const jsonString = JSON.stringify(data, null, 2);
    if (typeof Blob !== 'undefined') {
      return new Blob([jsonString], { type: 'application/json' });
    }
    return { data: jsonString, type: 'application/json', size: Buffer.byteLength(jsonString) };
  }

  toCSVBlob(records, columns = null) {
    const csvString = this.toCSVString(records, columns);
    if (typeof Blob !== 'undefined') {
      return new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    }
    return { data: csvString, type: 'text/csv;charset=utf-8;', size: Buffer.byteLength(csvString) };
  }

  generateMarkdownSummary(data) {
    const dateStr = new Date().toISOString().split('T')[0];
    let md = `# Supply Chain Logistics Audit Report (${dateStr})\n\n`;
    md += `**Total Shipments / Records:** ${Array.isArray(data) ? data.length : 1}\n\n`;
    if (Array.isArray(data) && data.length > 0) {
      md += `| ID | Route / Hub | Status | Units | Carrier |\n`;
      md += `|---|---|---|---|---|\n`;
      data.forEach(item => {
        md += `| ${item.id || '-'} | ${item.route || item.hub || '-'} | ${item.status || '-'} | ${item.units || '-'} | ${item.carrier || '-'} |\n`;
      });
    }
    return md;
  }

  triggerDownload(filename, blobOrData) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    const url = URL.createObjectURL(blobOrData instanceof Blob ? blobOrData : new Blob([blobOrData]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }
}

export const SAMPLE_SUPPLY_DATA = [
  { id: 'TRK-101', route: 'Rotterdam -> Berlin', status: 'IN_TRANSIT', units: 450, carrier: 'Maersk Logistics, "North"' },
  { id: 'TRK-102', route: 'Shanghai -> Los Angeles', status: 'CUSTOMS_HOLD', units: 1200, carrier: 'Pacific Cargo Line' },
  { id: 'TRK-103', route: 'Singapore -> Sydney', status: 'DELIVERED', units: 820, carrier: 'Oceanic Transit "Express"' },
  { id: 'TRK-104', route: 'Hamburg -> Warsaw', status: 'DISPATCHED', units: 310, carrier: 'EuroFreight Rail' }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.SupplyChainLogisticsExportEngine = SupplyChainLogisticsExportEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new SupplyChainLogisticsExportEngine();
    const downloadJsonBtn = document.getElementById('export-json-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const copyMdBtn = document.getElementById('copy-md-btn');

    if (downloadJsonBtn) {
      downloadJsonBtn.addEventListener('click', () => {
        const blob = engine.toJSONBlob(SAMPLE_SUPPLY_DATA);
        engine.triggerDownload('supply_chain_manifest.json', blob);
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const blob = engine.toCSVBlob(SAMPLE_SUPPLY_DATA);
        engine.triggerDownload('supply_chain_manifest.csv', blob);
      });
    }

    if (copyMdBtn) {
      copyMdBtn.addEventListener('click', () => {
        const md = engine.generateMarkdownSummary(SAMPLE_SUPPLY_DATA);
        navigator.clipboard?.writeText(md);
        copyMdBtn.textContent = 'Copied Markdown!';
        setTimeout(() => { copyMdBtn.textContent = 'Copy Markdown Audit'; }, 1500);
      });
    }
  });
}
