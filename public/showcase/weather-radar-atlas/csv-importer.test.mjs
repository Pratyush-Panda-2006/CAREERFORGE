import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasCsvImporter } from './csv-importer.js';

describe('WeatherRadarAtlasCsvImporter', () => {
  it('detects comma, semicolon, and tab delimiters accurately', () => {
    const importer = new WeatherRadarAtlasCsvImporter();
    assert.equal(importer.detectDelimiter('a,b,c'), ',');
    assert.equal(importer.detectDelimiter('a;b;c'), ';');
    assert.equal(importer.detectDelimiter('a\tb\tc'), '\t');
  });

  it('parses valid CSV lines into headers and structured row records', () => {
    const importer = new WeatherRadarAtlasCsvImporter();
    const csv = 'id,name,value\n101,alpha,45.5\n102,beta,89.2';
    const res = importer.parseCSV(csv);
    assert.deepEqual(res.headers, ['id', 'name', 'value']);
    assert.equal(res.rows.length, 2);
    assert.deepEqual(res.rows[0], ['101', 'alpha', '45.5']);
  });

  it('sorts columns numerically and alphabetically', () => {
    const importer = new WeatherRadarAtlasCsvImporter();
    const csv = 'id,name,value\n102,beta,20\n101,alpha,50';
    importer.parseCSV(csv);
    importer.sortColumn(0, true);
    assert.equal(importer.rows[0][0], '101');
    importer.sortColumn(0, false);
    assert.equal(importer.rows[0][0], '102');
  });

  it('exports parsed tabular data into JSON format', () => {
    const importer = new WeatherRadarAtlasCsvImporter();
    importer.parseCSV('colA,colB\nval1,val2');
    const json = importer.toJSON();
    assert.equal(json.length, 1);
    assert.deepEqual(json[0], { colA: 'val1', colB: 'val2' });
  });
});
