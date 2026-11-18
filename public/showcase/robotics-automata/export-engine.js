/**
 * Robotics Automata - Client-Side Export Engine & Formatted Summary Report Generator
 * Issue #690 - NSoC '26 Level 3 Feature
 */

export class RoboticsAutomataExportEngine {
  constructor(defaultFilenamePrefix = 'robotics_automata_export') {
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
    let md = `# Robotics Fleet Diagnostics Report (${dateStr})\n\n`;
    md += `**Total Units Registered:** ${Array.isArray(data) ? data.length : 1}\n\n`;
    if (Array.isArray(data) && data.length > 0) {
      md += `| Unit ID | Robot Name | Category | Payload (kg) | Status |\n`;
      md += `|---|---|---|---|---|\n`;
      data.forEach(item => {
        md += `| ${item.id || '-'} | ${item.name || '-'} | ${item.category || '-'} | ${item.payloadKg || '-'} | ${item.status || '-'} |\n`;
      });
    }
    return md;
  }

  triggerDownload(filename, blobOrData) {
    if (typeof window === 'undefined' || typeof document !== 'undefined') return false;
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

export const SAMPLE_ROBOT_EXPORT_DATA = [
  { id: 'BOT-01', name: 'Cobot Arm V6 - "Titan"', category: 'Manipulator', payloadKg: 10, status: 'OPERATIONAL, CALIBRATED' },
  { id: 'BOT-02', name: 'Mobile AMR Transporter', category: 'AMR Base', payloadKg: 200, status: 'DOCKED' },
  { id: 'BOT-03', name: 'Parallel Delta High-Speed', category: 'Delta', payloadKg: 3, status: 'ACTIVE, 120_CYCLES/MIN' },
  { id: 'BOT-04', name: 'SCARA Assembly Arm', category: 'SCARA', payloadKg: 6, status: 'MAINTENANCE' }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.RoboticsAutomataExportEngine = RoboticsAutomataExportEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new RoboticsAutomataExportEngine();
    const downloadJsonBtn = document.getElementById('export-json-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const copyMdBtn = document.getElementById('copy-md-btn');

    if (downloadJsonBtn) {
      downloadJsonBtn.addEventListener('click', () => {
        const blob = engine.toJSONBlob(SAMPLE_ROBOT_EXPORT_DATA);
        engine.triggerDownload('robotics_fleet_inventory.json', blob);
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const blob = engine.toCSVBlob(SAMPLE_ROBOT_EXPORT_DATA);
        engine.triggerDownload('robotics_fleet_inventory.csv', blob);
      });
    }

    if (copyMdBtn) {
      copyMdBtn.addEventListener('click', () => {
        const md = engine.generateMarkdownSummary(SAMPLE_ROBOT_EXPORT_DATA);
        navigator.clipboard?.writeText(md);
        copyMdBtn.textContent = 'Copied Markdown!';
        setTimeout(() => { copyMdBtn.textContent = 'Copy Markdown Audit'; }, 1500);
      });
    }
  });
}
