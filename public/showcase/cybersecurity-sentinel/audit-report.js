import { buildAudit } from './audit-model.js';
const dialog = document.getElementById('audit-dialog');
const report = document.getElementById('audit-report');
if (dialog && report) {
  const form = dialog.querySelector('form');
  const feedback = document.getElementById('audit-feedback');
  let opener = null;
  document.getElementById('audit-open').addEventListener('click', event => { opener = event.currentTarget; dialog.showModal(); });
  document.getElementById('audit-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  function node(tag, value, className) {
    const element = document.createElement(tag);
    if (value !== undefined) element.textContent = String(value);
    if (className) element.className = className;
    return element;
  }
  function table(headers, rows) {
    const result = node('table'); const head = node('thead'); const heading = node('tr');
    headers.forEach(label => { const cell = node('th', label); cell.scope = 'col'; heading.append(cell); });
    head.append(heading); const body = node('tbody');
    rows.forEach(values => { const row = node('tr'); values.forEach(value => row.append(node('td', value))); body.append(row); });
    result.append(head, body); return result;
  }
  function render(snapshot) {
    const content = document.getElementById('audit-content'); content.textContent = '';
    const cover = node('section', undefined, 'audit-cover');
    cover.append(node('p', 'SENTINEL / ILLUSTRATIVE AUDIT', 'audit-kicker'), node('h2', 'Security audit report'),
      node('p', 'SIMULATED SHOWCASE DATA — NOT A PENETRATION TEST OR SECURITY CERTIFICATION', 'audit-warning'),
      node('p', `Captured ${snapshot.generatedAt} · ${snapshot.findings.length} included findings from ${snapshot.sourceCount} source records.`),
      node('p', `Scope: ${snapshot.scope.source}; minimum severity ${snapshot.scope.minimum}; asset contains “${snapshot.scope.asset || '(any)'}”; auto-mitigated events ${snapshot.scope.includeMitigated ? 'included' : 'excluded'}.`),
      node('p', `Heuristic grade for this filtered snapshot: ${snapshot.grade}`, 'audit-grade'),
      node('p', 'Grade uses the worst included severity: critical F, high D, medium C, low B, informational A+. Empty scope is Not assessed. This is not a validated organizational posture score.'),
      node('p', 'CVSS-style scores come from the existing fictional catalogue (0–100 converted to 0–10), without verified vectors. Incident events do not provide CVSS scores and are marked N/A. Catalogue records are not evidence that an asset was scanned.'));
    content.append(cover);
    const matrix = node('section'); matrix.append(node('h3', 'Severity/source matrix'));
    const matrixTable = table(['Severity', 'Catalogue samples', 'Incident events'], snapshot.matrix.map(row => [row.severity, row.catalogue, row.incident]));
    [...matrixTable.querySelectorAll('tbody tr')].forEach((row, index) => { row.className = `audit-risk-${snapshot.matrix[index].severity}`; });
    matrix.append(matrixTable); content.append(matrix);
    const assets = node('section'); assets.append(node('h3', 'Included products and assets'));
    const list = node('ul'); snapshot.assets.forEach(asset => list.append(node('li', asset)));
    assets.append(snapshot.assets.length ? list : node('p', 'No assets match this scope. No security conclusion can be drawn.')); content.append(assets);
    const findings = node('section', undefined, 'audit-findings'); findings.append(node('h3', 'Findings and remediation review targets'));
    findings.append(node('p', 'Illustrative review windows: critical 1 day, high 7 days, medium 30 days, low 90 days, informational monitor. These are demo priorities, not contractual remediation deadlines. Reported mitigation is not independently verified.'));
    if (!snapshot.findings.length) findings.append(node('p', 'No findings match the selected filters. This does not demonstrate that a system is secure.'));
    snapshot.findings.forEach(finding => {
      const card = node('article', undefined, `audit-finding audit-risk-${finding.severity}`);
      const metadata = node('dl', undefined, 'audit-metadata');
      [['Asset/product', finding.asset], ['Severity', finding.severity], ['CVSS-style', finding.cvss === null ? 'N/A — not supplied' : finding.cvss.toFixed(1)],
        ['Source', finding.source], ['Reported status', finding.status], ['Review by', finding.reviewBy]].forEach(([label, value]) => {
        const group = node('div'); group.append(node('dt', label), node('dd', value)); metadata.append(group);
      });
      card.append(node('h4', `${finding.id} · ${finding.title}`),
        metadata,
        node('p', `Reference: ${finding.reference || 'Not supplied'}. ${finding.remediation}`));
      findings.append(card);
    });
    content.append(findings, node('p', 'Frozen local snapshot. New simulated events do not change this report; regenerate to capture them. No network scan or data upload was performed.', 'audit-footer'));
    report.hidden = false; document.body.classList.add('audit-report-ready');
    report.scrollIntoView({ block: 'start' }); report.focus({ preventScroll: true });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const source = window.sentinelAuditData;
      if (!source?.catalogue || !source?.incidents) throw new Error('Demo data is not ready. Try again after the page loads.');
      const snapshot = buildAudit([...source.catalogue(), ...source.incidents()], {
        source: document.getElementById('audit-source').value, minimum: document.getElementById('audit-minimum').value,
        asset: document.getElementById('audit-asset').value, includeMitigated: document.getElementById('audit-mitigated').checked
      });
      feedback.textContent = ''; dialog.close(); render(snapshot);
    } catch (error) { feedback.textContent = error.message; }
  });
  document.getElementById('audit-print').addEventListener('click', () => window.print());
  document.getElementById('audit-back').addEventListener('click', () => {
    report.hidden = true; document.body.classList.remove('audit-report-ready'); document.getElementById('audit-open').focus();
  });
}
