import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioExportEngine } from './export-engine.js';

describe('AgencyStudioExportEngine', () => {
  it('formats structured columns and rows into RFC4180 CSV string', () => {
    const engine = new AgencyStudioExportEngine();
    const csv = engine.generateCsv(['id', 'name'], [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
    assert.ok(csv.startsWith('id,name'));
    assert.ok(csv.includes('"Alice"'));
  });

  it('renders markdown summary tables cleanly', () => {
    const engine = new AgencyStudioExportEngine();
    const md = engine.generateMarkdown('Studio Summary', { revenue: '$10k', clients: 5 });
    assert.ok(md.includes('# Studio Summary'));
    assert.ok(md.includes('| revenue | $10k |'));
  });

  it('exports standardized JSON package with metadata and record counts', () => {
    const engine = new AgencyStudioExportEngine();
    const jsonStr = engine.generateJSON({ author: 'Admin' }, [{ id: 10 }]);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.schemaVersion, '1.0');
    assert.equal(parsed.totalRecords, 1);
  });
});
