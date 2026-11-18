import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeExportEngine } from './export-engine.js';

describe('QuantumForgeExportEngine (Issue #658)', () => {
  it('initializes with default options and register presets', () => {
    const engine = new QuantumForgeExportEngine();
    assert.equal(engine.systemName, 'Quantum Forge Coherent Matrix');
    assert.ok(Array.isArray(engine.defaultRecords));
    assert.equal(engine.defaultRecords.length, 6);
  });

  it('correctly escapes CSV special characters (quotes, commas, newlines)', () => {
    const engine = new QuantumForgeExportEngine();
    assert.equal(engine.escapeCSV('standardText'), 'standardText');
    assert.equal(engine.escapeCSV('value, with, commas'), '"value, with, commas"');
    assert.equal(engine.escapeCSV('value with "quotes"'), '"value with ""quotes"""');
    assert.equal(engine.escapeCSV('value with\nline breaks'), '"value with\nline breaks"');
    assert.equal(engine.escapeCSV(null), '');
    assert.equal(engine.escapeCSV(undefined), '');
  });

  it('generates well-formed CSV table string matching data schema', () => {
    const engine = new QuantumForgeExportEngine();
    const csv = engine.toCSVString();
    const lines = csv.split('\r\n');
    assert.ok(lines.length >= 7); // 1 header + 6 records
    assert.equal(lines[0], 'id,name,qubits,fidelity,coherenceUs,status,coolingTier');

    // Check line 6 Rydberg atom with comma in name
    const rydbergLine = lines.find(l => l.includes('QREG-006'));
    assert.ok(rydbergLine.includes('"Rydberg Neutral Atom Array, 2D Grid"'));
  });

  it('serializes JSON blob payload with accurate telemetry aggregation', () => {
    const engine = new QuantumForgeExportEngine();
    const jsonOutput = engine.toJSONBlob();
    assert.equal(jsonOutput.mimeType, 'application/json');
    assert.ok(jsonOutput.size > 0);

    const parsed = JSON.parse(jsonOutput.content);
    assert.equal(parsed.exportMetadata.system, 'Quantum Forge Coherent Matrix');
    assert.equal(parsed.exportMetadata.recordCount, 6);
    assert.equal(parsed.exportMetadata.totalQubits, 776);
    assert.ok(parsed.exportMetadata.averageFidelity > 0.99);
    assert.equal(parsed.records.length, 6);
  });

  it('formats comprehensive Markdown audit summary with markdown table', () => {
    const engine = new QuantumForgeExportEngine();
    const md = engine.toMarkdownSummary();
    assert.ok(md.includes('# Quantum Forge Coherent Matrix - Coherent Telemetry Audit Report'));
    assert.ok(md.includes('| Subsystem ID | Architecture Name | Qubits | Fidelity | Coherence (μs) | Status | Cooling Mode |'));
    assert.ok(md.includes('QREG-001'));
    assert.ok(md.includes('QREG-005'));
    assert.ok(md.includes('Topological Majorana Fermion Zero-Mode'));
    assert.ok(md.includes('Confidential Quantum Coherence Diagnostic Telemetry'));
  });

  it('handles empty datasets and graceful fallback in non-DOM environments', () => {
    const engine = new QuantumForgeExportEngine();
    assert.equal(engine.toCSVString([]), '');

    const downloadRes = engine.triggerDownload('test.csv', 'sample,data');
    assert.equal(downloadRes.success, false);
    assert.equal(downloadRes.reason, 'SSR / Non-DOM environment');
  });
});
