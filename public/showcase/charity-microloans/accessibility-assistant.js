function rgb(value) {
  if (!Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isFinite(v) || v < 0 || v > 255)) throw new RangeError('RGB needs three channels from 0 to 255.');
  return value;
}
export function parseColor(value) {
  const match = /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(value);
  if (!match) return null;
  const channels = match.slice(1, 4).map(Number), alpha = match[4] === undefined ? 1 : Number(match[4]);
  try { rgb(channels); } catch { return null; }
  return alpha >= 0 && alpha <= 1 ? { channels, alpha } : null;
}
export function composite(front, back) {
  rgb(front.channels); rgb(back);
  if (!Number.isFinite(front.alpha) || front.alpha < 0 || front.alpha > 1) throw new RangeError('Invalid opacity.');
  return front.channels.map((v, i) => v * front.alpha + back[i] * (1 - front.alpha));
}
export function tabSequence(controls) {
  return controls.map((item, index) => ({ ...item, index })).filter(v => !v.disabled && !v.hidden && v.tabIndex >= 0)
    .sort((a, b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity) || a.index - b.index);
}
export function referenceProblems(ids, references) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  return references.flatMap(({ label, attribute, value }) => value.trim() ? value.trim().split(/\s+/).flatMap(id => {
    const count = counts.get(id) || 0;
    return count === 1 ? [] : [`${label}: ${attribute} refers to ${count ? 'duplicate' : 'missing'} ID “${id}”.`];
  }) : [`${label}: ${attribute} has no target ID.`]);
}
export class CharityMicroloansA11yAuditor {
  calculateLuminance(color) {
    const linear = rgb(color).map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  getContrastRatio(c1, c2) {
    const a = this.calculateLuminance(c1), b = this.calculateLuminance(c2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  evaluateWCAG(ratio, large = false) {
    if (!Number.isFinite(ratio) || ratio < 1 || ratio > 21) throw new RangeError('Contrast must be from 1 to 21.');
    const aaThreshold = large ? 3 : 4.5, aaaThreshold = large ? 4.5 : 7;
    return { aa: ratio >= aaThreshold, aaa: ratio >= aaaThreshold, aaThreshold, aaaThreshold };
  }
  textContrast(element) {
    const view = element.ownerDocument.defaultView, layers = [];
    let opaque = false;
    for (let current = element; current; current = current.parentElement) {
      const style = view.getComputedStyle(current);
      if (style.backgroundImage !== 'none' || Number(style.opacity) !== 1 || style.filter !== 'none' || style.mixBlendMode !== 'normal') return { manual: 'Background image, opacity, filter, or blend requires manual inspection.' };
      if (!opaque) {
        const color = parseColor(style.backgroundColor);
        if (!color) return { manual: 'Unsupported background color.' };
        layers.push(color); opaque = color.alpha === 1;
      }
    }
    if (!opaque) return { manual: 'No known opaque background.' };
    const style = view.getComputedStyle(element), foreground = parseColor(style.color);
    if (!foreground || style.textShadow !== 'none') return { manual: 'Unsupported text color or shadow.' };
    let background = [255, 255, 255];
    for (const layer of layers.reverse()) background = composite(layer, background);
    const ratio = this.getContrastRatio(composite(foreground, background), background);
    const size = parseFloat(style.fontSize), weight = Number(style.fontWeight);
    const large = size >= 24 || (size >= 56 / 3 && weight >= 700);
    return { ratio, large, ...this.evaluateWCAG(ratio, large) };
  }
  inspect(root) {
    if (!root || root.querySelectorAll('*').length > 200) throw new RangeError('Choose a sample with at most 200 elements.');
    const view = root.ownerDocument.defaultView;
    const visible = el => !el.closest('[hidden],[inert]') && view.getComputedStyle(el).visibility === 'visible' && el.getClientRects().length > 0;
    const contrast = [...root.querySelectorAll('[data-contrast]')].filter(visible).map(el => ({ label: el.dataset.contrast, ...this.textContrast(el) }));
    const ids = [...root.querySelectorAll('[id]')].map(el => el.id);
    const references = [...root.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]')].flatMap(el => ['aria-labelledby', 'aria-describedby', 'aria-controls'].filter(attr => el.hasAttribute(attr)).map(attribute => ({ label: el.id || el.tagName, attribute, value: el.getAttribute(attribute) })));
    const problems = referenceProblems(ids, references);
    for (const el of root.querySelectorAll('[aria-expanded]')) if (!['true', 'false'].includes(el.getAttribute('aria-expanded'))) problems.push(`${el.id || el.tagName}: aria-expanded must be true or false.`);
    const controls = [...root.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].map(el => ({ id: el.id, label: el.labels?.[0]?.textContent.trim() || el.getAttribute('aria-label') || el.textContent.trim(), tabIndex: el.tabIndex, disabled: el.matches(':disabled'), hidden: !visible(el) }));
    return { contrast, problems, route: tabSequence(controls), positive: controls.filter(el => !el.hidden && !el.disabled && el.tabIndex > 0).length };
  }
}

if (typeof document !== 'undefined' && document.querySelector('#loan-sample')) {
  const sample = document.querySelector('#loan-sample'), auditor = new CharityMicroloansA11yAuditor();
  const byId = id => document.getElementById(id), details = byId('loan-details'), apply = byId('loan-apply'), preview = byId('preview');
  const original = [details, apply].map(el => ({ el, attributes: ['aria-expanded', 'aria-controls', 'tabindex'].map(name => [name, el.getAttribute(name)]) }));
  let repaired = false, latest;
  const badge = (text, state) => { const el = document.createElement('span'); el.className = `badge ${state}`; el.textContent = text; return el; };
  function scan() {
    try {
      latest = auditor.inspect(sample);
      byId('contrast-results').replaceChildren(...latest.contrast.map(row => {
        const tr = document.createElement('tr'), label = document.createElement('td'), ratio = document.createElement('td'), result = document.createElement('td');
        label.textContent = row.label; ratio.textContent = row.manual ? 'Unverified' : `${row.ratio.toFixed(3)}:1`;
        if (row.manual) { result.append(badge('Manual', 'manual')); result.title = row.manual; }
        else { result.append(badge(row.aa ? 'AA pass' : 'AA fail', row.aa ? '' : 'fail'), document.createTextNode(' / '), badge(row.aaa ? 'AAA pass' : 'AAA fail', row.aaa ? '' : 'fail')); result.title = `AA ≥ ${row.aaThreshold}:1; AAA ≥ ${row.aaaThreshold}:1${row.large ? ' (large text)' : ''}. Decisions use unrounded values.`; }
        tr.append(label, ratio, result); return tr;
      }));
      const checks = [
        { pass: latest.problems.length === 0, text: latest.problems.length ? latest.problems.join(' ') : 'ARIA ID references and expanded values are valid within this sample.' },
        { pass: latest.positive === 0, text: latest.positive ? `${latest.positive} positive tab index changes the default order. Review it manually.` : 'No positive tab indices override the document order.' },
      ];
      byId('structure-results').replaceChildren(...checks.map(check => { const li = document.createElement('li'); li.append(badge(check.pass ? 'Pass' : 'Review', check.pass ? '' : 'manual'), document.createTextNode(check.text)); return li; }));
      byId('tab-route').replaceChildren(...latest.route.map(item => { const li = document.createElement('li'); li.textContent = `${item.label || item.id} · tabindex ${item.tabIndex}`; return li; }));
      const known = latest.contrast.filter(row => !row.manual), passed = known.filter(row => row.aa).length + checks.filter(check => check.pass).length;
      byId('score').textContent = `${passed} / ${latest.contrast.length + checks.length} checks passed`;
      byId('score-detail').textContent = `${known.length} computed text checks, ${latest.contrast.length - known.length} unverified text checks, and 2 structure checks. Keyboard behavior still needs manual review.`;
      byId('scan-status').textContent = `${repaired ? 'Repair preview' : 'Original sample'} checked. Results below reflect the current DOM; unverified checks are not passes.`;
    } catch (error) {
      byId('scan-status').textContent = `Review could not run: ${error.message}`;
      byId('score').textContent = 'Unverified'; byId('score-detail').textContent = 'No current checks passed; fix the sample and run checks again.';
      for (const id of ['contrast-results', 'structure-results', 'tab-route']) byId(id).replaceChildren();
      latest = null;
    }
  }
  byId('scan').addEventListener('click', scan);
  preview.addEventListener('click', () => {
    repaired = !repaired; sample.classList.toggle('repaired', repaired);
    if (repaired) { details.setAttribute('aria-controls', 'loan-terms'); details.setAttribute('aria-expanded', String(!byId('loan-terms').hidden)); apply.removeAttribute('tabindex'); }
    else for (const { el, attributes } of original) for (const [name, value] of attributes) { if (value === null) el.removeAttribute(name); else el.setAttribute(name, value); }
    preview.setAttribute('aria-pressed', String(repaired)); preview.textContent = repaired ? 'Undo repair preview' : 'Preview repairs'; byId('sample-state').textContent = repaired ? 'Repaired preview' : 'Original'; scan();
  });
  for (const [id, property] of [['text-color', '--sample-text'], ['background-color', '--sample-bg']]) byId(id).addEventListener('input', event => { sample.style.setProperty(property, event.target.value); scan(); });
  byId('keyboard').addEventListener('click', () => { scan(); const first = latest?.route[0]; if (first) byId(first.id)?.focus(); });
  sample.addEventListener('focusin', event => { const index = latest?.route.findIndex(item => item.id === event.target.id) ?? -1; byId('focus-status').textContent = `Focused: ${event.target.labels?.[0]?.textContent.trim() || event.target.textContent.trim() || event.target.id}${index >= 0 ? ` (${index + 1} of ${latest.route.length})` : ''}.`; });
  details.addEventListener('click', () => { const terms = byId('loan-terms'); terms.hidden = !terms.hidden; details.setAttribute('aria-expanded', String(!terms.hidden)); scan(); });
  apply.addEventListener('click', () => { byId('loan-message').textContent = 'Demo contribution previewed. Nothing was submitted or stored.'; });
  scan();
}
