import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSeverity, buildAudit } from './audit-model.js';
const scope = { source: 'all', minimum: 'info', asset: '', includeMitigated: true };
const date = new Date('2030-01-01T12:00:00Z');
const rows = [
  { id: 'C1', title: 'Sample critical', asset: 'Demo API', source: 'catalogue', cvss: 9.8, status: 'Unverified sample', reference: 'Sample CVE' },
  { id: 'C2', title: 'Sample medium', asset: 'Demo Portal', source: 'catalogue', cvss: 5.4, status: 'Unverified sample' },
  { id: 'I1', title: 'Sample incident', asset: 'api.demo', source: 'incident', cvss: null, severity: 'high', status: 'auto-mitigated' },
  { id: 'I2', title: 'Sample info', asset: 'Demo Portal', source: 'incident', cvss: null, severity: 'info', status: 'verified' }
];
test('severity bands include exact CVSS-style boundaries and reject malformed values', () => {
  for (const [value, expected] of [[0, 'info'], [0.1, 'low'], [3.9, 'low'], [4, 'medium'], [6.9, 'medium'], [7, 'high'], [8.9, 'high'], [9, 'critical'], [10, 'critical']]) assert.equal(scoreSeverity(value), expected);
  for (const value of [-1, 11, NaN, Infinity, '9', null]) assert.throws(() => scoreSeverity(value));
});
test('snapshot aggregates source/severity matrix, unique assets and worst-severity grade', () => {
  const report = buildAudit(rows, scope, date);
  assert.equal(report.grade, 'F'); assert.equal(report.sourceCount, 4); assert.equal(report.findings.length, 4);
  assert.deepEqual(report.assets, ['Demo API', 'Demo Portal', 'api.demo']);
  assert.deepEqual(report.matrix[0], { severity: 'critical', catalogue: 1, incident: 0 });
  assert.equal(report.counts.high, 1);
});
test('source, severity, case-insensitive trimmed asset and mitigation filters intersect', () => {
  const report = buildAudit(rows, { ...scope, source: 'catalogue', minimum: 'high', asset: '  API  ' }, date);
  assert.deepEqual(report.findings.map(row => row.id), ['C1']); assert.equal(report.scope.asset, 'API');
  assert.equal(buildAudit(rows, { ...scope, includeMitigated: false }, date).findings.length, 3);
  assert.deepEqual(buildAudit(rows, { ...scope, source: 'incident', minimum: 'high', includeMitigated: false }, date).findings, []);
});
test('empty filters never claim a secure A+ grade', () => {
  const report = buildAudit(rows, { ...scope, asset: 'missing' }, date);
  assert.equal(report.grade, 'Not assessed'); assert.equal(report.assets.length, 0);
  assert.equal(buildAudit([], scope, date).grade, 'Not assessed');
});
test('incident CVSS stays unavailable rather than inventing a numeric score', () => {
  const report = buildAudit(rows, { ...scope, source: 'incident' }, date);
  assert.ok(report.findings.every(row => row.cvss === null)); assert.equal(report.grade, 'D');
});
test('review targets use snapshot UTC date, fixed illustrative windows and Monitor for info', () => {
  const report = buildAudit(rows, scope, date);
  const byId = Object.fromEntries(report.findings.map(row => [row.id, row]));
  assert.equal(byId.C1.reviewBy, '2030-01-02'); assert.equal(byId.I1.reviewBy, '2030-01-08');
  assert.equal(byId.C2.reviewBy, '2030-01-31'); assert.equal(byId.I2.reviewBy, 'Monitor');
});
test('returned report is detached from mutable source records and scope', () => {
  const input = rows.map(row => ({ ...row })), filters = { ...scope };
  const report = buildAudit(input, filters, date);
  input[0].title = 'Changed'; input.push({ ...rows[0] }); filters.minimum = 'critical';
  assert.equal(report.findings[0].title, 'Sample critical'); assert.equal(report.findings.length, 4); assert.equal(report.scope.minimum, 'info');
});
test('invalid source records/scopes fail closed rather than masking missing evidence', () => {
  for (const row of [{ ...rows[0], cvss: 12 }, { ...rows[2], severity: 'unknown' }, { ...rows[0], asset: '' }, { ...rows[0], source: 'unknown' }]) assert.throws(() => buildAudit([row], scope, date));
  for (const changes of [{ source: 'unknown' }, { minimum: 'unknown' }, { includeMitigated: 'yes' }, { asset: null }]) assert.throws(() => buildAudit(rows, { ...scope, ...changes }, date));
  assert.throws(() => buildAudit(rows, scope, new Date('invalid')));
});
test('all grades follow the documented worst-band mapping', () => {
  for (const [score, grade] of [[0, 'A+'], [2, 'B'], [5, 'C'], [8, 'D'], [10, 'F']]) assert.equal(buildAudit([{ ...rows[0], cvss: score }], scope, date).grade, grade);
});
