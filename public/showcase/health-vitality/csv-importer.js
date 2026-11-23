/**
 * Health Vitality - Client-Side CSV Data Importer & Tabular Previewer
 */

export class HealthVitalityCsvImporter {
  constructor() {
    this.headers = [];
    this.rows = [];
    this.rawText = '';
  }

  detectDelimiter(sample) {
    if (!sample || typeof sample !== 'string') return ',';
    const commas = (sample.match(/,/g) || []).length;
    const semicolons = (sample.match(/;/g) || []).length;
    const tabs = (sample.match(/\t/g) || []).length;
    if (tabs > commas && tabs > semicolons) return '\t';
    if (semicolons > commas) return ';';
    return ',';
  }

  parseCSV(text) {
    if (!text || typeof text !== 'string') {
      this.headers = [];
      this.rows = [];
      return { headers: [], rows: [] };
    }
    this.rawText = text;
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const delimiter = this.detectDelimiter(lines[0]);

    const parseLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    this.headers = parseLine(lines[0]);
    this.rows = lines.slice(1).map(parseLine);
    return { headers: this.headers, rows: this.rows };
  }

  sortColumn(colIndex, asc = true) {
    if (colIndex < 0 || !this.headers[colIndex]) return this.rows;
    this.rows.sort((a, b) => {
      const valA = a[colIndex] ?? '';
      const valB = b[colIndex] ?? '';
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return asc ? numA - numB : numB - numA;
      }
      return asc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    return this.rows;
  }

  toJSON() {
    return this.rows.map(row => {
      const obj = {};
      this.headers.forEach((h, i) => {
        obj[h] = row[i] ?? '';
      });
      return obj;
    });
  }
}
