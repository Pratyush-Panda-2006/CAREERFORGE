export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
const DAYS = { critical: 1, high: 7, medium: 30, low: 90, info: null };
export function scoreSeverity(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 10) throw new Error('Invalid sample CVSS score.');
  return score >= 9 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : score > 0 ? 'low' : 'info';
}
const text = value => typeof value === 'string' ? value.slice(0, 500) : '';
export function buildAudit(rows, scope, generatedAt = new Date()) {
  if (!Array.isArray(rows) || rows.length > 1000 || !Number.isFinite(generatedAt.getTime())) throw new Error('Invalid report snapshot.');
  if (!['all', 'catalogue', 'incident'].includes(scope.source) || !SEVERITIES.includes(scope.minimum)
      || typeof scope.includeMitigated !== 'boolean' || typeof scope.asset !== 'string') throw new Error('Invalid audit scope.');
  const normalizedScope = { source: scope.source, minimum: scope.minimum, asset: scope.asset.trim().slice(0, 100), includeMitigated: scope.includeMitigated };
  const findings = rows.map(row => {
    if (!row || !['catalogue', 'incident'].includes(row.source)) throw new Error('Unrecognized finding source.');
    const severity = row.cvss !== null ? scoreSeverity(row.cvss) : row.severity;
    if (!SEVERITIES.includes(severity) || !text(row.id) || !text(row.asset)) throw new Error('Incomplete finding.');
    return { id: text(row.id), title: text(row.title), asset: text(row.asset), status: text(row.status),
      reference: text(row.reference), cvss: row.cvss, source: row.source, severity };
  }).filter(row => (normalizedScope.source === 'all' || row.source === normalizedScope.source)
    && SEVERITIES.indexOf(row.severity) >= SEVERITIES.indexOf(normalizedScope.minimum)
    && row.asset.toLowerCase().includes(normalizedScope.asset.toLowerCase())
    && (normalizedScope.includeMitigated || row.status !== 'auto-mitigated'))
    .sort((a, b) => SEVERITIES.indexOf(b.severity) - SEVERITIES.indexOf(a.severity) || a.id.localeCompare(b.id));
  const counts = Object.fromEntries(SEVERITIES.map(severity => [severity, findings.filter(row => row.severity === severity).length]));
  const matrix = SEVERITIES.slice().reverse().map(severity => ({ severity,
    catalogue: findings.filter(row => row.severity === severity && row.source === 'catalogue').length,
    incident: findings.filter(row => row.severity === severity && row.source === 'incident').length }));
  const worst = findings[0]?.severity;
  const grade = worst ? { critical: 'F', high: 'D', medium: 'C', low: 'B', info: 'A+' }[worst] : 'Not assessed';
  return { generatedAt: generatedAt.toISOString(), scope: normalizedScope, sourceCount: rows.length, counts, matrix, grade,
    assets: [...new Set(findings.map(row => row.asset))].sort(), findings: findings.map(row => ({ ...row,
      reviewBy: DAYS[row.severity] === null ? 'Monitor' : new Date(generatedAt.getTime() + DAYS[row.severity] * 86400000).toISOString().slice(0, 10),
      remediation: row.source === 'catalogue' ? 'Validate affected product/version; consult vendor remediation and verify the fix.' : 'Verify reported containment, investigate root cause, and validate remediation.' })) };
}
