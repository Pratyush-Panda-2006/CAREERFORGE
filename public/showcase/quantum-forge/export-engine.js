/**
 * Quantum Forge Export Engine
 * Serializes quantum simulation benchmarks, qubit registers, and gate fidelity metrics
 * into downloadable formats (JSON, CSV, and Markdown audit summary).
 */

export class QuantumForgeExportEngine {
  constructor(options = {}) {
    this.systemName = options.systemName || 'Quantum Forge Coherent Matrix';
    this.version = options.version || '4.8.0';
    this.defaultRecords = options.defaultRecords || [
      { id: 'QREG-001', name: 'Superconducting Transmon Array', qubits: 128, fidelity: 0.9994, coherenceUs: 142.5, status: 'operational', coolingTier: '15mK Dilution' },
      { id: 'QREG-002', name: 'Trapped-Ion Ytterbium Gate', qubits: 64, fidelity: 0.9998, coherenceUs: 850.0, status: 'calibrating', coolingTier: 'Laser Cooled' },
      { id: 'QREG-003', name: 'Photonic Squeezed State Lattice', qubits: 256, fidelity: 0.9920, coherenceUs: 12.8, status: 'operational', coolingTier: 'Room Temp Optical' },
      { id: 'QREG-004', name: 'Silicon Spin Neutral Qubits', qubits: 32, fidelity: 0.9975, coherenceUs: 420.2, status: 'active', coolingTier: '100mK Cryostat' },
      { id: 'QREG-005', name: 'Topological Majorana Fermion Zero-Mode', qubits: 16, fidelity: 0.9999, coherenceUs: 1200.0, status: 'experimental', coolingTier: '7mK Sub-Kelvin' },
      { id: 'QREG-006', name: 'Rydberg Neutral Atom Array, 2D Grid', qubits: 280, fidelity: 0.9942, coherenceUs: 95.4, status: 'operational', coolingTier: 'Ultra-cold Vacuum' }
    ];
  }

  escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  toCSVString(records = this.defaultRecords) {
    if (!Array.isArray(records) || records.length === 0) {
      return '';
    }
    const headers = Object.keys(records[0]);
    const headerRow = headers.map(h => this.escapeCSV(h)).join(',');
    const rows = records.map(record =>
      headers.map(h => this.escapeCSV(record[h])).join(',')
    );
    return [headerRow, ...rows].join('\r\n');
  }

  toJSONBlob(records = this.defaultRecords) {
    const payload = {
      exportMetadata: {
        system: this.systemName,
        version: this.version,
        timestamp: new Date().toISOString(),
        recordCount: records.length,
        averageFidelity: Number((records.reduce((acc, r) => acc + (r.fidelity || 0), 0) / (records.length || 1)).toFixed(4)),
        totalQubits: records.reduce((acc, r) => acc + (r.qubits || 0), 0)
      },
      records: records
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    return {
      content: jsonStr,
      blob: typeof Blob !== 'undefined' ? new Blob([jsonStr], { type: 'application/json;charset=utf-8;' }) : null,
      size: jsonStr.length,
      mimeType: 'application/json'
    };
  }

  toMarkdownSummary(records = this.defaultRecords) {
    const totalQubits = records.reduce((acc, r) => acc + (r.qubits || 0), 0);
    const avgFidelity = (records.reduce((acc, r) => acc + (r.fidelity || 0), 0) / (records.length || 1) * 100).toFixed(2);

    let md = `# ${this.systemName} - Coherent Telemetry Audit Report\n\n`;
    md += `**Export Generated:** ${new Date().toISOString()}\n`;
    md += `**Engine Version:** ${this.version}\n`;
    md += `**Registered Subsystems:** ${records.length} modules\n`;
    md += `**Total Managed Qubits:** ${totalQubits}\n`;
    md += `**Mean Gate Fidelity:** ${avgFidelity}%\n\n`;
    md += `| Subsystem ID | Architecture Name | Qubits | Fidelity | Coherence (μs) | Status | Cooling Mode |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    records.forEach(r => {
      md += `| ${r.id} | ${r.name} | ${r.qubits} | ${(r.fidelity * 100).toFixed(2)}% | ${r.coherenceUs} μs | ${r.status} | ${r.coolingTier} |\n`;
    });

    md += `\n---\n*Confidential Quantum Coherence Diagnostic Telemetry - Quantum Forge Ecosystem*\n`;
    return md;
  }

  triggerDownload(filename, blobOrContent, mimeType = 'text/plain') {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { success: false, reason: 'SSR / Non-DOM environment' };
    }
    const blob = blobOrContent instanceof Blob
      ? blobOrContent
      : new Blob([blobOrContent], { type: mimeType });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
    return { success: true, filename, size: blob.size };
  }
}
