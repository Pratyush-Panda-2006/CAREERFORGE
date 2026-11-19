const WIDTH = 1000, HEIGHT = 700, SCALE = 2;
const fields = { title: 60, recipient: 80, contribution: 80, message: 180 };

export function encodeReference(reference) {
  if (typeof reference !== 'string' || !/^[A-Z0-9-]{1,24}$/.test(reference)) throw new Error('Reference must use 1–24 uppercase letters, numbers or hyphens.');
  const groups = [...reference].map(character => {
    const bits = character.charCodeAt(0).toString(2).padStart(7, '0');
    const ones = [...bits].reduce((sum, bit) => sum + Number(bit), 0);
    return bits + (ones % 2 === 0 ? '1' : '0');
  });
  return { groups, modules: '10110' + groups.join('') + '1101' };
}

export function normalizeReceipt(data) {
  if (!data || typeof data !== 'object') throw new Error('Enter certificate details.');
  const normalized = {};
  for (const [field, limit] of Object.entries(fields)) {
    if (typeof data[field] !== 'string') throw new Error(`Enter ${field}.`);
    const value = data[field].replace(/\s+/g, ' ').trim();
    if (!value || [...value].length > limit || [...value].some(character => character.codePointAt(0) < 32 || character.codePointAt(0) === 127)) throw new Error(`${field} must contain 1–${limit} printable characters.`);
    normalized[field] = value;
  }
  normalized.reference = typeof data.reference === 'string' ? data.reference.trim().toUpperCase() : '';
  encodeReference(normalized.reference);
  if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('Choose a valid date.');
  const date = new Date(`${data.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.date) throw new Error('Choose a valid calendar date.');
  return { ...normalized, date: data.date };
}

export function wrapText(ctx, text, width, maxLines) {
  const lines = []; let line = '';
  for (const character of text) {
    if (ctx.measureText(line + character).width > width) {
      if (!line) throw new Error('Text cannot fit the certificate.');
      lines.push(line.trimEnd()); line = character.trimStart();
    } else line += character;
  }
  if (line) lines.push(line.trimEnd());
  if (lines.length > maxLines) throw new Error('Text is too wide for the certificate. Shorten the title, name or note.');
  return lines;
}

export class NonprofitImpactReceiptGenerator {
  constructor(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('Canvas is unavailable.');
    this.canvas = canvas;
    canvas.width = WIDTH * SCALE; canvas.height = HEIGHT * SCALE;
    this.lastReceipt = null;
  }

  drawBarcode(ctx, code, x, y, width = 808, height = 54) {
    const { modules } = encodeReference(code);
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > WIDTH || y + height > HEIGHT) throw new Error('Reference pattern exceeds the certificate bounds.');
    const unit = width / (modules.length + 20); // Ten empty modules on each side.
    ctx.fillStyle = '#173c34';
    [...modules].forEach((bit, index) => { if (bit === '1') ctx.fillRect(x + (index + 10) * unit, y, unit, height); });
    return { x, y, width, height, modules: modules.length, quietModules: 10 };
  }

  renderCanvas(ctx, input) {
    const receipt = normalizeReceipt(input);
    if (!ctx || !ctx.canvas || ctx.canvas.width !== WIDTH * SCALE || ctx.canvas.height !== HEIGHT * SCALE) throw new Error('Canvas must be 2000 × 1400 pixels.');
    // Preflight all text before clearing a valid previous preview.
    ctx.save();
    try {
      ctx.font = '34px Georgia, serif'; const title = wrapText(ctx, receipt.title, 808, 2);
      ctx.font = '30px Georgia, serif'; const recipient = wrapText(ctx, receipt.recipient, 808, 2);
      ctx.font = '18px system-ui, sans-serif'; const contribution = wrapText(ctx, receipt.contribution, 808, 2);
      ctx.font = '17px system-ui, sans-serif'; const message = wrapText(ctx, receipt.message, 808, 3);
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#173c34'; ctx.fillRect(0, 0, 20, HEIGHT);
      ctx.strokeStyle = '#b6c5b6'; ctx.lineWidth = 1; ctx.strokeRect(48, 48, 904, 604);
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = '#173c34';
      ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('NONPROFIT IMPACT  /  COMMUNITY RECORD', 96, 100);
      ctx.font = '34px Georgia, serif'; title.forEach((line, index) => ctx.fillText(line, 96, 160 + index * 42));
      ctx.font = '13px system-ui, sans-serif'; ctx.fillText('PRESENTED WITH THANKS TO', 96, 240);
      ctx.font = '30px Georgia, serif'; recipient.forEach((line, index) => ctx.fillText(line, 96, 284 + index * 36));
      ctx.font = '18px system-ui, sans-serif'; contribution.forEach((line, index) => ctx.fillText(line, 96, 365 + index * 25));
      ctx.font = '13px system-ui, sans-serif'; ctx.fillText(`DATE  ${receipt.date}     /     REF  ${receipt.reference}`, 96, 423);
      this.drawBarcode(ctx, receipt.reference, 96, 450);
      ctx.font = '17px system-ui, sans-serif'; message.forEach((line, index) => ctx.fillText(line, 96, 550 + index * 23));
      ctx.fillStyle = '#53665d'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText('PERSONAL ACKNOWLEDGEMENT · DECORATIVE REFERENCE PATTERN · CREATED LOCALLY', 96, 625);
      this.lastReceipt = receipt;
      return { ...receipt };
    } finally { ctx.restore(); }
  }

  render(data) { return this.renderCanvas(this.canvas.getContext('2d'), data); }
  toDataURL() {
    if (!this.lastReceipt) throw new Error('Render a valid certificate first.');
    const value = this.canvas.toDataURL('image/png');
    if (!value.startsWith('data:image/png;base64,')) throw new Error('PNG encoding failed.');
    return value;
  }
  async downloadBlob(filename) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.png$/.test(filename)) throw new Error('Choose a plain PNG filename.');
    if (!this.lastReceipt) throw new Error('Render a valid certificate first.');
    const blob = await new Promise((resolve, reject) => {
      this.canvas.toBlob(value => value && value.size && value.type === 'image/png' ? resolve(value) : reject(new Error('PNG export failed. Try again.')), 'image/png');
    });
    return { blob, filename };
  }
}

function startStudio(root) {
  const form = root.querySelector('form'), canvas = root.querySelector('canvas');
  const download = root.querySelector('#download-receipt'), error = root.querySelector('#receipt-error');
  const status = root.querySelector('#receipt-status'), summary = root.querySelector('#receipt-summary');
  let generator, pending = false, alive = true, valid = false, frame = 0;
  const urls = new Set();
  function preview() {
    cancelAnimationFrame(frame); frame = 0;
    try {
      generator ??= new NonprofitImpactReceiptGenerator(canvas);
      const data = generator.render(Object.fromEntries(new FormData(form)));
      const description = `${data.title} Presented to ${data.recipient}. ${data.contribution}. Date ${data.date}. Reference ${data.reference}. ${data.message}`;
      canvas.setAttribute('aria-label', description); summary.textContent = description;
      valid = true; error.hidden = true; error.textContent = ''; download.disabled = pending;
      status.textContent = 'Ready to keep. Preview matches your details.';
      return data;
    } catch (failure) {
      valid = false; error.textContent = failure.message; error.hidden = false; download.disabled = true;
      status.textContent = 'Update the details to export. The last valid preview is retained.';
      return null;
    }
  }
  form.addEventListener('input', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(preview); });
  form.addEventListener('submit', event => { event.preventDefault(); preview(); });
  root.querySelectorAll('button[data-zoom]').forEach(button => button.addEventListener('click', () => {
    root.querySelector('#canvas-frame').dataset.zoom = button.dataset.zoom;
    root.querySelectorAll('button[data-zoom]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  download.addEventListener('click', async () => {
    if (pending) return;
    const data = preview(); if (!data) return;
    pending = true; download.disabled = true; status.textContent = 'Encoding your PNG…';
    try {
      const { blob, filename } = await generator.downloadBlob(`impact-${data.reference}.png`);
      if (!alive) return;
      const url = URL.createObjectURL(blob); urls.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 1000);
      status.textContent = 'PNG download prepared. Check your browser downloads.';
    } catch (failure) { if (alive) { error.textContent = failure.message; error.hidden = false; status.textContent = 'Could not export. Try again.'; } }
    finally { pending = false; if (alive) download.disabled = !valid; }
  });
  window.addEventListener('pagehide', () => { alive = false; cancelAnimationFrame(frame); urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); }, { once: true });
  preview();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('#receipt-studio');
  if (root) startStudio(root);
}
