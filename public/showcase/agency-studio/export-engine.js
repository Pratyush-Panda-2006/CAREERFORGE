/**
 * Agency Studio - Client-Side Export Engine & Formatted Summary Report Generator
 */

export class AgencyStudioExportEngine {
  generateCsv(columns, rows) {
    if (!columns || !rows) return '';
    const header = columns.join(',');
    const body = rows.map(r => columns.map(c => `"${r[c] ?? ''}"`).join(',')).join('\n');
    return `${header}\n${body}`;
  }

  generateMarkdown(title, data = {}) {
    let md = `# ${title}\n\nGenerated at: ${new Date().toISOString()}\n\n| Metric | Value |\n| :--- | :--- |\n`;
    for (const [k, v] of Object.entries(data)) {
      md += `| ${k} | ${v} |\n`;
    }
    return md;
  }

  generateJSON(metadata = {}, records = []) {
    return JSON.stringify({
      schemaVersion: '1.0',
      exportedAt: Date.now(),
      metadata,
      totalRecords: records.length,
      records
    }, null, 2);
  }
}
